#!/usr/bin/env node
// Monthly Ad Awards Deadline & Fee Scraper + Månadens Kampanj Updater
// Run via: node scraper.js
// Schedule monthly with cron: 0 9 1 * * cd /path/to/project && node scraper.js
//
// This script:
// 1. Checks official award websites for deadline and pricing changes
// 2. Scrapes resume.se/manadens-kampanj for byråtoppen + category top lists
// 3. Auto-updates data.js with fresh Månadens Kampanj leaderboard data
// 4. Outputs a report for manual review of deadline/fee changes

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================================
// PART 1: Award Sources for deadline/fee monitoring
// ============================================================

const SOURCES = [
  {
    id: 'cannes-lions',
    name: 'Cannes Lions',
    urls: [
      'https://www.canneslions.com/awards/awards-support/dates-and-fees'
    ],
    keywords: ['deadline', 'fee', 'date', 'entry', 'late', 'price', 'submit']
  },
  {
    id: 'dandad',
    name: 'D&AD Awards',
    urls: [
      'https://www.dandad.org/awards/d-ad-awards/'
    ],
    keywords: ['deadline', 'fee', 'early bird', 'standard', 'extended', 'price']
  },
  {
    id: 'one-show',
    name: 'The One Show',
    urls: [
      'https://oneshow.org/dates/',
      'https://oneshow.org/fees/'
    ],
    keywords: ['deadline', 'fee', 'super early', 'regular', 'final', 'extended']
  },
  {
    id: 'clio-awards',
    name: 'Clio Awards',
    urls: [
      'https://clios.com/the-clio-awards/entry-information/key-dates/',
      'https://clios.com/the-clio-awards/entry-information/entry-fees/'
    ],
    keywords: ['deadline', 'fee', 'entry', 'campaign', 'student']
  },
  {
    id: 'lia',
    name: 'London International Awards',
    urls: [
      'https://www.liaawards.com/enter/entry_fees/'
    ],
    keywords: ['deadline', 'fee', 'early bird', 'standard', 'full price']
  },
  {
    id: 'effie-awards',
    name: 'Effie Awards',
    urls: [
      'https://effie.org/partners/united-states/entry-details/'
    ],
    keywords: ['deadline', 'fee', 'entry', 'extension']
  },
  {
    id: 'adc-awards',
    name: 'ADC Awards',
    urls: [
      'https://adcawards.org/dates/',
      'https://adcawards.org/fees/'
    ],
    keywords: ['deadline', 'fee', 'regular', 'extended', 'final']
  },
  {
    id: 'webby-awards',
    name: 'Webby Awards',
    urls: [
      'https://www.webbyawards.com/eligibility-and-guidelines/'
    ],
    keywords: ['deadline', 'fee', 'entry', 'submit']
  },
  {
    id: 'andy-awards',
    name: 'ANDY Awards',
    urls: [
      'https://www.andyawards.com/enter-now/'
    ],
    keywords: ['deadline', 'fee', 'early', 'final', 'extended', 'single', 'campaign']
  },
  {
    id: 'guldagget',
    name: 'Guldägget',
    urls: [
      'https://guldagget.se/tavla/inlamning/',
      'https://guldagget.se/tavla/tavlingsinformation/'
    ],
    keywords: ['deadline', 'avgift', 'anmälan', 'inlämning', 'pris', 'datum']
  },
  {
    id: '100-wattaren',
    name: '100-wattaren',
    urls: [
      'https://100wattaren.se/'
    ],
    keywords: ['deadline', 'avgift', 'anmälan', 'inlämning', 'datum', 'tävling']
  }
];

// ============================================================
// PART 2: Månadens Kampanj — Resume.se pages to scrape
// ============================================================

const MANADENS_PAGES = {
  byratoppen: 'https://www.resume.se/manadens-kampanj/',
  categories: [
    { id: 'film',     name: 'Månadens Film',    url: 'https://www.resume.se/manadens-kampanj/film/' },
    { id: 'print',    name: 'Månadens Print',   url: 'https://www.resume.se/manadens-kampanj/print/' },
    { id: 'utomhus',  name: 'Månadens Utomhus', url: 'https://www.resume.se/manadens-kampanj/utomhus/' },
    { id: 'design',   name: 'Månadens Design',  url: 'https://www.resume.se/manadens-kampanj/design/' },
    { id: 'ide',      name: 'Månadens Idé',     url: 'https://www.resume.se/manadens-kampanj/ide/' },
    { id: 'content',  name: 'Månadens Content', url: 'https://www.resume.se/manadens-kampanj/content/' },
    { id: 'pr',       name: 'Månadens PR',      url: 'https://www.resume.se/manadens-kampanj/pr/' },
    { id: 'digital',  name: 'Månadens Digital', url: 'https://www.resume.se/manadens-kampanj/digital/' },
    { id: 'audio',    name: 'Månadens Audio',   url: 'https://www.resume.se/manadens-kampanj/audio/' }
  ]
};

