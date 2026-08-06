import fs from 'fs';

const html = fs.readFileSync('icarus_header.html', 'utf8');
const logoMatch = html.match(/<img[^>]*class="header__heading-logo[^"]*"[^>]*src="([^"]+)"/);
console.log('logo src:', logoMatch && logoMatch[1]);

const navItems = [...html.matchAll(/HeaderDrawer-([\w-]+)[\s\S]*?>([^<]+)</g)].map((m) => m[2].trim());
console.log('nav items:', [...new Set(navItems)].slice(0, 20));
