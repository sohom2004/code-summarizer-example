import { vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Add global type for TypeScript
declare global {
  var createTestServer: () => McpServer;
}

// No need to mock the MCP SDK modules anymore as we're using the real implementation
// Just set up some test helpers if needed

// Set up test helpers for MCP
globalThis.createTestServer = () => {
  return new McpServer({
    name: 'Test MCP Server',
    version: '1.0.0'
  });
};

// We don't want to mock fs anymore, using the real filesystem instead
// No vi.mock('fs') call

// Setup logger silencing for tests
console.log = vi.fn();
console.warn = vi.fn();
console.error = vi.fn();

// Export nothing but ensure this file is treated as a module
export {};