import fs from 'fs';

const html = fs.readFileSync('icarus_header.html', 'utf8');
const imgs = html.match(/<img[^>]*>/g) || [];
console.log('Images in header:');
for (const img of imgs.slice(0, 20)) {
  console.log(img);
}

const heading = html.match(/<h1[^>]*class="header__heading[^"]*"[\s\S]*?<\/h1>/i);
console.log('\nHeading block:', heading && heading[0].slice(0, 500));
