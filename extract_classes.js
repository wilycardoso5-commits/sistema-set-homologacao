const fs = require('fs');
const content = fs.readFileSync('telausuarios.html', 'utf8');
const regex = /class="([^"]+)"/g;
let match;
const classes = new Set();
while ((match = regex.exec(content)) !== null) {
    match[1].split(' ').forEach(c => {
        if (c) classes.add(c);
    });
}
fs.writeFileSync('classes.txt', Array.from(classes).sort().join('\n'));
