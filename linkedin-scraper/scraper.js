const https = require('https');

const BASE_KEYWORDS = [
  'Guldägget',
  '100-wattaren',
  'Månadens kampanj',
  'svensk reklam',
  'reklambyrå award'
];

const TRACKED_AGENCIES = [
  'Forsman & Bodenfors', 'INGO', 'Acne', 'Åkestam Holst',
  'Familjen', 'Volt', 'Perfect Fools', 'Garbergs',
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

// Walk the entire response object and extract all activity URNs
function extractUrnsFromBody(body) {
  const urns = [];
  const ACTIVITY_RE = /(urn:li:(?:activity|ugcPost|share):[0-9]+)/g;

  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(walk); return; }
    for (const val of Object.values(obj)) {
      if (typeof val === 'string') {
        // matchAll finds all activity URNs even inside compound URNs like fsd_update:(...)
        for (const m of val.matchAll(ACTIVITY_RE)) urns.push(m[1]);
      } else if (val && typeof val === 'object') {
        walk(val);
      }
    }
  }

  walk(body);
  return [...new Set(urns)];
}

// Working URL format confirmed via /debug endpoint
function buildSearchUrls(keyword, count) {
  const kw = encodeURIComponent(keyword);
  return [
    `/voyager/api/voyagerSearchDashClusters?q=all&count=${count}&origin=GLOBAL_SEARCH_HEADER&query=(keywords:${kw},flagshipSearchIntent:SEARCH_SRP,queryParameters:(resultType:List(CONTENT)),includeFiltersInResponse:false)`,
  ];
}

async function searchPosts(keyword, creds) {
  for (const url of buildSearchUrls(keyword, MAX_POSTS)) {
    try {
      await sleep(400);
      const { status, body } = await liGet(url, creds);
      if (status === 200 && typeof body === 'object') {
        return extractUrnsFromBody(body);
      }
    } catch { continue; }
  }
  return [];
}

async function fetchPost(urn, creds) {
  for (const url of [
    `/voyager/api/feed/updates/${encodeURIComponent(urn)}?updateType=STORY_UPDATE&ursaContextType=FEED_DETAIL`,
    `/voyager/api/feed/updates/${encodeURIComponent(urn)}`,
  ]) {
    try {
      const { status, body } = await liGet(url, creds);
      if (status === 200 && typeof body === 'object') return extractPostData(body, urn);
    } catch { continue; }
  }
  return null;
}

async function fetchComments(urn, creds) {
  try {
    const { status, body } = await liGet(
      `/voyager/api/feed/comments?updateId=${encodeURIComponent(urn)}&count=${MAX_COMMENTS}&start=0`, creds
    );
    if (status !== 200 || typeof body !== 'object') return [];
    return (body?.elements || []).reduce((acc, el) => {
      const text = el.comment?.text || el.message?.text || '';
      if (text) acc.push({
        author: extractAuthorName(el.commenter || el.actor || {}),
        text: text.trim(),
        likes: el.socialDetail?.totalSocialActivityCounts?.numLikes || 0,
        time: el.createdTime ? new Date(el.createdTime).toISOString() : null
      });
      return acc;
    }, []);
  } catch { return []; }
}

function extractAuthorName(actor) {
  return (actor?.name?.text || actor?.title?.text ||
    ((actor?.miniProfile?.firstName || '') + ' ' + (actor?.miniProfile?.lastName || '')))
    .replace(/undefined/g, '').trim() || 'Unknown';
}

function extractPostData(body, urn) {
  const update     = body?.value || body?.data || body;
  const actor      = update?.actor || {};
  const commentary = update?.commentary || update?.specificContent?.['com.linkedin.ugc.ShareContent'] || {};
  const text       = commentary?.text?.text || commentary?.shareCommentary?.text || update?.message?.text || '';
  const social     = update?.socialDetail?.totalSocialActivityCounts || update?.socialDetail || {};
  const authorName = extractAuthorName(actor);
  return {
    urn,
    author: authorName,
    text: text.trim(),
    likes: social?.numLikes || social?.numReactions || 0,
    comments: social?.numComments || 0,
    shares: social?.numShares || 0,
    created: update?.actor?.subDescription?.text || '',
    mentionedAgencies: TRACKED_AGENCIES.filter(a =>
      `${authorName} ${text}`.toLowerCase().includes(a.toLowerCase())
    ),
    url: `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}`
  };
}

async function scrapeLinkedIn({ liAt, jsessionid, extraKeywords = [], onProgress }) {
  const sessionToken = jsessionid.replace(/^"|"$/g, '');
  const creds        = { liAt, sessionToken };
  const allPosts     = [];
  const seenUrns     = new Set();

  for (const keyword of [...BASE_KEYWORDS, ...extraKeywords]) {
    const isExtra = extraKeywords.includes(keyword);
    onProgress?.({ type: 'searching', keyword, isExtra });
    try {
      const urns  = await searchPosts(keyword, creds);
      const fresh = urns.filter(u => !seenUrns.has(u));
      fresh.forEach(u => seenUrns.add(u));
      onProgress?.({ type: 'found', keyword, count: fresh.length });

      for (const urn of fresh) {
        await sleep(900);
        const post = await fetchPost(urn, creds);
        if (!post) continue;
        post.commentsList = post.comments > 0
          ? await (async () => { await sleep(400); return fetchComments(urn, creds); })()
          : [];
        const full = { ...post, matchedKeyword: keyword, isExtra };
        allPosts.push(full);
        onProgress?.({ type: 'post', post: full });
      }
    } catch (err) {
      onProgress?.({ type: 'error_msg', keyword, message: err.message });
      if (err.message.includes('session expired')) throw err;
    }
  }

  return { runDate: new Date().toISOString(), baseKeywords: BASE_KEYWORDS, extraKeywords, totalPosts: allPosts.length, posts: allPosts };
}

module.exports = { scrapeLinkedIn, BASE_KEYWORDS, TRACKED_AGENCIES, buildHeaders, buildSearchUrls };
