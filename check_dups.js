const fs = require('fs');
const content = fs.readFileSync('src/lib/store.ts', 'utf8');
const match = content.match(/return \{([\s\S]*?)\};/);
if (match) {
    const lines = match[1].split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
    const keys = lines.flatMap(l => l.split(',')).map(k => k.trim().split(':')[0].trim()).filter(k => k);
    const counts = {};
    keys.forEach(k => counts[k] = (counts[k] || 0) + 1);
    const dups = Object.keys(counts).filter(k => counts[k] > 1);
    console.log('Duplicates found:', dups);
} else {
    console.log('Return block not found');
}
