// Runs Lighthouse against the local static server and saves JSON reports.
// Usage: node tests/lighthouse.js [label]   (default label: run)
const path = require('path');
const fs = require('fs');

process.env.CHROME_PATH = process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const PORT = Number(process.env.PORT) || 4173;
const OUT_DIR = path.join(__dirname, '.lighthouse');

async function main() {
  const label = process.argv[2] || 'run';
  const { start } = require('./serve');
  const server = await start(PORT);
  const chromeLauncher = require('chrome-launcher');
  const lighthouseModule = require('lighthouse');
  const lighthouse = lighthouseModule.default || lighthouseModule;
  const chrome = await chromeLauncher.launch({
    chromePath: process.env.CHROME_PATH,
    chromeFlags: ['--headless=new', '--disable-gpu', '--no-sandbox']
  });
  const urls = [
    ['home', 'http://127.0.0.1:' + PORT + '/index.html'],
    ['product', 'http://127.0.0.1:' + PORT + '/fragrance/afnan-turathi-brown.html']
  ];
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const summary = {};
  try {
    for (const [name, url] of urls) {
      const result = await lighthouse(url, {
        port: chrome.port,
        output: 'json',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        logLevel: 'error'
      });
      const file = path.join(OUT_DIR, label + '-' + name + '.json');
      fs.writeFileSync(file, result.report);
      summary[name] = Object.fromEntries(
        Object.entries(result.lhr.categories).map(([k, v]) => [k, Math.round(v.score * 100)])
      );
      const audits = result.lhr.audits;
      summary[name].fcp = audits['first-contentful-paint'] && audits['first-contentful-paint'].displayValue;
      summary[name].lcp = audits['largest-contentful-paint'] && audits['largest-contentful-paint'].displayValue;
      summary[name].tbt = audits['total-blocking-time'] && audits['total-blocking-time'].displayValue;
      summary[name].cls = audits['cumulative-layout-shift'] && audits['cumulative-layout-shift'].displayValue;
      console.log(name + ': ' + JSON.stringify(summary[name]));
    }
  } finally {
    await chrome.kill();
    server.close();
  }
  fs.writeFileSync(path.join(OUT_DIR, label + '-summary.json'), JSON.stringify(summary, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
