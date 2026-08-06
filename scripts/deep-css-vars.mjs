import fs from 'fs';

const css = fs.readFileSync('icarus_base.css', 'utf8');

// Find all CSS variables defined anywhere, not just :root
const allVars = [...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)]
  .map((m) => ({ name: m[1], value: m[2].trim() }));

const dedup = new Map();
for (const v of allVars) {
  if (!dedup.has(v.name)) dedup.set(v.name, v.value);
}

const interesting = [
  '--color-background',
  '--color-foreground',
  '--color-secondary-button',
  '--color-secondary-button-text',
  '--color-button',
  '--color-button-text',
  '--color-badge-background',
  '--color-badge-border',
  '--color-badge-foreground',
  '--color-link',
  '--gradient-background',
  '--font-body-family',
  '--font-body-style',
  '--font-body-weight',
  '--font-heading-family',
  '--font-heading-style',
  '--font-heading-weight',
  '--font-body-scale',
  '--font-heading-scale',
  '--page-width',
  '--page-width-margin',
  '--spacing-sections-desktop',
  '--spacing-sections-mobile',
  '--media-padding',
  '--product-card-corner-radius',
  '--product-card-border-width',
  '--buttons-radius',
  '--buttons-radius-outset',
  '--buttons-border-width',
  '--inputs-radius',
  '--text-boxes-radius',
];

for (const name of interesting) {
  if (dedup.has(name)) {
    console.log(`${name}: ${dedup.get(name)}`);
  }
}

// Search for any rgb values referencing color-foreground/background
console.log('\n--- RGB references ---');
const rgbRefs = [...css.matchAll(/rgba?\(\s*(var\(--color-[\w-]+\))[^)]*\)/g)].map((m) => m[0]);
console.log([...new Set(rgbRefs)].slice(0, 10));
