import fs from 'fs';

const html = fs.readFileSync('icarus_full.html', 'utf8');

const css = [...html.matchAll(/href="([^"]+\.css)"|href='([^']+\.css)'/g)]
  .map((m) => m[1] || m[2])
  .filter(Boolean);
console.log('CSS files:', [...new Set(css)].slice(0, 30));

const styles = html.match(/<style[\s\S]*?<\/style>/gi);
console.log('Inline style blocks:', styles ? styles.length : 0);

const tc = html.match(/<meta[^>]*name=["']theme-color["'][^>]*>/i);
console.log('Theme meta:', tc && tc[0]);

const bc = html.match(/<body[^>]*>/i);
console.log('Body tag:', bc && bc[0]);

const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]).filter(Boolean);
console.log('JS files sample:', [...new Set(scripts)].slice(0, 10));

// Extract all hex colors
const hexColors = [...html.matchAll(/#(?:[0-9a-fA-F]{3}){1,2}\b/g)].map((m) => m[0].toLowerCase());
console.log('Hex colors:', [...new Set(hexColors)].sort());

// Extract rgb/rgba
const rgb = [...html.matchAll(/rgba?\([^)]+\)/g)].map((m) => m[0]);
console.log('RGB colors:', [...new Set(rgb)].slice(0, 30));

// Font family mentions
const fonts = [...html.matchAll(/font-family:\s*([^;}{]+)/g)].map((m) => m[1].trim());
console.log('Font families:', [...new Set(fonts)].slice(0, 20));
