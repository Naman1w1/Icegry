const https = require('https');
const fs = require('fs');

const url = 'https://bluorng.com/collections/new-in';
https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('bluorng-new-in.html', data);
    const keywords = ['flashlight', 'torch', 'Advance Filters', 'mobile-facets', 'facets__open', 'icon-flashlight', 'advance-filter', 'advance_filter', 'advance-filters'];
    const log = [`Downloaded ${data.length} bytes\n`];
    for (const kw of keywords) {
      const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      let m, count = 0;
      while ((m = re.exec(data)) !== null) {
        count++;
        if (count <= 3) {
          log.push(`\n=== ${kw} match ${count} at ${m.index} ===`);
          log.push(data.slice(Math.max(0, m.index - 200), m.index + 800));
        }
      }
      if (count) log.push(`\n${kw}: ${count} total`);
    }
    const cssUrls = [...new Set(data.match(/\/cdn\/shop\/t\/\d+\/assets\/[^"'\s>]+\.css[^"'\s>]*/g) || [])];
    log.push(`\n\nCSS URLs (${cssUrls.length}):`);
    cssUrls.forEach(u => log.push('https://bluorng.com' + u.replace(/^https:\/\/bluorng\.com/, '')));
    fs.writeFileSync('fetch_log.txt', log.join('\n'));
    console.log('done', data.length);
  });
}).on('error', e => {
  fs.writeFileSync('fetch_log.txt', 'ERROR: ' + e.message);
});
