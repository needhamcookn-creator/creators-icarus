import fs from 'fs';

const html = fs.readFileSync('icarus_full.html', 'utf8');
const styles = html.match(/<style[\s\S]*?<\/style>/gi) || [];

console.log('Total inline style blocks:', styles.length);
for (let i = 0; i < Math.min(6, styles.length); i++) {
  const s = styles[i].replace(/\s+/g, ' ').slice(0, 400);
  console.log(`\n--- Style block ${i} ---\n${s}`);
}
