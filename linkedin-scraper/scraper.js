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

function liGet(urlPath, { liAt, sessionToken }) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.linkedin.com',
      path: urlPath,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/vnd.linkedin.normalized+json+2.1',
        'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
        'x-li-lang': 'sv_SE',
        'x-li-page-instance': 'urn:li:page:d_flagship3_search_srp_content;' + Math.random().toString(36).slice(2),
        'x-li-track': JSON.stringify({ clientVersion: '1.13.14321', mpVersion: '1.13.14321', osName: 'web', timezoneOffset: 2, timezone: 'Europe/Stockholm', deviceFormFactor: 'DESKTOP', mpName: 'voyager-web' }),
        'x-restli-protocol-version': '2.0.0',
        'x-li-pem-metadata': 'Voyager - Feed=false',
        'csrf-token': sessionToken,
        'Cookie': `li_at=${liAt}; JSESSIONID="${sessionToken}"`
      },
      timeout: 25000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 401 || res.statusCode === 403) {
          reject(new Error(`HTTP ${res.statusCode} — session expired or invalid cookies`));
          return;
        }
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data, raw: data.slice(0, 200) }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isPostUrn(urn) {
  return urn.includes(':activity:') || urn.includes(':ugcPost:') || urn.includes(':share:');
}

function extractUrnsFromBody(body) {
  const urns = [];

  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(walk); return; }

    // Direct URN fields
    for (const key of ['targetUrn', 'trackingUrn', 'entityUrn', 'updateUrn']) {
      const val = obj[key];
      if (typeof val === 'string' && isPostUrn(val)) {
        // Extract clean activity URN from compound URNs
        const match = val.match(/(urn:li:(?:activity|ugcPost|share):[0-9]+)/);
        if (match) urns.push(match[1]);
      }
    }

    // Recurse into known containers
    for (const key of ['elements', 'items', 'item', 'entityResult', 'results', 'data']) {
      if (obj[key]) walk(obj[key]);
    }
  }

  walk(body);
  return [...new Set(urns)];
}

async function searchPosts(keyword, creds) {
  const kw = encodeURIComponent(keyword);

  // Try multiple API formats — LinkedIn changes these frequently
  const urls = [
    // 2024+ dash search
    `/voyager/api/voyagerSearchDashClusters?decorationId=com.linkedin.voyager.dash.deco.search.SearchCluster-2&count=${MAX_POSTS}&q=all&query=(keywords:${kw},flagshipSearchIntent:SEARCH_SRP,queryParameters:(resultType:List(CONTENT)),includeFiltersInResponse:false)`,
    // Classic blended with content filter
    `/voyager/api/search/blended?keywords=${kw}&origin=GLOBAL_SEARCH_HEADER&q=all&start=0&count=${MAX_POSTS}&filters=List(resultType-%3ECONTENT)`,
    // Classic blended without filter (broader)
    `/voyager/api/search/blended?keywords=${kw}&origin=GLOBAL_SEARCH_HEADER&q=all&start=0&count=${MAX_POSTS}`,
  ];

  for (const url of urls) {
    try {
      await sleep(400);
      const { status, body } = await liGet(url, creds);
      if (status !== 200 || typeof body !== 'object') continue;
      const urns = extractUrnsFromBody(body);
      if (urns.length > 0) return { urns, apiUsed: url.split('?')[0] };
    } catch { continue; }
  }

  return { urns: [], apiUsed: null };
}

async function fetchPost(urn, creds) {
  const urls = [
    `/voyager/api/feed/updates/${encodeURIComponent(urn)}?updateType=STORY_UPDATE&ursaContextType=FEED_DETAIL`,
    `/voyager/api/feed/updates/${encodeURIComponent(urn)}`,
  ];

  for (const url of urls) {
    try {
      const { status, body } = await liGet(url, creds);
      if (status === 200 && typeof body === 'object') {
        return extractPostData(body, urn);
      }
    } catch { continue; }
  }
  return null;
}

async function fetchComments(urn, creds) {
  const url = `/voyager/api/feed/comments?updateId=${encodeURIComponent(urn)}&count=${MAX_COMMENTS}&start=0`;
  try {
    const { status, body } = await liGet(url, creds);
    if (status !== 200 || typeof body !== 'object') return [];
    return (body?.elements || body?.data?.elements || []).reduce((acc, el) => {
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
    ((actor?.miniProfile?.firstName || '') + ' ' + (actor?.miniProfile?.lastName || '')) || 'Unknown')
    .replace(/undefined/g, '').trim() || 'Unknown';
}

function extractPostData(body, urn) {
  const update     = body?.value || body?.data || body;
  const actor      = update?.actor || {};
  const commentary = update?.commentary || update?.specificContent?.['com.linkedin.ugc.ShareContent'] || {};
  const text       = commentary?.text?.text || commentary?.shareCommentary?.text || update?.message?.text || '';
  const social     = update?.socialDetail?.totalSocialActivityCounts || update?.socialDetail || {};
  const authorName = extractAuthorName(actor);
  const fullText   = `${authorName} ${text}`.toLowerCase();
  return {
    urn,
    author: authorName,
    text: text.trim(),
    likes: social?.numLikes || social?.numReactions || 0,
    comments: social?.numComments || 0,
    shares: social?.numShares || 0,
    created: update?.actor?.subDescription?.text || '',
    mentionedAgencies: TRACKED_AGENCIES.filter(a => fullText.includes(a.toLowerCase())),
    url: `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}`
  };
}

async function scrapeLinkedIn({ liAt, jsessionid, extraKeywords = [], onProgress }) {
  const sessionToken = jsessionid.replace(/^"|"$/g, '');
  const creds        = { liAt, sessionToken };
  const keywords     = [...BASE_KEYWORDS, ...extraKeywords];
  const allPosts     = [];
  const seenUrns     = new Set();

  for (const keyword of keywords) {
    const isExtra = extraKeywords.includes(keyword);
    onProgress?.({ type: 'searching', keyword, isExtra });

    try {
      const { urns, apiUsed } = await searchPosts(keyword, creds);
      const fresh = urns.filter(u => !seenUrns.has(u));
      fresh.forEach(u => seenUrns.add(u));
      onProgress?.({ type: 'found', keyword, count: fresh.length, apiUsed });

      for (const urn of fresh) {
        await sleep(900);
        const post = await fetchPost(urn, creds);
        if (!post) continue;

        if (post.comments > 0) {
          await sleep(500);
          post.commentsList = await fetchComments(urn, creds);
        } else {
          post.commentsList = [];
        }

        const full = { ...post, matchedKeyword: keyword, isExtra };
        allPosts.push(full);
        onProgress?.({ type: 'post', post: full });
      }
    } catch (err) {
      onProgress?.({ type: 'error_msg', keyword, message: err.message });
      if (err.message.includes('session expired')) throw err;
    }
  }

  return {
    runDate: new Date().toISOString(),
    baseKeywords: BASE_KEYWORDS,
    extraKeywords,
    totalPosts: allPosts.length,
    posts: allPosts
  };
}

module.exports = { scrapeLinkedIn, BASE_KEYWORDS, TRACKED_AGENCIES };
