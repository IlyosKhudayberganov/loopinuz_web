const fs = require('fs');
const f = 'C:/Users/user/Documents/Downloads/tweb-master/tweb-master/src/lang.ts';
let c = fs.readFileSync(f, 'utf8');

// Replace "Telegram" with "Loopinuz" only in string VALUES, not keys
const lines = c.split('\n');
const result = lines.map((l, i) => {
  if (!l.includes('Telegram')) return l;
  
  // Match: key: 'value with Telegram'
  const m = l.match(/^(\s+'[^']+'\s*:\s*')(.*)/);
  if (!m) return l;
  
  const prefix = m[1];
  let val = m[2];
  
  const lastQuote = val.lastIndexOf("'");
  if (lastQuote === -1) return l;
  
  let content = val.substring(0, lastQuote);
  const suffix = val.substring(lastQuote);
  
  // Only replace in string content, not in URLs
  content = content.replace(/Telegram(?!\.org|\.com|Web\.org)/g, 'Loopinuz');
  
  return prefix + content + suffix;
});

fs.writeFileSync(f, result.join('\n'), 'utf8');
console.log('Done! Replaced Telegram -> Loopinuz in lang.ts');
