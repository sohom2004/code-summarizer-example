/**
 * Tests for the helper functions
 */

const assert = require('assert');
const { formatDate, capitalize } = require('../src/utils/helpers');
const { main } = require('../src/index');

// Test the formatDate function
describe('formatDate', () => {
  it('should format a date to ISO string', () => {
    const testDate = new Date('2023-01-01T12:00:00Z');
    const result = formatDate(testDate);
    assert.strictEqual(result, '2023-01-01T12:00:00.000Z');
  });
});

// Test the capitalize function
describe('capitalize', () => {
  it('should capitalize the first letter of a string', () => {
    const result = capitalize('hello');
    assert.strictEqual(result, 'Hello');
  });
  
  it('should handle empty strings', () => {
    const result = capitalize('');
    assert.strictEqual(result, '');
  });
  
  it('should handle null inputs', () => {
    const result = capitalize(null);
    assert.strictEqual(result, '');
  });
});

// Test the main function
describe('main', () => {
  it('should return a formatted date string', () => {
    const result = main();
    // Verify the result is a string and matches ISO format
    assert(typeof result === 'string');
    assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(result));
  });
});