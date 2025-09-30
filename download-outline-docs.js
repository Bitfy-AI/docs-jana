#!/usr/bin/env node

/**
 * Outline Documentation Downloader
 * Downloads markdown documents from Outline preserving full hierarchy
 */

const fs = require('fs').promises;
const path = require('path');
const cliProgress = require('cli-progress');
require('dotenv').config();

// ===== COMMAND-LINE ARGUMENT PARSING =====
const args = process.argv.slice(2);
const config = {
  outputDir: null,
  delay: 200,
  collections: null,
  help: false,
  verbose: false,
};

// Parse command-line arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  switch (arg) {
    case '--help':
    case '-h':
      config.help = true;
      break;
    case '--output':
    case '-o':
      config.outputDir = args[++i];
      if (!config.outputDir) {
        console.error('Error: --output requires a directory path');
        process.exit(1);
      }
      break;
    case '--delay':
    case '-d':
      config.delay = parseInt(args[++i], 10);
      if (isNaN(config.delay) || config.delay < 0) {
        console.error('Error: --delay must be a positive number');
        process.exit(1);
      }
      break;
    case '--collections':
    case '-c':
      config.collections = args[++i];
      if (!config.collections) {
        console.error('Error: --collections requires a comma-separated list of IDs');
        process.exit(1);
      }
      config.collections = config.collections.split(',').map(s => s.trim());
      break;
    case '--verbose':
    case '-v':
      config.verbose = true;
      break;
    default:
      if (arg.startsWith('-')) {
        console.error(`Error: Unknown option: ${arg}`);
        console.error('Use --help to see available options');
        process.exit(1);
      }
  }
}

// Show help if requested
if (config.help) {
  console.log(`
Outline Documentation Downloader
Downloads markdown documents from Outline preserving full hierarchy

USAGE:
  node download-outline-docs.js [OPTIONS]

OPTIONS:
  -h, --help              Show this help message and exit
  -o, --output <dir>      Output directory for downloaded docs (default: ./docs)
  -d, --delay <ms>        Delay between API requests in milliseconds (default: 200)
  -c, --collections <ids> Comma-separated list of collection IDs to download
                          If not specified, all collections will be downloaded
  -v, --verbose           Enable verbose logging for detailed output

EXAMPLES:
  # Download all collections to default directory
  node download-outline-docs.js

  # Download to custom directory with custom delay
  node download-outline-docs.js --output ./my-docs --delay 500

  # Download specific collections only
  node download-outline-docs.js --collections "abc123,def456"

  # Verbose mode with custom settings
  node download-outline-docs.js -v -o ./docs -d 300

  # Show this help message
  node download-outline-docs.js --help

ENVIRONMENT VARIABLES:
  OUTLINE_URL           Your Outline instance URL (required)
  OUTLINE_API_TOKEN     Your Outline API token (required)

  These should be set in a .env file in the project root.

EXIT CODES:
  0   Success - all documents downloaded successfully
  1   Error - configuration error, API error, or fatal failures
  2   Partial success - some documents failed to download
`);
  process.exit(0);
}

class OutlineDownloader {
  constructor(cliConfig) {
    this.outlineUrl = process.env.OUTLINE_URL?.replace(/\/$/, '');
    this.apiToken = process.env.OUTLINE_API_TOKEN;
    this.docsDir = cliConfig.outputDir
      ? path.resolve(cliConfig.outputDir)
      : path.join(__dirname, 'docs');
    this.documentCache = new Map();
    this.delay = cliConfig.delay;
    this.verbose = cliConfig.verbose;
    this.filterCollections = cliConfig.collections;

    // Progress tracking
    this.totalDocuments = 0;
    this.processedDocuments = 0;
    this.progressBar = null;
    this.startTime = null;

    // Rate limiting configuration
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
    this.requestTimeout = 30000; // 30 seconds

    if (!this.outlineUrl || !this.apiToken) {
      throw new Error('OUTLINE_URL and OUTLINE_API_TOKEN must be set in .env file');
    }

    this.log('Configuration:');
    this.log(`  Output directory: ${this.docsDir}`);
    this.log(`  API delay: ${this.delay}ms`);
    if (this.filterCollections) {
      this.log(`  Filter collections: ${this.filterCollections.join(', ')}`);
    }
  }

  log(message) {
    if (this.verbose) {
      console.log(`[VERBOSE] ${message}`);
    }
  }

  async fetch(endpoint, options = {}, retryCount = 0) {
    const url = `${this.outlineUrl}/api${endpoint}`;

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      this.log(`Fetching: ${endpoint}`);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Include response body in error for better debugging
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch (e) {
          errorBody = 'Could not read response body';
        }

        const error = new Error(`Outline API error: ${response.status} ${response.statusText} - ${errorBody}`);
        error.status = response.status;
        error.response = errorBody;

        // Check if we should retry (rate limit or server errors)
        if ((response.status === 429 || response.status >= 500) && retryCount < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, retryCount); // Exponential backoff
          console.log(`\n⏳ Rate limited or server error. Retrying in ${delay}ms... (attempt ${retryCount + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.fetch(endpoint, options, retryCount + 1);
        }

        throw error;
      }

      return response.json();
    } catch (error) {
      // Handle timeout errors
      if (error.name === 'AbortError') {
        if (retryCount < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, retryCount);
          console.log(`\n⏳ Request timeout. Retrying in ${delay}ms... (attempt ${retryCount + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.fetch(endpoint, options, retryCount + 1);
        }
        throw new Error(`Request timeout after ${this.requestTimeout}ms`);
      }
      throw error;
    }
  }

