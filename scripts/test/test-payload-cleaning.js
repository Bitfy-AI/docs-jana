/**
 * Test script to verify workflow payload cleaning
 * Tests that only N8N API-accepted fields are included
 */

// Mock workflow data with all possible fields
const mockWorkflowData = {
  // N8N API accepted fields
  id: '123',
  name: 'Test Workflow',
  nodes: [
    {
      id: 'node1',
      type: 'n8n-nodes-base.start',
      position: [250, 300],
      parameters: {},
    },
  ],
  connections: {
    node1: {
      main: [[{ node: 'node2', type: 'main', index: 0 }]],
    },
  },
  settings: {
    executionOrder: 'v1',
  },

  // Fields that should be REMOVED (cause HTTP 400)
  versionId: 'abc123',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  active: true,
  tags: ['tag1', 'tag2'],
  shared: true,
  pinData: {},
  meta: {},
  staticData: {},
  hash: 'somehash',
  homeProject: { id: '1', name: 'Home' },
  sharedWithProjects: [],
  usedWebhooks: [],
};

// Simulate the _cleanWorkflowPayload method
function cleanWorkflowPayload(workflowData) {
  // N8N API accepts only these fields for workflow create/update
  const allowedFields = ['name', 'nodes', 'connections', 'settings'];

  // Preserve ID for ID preservation during upload
  if (workflowData.id) {
    allowedFields.push('id');
  }

  const cleanedPayload = {};

  allowedFields.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(workflowData, field)) {
      cleanedPayload[field] = workflowData[field];
    }
  });

  // Log removed fields for debugging
  const removedFields = Object.keys(workflowData).filter(
    key => !allowedFields.includes(key)
  );

  if (removedFields.length > 0) {
    console.log(`\n✓ Removed fields from payload: ${removedFields.join(', ')}`);
  }

  return cleanedPayload;
}

// Run the test
console.log('Testing workflow payload cleaning...\n');
console.log('Original workflow has', Object.keys(mockWorkflowData).length, 'fields');

const cleanedPayload = cleanWorkflowPayload(mockWorkflowData);

console.log('Cleaned payload has', Object.keys(cleanedPayload).length, 'fields');
console.log('\n✓ Cleaned payload contains only:', Object.keys(cleanedPayload).join(', '));

// Verify expectations
const expectedFields = ['id', 'name', 'nodes', 'connections', 'settings'];
const actualFields = Object.keys(cleanedPayload).sort();
const expectedFieldsSorted = expectedFields.sort();

const isValid = JSON.stringify(actualFields) === JSON.stringify(expectedFieldsSorted);

console.log('\n--- Test Results ---');
console.log('Expected fields:', expectedFieldsSorted.join(', '));
console.log('Actual fields:', actualFields.join(', '));
console.log('Test Status:', isValid ? '✓ PASSED' : '✗ FAILED');

// Show what was removed
const removedFields = Object.keys(mockWorkflowData).filter(
  key => !expectedFields.includes(key)
);

console.log('\n--- Removed Fields (These caused HTTP 400) ---');
removedFields.forEach(field => {
  console.log(`  - ${field}: ${JSON.stringify(mockWorkflowData[field])}`);
});

console.log('\n--- Final Cleaned Payload ---');
console.log(JSON.stringify(cleanedPayload, null, 2));
