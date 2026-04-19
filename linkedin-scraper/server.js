const express = require('express');
const path    = require('path');
const fs      = require('fs');
const https   = require('https');
const { scrapeLinkedIn, BASE_KEYWORDS } = require('./scraper');

const app  = express();
const jobs = new Map();
let   jobCounter = 0;

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/config', (_req, res) => {
  res.json({ baseKeywords: BASE_KEYWORDS });
});

// Debug endpoint — shows raw LinkedIn API response for a test search
app.get('/debug', (req, res) => {
  const liAt       = process.env.LINKEDIN_LI_AT;
  const jsessionid = process.env.LINKEDIN_JSESSIONID;
  if (!liAt || !jsessionid) return res.json({ error: 'Cookies saknas' });

  const sessionToken = jsessionid.replace(/^"|"$/g, '');
  const keyword      = encodeURIComponent(req.query.q || 'reklam');

  const urls = [
    `/voyager/api/voyagerSearchDashClusters?decorationId=com.linkedin.voyager.dash.deco.search.SearchCluster-2&count=5&q=all&query=(keywords:${keyword},flagshipSearchIntent:SEARCH_SRP,queryParameters:(resultType:List(CONTENT)),includeFiltersInResponse:false)`,
    `/voyager/api/search/blended?keywords=${keyword}&origin=GLOBAL_SEARCH_HEADER&q=all&start=0&count=5&filters=List(resultType-%3ECONTENT)`,
    `/voyager/api/search/blended?keywords=${keyword}&q=all&start=0&count=5`,
  ];

  const results = [];
  let idx = 0;

  function next() {
    if (idx >= urls.length) return res.json({ results });
    const url = urls[idx++];
    const options = {
      hostname: 'www.linkedin.com',
      path: url,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/vnd.linkedin.normalized+json+2.1',
        'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
        'x-li-lang': 'sv_SE',
        'x-li-track': JSON.stringify({ clientVersion: '1.13.14321', mpVersion: '1.13.14321', osName: 'web', timezoneOffset: 2, timezone: 'Europe/Stockholm', deviceFormFactor: 'DESKTOP', mpName: 'voyager-web' }),
        'x-restli-protocol-version': '2.0.0',
        'csrf-token': sessionToken,
        'Cookie': `li_at=${liAt}; JSESSIONID="${sessionToken}"`
      },
      timeout: 15000
    };
    const r = https.request(options, (resp) => {
      let data = '';
      resp.on('data', c => data += c);
      resp.on('end', () => {
        results.push({ url: url.split('?')[0], status: resp.statusCode, preview: data.slice(0, 800) });
        next();
      });
    });
    r.on('error', err => { results.push({ url, error: err.message }); next(); });
    r.on('timeout', () => { r.destroy(); results.push({ url, error: 'timeout' }); next(); });
    r.end();
  }
  next();
});

app.post('/scrape', (req, res) => {
  const liAt       = process.env.LINKEDIN_LI_AT;
  const jsessionid = process.env.LINKEDIN_JSESSIONID;

  if (!liAt || !jsessionid) {
    return res.status(500).json({
      error: 'LinkedIn-cookies är inte konfigurerade. Sätt LINKEDIN_LI_AT och LINKEDIN_JSESSIONID som miljövariabler på servern.'
    });
  }

  const jobId = String(++jobCounter);
  const { extraKeywords = [] } = req.body;

  const job = { id: jobId, status: 'running', events: [], clients: new Set() };
  jobs.set(jobId, job);

  function emit(type, data) {
    const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    job.events.push({ type, data });
    for (const client of job.clients) client.write(payload);
  }

  scrapeLinkedIn({
    liAt,
    jsessionid,
    extraKeywords,
    onProgress: ({ type, ...data }) => {
      if (type === 'post') emit('post', data.post);
      else emit(type, data);
    }
  }).then(result => {
    job.status = 'done';
    emit('done', { totalPosts: result.totalPosts });
    for (const client of job.clients) client.end();
  }).catch(err => {
    job.status = 'error';
    emit('error_msg', { keyword: '', message: err.message });
    for (const client of job.clients) client.end();
  });

  res.json({ jobId });
});

app.get('/stream/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Jobb hittades inte' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  for (const { type, data } of job.events) {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  if (job.status !== 'running') { res.end(); return; }

  job.clients.add(res);
  req.on('close', () => job.clients.delete(res));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`LinkedIn Scraper → port ${PORT}`);
  console.log(`index.html finns: ${fs.existsSync(path.join(__dirname, 'index.html'))}`);
});
