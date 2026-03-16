const fs = require('fs');
let code = fs.readFileSync('./src/game_room.ts', 'utf-8');
let beforeLength = code.length;
let matches1 = (code.match(/treasuryShares/g) || []).length;
let matches2 = (code.match(/playerShares/g) || []).length;

code = code.replace(/treasuryShares/g, 'dumpedShares');
code = code.replace(/playerShares/g, 'circulatingShares');
code = code.replace(/TREASURY_SHARES_TOTAL/g, 'DUMPED_SHARES_TOTAL');

fs.writeFileSync('./src/game_room.ts', code);
console.log(`Replaced treasuryShares x${matches1}, playerShares x${matches2}`);
