const https = require('https');
require('dotenv').config();

const url = (process.env.N8N_URL || 'https://n8n.refrisol.com.br').replace('https://', '');
const apiKey = process.env.N8N_API_KEY;

async function listWorkflows() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url,
      path: '/api/v1/workflows?limit=200',
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Accept': 'application/json'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        const workflows = result.data || result;

        // Group by name
        const byName = {};
        workflows.forEach(w => {
          if (!byName[w.name]) byName[w.name] = [];
          byName[w.name].push({ id: w.id, createdAt: w.createdAt });
        });

        // Find duplicates
        const duplicates = Object.entries(byName)
          .filter(([name, wfs]) => wfs.length > 1)
          .map(([name, wfs]) => ({ name, count: wfs.length, workflows: wfs }));

        console.log('Total workflows:', workflows.length);
        console.log('Duplicated workflows:', duplicates.length);
        console.log('\nDuplicates:');
        duplicates.forEach(d => {
          console.log(`\n${d.name} (${d.count} copies):`);
          d.workflows.forEach(w => console.log(`  - ID: ${w.id}, Created: ${w.createdAt}`));
        });

        resolve(duplicates);
      });
    }).on('error', reject);
  });
}

listWorkflows().catch(console.error);
