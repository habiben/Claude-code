const express = require('express');
const path    = require('path');
const fs      = require('fs');
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
  console.log(`__dirname: ${__dirname}`);
  console.log(`index.html finns: ${fs.existsSync(path.join(__dirname, 'index.html'))}`);
});
