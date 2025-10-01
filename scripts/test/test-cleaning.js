const fs = require('fs');
const WorkflowService = require('./src/services/workflow-service');

// Load the failing workflow
const workflow = JSON.parse(fs.readFileSync('./workflows/jana/(BCO-CNS-001)_fabrica-banco-consulta-rGrUV2QsLU9eCkoP.json', 'utf8'));

console.log('Original settings:', JSON.stringify(workflow.settings, null, 2));

// Create mock logger
const mockLogger = {
  info: () => {},
  debug: () => {},
  error: () => {},
  warn: () => {}
};

// Create service instance
const service = new WorkflowService({}, {}, mockLogger);

// Test the cleaning
const cleaned = service._cleanWorkflowPayload(workflow);

console.log('\nCleaned settings:', JSON.stringify(cleaned.settings, null, 2));
console.log('\nAll cleaned payload keys:', Object.keys(cleaned).join(', '));
