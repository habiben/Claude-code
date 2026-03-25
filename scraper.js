#!/usr/bin/env node
// Monthly Ad Awards Deadline & Fee Scraper
// Run via: node scraper.js
// Schedule monthly with cron: 0 9 1 * * cd /path/to/project && node scraper.js
//
// This script checks official award websites for deadline and pricing changes,
// then outputs a report. It does NOT auto-modify data.js — review changes manually.

const https = require('https');
const http = require('http');

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

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'AdAwardsTracker-Scraper/1.0 (monthly check)',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchPage(res.headers.location).then(resolve).catch(reject);
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

// Date pattern detection: look for date-like strings
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

// Currency/fee detection
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

async function main() {
  const runDate = new Date().toISOString().split('T')[0];
  console.log('='.repeat(70));
  console.log(`  Ad Awards Monthly Scraper — ${runDate}`);
  console.log('='.repeat(70));
  console.log();

  const results = [];

  for (const source of SOURCES) {
    process.stdout.write(`Checking ${source.name}...`);
    try {
      const result = await checkSource(source);
      results.push(result);
      const pageOk = result.pages.filter(p => !p.error).length;
      console.log(` OK (${pageOk}/${result.pages.length} pages, ${result.allDates.length} dates, ${result.allFees.length} fees found)`);
    } catch (err) {
      console.log(` FAILED: ${err.message}`);
      results.push({ id: source.id, name: source.name, error: err.message });
    }
  }

  console.log();
  console.log('-'.repeat(70));
  console.log('  DETAILED REPORT');
  console.log('-'.repeat(70));

  for (const r of results) {
    console.log();
    console.log(`--- ${r.name} (${r.id}) ---`);

    if (r.error) {
      console.log(`  ERROR: ${r.error}`);
      continue;
    }

    for (const page of r.pages) {
      if (page.error) {
        console.log(`  [FAIL] ${page.url}: ${page.error}`);
      } else {
        console.log(`  [${page.status}] ${page.url} (${page.textLength} chars)`);
      }
    }

    if (r.allDates.length > 0) {
      console.log(`  Dates found: ${r.allDates.join(', ')}`);
    }

    if (r.allFees.length > 0) {
      console.log(`  Fees found: ${r.allFees.join(', ')}`);
    }

    if (r.snippets.length > 0) {
      console.log(`  Relevant snippets:`);
      r.snippets.slice(0, 8).forEach(s => {
        console.log(`    • ${s.substring(0, 120)}${s.length > 120 ? '...' : ''}`);
      });
    }
  }

  console.log();
  console.log('='.repeat(70));
  console.log('  ACTION ITEMS: Review dates and fees above against data.js');
  console.log('  If changes detected, update data.js manually and commit.');
  console.log('='.repeat(70));

  // Write JSON report for automation
  const reportPath = `scraper-report-${runDate}.json`;
  require('fs').writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nJSON report saved to: ${reportPath}`);
}

main().catch(err => {
  console.error('Scraper failed:', err);
  process.exit(1);
});
