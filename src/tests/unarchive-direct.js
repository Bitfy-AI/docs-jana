#!/usr/bin/env node

/**
 * N8N Direct Unarchive Tool
 * Uses direct API PATCH to set isArchived = false
 */

require('dotenv').config();
const https = require('https');
const http = require('http');

const N8N_URL = process.env.N8N_URL;
const API_KEY = process.env.N8N_API_KEY;

async function makeRequest(method, path, body = null) {
  const url = new URL(path, N8N_URL);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function main() {
  console.log('📦 N8N Direct Unarchive Tool\n');
  console.log(`🎯 Target: ${N8N_URL}\n`);

  try {
    // Get all workflows
    console.log('📊 Fetching workflows...');
    const response = await makeRequest('GET', '/api/v1/workflows');
    const workflows = response.data;

    const archived = workflows.filter(w => w.isArchived === true);
    console.log(`✅ Found ${workflows.length} workflows total`);
    console.log(`📦 Found ${archived.length} archived workflows\n`);

    if (archived.length === 0) {
      console.log('✅ No archived workflows found!');
      return;
    }

    let success = 0;
    let failed = 0;

    for (const wf of archived) {
      try {
        console.log(`🔓 Unarchiving: ${wf.name}`);

        // Try direct PATCH with minimal payload
        await makeRequest('PATCH', `/api/v1/workflows/${wf.id}`, {
          isArchived: false
        });

        success++;
        console.log('   ✅ Success\n');
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
        failed++;
      }
    }

    console.log('━'.repeat(50));
    console.log('\n✅ Complete!');
    console.log(`   Success: ${success}`);
    console.log(`   Failed: ${failed}`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