  async listCollections() {
    console.log('📚 Fetching collections (spaces)...');

    const data = await this.fetch('/collections.list', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    let collections = data.data;

    // Filter collections if specified
    if (this.filterCollections && this.filterCollections.length > 0) {
      collections = collections.filter(c => this.filterCollections.includes(c.id));
      this.log(`Filtered to ${collections.length} collections`);
    }

    return collections;
  }

  async getCollection(collectionId) {
    const data = await this.fetch('/collections.info', {
      method: 'POST',
      body: JSON.stringify({ id: collectionId }),
    });

    return data.data;
  }

  async getCollectionDocuments(collectionId) {
    const data = await this.fetch('/collections.documents', {
      method: 'POST',
      body: JSON.stringify({ id: collectionId }),
    });

    return data.data;
  }

  async getDocumentContent(documentId) {
    if (this.documentCache.has(documentId)) {
      return this.documentCache.get(documentId);
    }

    const data = await this.fetch('/documents.info', {
      method: 'POST',
      body: JSON.stringify({ id: documentId }),
    });

    this.documentCache.set(documentId, data.data);
    return data.data;
  }

  escapeYaml(value) {
    // Escape special characters in YAML values to prevent injection
    if (typeof value !== 'string') {
      return value;
    }

    // If the value contains special YAML characters, wrap in quotes and escape quotes
    if (/[:#\[\]{}&*!|>'\"%@`]/.test(value) || value.startsWith('-') || value.startsWith('?')) {
      // Escape backslashes and quotes
      const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `"${escaped}"`;
    }

    return value;
  }

  sanitizeFilename(filename) {
    // Remove or replace dangerous characters
    let sanitized = filename
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/\.+$/, '')
      .toLowerCase();

    // Path traversal protection: remove any path separators and parent directory references
    sanitized = sanitized
      .replace(/\.\./g, '') // Remove parent directory references
      .replace(/[\/\\]/g, '-') // Replace any remaining path separators
      .replace(/^\.+/, ''); // Remove leading dots

    // Ensure filename is not empty
    if (!sanitized || sanitized.length === 0) {
      sanitized = 'untitled';
    }

    // Limit length to prevent filesystem issues
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200);
    }

