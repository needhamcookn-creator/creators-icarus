import fs from 'fs';

const css = fs.readFileSync('icarus_base.css', 'utf8');

// Extract :root CSS variables
const rootMatch = css.match(/:root\{([^}]+)\}/);
if (rootMatch) {
  const vars = rootMatch[1]
    .split(';')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => {
      const [name, ...rest] = v.split(':');
      return { name: name.trim(), value: rest.join(':').trim() };
    });

  const interesting = vars.filter(
    (v) =>
      v.name.includes('color') ||
      v.name.includes('font') ||
      v.name.includes('heading') ||
      v.name.includes('body') ||
      v.name.includes('background') ||
      v.name.includes('button') ||
      v.name.includes('radius') ||
      v.name.includes('spacing')
  );

  console.log('Key CSS variables:');
  for (const v of interesting) {
    console.log(`  ${v.name}: ${v.value}`);
  }
}

// Extract font-family rules
const fontRules = [...css.matchAll(/font-family:\s*([^;}{]+)/g)]
  .map((m) => m[1].trim())
  .filter((v) => v && !v.includes('var('));
console.log('\nFont families:', [...new Set(fontRules)].slice(0, 20));

// Extract colors
const hexColors = [...css.matchAll(/#(?:[0-9a-fA-F]{3}){1,2}\b/g)].map((m) => m[0].toLowerCase());
console.log('\nHex colors:', [...new Set(hexColors)].sort());
