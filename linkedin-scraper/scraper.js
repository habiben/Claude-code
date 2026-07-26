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

// Build lookup map from included array
function buildIncludedMap(included) {
  const map = {};
  for (const obj of (included || [])) {
    if (obj && obj.entityUrn) map[obj.entityUrn] = obj;
  }
  return map;
}

// Resolve author name — tries inline fields and included references
function resolveAuthorName(actor, map) {
  if (!actor) return 'Unknown';

  // Inline name
  if (actor.name && actor.name.text) return actor.name.text;

  // Reference via *miniProfile or *actor
  const ref = actor['*miniProfile'] || actor['*actor'];
  if (ref && map[ref]) {
    const p = map[ref];
    const fn = p.firstName || p.localizedFirstName || '';
    const ln = p.lastName  || p.localizedLastName  || '';
    if (fn || ln) return `${fn} ${ln}`.trim();
    if (p.name && p.name.text) return p.name.text;
  }

  // Nested miniProfile
  if (actor.miniProfile) {
    const p = actor.miniProfile;
    const fn = p.firstName || p.localizedFirstName || '';
    const ln = p.lastName  || p.localizedLastName  || '';
    if (fn || ln) return `${fn} ${ln}`.trim();
  }

  return 'Unknown';
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

// Extract posts directly from search response (included array)
function extractPostsFromSearch(body, keyword) {
  const included = body.included || [];
  const map = buildIncludedMap(included);
  const posts = [];
  const seen = new Set();

  for (const obj of included) {
    const type = obj && obj['$type'] ? obj['$type'] : '';
    if (!type.includes('UpdateV2') && !type.includes('FeedUpdate')) continue;

    // Get activity URN
    const rawUrn = obj.entityUrn || obj.updateUrn || '';
    const m = rawUrn.match(/(urn:li:(?:activity|ugcPost|share):[0-9]+)/);
    if (!m) continue;
    const urn = m[1];
    if (seen.has(urn)) continue;
    seen.add(urn);

    const actor      = obj.actor || {};
    const author     = resolveAuthorName(actor, map);
    const commentary = obj.commentary || (obj.specificContent && obj.specificContent['com.linkedin.ugc.ShareContent']) || {};
    const text       = (commentary.text && commentary.text.text) || (commentary.shareCommentary && commentary.shareCommentary.text) || (obj.message && obj.message.text) || '';
    const social     = (obj.socialDetail && obj.socialDetail.totalSocialActivityCounts) || obj.socialDetail || {};
    const createdAt  = obj.createdAt ? new Date(obj.createdAt).toISOString() : null;
    const relTime    = (actor.subDescription && actor.subDescription.text) || '';
    const fullText   = `${author} ${text}`.toLowerCase();

    posts.push({
      urn,
      author,
      text: text.trim(),
      likes:    social.numLikes    || social.numReactions || 0,
      comments: social.numComments || 0,
      shares:   social.numShares   || 0,
      createdAt,
      relativeTime: relTime,
      mentionedAgencies: TRACKED_AGENCIES.filter(a => fullText.includes(a.toLowerCase())),
      url: `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}`,
      matchedKeyword: keyword,
      commentsList: []
    });
  }

  return posts;
}

async function fetchComments(urn, creds) {
  try {
    const { status, body } = await liGet(
      `/voyager/api/feed/comments?updateId=${encodeURIComponent(urn)}&count=${MAX_COMMENTS}&start=0`, creds
    );
    if (status !== 200 || typeof body !== 'object') return [];
    const map = buildIncludedMap(body.included);
    return (body.elements || []).reduce((acc, el) => {
      const text = (el.comment && el.comment.text) || (el.message && el.message.text) || '';
      if (!text) return acc;
      acc.push({
        author: resolveAuthorName(el.commenter || el.actor || {}, map),
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

      // Extract posts from search response included array
      const posts = extractPostsFromSearch(body, keyword);

      // Fall back to URN extraction if included gave nothing
      const urns = posts.length > 0 ? posts.map(p => p.urn) : extractUrnsFromBody(body);
      const fresh = urns.filter(u => !seenUrns.has(u));
      fresh.forEach(u => seenUrns.add(u));
      onProgress && onProgress({ type: 'found', keyword, count: fresh.length });

      for (const post of posts.filter(p => fresh.includes(p.urn))) {
        if (post.comments > 0) {
          await sleep(400);
          post.commentsList = await fetchComments(post.urn, creds);
        }
        const full = Object.assign({}, post, { isExtra });
        allPosts.push(full);
        onProgress && onProgress({ type: 'post', post: full });
        await sleep(300);
      }
    } catch (err) {
      onProgress && onProgress({ type: 'error_msg', keyword, message: err.message });
      if (err.message.includes('session expired')) throw err;
    }
  }

  return { runDate: new Date().toISOString(), baseKeywords: BASE_KEYWORDS, extraKeywords, totalPosts: allPosts.length, posts: allPosts };
}

module.exports = { scrapeLinkedIn, BASE_KEYWORDS, TRACKED_AGENCIES, buildHeaders, buildSearchUrl };
