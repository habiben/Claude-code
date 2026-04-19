#!/usr/bin/env node
// LinkedIn Scraper — Swedish Ad Industry Posts & Comments
//
// Uses LinkedIn's internal Voyager API (same endpoints the web app uses).
// Requires your own LinkedIn session cookies — no third-party services.
//
// Setup (one-time):
//   1. Log in to linkedin.com in your browser
//   2. Open DevTools → Application → Cookies → linkedin.com
//   3. Copy the values for 'li_at' and 'JSESSIONID'
//   4. Export them before running:
//        export LINKEDIN_LI_AT="your_li_at_value"
//        export LINKEDIN_JSESSIONID="your_jsessionid_value"
//
// Run (standard):  node linkedin-scraper.js
// Run (extra terms): node linkedin-scraper.js "Publicis" "Saatchi Stockholm"
// Cron: 0 8 * * 1 cd /path/to/project && node linkedin-scraper.js

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ============================================================
// Configuration
// ============================================================

const LI_AT      = process.env.LINKEDIN_LI_AT      || '';
const JSESSIONID = process.env.LINKEDIN_JSESSIONID || '';

if (!LI_AT || !JSESSIONID) {
  console.error('ERROR: Set LINKEDIN_LI_AT and LINKEDIN_JSESSIONID environment variables.');
  console.error('See the comment at the top of this file for instructions.');
  process.exit(1);
}

// Strip surrounding quotes LinkedIn sometimes adds to JSESSIONID
const SESSION_TOKEN = JSESSIONID.replace(/^"|"$/g, '');

// Base keywords — always searched
const SEARCH_KEYWORDS = [
  'Guldägget',
  '100-wattaren',
  'Månadens kampanj',
  'svensk reklam',
  'reklambyrå award'
];

// Extra keywords passed as CLI arguments, e.g.:
//   node linkedin-scraper.js "Publicis" "Saatchi Stockholm"
const EXTRA_KEYWORDS = process.argv.slice(2).filter(a => !a.startsWith('-'));

// Combined list used at runtime (base + temporary extras)
const ACTIVE_KEYWORDS = [...SEARCH_KEYWORDS, ...EXTRA_KEYWORDS];

// Agency names to look for in post text / author fields
const TRACKED_AGENCIES = [
  'Forsman & Bodenfors',
  'INGO',
  'Acne',
  'Åkestam Holst',
  'Familjen',
  'Volt',
  'Perfect Fools',
  'Garbergs',
  'TBWA',
  'DDB',
  'McCann',
  'Ogilvy'
];

// Max posts per keyword, max comments per post
const MAX_POSTS_PER_KEYWORD = 10;
const MAX_COMMENTS_PER_POST = 20;

// ============================================================
// HTTP helper
// ============================================================

function liGet(urlPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.linkedin.com',
      path: urlPath,
      method: 'GET',
      headers: {
        'User-Agent':                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':                    'application/vnd.linkedin.normalized+json+2.1',
        'Accept-Language':           'sv-SE,sv;q=0.9,en;q=0.8',
        'x-li-lang':                 'sv_SE',
        'x-li-track':                JSON.stringify({ clientVersion: '1.13.12143', mpVersion: '1.13.12143', osName: 'web', timezoneOffset: 1, timezone: 'Europe/Stockholm', deviceFormFactor: 'DESKTOP', mpName: 'voyager-web' }),
        'x-restli-protocol-version': '2.0.0',
        'csrf-token':                SESSION_TOKEN,
        'Cookie':                    `li_at=${LI_AT}; JSESSIONID="${SESSION_TOKEN}"`
      },
      timeout: 20000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 401 || res.statusCode === 403) {
          reject(new Error(`HTTP ${res.statusCode} — session expired or invalid cookies`));
          return;
        }
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ============================================================
// Voyager API helpers
// ============================================================

