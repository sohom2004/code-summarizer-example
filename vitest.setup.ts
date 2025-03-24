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

// Create test environment for file operations
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    // Add helper functions for tests if needed, but use real implementations by default
    existsSync: vi.fn((path: string) => {
      // Default to true for tests unless explicitly mocked
      return true;
    }),
    promises: {
      readFile: vi.fn(async (path: string) => {
        // Return a simple test file for most paths
        return 'function test() { return "test"; }';
      }),
      writeFile: vi.fn(),
      // Add other fs.promises methods as needed
      stat: vi.fn().mockResolvedValue({ size: 1000, isDirectory: () => false }),
      readdir: vi.fn().mockResolvedValue([])
    }
  };
});

// Setup logger silencing for tests
console.log = vi.fn();
console.warn = vi.fn();
console.error = vi.fn();

// Export nothing but ensure this file is treated as a module
export {};