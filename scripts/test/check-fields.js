const fs = require('fs');

const workflow = JSON.parse(fs.readFileSync('workflows/jana/(ADP-CHM-001)_adaptador_chamadas_para_outros_softwares-w4FrEfJ5QussbV3A.json', 'utf8'));

const ACCEPTED = ['name', 'nodes', 'connections', 'settings'];
const extra = Object.keys(workflow).filter(k => !ACCEPTED.includes(k));

console.log('Extra fields:', extra.join(', '));
console.log('\nAll workflow keys:', Object.keys(workflow).join(', '));