async function searchPosts(keyword) {
  const encoded = encodeURIComponent(keyword);
  const url = `/voyager/api/search/blended?keywords=${encoded}&origin=GLOBAL_SEARCH_HEADER&q=all&start=0&count=${MAX_POSTS_PER_KEYWORD}&filters=List(resultType-%3ECONTENT)`;

  const { status, body } = await liGet(url);
  if (status !== 200 || typeof body !== 'object') return [];

  const urns = [];
  const elements = body?.elements || body?.data?.elements || [];
  for (const group of elements) {
    for (const item of (group.elements || [])) {
      const urn = item.targetUrn || item.entityUrn || '';
      if (urn.includes('activity') || urn.includes('ugcPost') || urn.includes('share')) {
        urns.push(urn);
      }
    }
  }
  return urns;
}

async function fetchPost(urn) {
  const encodedUrn = encodeURIComponent(urn);
  const url = `/voyager/api/feed/updates/${encodedUrn}?updateType=STORY_UPDATE&ursaContextType=FEED_DETAIL`;

  const { status, body } = await liGet(url);
  if (status !== 200 || typeof body !== 'object') return null;

  return extractPostData(body, urn);
}

async function fetchComments(urn) {
  const encodedUrn = encodeURIComponent(urn);
  const url = `/voyager/api/feed/comments?updateId=${encodedUrn}&count=${MAX_COMMENTS_PER_POST}&start=0`;

  const { status, body } = await liGet(url);
  if (status !== 200 || typeof body !== 'object') return [];

  const comments = [];
  const elements = body?.elements || body?.data?.elements || [];
  for (const el of elements) {
    const author = extractAuthorName(el.commenter || el.actor || {});
    const text   = el.comment?.text || el.message?.text || '';
    const likes  = el.socialDetail?.totalSocialActivityCounts?.numLikes || 0;
    const time   = el.createdTime ? new Date(el.createdTime).toISOString() : null;
    if (text) comments.push({ author, text: text.trim(), likes, time });
  }
  return comments;
}

// ============================================================
// Data extraction helpers
// ============================================================

function extractAuthorName(actor) {
  return (
    actor?.name?.text ||
    actor?.title?.text ||
    actor?.miniProfile?.firstName + ' ' + actor?.miniProfile?.lastName ||
    'Unknown'
  ).trim().replace(/undefined/g, '').trim() || 'Unknown';
}

function extractPostData(body, urn) {
  const update      = body?.value || body?.data || body;
  const actor       = update?.actor || {};
  const commentary  = update?.commentary || update?.specificContent?.['com.linkedin.ugc.ShareContent'] || {};
  const text        = commentary?.text?.text || commentary?.shareCommentary?.text || update?.message?.text || '';
  const social      = update?.socialDetail?.totalSocialActivityCounts || update?.socialDetail || {};
  const likes       = social?.numLikes   || social?.numReactions || 0;
  const comments    = social?.numComments || 0;
  const shares      = social?.numShares   || 0;
  const created     = update?.actor?.subDescription?.text || '';
  const authorName  = extractAuthorName(actor);

  const fullText          = `${authorName} ${text}`.toLowerCase();
  const mentionedAgencies = TRACKED_AGENCIES.filter(a => fullText.includes(a.toLowerCase()));

  return { urn, author: authorName, text: text.trim(), likes, comments, shares, created, mentionedAgencies, url: urnToUrl(urn) };
}

function urnToUrl(urn) {
  return `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}`;
}

// ============================================================
// Main scraping flow
// ============================================================