// ============================================================
// Shared utilities
// ============================================================

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8'
      },
      timeout: 20000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirect = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        fetchPage(redirect).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&aring;/gi, 'å')
    .replace(/&auml;/gi, 'ä')
    .replace(/&ouml;/gi, 'ö')
    .replace(/&Aring;/gi, 'Å')
    .replace(/&Auml;/gi, 'Ä')
    .replace(/&Ouml;/gi, 'Ö')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractRelevantSnippets(text, keywords) {
  const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
  const matches = [];

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        matches.push(sentence.trim());
        break;
      }
    }
  }

  return matches.slice(0, 20);
}

function findDates(text) {
  const patterns = [
    /\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/gi,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b/gi,
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
    /\b\d{1,2}\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+\d{4}\b/gi
  ];

  const dates = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      dates.push(match[0]);
    }
  }
  return [...new Set(dates)];
}

function findFees(text) {
  const patterns = [
    /[€$£]\s?[\d,]+(?:\.\d{2})?(?:\s?[-–]\s?[€$£]?\s?[\d,]+(?:\.\d{2})?)?/g,
    /[\d,]+\s?(?:kr|SEK|SGD|USD|EUR|GBP)(?:\s?[-–]\s?[\d,]+\s?(?:kr|SEK|SGD|USD|EUR|GBP)?)?/gi,
    /\b\d{1,2}\s?\d{3}\s?kr\b/gi
  ];

  const fees = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      fees.push(match[0]);
    }
  }
  return [...new Set(fees)];
}

// ============================================================
// PART 1 Logic: Check award sources for changes
// ============================================================

async function checkSource(source) {
  const result = {
    id: source.id,
    name: source.name,
    checked: new Date().toISOString(),
    pages: [],
    allDates: [],
    allFees: [],
    snippets: []
  };

  for (const url of source.urls) {
    try {
      const { status, body } = await fetchPage(url);
      const text = stripHtml(body);
      const dates = findDates(text);
      const fees = findFees(text);
      const snippets = extractRelevantSnippets(text, source.keywords);

      result.pages.push({ url, status, textLength: text.length });
      result.allDates.push(...dates);
      result.allFees.push(...fees);
      result.snippets.push(...snippets);
    } catch (err) {
      result.pages.push({ url, error: err.message });
    }
  }

  result.allDates = [...new Set(result.allDates)];
  result.allFees = [...new Set(result.allFees)];

  return result;
}

// ============================================================
// PART 2 Logic: Scrape Månadens Kampanj from resume.se
// ============================================================

// Parse the byråtoppen leaderboard from HTML
// Looks for patterns like ranked lists of agency names with point numbers
function parseByratoppen(html) {
  const leaderboard = [];

  // Try to find a structured list/table with agency names and points
  // Pattern 1: Look for <li> or <tr> elements with agency names and numbers
  const tableRowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const rows = html.match(tableRowPattern) || [];

  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    if (cells.length >= 2) {
      const cellTexts = cells.map(c => stripHtml(c));
      // Look for a row that has a number (rank or points) and a name
      const numCell = cellTexts.find(t => /^\d+$/.test(t.trim()));
      const nameCell = cellTexts.find(t => /^[A-ZÅÄÖa-zåäö]/.test(t.trim()) && t.trim().length > 2);
      if (numCell && nameCell) {
        const pointsCell = cellTexts.filter(t => /^\d+$/.test(t.trim()));
        leaderboard.push({
          agency: nameCell.trim(),
          points: parseInt(pointsCell[pointsCell.length - 1]) || 0
        });
      }
    }
  }

  // Pattern 2: Look for ordered list items
  if (leaderboard.length === 0) {
    const listPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    const items = html.match(listPattern) || [];
    for (const item of items) {
      const text = stripHtml(item);
      // Match "Agency Name – 42p" or "Agency Name 42 poäng" patterns
      const match = text.match(/^(.+?)\s*[-–—]\s*(\d+)\s*(?:p|poäng)?$/i)
        || text.match(/^(\d+)\.\s*(.+?)\s+(\d+)\s*(?:p|poäng)?$/i);
      if (match) {
        leaderboard.push({
          agency: (match[2] || match[1]).trim(),
          points: parseInt(match[3] || match[2]) || 0
        });
      }
    }
  }

  // Pattern 3: Plain text with numbered list
  if (leaderboard.length === 0) {
    const text = stripHtml(html);
    const lines = text.split(/(?:\d+[\.\)]\s)/);
    for (const line of lines) {
      const match = line.trim().match(/^(.+?)\s*[-–—,]\s*(\d+)\s*(?:p|poäng)/i);
      if (match) {
        leaderboard.push({
          agency: match[1].trim(),
          points: parseInt(match[2]) || 0
        });
      }
    }
  }

  // Sort by points descending and add ranks
  leaderboard.sort((a, b) => b.points - a.points);
  return leaderboard.map((entry, i) => ({
    rank: i + 1,
    agency: entry.agency,
    points: entry.points,
    wins: 0,   // Will be enriched from category data
    podiums: 0
  }));
}

