// Import from our mock implementation
import { McpServer } from './mock-sdk.js';
import { getConfig } from '../config/config.js';
import { codeSummaryPrompt, directorySummaryPrompt } from './prompts.js';
import { 
  codeFileResource, 
  codeDirectoryResource, 
  fileSummaryResource, 
  batchSummaryResource 
} from './resources.js';
import { 
  summarizeFileTool, 
  summarizeDirectoryTool, 
  setConfigTool 
} from './tools.js';

/**
 * Create and configure the MCP server
 */
export function createMcpServer(): McpServer {
  // Get configuration
  const config = getConfig();
  
  // Create server instance
  const server = new McpServer({
    port: config.port,
    name: 'Code Summarizer',
    description: 'MCP server for code summarization services',
    capabilities: 'Provides tools and resources for summarizing code files and directories'
  });
  
  // Register prompts
  server.prompts.add(codeSummaryPrompt);
  server.prompts.add(directorySummaryPrompt);
  
  // Register resources
  server.resources.add(codeFileResource);
  server.resources.add(codeDirectoryResource);
  server.resources.add(fileSummaryResource);
  server.resources.add(batchSummaryResource);
  
  // Register tools
  server.tools.add(summarizeFileTool);
  server.tools.add(summarizeDirectoryTool);
  server.tools.add(setConfigTool);
  
  return server;
}

/**
 * Start the MCP server
 */
export async function startServer(): Promise<void> {
  try {
    const server = createMcpServer();
    const config = getConfig();
    
    await server.start();
    console.log(`🚀 MCP Server running at http://localhost:${config.port}`);
    console.log('Available tools:');
    server.tools.getAll().forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down MCP server...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('Shutting down MCP server...');
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error(`Error starting MCP server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
} 