async function scrapeLinkedIn() {
  console.log('='.repeat(70));
  console.log('  LinkedIn Scraper — Swedish Ad Industry');
  console.log('='.repeat(70));
  console.log();
  console.log(`  Base keywords    (${SEARCH_KEYWORDS.length}): ${SEARCH_KEYWORDS.join(', ')}`);
  if (EXTRA_KEYWORDS.length > 0) {
    console.log(`  Extra keywords   (${EXTRA_KEYWORDS.length}): ${EXTRA_KEYWORDS.join(', ')}  [tilfälliga]`);
  }
  console.log(`  Total to search       : ${ACTIVE_KEYWORDS.length} terms`);
  console.log();

  const allPosts = [];
  const seenUrns = new Set();

  for (const keyword of ACTIVE_KEYWORDS) {
    const isExtra = EXTRA_KEYWORDS.includes(keyword);
    const label   = isExtra ? `"${keyword}" [extra]` : `"${keyword}"`;
    process.stdout.write(`  Searching: ${label}...`);

    let urns;
    try {
      urns = await searchPosts(keyword);
    } catch (err) {
      console.log(` FAILED: ${err.message}`);
      if (err.message.includes('session expired')) {
        console.error('\n  LinkedIn session expired. Re-copy your cookies and try again.');
        process.exit(1);
      }
      continue;
    }

    const fresh = urns.filter(u => !seenUrns.has(u));
    console.log(` ${fresh.length} new posts found`);
    fresh.forEach(u => seenUrns.add(u));

    for (const urn of fresh) {
      await sleep(800);

      let post;
      try {
        post = await fetchPost(urn);
      } catch (err) {
        console.log(`    [SKIP] ${urn}: ${err.message}`);
        continue;
      }

      if (!post) continue;

      if (post.comments > 0) {
        try {
          await sleep(500);
          post.commentsList = await fetchComments(urn);
        } catch {
          post.commentsList = [];
        }
      } else {
        post.commentsList = [];
      }

      allPosts.push({ ...post, matchedKeyword: keyword, isExtraKeyword: isExtra });
      console.log(`    ✓ ${post.author.substring(0, 40).padEnd(40)} 👍 ${String(post.likes).padStart(4)}  💬 ${String(post.comments).padStart(3)}`);
    }
  }

  return allPosts;
}

// ============================================================
// Report & output
// ============================================================

function printReport(posts) {
  console.log();
  console.log('='.repeat(70));
  console.log('  REPORT');
  console.log('='.repeat(70));
  console.log(`  Total posts collected : ${posts.length}`);

  const withComments = posts.filter(p => p.commentsList.length > 0);
  console.log(`  Posts with comments   : ${withComments.length}`);

  const agencyPosts = posts.filter(p => p.mentionedAgencies.length > 0);
  console.log(`  Agency-related posts  : ${agencyPosts.length}`);

  if (EXTRA_KEYWORDS.length > 0) {
    const extraPosts = posts.filter(p => p.isExtraKeyword);
    console.log(`  Posts via extra terms : ${extraPosts.length}  (${EXTRA_KEYWORDS.join(', ')})`);
  }

  if (agencyPosts.length > 0) {
    console.log();
    console.log('  Agency mentions:');
    const counts = {};
    for (const p of agencyPosts) {
      for (const a of p.mentionedAgencies) counts[a] = (counts[a] || 0) + 1;
    }
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([agency, n]) => console.log(`    ${agency.padEnd(30)} ${n} post(s)`));
  }

  if (withComments.length > 0) {
    console.log();
    console.log('  Top commented posts:');
    withComments
      .sort((a, b) => b.comments - a.comments)
      .slice(0, 5)
      .forEach(p => {
        console.log(`    💬 ${p.comments} | 👍 ${p.likes} | ${p.author.substring(0, 35)}`);
        console.log(`       ${p.text.substring(0, 100).replace(/\n/g, ' ')}...`);
        console.log(`       ${p.url}`);
        if (p.commentsList.length > 0) {
          console.log('       Top comments:');
          p.commentsList.slice(0, 3).forEach(c => {
            console.log(`         • ${c.author}: ${c.text.substring(0, 80).replace(/\n/g, ' ')}`);
          });
        }
      });
  }
}

async function main() {
  const runDate = new Date().toISOString().split('T')[0];

  let posts;
  try {
    posts = await scrapeLinkedIn();
  } catch (err) {
    console.error('Scraper error:', err.message);
    process.exit(1);
  }

  printReport(posts);

  const report = {
    runDate,
    totalPosts: posts.length,
    baseKeywords: SEARCH_KEYWORDS,
    extraKeywords: EXTRA_KEYWORDS,
    activeKeywords: ACTIVE_KEYWORDS,
    trackedAgencies: TRACKED_AGENCIES,
    posts
  };

  const outPath = path.join(__dirname, `linkedin-report-${runDate}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log();
  console.log(`  Full report saved: ${outPath}`);
  console.log('='.repeat(70));
}

main();