// Parse a category page for top list
function parseCategoryTopList(html, categoryName) {
  const results = [];
  const text = stripHtml(html);

  // Look for ranked entries: "1. Agency Name" or "Agency Name – Winner"
  const patterns = [
    /(\d+)\.\s*([A-ZÅÄÖa-zåäö][^\d\n]{2,50})/g,
    /(?:Vinnare|1:a|2:a|3:a|Winner|First|Second|Third)[:\s]+([A-ZÅÄÖa-zåäö][^\n]{2,50})/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const rank = match[1] ? parseInt(match[1]) : results.length + 1;
      const agency = (match[2] || match[1]).trim()
        .replace(/\s*[-–].*$/, '') // Remove trailing description
        .replace(/\s*\d+\s*(?:p|poäng).*$/, ''); // Remove points
      if (agency.length > 2 && agency.length < 60) {
        results.push({ rank, agency });
      }
    }
    if (results.length > 0) break;
  }

  return { category: categoryName, topList: results.slice(0, 10) };
}

async function scrapeManadens() {
  console.log();
  console.log('='.repeat(70));
  console.log('  Månadens Kampanj — Scraping resume.se');
  console.log('='.repeat(70));

  const result = {
    scraped: new Date().toISOString(),
    byratoppen: [],
    categoryTopLists: [],
    errors: []
  };

  // 1. Scrape Byråtoppen (main leaderboard)
  process.stdout.write('\n  Fetching Byråtoppen...');
  try {
    const { status, body } = await fetchPage(MANADENS_PAGES.byratoppen);
    if (status === 200) {
      result.byratoppen = parseByratoppen(body);
      console.log(` OK (${result.byratoppen.length} agencies found)`);

      if (result.byratoppen.length > 0) {
        console.log('  Leaderboard:');
        result.byratoppen.slice(0, 15).forEach(r => {
          console.log(`    ${String(r.rank).padStart(2)}. ${r.agency.padEnd(35)} ${r.points}p`);
        });
      } else {
        console.log('  WARNING: Could not parse leaderboard. Page may require auth or structure changed.');
        console.log('  Raw text preview:', stripHtml(body).substring(0, 500));
      }
    } else {
      console.log(` HTTP ${status}`);
      result.errors.push({ page: 'byratoppen', status });
    }
  } catch (err) {
    console.log(` FAILED: ${err.message}`);
    result.errors.push({ page: 'byratoppen', error: err.message });
  }

  // 2. Scrape each category page
  for (const cat of MANADENS_PAGES.categories) {
    process.stdout.write(`  Fetching ${cat.name}...`);
    try {
      const { status, body } = await fetchPage(cat.url);
      if (status === 200) {
        const topList = parseCategoryTopList(body, cat.name);
        result.categoryTopLists.push({ id: cat.id, ...topList });
        console.log(` OK (${topList.topList.length} entries)`);

        if (topList.topList.length > 0) {
          topList.topList.slice(0, 3).forEach(e => {
            console.log(`    ${e.rank}. ${e.agency}`);
          });
        }
      } else {
        console.log(` HTTP ${status}`);
        result.errors.push({ page: cat.id, status });
      }
    } catch (err) {
      console.log(` FAILED: ${err.message}`);
      result.errors.push({ page: cat.id, error: err.message });
    }
  }

  // 3. Enrich leaderboard with win/podium counts from category data
  if (result.byratoppen.length > 0 && result.categoryTopLists.length > 0) {
    const agencyStats = {};
    for (const cat of result.categoryTopLists) {
      for (const entry of cat.topList) {
        if (!agencyStats[entry.agency]) {
          agencyStats[entry.agency] = { wins: 0, podiums: 0 };
        }
        if (entry.rank === 1) agencyStats[entry.agency].wins++;
        if (entry.rank <= 3) agencyStats[entry.agency].podiums++;
      }
    }

    for (const row of result.byratoppen) {
      const stats = agencyStats[row.agency] || { wins: 0, podiums: 0 };
      row.wins = stats.wins;
      row.podiums = stats.podiums;
    }
  }

  return result;
}

// ============================================================
// Auto-update data.js with fresh Månadens data
// ============================================================

