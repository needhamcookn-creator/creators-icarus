import fs from 'fs';

const files = fs.readdirSync('dist/_next/static/chunks').filter((f) => f.endsWith('.css'));
for (const f of files) {
  const css = fs.readFileSync('dist/_next/static/chunks/' + f, 'utf8');
  if (css.includes('icarus')) {
    console.log('File:', f);
    const matches = css.match(/--color-icarus-[\w-]+:[^;]+/g);
    if (matches) console.log(matches.slice(0, 20).join('\n'));
    console.log('\nHas bg-icarus-white rule:', /\.bg-icarus-white/.test(css));
    console.log('Has text-icarus-black rule:', /\.text-icarus-black/.test(css));
    break;
  }
}