    return sanitized;
  }

  async ensureDir(dir) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  countDocuments(docTree) {
    let count = 0;
    for (const doc of docTree) {
      count += 1;
      if (doc.children && doc.children.length > 0) {
        count += this.countDocuments(doc.children);
      }
    }
    return count;
  }

  updateProgress() {
    this.processedDocuments++;
    if (this.progressBar) {
      const elapsed = Date.now() - this.startTime;
      const rate = this.processedDocuments / (elapsed / 1000);
      const remaining = this.totalDocuments - this.processedDocuments;
      const eta = remaining / rate;

      this.progressBar.update(this.processedDocuments, {
        eta: Math.round(eta),
        rate: rate.toFixed(2)
      });
    }
  }

  async downloadDocument(doc, currentDir, depth = 0) {
    try {
      const indent = '  '.repeat(depth);
      const icon = doc.children && doc.children.length > 0 ? '📁' : '📄';

      if (!this.progressBar) {
        console.log(`${indent}${icon} ${doc.title}`);
      }

      const content = await this.getDocumentContent(doc.id);
      this.updateProgress();

      let stats = { success: 1, failed: 0, errors: [] };

      // If document has children, create a folder for it
      if (doc.children && doc.children.length > 0) {
        const subDir = path.join(currentDir, this.sanitizeFilename(doc.title));
        await this.ensureDir(subDir);

        // Save the document markdown in the subfolder
        // Add document ID suffix to prevent filename collisions
        const docIdSuffix = doc.id.substring(0, 8);
        const filename = `${this.sanitizeFilename(doc.title)}-${docIdSuffix}.md`;
        const filepath = path.join(subDir, filename);

        const markdown = `---
title: ${this.escapeYaml(content.title)}
id: ${content.id}
created: ${content.createdAt}
updated: ${content.updatedAt}
${content.parentDocumentId ? `parent: ${content.parentDocumentId}` : ''}
---

${content.text}`;

        await fs.writeFile(filepath, markdown, 'utf-8');
        this.log(`Saved: ${filename}`);

        // Process children in the same subfolder
        for (const child of doc.children) {
          const childStats = await this.downloadDocument(child, subDir, depth + 1);
          stats.success += childStats.success;
          stats.failed += childStats.failed;
          stats.errors.push(...childStats.errors);

          // Configurable delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, this.delay));
        }
      } else {
        // No children, just save the document
        // Add document ID suffix to prevent filename collisions
        const docIdSuffix = doc.id.substring(0, 8);
        const filename = `${this.sanitizeFilename(doc.title)}-${docIdSuffix}.md`;
        const filepath = path.join(currentDir, filename);

        const markdown = `---
title: ${this.escapeYaml(content.title)}
id: ${content.id}
created: ${content.createdAt}
updated: ${content.updatedAt}
${content.parentDocumentId ? `parent: ${content.parentDocumentId}` : ''}
---

${content.text}`;

        await fs.writeFile(filepath, markdown, 'utf-8');
        this.log(`Saved: ${filename}`);
      }

      return stats;
    } catch (error) {
      const indent = '  '.repeat(depth);
      console.error(`\n${indent}❌ Error downloading ${doc.title}: ${error.message}`);
      this.updateProgress();
      return {
        success: 0,
        failed: 1,
        errors: [{ title: doc.title, error: error.message }]
      };
    }
  }

  async downloadAll() {
    console.log('🚀 Starting Outline documentation download with full hierarchy...\n');
    this.startTime = Date.now();

    await this.ensureDir(this.docsDir);

    // Get all collections (spaces)
    const collections = await this.listCollections();
    console.log(`📚 Found ${collections.length} space(s)\n`);

    if (collections.length === 0) {
      console.log('⚠️  No collections found or no collections match the filter.');
      return { totalDocs: 0, success: 0, failed: 0, errors: [], collections: [] };
    }

    const results = {
      totalDocs: 0,
      success: 0,
      failed: 0,
      errors: [],
      collections: [],
    };

    // First pass: count all documents for progress tracking
    console.log('📊 Counting documents...');
    for (const collection of collections) {
      const tree = await this.getCollectionDocuments(collection.id);
      const docCount = this.countDocuments(tree);
      this.totalDocuments += docCount;
      this.log(`Collection "${collection.name}": ${docCount} documents`);
    }

    console.log(`📄 Total documents to download: ${this.totalDocuments}\n`);

    // Initialize progress bar
    this.progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} docs | ETA: {eta}s | Rate: {rate} docs/s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    this.progressBar.start(this.totalDocuments, 0, {
      eta: 'N/A',
      rate: '0.00'
    });

    // Second pass: download documents
    for (const collection of collections) {
      try {
        this.log(`\nProcessing space: ${collection.name}`);

        // Create directory for this collection
        const collectionDir = path.join(this.docsDir, this.sanitizeFilename(collection.name));
        await this.ensureDir(collectionDir);

        // Get documents with tree structure
        const tree = await this.getCollectionDocuments(collection.id);

        const collectionResults = {
          name: collection.name,
          total: 0,
          success: 0,
          failed: 0,
        };

        // Download root documents and their children
        for (const doc of tree) {
          const stats = await this.downloadDocument(doc, collectionDir, 1);

          collectionResults.success += stats.success;
          collectionResults.failed += stats.failed;
          collectionResults.total += stats.success + stats.failed;
          results.totalDocs += stats.success + stats.failed;
          results.success += stats.success;
          results.failed += stats.failed;

          stats.errors.forEach(err => {
            results.errors.push({
              collection: collection.name,
              ...err
            });
          });

          // Configurable delay between root documents
          await new Promise(resolve => setTimeout(resolve, this.delay));
        }

        results.collections.push(collectionResults);
      } catch (error) {
        console.error(`\n   ❌ Error processing collection ${collection.name}: ${error.message}`);
        results.errors.push({
          collection: collection.name,
          title: 'Collection Processing',
          error: error.message
        });
      }
    }

    // Stop progress bar
    this.progressBar.stop();

    // Calculate elapsed time
    const elapsed = Date.now() - this.startTime;
    const elapsedSeconds = (elapsed / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('📊 Download Summary:');
    console.log(`  Spaces: ${collections.length}`);
    console.log(`  Total Documents: ${results.totalDocs}`);
    console.log(`  ✅ Success: ${results.success}`);
    console.log(`  ❌ Failed: ${results.failed}`);
    console.log(`  ⏱️  Time elapsed: ${elapsedSeconds}s`);
    console.log(`  📁 Output directory: ${this.docsDir}`);

    if (results.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      results.errors.forEach(({ collection, title, error }) => {
        console.log(`  - [${collection}] ${title}: ${error}`);
      });
    }

    console.log('='.repeat(60));

    // Return results for exit code determination
    return results;
  }
}

// Main execution
(async () => {
  try {
    const downloader = new OutlineDownloader(config);
    const results = await downloader.downloadAll();

    // Determine exit code based on results
    if (results.failed === 0) {
      console.log('\n✅ All documents downloaded successfully!');
      process.exit(0);
    } else if (results.success > 0) {
      console.log('\n⚠️  Download completed with some failures.');
      process.exit(2);
    } else {
      console.error('\n❌ Download failed - no documents were downloaded.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    if (config.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
})();
