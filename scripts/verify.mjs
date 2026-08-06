import fs from 'fs';

const h = fs.readFileSync('dist/index.html', 'utf8');

const checks = [
  ['Title', /<title>([^<]*)<\/title>/i.test(h)],
  ['Hero H1 contains "fits"', /Turn your fits into/i.test(h)],
  ['Instagram CTA', /Continue with Instagram/.test(h)],
  ['Dashboard section', /Your dashboard, your data/.test(h)],
  ['Analytics card', /Analytics Dashboard/.test(h)],
  ['Auto DM card', /Automated DMs/.test(h)],
  ['Features section', /Everything you need to scale/.test(h)],
  ['How it works section', /How it works/.test(h)],
  ['Footer', /ICARUS\. All rights reserved/.test(h)],
];

for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
}
