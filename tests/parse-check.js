// Syntax-check every inline JS block in index.html and locate U+FFFD markers.
// Usage: node tests/parse-check.js
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
let m, i = 0, bad = 0;
while ((m = re.exec(html))) {
  i++;
  const attrs = m[1] || '';
  if (/application\/ld\+json/i.test(attrs)) {
    try { JSON.parse(m[2].trim()); } catch (e) {
      bad++;
      console.log('JSON-LD #' + i + ' line~' + (html.slice(0, m.index).split('\n').length) + ' FAIL: ' + e.message);
    }
    continue;
  }
  if (/type=/i.test(attrs) && !/text\/javascript/i.test(attrs)) continue;
  const code = m[2].trim();
  if (!code) continue;
  try { new Function(code); } catch (e) {
    bad++;
    console.log('script #' + i + ' line~' + (html.slice(0, m.index).split('\n').length) + ' FAIL: ' + e.message);
  }
}
console.log(i + ' script blocks, ' + bad + ' invalid');
const lines = html.split('\n');
let f = 0;
lines.forEach((ln, n) => {
  let idx = ln.indexOf('\uFFFD');
  while (idx !== -1) { f++; console.log('FFFD line ' + (n + 1) + ': ...' + ln.slice(Math.max(0, idx - 60), idx + 60) + '...'); idx = ln.indexOf('\uFFFD', idx + 1); }
});
console.log('U+FFFD count: ' + f);