function updateDataJs(manadensResult) {
  const dataPath = path.join(__dirname, 'data.js');
  let content = fs.readFileSync(dataPath, 'utf-8');

  if (manadensResult.byratoppen.length === 0) {
    console.log('\n  SKIP: No leaderboard data scraped, data.js not modified.');
    return false;
  }

  // Build new leaderboard array string
  const leaderboardEntries = manadensResult.byratoppen.slice(0, 15).map(r => {
    const agency = r.agency.replace(/'/g, "\\'");
    return `    { rank: ${r.rank}, agency: '${agency}', points: ${r.points}, wins: ${r.wins}, podiums: ${r.podiums} }`;
  });

  const newLeaderboard = `leaderboard: [\n${leaderboardEntries.join(',\n')}\n  ]`;

  // Replace existing leaderboard in data.js
  const leaderboardRegex = /leaderboard:\s*\[[\s\S]*?\n\s*\]/;
  if (leaderboardRegex.test(content)) {
    content = content.replace(leaderboardRegex, newLeaderboard);
  } else {
    console.log('\n  WARNING: Could not find leaderboard array in data.js');
    return false;
  }

  // Update lastUpdated date
  const today = new Date().toISOString().split('T')[0];
  content = content.replace(
    /lastUpdated:\s*["'][^"']+["']/,
    `lastUpdated: "${today}"`
  );

  fs.writeFileSync(dataPath, content, 'utf-8');
  console.log(`\n  SUCCESS: data.js updated with ${manadensResult.byratoppen.length} leaderboard entries (${today})`);
  return true;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const runDate = new Date().toISOString().split('T')[0];
  console.log('='.repeat(70));
  console.log(`  Ad Awards Monthly Scraper — ${runDate}`);
  console.log('='.repeat(70));
  console.log();

  // --- PART 1: Check award deadline/fee sources ---
  console.log('PART 1: Checking award websites for deadline & fee changes');
  console.log('-'.repeat(70));

  const results = [];

  for (const source of SOURCES) {
    process.stdout.write(`  Checking ${source.name}...`);
    try {
      const result = await checkSource(source);
      results.push(result);
      const pageOk = result.pages.filter(p => !p.error).length;
      console.log(` OK (${pageOk}/${result.pages.length} pages, ${result.allDates.length} dates, ${result.allFees.length} fees)`);
    } catch (err) {
      console.log(` FAILED: ${err.message}`);
      results.push({ id: source.id, name: source.name, error: err.message });
    }
  }

  // Detailed report for Part 1
  console.log();
  console.log('-'.repeat(70));
  console.log('  DETAILED DEADLINE & FEE REPORT');
  console.log('-'.repeat(70));

  for (const r of results) {
    console.log();
    console.log(`  --- ${r.name} (${r.id}) ---`);

    if (r.error) {
      console.log(`    ERROR: ${r.error}`);
      continue;
    }

    for (const page of r.pages) {
      if (page.error) {
        console.log(`    [FAIL] ${page.url}: ${page.error}`);
      } else {
        console.log(`    [${page.status}] ${page.url} (${page.textLength} chars)`);
      }
    }

    if (r.allDates.length > 0) {
      console.log(`    Dates found: ${r.allDates.join(', ')}`);
    }

    if (r.allFees.length > 0) {
      console.log(`    Fees found: ${r.allFees.join(', ')}`);
    }

    if (r.snippets.length > 0) {
      console.log(`    Relevant snippets:`);
      r.snippets.slice(0, 5).forEach(s => {
        console.log(`      • ${s.substring(0, 120)}${s.length > 120 ? '...' : ''}`);
      });
    }
  }

  // --- PART 2: Scrape Månadens Kampanj ---
  const manadensResult = await scrapeManadens();

  // Auto-update data.js with fresh leaderboard
  const updated = updateDataJs(manadensResult);

  // --- Save full report ---
  const fullReport = {
    runDate,
    awardSources: results,
    manadensKampanj: manadensResult,
    dataJsUpdated: updated
  };

  const reportPath = path.join(__dirname, `scraper-report-${runDate}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));

  console.log();
  console.log('='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Award sources checked: ${results.length}`);
  console.log(`  Månadens categories scraped: ${manadensResult.categoryTopLists.length}`);
  console.log(`  Byråtoppen entries: ${manadensResult.byratoppen.length}`);
  console.log(`  data.js auto-updated: ${updated ? 'YES' : 'NO (manual update needed)'}`);
  console.log(`  Errors: ${manadensResult.errors.length}`);
  console.log(`  Report saved: ${reportPath}`);
  console.log();
  console.log('  ACTION: Review deadline/fee changes above against data.js.');
  console.log('  Månadens leaderboard is auto-updated. Commit & push if correct.');
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('Scraper failed:', err);
  process.exit(1);
});
