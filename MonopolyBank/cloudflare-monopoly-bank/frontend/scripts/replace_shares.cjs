const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');
let totalMatches = 0;

for (const file of files) {
    let code = fs.readFileSync(file, 'utf-8');
    let matches1 = (code.match(/treasuryShares/g) || []).length;
    let matches2 = (code.match(/playerShares/g) || []).length;

    if (matches1 > 0 || matches2 > 0) {
        code = code.replace(/treasuryShares/g, 'dumpedShares');
        code = code.replace(/playerShares/g, 'circulatingShares');
        fs.writeFileSync(file, code);
        totalMatches += (matches1 + matches2);
        console.log(`Replaced in ${file} (treasury x${matches1}, player x${matches2})`);
    }
}
console.log(`Finished. Total replacements: ${totalMatches}`);
