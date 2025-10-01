const fs = require('fs');
const path = require('path');

const dir = './workflows/jana';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

const allSettingsKeys = new Set();

files.forEach(file => {
  try {
    const workflow = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (workflow.settings && typeof workflow.settings === 'object') {
      Object.keys(workflow.settings).forEach(key => allSettingsKeys.add(key));
    }
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
  }
});

console.log('All settings keys found across workflows:');
console.log([...allSettingsKeys].sort().join('\n'));
