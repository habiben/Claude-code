const https = require('https');

const BASE_KEYWORDS = [
  'Jude law',
  'Legora',
  'Åkestam Holst',
  'NoA Åkestam Holst',
  'Law Just got more attractive',
  'The new face of law'
];

const TRACKED_AGENCIES = [
  'Åkestam Holst', 'NoA Åkestam Holst', 'Legora',
  'Forsman & Bodenfors', 'INGO', 'Acne', 'Familjen',
  'TBWA', 'DDB', 'McCann', 'Ogilvy'
];

const MAX_POSTS    = 10;
const MAX_COMMENTS = 20;
const POST_URN_RE  = /(urn:li:(?:activity|ugcPost|share):[0-9]+)/;

function buildHeaders(liAt, sessionToken) {
  return {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/vnd.linkedin.normalized+json+2.1',
    'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
    'x-li-lang': 'sv_SE',
    'x-li-track': JSON.stringify({ clientVersion: '1.13.14321', mpVersion: '1.13.14321', osName: 'web', timezoneOffset: 2, timezone: 'Europe/Stockholm', deviceFormFactor: 'DESKTOP', mpName: 'voyager-web' }),
    'x-restli-protocol-version': '2.0.0',
    'csrf-token': sessionToken,
    'Cookie': `li_at=${liAt}; JSESSIONID="${sessionToken}"`
  };
}

function liGet(urlPath, { liAt, sessionToken }) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.linkedin.com',
      path: urlPath,
      method: 'GET',
      headers: buildHeaders(liAt, sessionToken),
      timeout: 25000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 401 || res.statusCode === 403)
          return reject(new Error(`HTTP ${res.statusCode} — session expired`));
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildSearchUrl(keyword, count) {
  const kw = encodeURIComponent(keyword);
  return `/voyager/api/voyagerSearchDashClusters?q=all&count=${count}&origin=GLOBAL_SEARCH_HEADER&query=(keywords:${kw},flagshipSearchIntent:SEARCH_SRP,queryParameters:(resultType:List(CONTENT)),includeFiltersInResponse:false)`;
}

function buildIncludedMap(included) {
  const map = {};
  for (const obj of (included || [])) {
    if (obj && obj.entityUrn) map[obj.entityUrn] = obj;
  }
  return map;
}

// Extract plain text from various LinkedIn text container shapes
function extractText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val.text) return extractText(val.text);
  if (val.shareCommentary) return extractText(val.shareCommentary);
  return '';
}

// Resolve author name from actor, dereferencing via included map
function resolveAuthorName(actor, map) {
  if (!actor) return null;

  if (actor.name && actor.name.text) return actor.name.text;
  if (typeof actor.name === 'string' && actor.name) return actor.name;

  const ref = actor['*miniProfile'] || actor['*actor'] || actor['*person'];
  if (ref && map[ref]) {
    const p = map[ref];
    if (p.name && p.name.text) return p.name.text;
    const fn = p.firstName || p.localizedFirstName || '';
    const ln = p.lastName  || p.localizedLastName  || '';
    if (fn || ln) return `${fn} ${ln}`.trim();
  }

  const mp = actor.miniProfile || actor.profile;
  if (mp) {
    if (mp.name && mp.name.text) return mp.name.text;
    const fn = mp.firstName || mp.localizedFirstName || '';
    const ln = mp.lastName  || mp.localizedLastName  || '';
    if (fn || ln) return `${fn} ${ln}`.trim();
  }

  if (actor.entityUrn && map[actor.entityUrn]) {
    const p = map[actor.entityUrn];
    const fn = p.firstName || p.localizedFirstName || '';
    const ln = p.lastName  || p.localizedLastName  || '';
    if (fn || ln) return `${fn} ${ln}`.trim();
  }

  return null;
}

function extractUrnsFromBody(body) {
  const urns = [];
  const RE = /(urn:li:(?:activity|ugcPost|share):[0-9]+)/g;
  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(walk); return; }
    for (const val of Object.values(obj)) {
      if (typeof val === 'string') { for (const m of val.matchAll(RE)) urns.push(m[1]); }
      else if (val && typeof val === 'object') walk(val);
    }
  }
  walk(body);
  return [...new Set(urns)];
}

function postFromObj(obj, map, keyword) {
  const actor  = obj.actor || obj.author || {};
  const author = resolveAuthorName(actor, map) || 'Unknown';

  const text = extractText(obj.commentary) ||
               extractText(obj.message)    ||
               extractText(obj.description)||
               extractText(obj.title)      || '';

  const social   = (obj.socialDetail && obj.socialDetail.totalSocialActivityCounts) || obj.socialDetail || {};
  const likes    = obj.reactionCount     || social.numLikes    || social.numReactions || 0;
  const comments = obj.totalCommentCount || social.numComments || 0;
  const shares   = social.numShares || 0;

  const createdAt = obj.createdAt
    ? new Date(obj.createdAt).toISOString()
    : (obj.created && obj.created.time ? new Date(obj.created.time).toISOString() : null);

  const relTime  = (actor.subDescription && actor.subDescription.text) || '';

  // Find activity URN from entityUrn or update-pointer fields
  const urnSource = [obj.entityUrn, obj.updateUrn, obj.trackingUrn].filter(Boolean).join(' ');
  const m = urnSource.match(POST_URN_RE);
  if (!m) return null;
  const urn = m[1];

  const fullText = `${author} ${text}`.toLowerCase();
  return {
    urn,
    author,
    text: text.trim(),
    likes,
    comments,
    shares,
    createdAt,
    relativeTime: relTime,
    mentionedAgencies: TRACKED_AGENCIES.filter(a => fullText.includes(a.toLowerCase())),
    url: `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}`,
    matchedKeyword: keyword,
    commentsList: []
  };
}

