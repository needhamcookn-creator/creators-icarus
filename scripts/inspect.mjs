import fs from 'fs';
const html = fs.readFileSync('collections.html', 'utf8');
console.log('len', html.length);
if (html.length < 200) {
  console.log(html);
  process.exit();
}
const title = html.match(/<title>([^<]*)<\/title>/i);
console.log('TITLE:', title && title[1]);
const desc = html.match(/<meta name="description" content="([^"]*)"/i);
console.log('DESC:', desc && desc[1]);
const imgs = [...html.matchAll(/https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|webp|gif)/gi)].map((x) => x[0]);
console.log([...new Set(imgs)].slice(0, 40).join('\n'));
