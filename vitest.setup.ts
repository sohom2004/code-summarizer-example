import { vi } from 'vitest';

// Mock the MCP SDK modules
vi.mock('@modelcontextprotocol/sdk/server', () => {
  return {
    McpServer: vi.fn(() => ({
      prompts: {
        add: vi.fn(),
        getAll: vi.fn().mockReturnValue([])
      },
      resources: {
        add: vi.fn(),
        getAll: vi.fn().mockReturnValue([])
      },
      tools: {
        add: vi.fn(),
        getAll: vi.fn().mockReturnValue([])
      },
      start: vi.fn(),
      stop: vi.fn()
    }))
  };
});

vi.mock('@modelcontextprotocol/sdk/prompts', () => {
  return {
    McpPromptTemplate: vi.fn()
  };
});

vi.mock('@modelcontextprotocol/sdk/resources', () => {
  return {
    McpResource: vi.fn()
  };
});

vi.mock('@modelcontextprotocol/sdk/tools', () => {
  return {
    McpTool: vi.fn()
  };
});