// Extract posts from search response included array.
// LinkedIn search uses SearchFeedUpdate objects (not UpdateV2), so we match
// on structure — actor present + post URN reachable — instead of $type.
function extractPostsFromSearch(body, keyword) {
  const included = body.included || [];
  const map      = buildIncludedMap(included);
  const posts    = [];
  const seen     = new Set();

  for (const obj of included) {
    if (!obj || typeof obj !== 'object') continue;
    if (!obj.actor && !obj.author) continue;

    const urnSource = [obj.entityUrn, obj.updateUrn, obj.trackingUrn]
      .filter(Boolean).join(' ');
    const m = urnSource.match(POST_URN_RE);
    if (!m) continue;
    const urn = m[1];
    if (seen.has(urn)) continue;
    seen.add(urn);

    const post = postFromObj(obj, map, keyword);
    if (post) posts.push(post);
  }

  return posts;
}

// Fetch a single post and extract its data from the response's included array
async function fetchPost(urn, creds, keyword) {
  try {
    const { status, body } = await liGet(
      `/voyager/api/feed/updates/${encodeURIComponent(urn)}`, creds
    );
    if (status !== 200 || typeof body !== 'object') return null;

    const included   = body.included || [];
    const map        = buildIncludedMap(included);
    const activityId = urn.split(':').pop(); // numeric ID portion

    for (const obj of included) {
      if (!obj) continue;
      const objUrn = String(obj.entityUrn || '');
      if (!objUrn.includes(activityId)) continue;
      if (!obj.actor && !obj.author) continue;
      const post = postFromObj(obj, map, keyword);
      if (post) return post;
    }
    return null;
  } catch { return null; }
}

async function fetchComments(urn, creds) {
  try {
    const { status, body } = await liGet(
      `/voyager/api/feed/comments?updateId=${encodeURIComponent(urn)}&count=${MAX_COMMENTS}&start=0`, creds
    );
    if (status !== 200 || typeof body !== 'object') return [];
    const map = buildIncludedMap(body.included);
    return (body.elements || []).reduce((acc, el) => {
      const text = extractText(el.comment) || extractText(el.message) || '';
      if (!text) return acc;
      acc.push({
        author: resolveAuthorName(el.commenter || el.actor || {}, map) || 'Unknown',
        text: text.trim(),
        likes: (el.socialDetail && el.socialDetail.totalSocialActivityCounts && el.socialDetail.totalSocialActivityCounts.numLikes) || 0,
        time: el.createdAt ? new Date(el.createdAt).toISOString() : null
      });
      return acc;
    }, []);
  } catch { return []; }
}

async function scrapeLinkedIn({ liAt, jsessionid, extraKeywords = [], onProgress }) {
  const sessionToken = jsessionid.replace(/^"|"$/g, '');
  const creds        = { liAt, sessionToken };
  const allPosts     = [];
  const seenUrns     = new Set();

  for (const keyword of [...BASE_KEYWORDS, ...extraKeywords]) {
    const isExtra = extraKeywords.includes(keyword);
    onProgress && onProgress({ type: 'searching', keyword, isExtra });

    try {
      await sleep(400);
      const { status, body } = await liGet(buildSearchUrl(keyword, MAX_POSTS), creds);

      if (status !== 200 || typeof body !== 'object') {
        onProgress && onProgress({ type: 'found', keyword, count: 0 });
        continue;
      }

      // Strategy 1: extract directly from search included array
      const searchPosts = extractPostsFromSearch(body, keyword);
      const freshSearch = searchPosts.filter(p => !seenUrns.has(p.urn));

      if (freshSearch.length > 0) {
        freshSearch.forEach(p => seenUrns.add(p.urn));
        onProgress && onProgress({ type: 'found', keyword, count: freshSearch.length });

        for (const post of freshSearch) {
          if (post.comments > 0) {
            await sleep(400);
            post.commentsList = await fetchComments(post.urn, creds);
          }
          const full = Object.assign({}, post, { isExtra });
          allPosts.push(full);
          onProgress && onProgress({ type: 'post', post: full });
          await sleep(300);
        }
      } else {
        // Strategy 2: extract URNs, fetch each post individually
        const urns  = extractUrnsFromBody(body);
        const fresh = urns.filter(u => !seenUrns.has(u)).slice(0, MAX_POSTS);
        fresh.forEach(u => seenUrns.add(u));
        onProgress && onProgress({ type: 'found', keyword, count: fresh.length });

        for (const urn of fresh) {
          await sleep(400);
          const post = await fetchPost(urn, creds, keyword);
          if (!post) continue;
          if (post.comments > 0) {
            await sleep(400);
            post.commentsList = await fetchComments(urn, creds);
          }
          const full = Object.assign({}, post, { isExtra });
          allPosts.push(full);
          onProgress && onProgress({ type: 'post', post: full });
          await sleep(300);
        }
      }
    } catch (err) {
      onProgress && onProgress({ type: 'error_msg', keyword, message: err.message });
      if (err.message.includes('session expired')) throw err;
    }
  }

  return { runDate: new Date().toISOString(), baseKeywords: BASE_KEYWORDS, extraKeywords, totalPosts: allPosts.length, posts: allPosts };
}

module.exports = { scrapeLinkedIn, BASE_KEYWORDS, TRACKED_AGENCIES, buildHeaders, buildSearchUrl };
