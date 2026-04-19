const express = require('express');
const path    = require('path');
const fs      = require('fs');
const https   = require('https');
const { scrapeLinkedIn, BASE_KEYWORDS, buildHeaders, buildSearchUrls } = require('./scraper');

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

// Debug: shows raw LinkedIn API response for each search URL variant
app.get('/debug', (req, res) => {
  const liAt       = process.env.LINKEDIN_LI_AT;
  const jsessionid = process.env.LINKEDIN_JSESSIONID;
  if (!liAt || !jsessionid) return res.json({ error: 'Cookies saknas' });

  const sessionToken = jsessionid.replace(/^"|"$/g, '');
  const keyword      = req.query.q || 'reklam';
  const urls         = buildSearchUrls(keyword, 5);
  const results      = [];
  let idx = 0;

  function next() {
    if (idx >= urls.length) return res.json({ keyword, results });
    const url = urls[idx++];
    const r = https.request({
      hostname: 'www.linkedin.com',
      path: url,
      method: 'GET',
      headers: buildHeaders(liAt, sessionToken),
      timeout: 15000
    }, (resp) => {
      let data = '';
      resp.on('data', c => data += c);
      resp.on('end', () => {
        results.push({
          url: url.split('?')[0],
          params: url.split('?')[1]?.slice(0, 120),
          status: resp.statusCode,
          preview: data.slice(0, 600)
        });
        next();
      });
    });
    r.on('error', err => { results.push({ url: url.split('?')[0], error: err.message }); next(); });
    r.on('timeout', () => { r.destroy(); results.push({ url, error: 'timeout' }); next(); });
    r.end();
  }
  next();
});

app.post('/scrape', (req, res) => {
  const liAt       = process.env.LINKEDIN_LI_AT;
  const jsessionid = process.env.LINKEDIN_JSESSIONID;
  if (!liAt || !jsessionid) {
    return res.status(500).json({ error: 'LinkedIn-cookies är inte konfigurerade.' });
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
    liAt, jsessionid, extraKeywords,
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
  console.log(`index.html: ${fs.existsSync(path.join(__dirname, 'index.html'))}`);
});
