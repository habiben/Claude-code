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
  helaListan: 'https://www.resume.se/marknadsforing/tavling/byratoppen-2026-hela-listan/',
  categories: [
    { id: 'film',      name: 'Månadens Film',      url: 'https://www.resume.se/manadens-kampanj/manadens-kampanj-film/' },
    { id: 'hantverk',  name: 'Månadens Hantverk',  url: 'https://www.resume.se/manadens-kampanj/manadens-kampanj-hantverk/' },
    { id: 'ide',       name: 'Månadens Idé',       url: 'https://www.resume.se/manadens-kampanj/manadens-kampanj-ide/' },
    { id: 'politik',   name: 'Månadens Politik',   url: 'https://www.resume.se/manadens-kampanj/manadens-kampanj-politik/' },
    { id: 'print',     name: 'Månadens Print',     url: 'https://www.resume.se/manadens-kampanj/manadens-kampanj-print/' },
    { id: 'utomhus',   name: 'Månadens Utomhus',   url: 'https://www.resume.se/manadens-kampanj/manadens-kampanj-utomhus/' }
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

function extractNextData(html) {
  const match = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function stripHtmlTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
function parseByratoppenFromNextData(html) {
  const nextData = extractNextData(html);
  if (!nextData) return [];

  const containers = nextData.props?.containers || [];
  const bodyParts = nextData.props?.bodyParts || [];

  const allParts = [
    ...bodyParts,
    ...containers.flatMap(c => c.bodyParts || [])
  ];

  const leaderboard = [];
  let inTotalt = false;

  for (const part of allParts) {
    if (part.type === 'subheading' && /totalt/i.test(part.text || '')) {
      inTotalt = true;
      continue;
    }
    if (part.type === 'subheading' && inTotalt) break;

    if (part.type === 'paragraph' && part.bodyHtml) {
      const text = stripHtmlTags(part.bodyHtml);
      const match = text.match(/^(\d+)\.\s*(.+?)\s+(\d+)\s*poäng$/);
      if (match) {
        const agencies = match[2].split(/,\s*/);
        const points = parseInt(match[3]);
        for (const agency of agencies) {
          leaderboard.push({ agency: agency.trim(), points });
        }
      }
    }
  }

  if (leaderboard.length === 0) return [];

  leaderboard.sort((a, b) => b.points - a.points);
  let currentRank = 1;
  return leaderboard.map((entry, i) => {
    if (i > 0 && entry.points < leaderboard[i - 1].points) currentRank = i + 1;
    return { rank: currentRank, agency: entry.agency, points: entry.points, wins: 0, podiums: 0 };
  });
}

function parseByratoppen(html) {
  const leaderboard = [];
  const text = stripHtml(html);

  const pattern = /(\d+)\.\s*([A-ZÅÄÖa-zåäöÀ-ɏ][A-ZÅÄÖa-zåäöÀ-ɏ\s&,.'·\-\/()]+?)\s+(\d+)\s*(?:poäng|p(?:\s|$|\d))/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    leaderboard.push({
      agency: match[2].trim(),
      points: parseInt(match[3]) || 0
    });
  }

  leaderboard.sort((a, b) => b.points - a.points);
  let currentRank = 1;
  return leaderboard.map((entry, i) => {
    if (i > 0 && entry.points < leaderboard[i - 1].points) currentRank = i + 1;
    return { rank: currentRank, agency: entry.agency, points: entry.points, wins: 0, podiums: 0 };
  });
}

function parseCategoryTopList(html, categoryName) {
  const nextData = extractNextData(html);
  if (!nextData) return { category: categoryName, topList: [], winners: [], categoryLeaderboard: [] };

  const containers = nextData.props?.containers || [];
  const topList = [];
  const winners = [];
  const categoryLeaderboard = [];

  for (const container of containers) {
    if (container.type !== 'bodypartsinfobox' || !container.bodyParts) continue;
    const title = container.title || '';

    if (/Vinnare/i.test(title)) {
      for (const part of container.bodyParts) {
        if (part.type !== 'paragraph' || !part.bodyHtml) continue;
        const text = stripHtmlTags(part.bodyHtml);
        if (/^kalkon/i.test(text)) continue;

        const rankMatch = text.match(/^(\d+)\.\s*/);
        if (!rankMatch) continue;
        const rank = parseInt(rankMatch[1]);
        const rest = text.slice(rankMatch[0].length);

        let campaignName = '', agency = '', client = '';
        const byraMatch = rest.match(/Byrå:\s*(.+?)(?:\s*Kund:|$)/i);
        const kundMatch = rest.match(/Kund:\s*(.+?)(?:\s*Byrå:|$)/i);

        if (byraMatch) agency = byraMatch[1].trim();
        if (kundMatch) client = kundMatch[1].trim();

        if (agency || client) {
          campaignName = rest.replace(/\s*(?:Byrå|Kund):.*/i, '').replace(/^[""\s]+|[""\s]+$/g, '').trim();
        } else {
          campaignName = rest.trim();
        }

        topList.push({ rank, agency: agency || client || campaignName });
        winners.push({ rank, campaign: campaignName, agency, client });
      }
    }

    if (/Byråtoppen/i.test(title) && !/alla\s+kategorier/i.test(title)) {
      for (const part of container.bodyParts) {
        if (part.type !== 'paragraph' || !part.bodyHtml) continue;
        const text = stripHtmlTags(part.bodyHtml);
        if (/se\s+hela/i.test(text)) continue;
        const entryPattern = /(\d+)\s*\.\s*(.+?)\s+(\d+)\s*poäng/g;
        let entryMatch;
        while ((entryMatch = entryPattern.exec(text)) !== null) {
          const agencies = entryMatch[2].split(/,\s*/);
          const points = parseInt(entryMatch[3]);
          for (const a of agencies) {
            categoryLeaderboard.push({ rank: parseInt(entryMatch[1]), agency: a.trim(), points });
          }
        }
      }
    }
  }

  return { category: categoryName, topList: topList.slice(0, 10), winners, categoryLeaderboard };
}

// Parse the tävlingsschema (competition schedule) from the main page
// Returns an array of rounds: { name, deadline, categories[] }
function parseTavlingsschema(html) {
  const text = stripHtml(html);
  const rounds = [];

  const svMonths = {
    'januari': '01', 'februari': '02', 'mars': '03', 'april': '04',
    'maj': '05', 'juni': '06', 'juli': '07', 'augusti': '08',
    'september': '09', 'oktober': '10', 'november': '11', 'december': '12'
  };

  // Match patterns like "Tävlingsomgång X ... Deadline: DD month ... Aktuell kategori: ..."
  const roundPattern = /Tävlingsomgång\s+([\w\-–åäöÅÄÖ]+(?:\s*[-–]\s*[\w]+)?)\s+.*?Deadline[:\s]*(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)(?:\s+(\d{4}))?\s+.*?Aktuell(?:\s+|)kategori[:\s]*([\s\S]*?)(?=Tävlingsomgång|$)/gi;

  let match;
  while ((match = roundPattern.exec(text)) !== null) {
    const roundName = match[1].trim();
    const day = match[2].padStart(2, '0');
    const monthName = match[3].toLowerCase();
    const month = svMonths[monthName];
    const year = match[4] || new Date().getFullYear().toString();
    const deadline = month ? `${year}-${month}-${day}` : null;

    const categoryStr = match[5].trim();
    const categories = categoryStr.split(/[,]+/).map(c => c.trim().toLowerCase()).filter(c => c.length > 0);

    if (deadline) {
      rounds.push({
        name: roundName,
        deadline,
        deadlineDisplay: `${match[2]} ${match[3]} ${year}`,
        categories
      });
    }
  }

  return rounds;
}

// Given parsed rounds, find the next upcoming deadline for each category
function getNextDeadlines(rounds) {
  const today = new Date().toISOString().split('T')[0];
  const categoryMap = {};

  // Category name normalization
  const normalize = (name) => {
    const map = { 'idé': 'ide', 'ide': 'ide', 'film': 'film', 'hantverk': 'hantverk',
                  'print': 'print', 'utomhus': 'utomhus', 'politik': 'politik' };
    return map[name.toLowerCase()] || name.toLowerCase();
  };

  // Sort rounds by deadline ascending
  const sorted = [...rounds].sort((a, b) => a.deadline.localeCompare(b.deadline));

  for (const round of sorted) {
    if (round.deadline < today) continue;
    for (const cat of round.categories) {
      const id = normalize(cat);
      if (!categoryMap[id]) {
        categoryMap[id] = {
          deadline: round.deadline,
          deadlineInfo: round.name + '-omgången'
        };
      }
    }
  }

  return categoryMap;
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
    schedule: [],
    nextDeadlines: {},
    errors: []
  };

  // 1. Scrape Byråtoppen from "hela listan" article (structured __NEXT_DATA__)
  process.stdout.write('\n  Fetching Byråtoppen (hela listan)...');
  try {
    const { status, body } = await fetchPage(MANADENS_PAGES.helaListan);
    if (status === 200) {
      result.byratoppen = parseByratoppenFromNextData(body);
      if (result.byratoppen.length === 0) {
        result.byratoppen = parseByratoppen(body);
      }
      console.log(` OK (${result.byratoppen.length} agencies found)`);
      if (result.byratoppen.length > 0) {
        console.log('  Leaderboard:');
        result.byratoppen.slice(0, 15).forEach(r => {
          console.log(`    ${String(r.rank).padStart(2)}. ${r.agency.padEnd(35)} ${r.points}p`);
        });
      }
    } else {
      console.log(` HTTP ${status}`);
      result.errors.push({ page: 'helaListan', status });
    }
  } catch (err) {
    console.log(` FAILED: ${err.message}`);
    result.errors.push({ page: 'helaListan', error: err.message });
  }

  // Fallback: try main page sidebar if hela listan failed
  if (result.byratoppen.length === 0) {
    process.stdout.write('  Fallback: Fetching from main page sidebar...');
    try {
      const { status, body } = await fetchPage(MANADENS_PAGES.byratoppen);
      if (status === 200) {
        result.byratoppen = parseByratoppen(body);
        console.log(` OK (${result.byratoppen.length} agencies)`);
      }
    } catch (err) {
      console.log(` FAILED: ${err.message}`);
    }
  }

  // 2. Scrape tävlingsschema from the main page
  process.stdout.write('\n  Fetching Tävlingsschema...');
  try {
    const { status, body } = await fetchPage(MANADENS_PAGES.byratoppen);
    if (status === 200) {
      result.schedule = parseTavlingsschema(body);
      result.nextDeadlines = getNextDeadlines(result.schedule);
      if (result.schedule.length > 0) {
        console.log(` OK (${result.schedule.length} rounds)`);
        for (const [catId, info] of Object.entries(result.nextDeadlines)) {
          console.log(`    ${catId.padEnd(12)} next deadline: ${info.deadline} (${info.deadlineInfo})`);
        }
      } else {
        console.log(' WARNING: Could not parse tävlingsschema.');
      }
    } else {
      console.log(` HTTP ${status}`);
    }
  } catch (err) {
    console.log(` FAILED: ${err.message}`);
  }

  // 3. Scrape each category page (using __NEXT_DATA__ from correct URLs)
  for (const cat of MANADENS_PAGES.categories) {
    process.stdout.write(`  Fetching ${cat.name}...`);
    try {
      const { status, body } = await fetchPage(cat.url);
      if (status === 200) {
        const parsed = parseCategoryTopList(body, cat.name);
        result.categoryTopLists.push({ id: cat.id, ...parsed });
        console.log(` OK (${parsed.topList.length} winners, ${parsed.categoryLeaderboard.length} in byråtoppen)`);
        if (parsed.topList.length > 0) {
          parsed.topList.slice(0, 3).forEach(e => {
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

  // 4. Enrich leaderboard with win/podium counts from category data
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

  let leaderboardUpdated = false;

  // Build new leaderboard if we scraped byråtoppen
  if (manadensResult.byratoppen.length > 0) {
    // Parse existing leaderboard from data.js for merging
    const existingMatch = content.match(/leaderboard:\s*\[([\s\S]*?)\n\s*\]/);
    let existingEntries = [];
    if (existingMatch) {
      const entryPattern = /rank:\s*(\d+),\s*agency:\s*"([^"]+)",\s*points:\s*(\d+),\s*wins:\s*(\d+),\s*podiums:\s*(\d+)/g;
      let m;
      while ((m = entryPattern.exec(existingMatch[1])) !== null) {
        existingEntries.push({
          rank: parseInt(m[1]), agency: m[2], points: parseInt(m[3]),
          wins: parseInt(m[4]), podiums: parseInt(m[5])
        });
      }
    }

    let finalEntries;
    const scraped = manadensResult.byratoppen;

    if (scraped.length >= 10 || existingEntries.length === 0) {
      // Enough scraped entries to fully replace
      finalEntries = scraped;
    } else {
      // Merge: update existing entries with scraped points, keep unscraped entries
      console.log(`\n  Merging ${scraped.length} scraped entries with ${existingEntries.length} existing entries`);
      const scrapedMap = new Map(scraped.map(s => [s.agency.toLowerCase(), s]));
      const merged = new Map();

      // Add/update from scraped data
      for (const s of scraped) {
        merged.set(s.agency.toLowerCase(), { ...s });
      }

      // Keep existing entries not found in scraped data
      for (const e of existingEntries) {
        const key = e.agency.toLowerCase();
        if (!merged.has(key)) {
          merged.set(key, { ...e });
        }
      }

      // Sort by points descending and re-rank
      finalEntries = [...merged.values()].sort((a, b) => b.points - a.points);
      let currentRank = 1;
      for (let i = 0; i < finalEntries.length; i++) {
        if (i > 0 && finalEntries[i].points < finalEntries[i - 1].points) {
          currentRank = i + 1;
        }
        finalEntries[i].rank = currentRank;
      }
    }

    const leaderboardEntries = finalEntries.slice(0, 20).map(r => {
      const agency = r.agency.replace(/"/g, '\\"');
      return `    { rank: ${r.rank}, agency: "${agency}", points: ${r.points}, wins: ${r.wins}, podiums: ${r.podiums} }`;
    });

    const newLeaderboard = `leaderboard: [\n${leaderboardEntries.join(',\n')}\n  ]`;

    const leaderboardRegex = /leaderboard:\s*\[[\s\S]*?\n\s*\]/;
    if (leaderboardRegex.test(content)) {
      content = content.replace(leaderboardRegex, newLeaderboard);
      leaderboardUpdated = true;
    } else {
      console.log('\n  WARNING: Could not find leaderboard array in data.js');
    }
  }

  // Even without fresh byråtoppen, update wins/podiums from category data
  if (!leaderboardUpdated && manadensResult.categoryTopLists && manadensResult.categoryTopLists.length > 0) {
    console.log('\n  Updating wins/podiums from category data (leaderboard not scraped):');
    const agencyStats = {};
    for (const cat of manadensResult.categoryTopLists) {
      for (const entry of cat.topList) {
        if (!agencyStats[entry.agency]) {
          agencyStats[entry.agency] = { wins: 0, podiums: 0 };
        }
        if (entry.rank === 1) agencyStats[entry.agency].wins++;
        if (entry.rank <= 3) agencyStats[entry.agency].podiums++;
      }
    }

    for (const [agency, stats] of Object.entries(agencyStats)) {
      const escaped = agency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const winsRegex = new RegExp(`(agency:\\s*"${escaped}"[^}]*wins:\\s*)\\d+`);
      const podiumsRegex = new RegExp(`(agency:\\s*"${escaped}"[^}]*podiums:\\s*)\\d+`);
      if (winsRegex.test(content)) {
        content = content.replace(winsRegex, `$1${stats.wins}`);
        content = content.replace(podiumsRegex, `$1${stats.podiums}`);
        console.log(`    ${agency}: ${stats.wins} wins, ${stats.podiums} podiums`);
      }
    }
  }

  // Update category deadlines from tävlingsschema
  if (manadensResult.nextDeadlines && Object.keys(manadensResult.nextDeadlines).length > 0) {
    console.log('\n  Updating category deadlines from tävlingsschema:');
    for (const [catId, info] of Object.entries(manadensResult.nextDeadlines)) {
      const deadlineRegex = new RegExp(
        `(id:\\s*"${catId}"[\\s\\S]*?deadlineInfo:\\s*")([^"]*)(")`,
      );
      const nextDeadlineRegex = new RegExp(
        `(id:\\s*"${catId}"[\\s\\S]*?nextDeadline:\\s*")([^"]*)(")`,
      );
      if (deadlineRegex.test(content)) {
        content = content.replace(deadlineRegex, `$1${info.deadlineInfo}$3`);
        content = content.replace(nextDeadlineRegex, `$1${info.deadline}$3`);
        console.log(`    ${catId}: ${info.deadline} (${info.deadlineInfo})`);
      }
    }
  } else if (manadensResult.categoryTopLists && manadensResult.categoryTopLists.length > 0) {
    // Fallback: use deadlines from individual category pages
    for (const cat of manadensResult.categoryTopLists) {
      if (cat.deadline) {
        const deadlineRegex = new RegExp(
          `(id:\\s*"${cat.id}"[\\s\\S]*?nextDeadline:\\s*")([^"]*)(")`,
        );
        if (deadlineRegex.test(content)) {
          content = content.replace(deadlineRegex, `$1${cat.deadline}$3`);
          console.log(`  Updated ${cat.id} deadline: ${cat.deadline}`);
        }
      }
    }
  }

  // Update category topList arrays from scraped data
  if (manadensResult.categoryTopLists && manadensResult.categoryTopLists.length > 0) {
    console.log('\n  Updating category top lists:');
    for (const cat of manadensResult.categoryTopLists) {
      const topListRegex = new RegExp(
        `(id:\\s*"${cat.id}"[\\s\\S]*?topList:\\s*)\\[[^\\]]*\\]`
      );
      if (topListRegex.test(content)) {
        if (cat.topList && cat.topList.length > 0) {
          const entries = cat.topList.map(e => {
            const agency = e.agency.replace(/"/g, '\\"');
            return `{ rank: ${e.rank}, agency: "${agency}" }`;
          });
          content = content.replace(topListRegex, `$1[${entries.join(', ')}]`);
          console.log(`    ${cat.id}: ${cat.topList.length} entries`);
        } else {
          content = content.replace(topListRegex, `$1[]`);
          console.log(`    ${cat.id}: cleared (0 entries found)`);
        }
      }
    }
  }

  // Update lastUpdated date
  const today = new Date().toISOString().split('T')[0];
  content = content.replace(
    /lastUpdated:\s*["'][^"']+["']/,
    `lastUpdated: "${today}"`
  );

  fs.writeFileSync(dataPath, content, 'utf-8');
  console.log(`\n  SUCCESS: data.js updated (${today}). Leaderboard: ${leaderboardUpdated ? manadensResult.byratoppen.length + ' entries' : 'kept existing'}. Categories: ${manadensResult.categoryTopLists.length} scraped.`);
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
