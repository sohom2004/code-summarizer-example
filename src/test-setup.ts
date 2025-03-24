import { createMcpServer } from './mcp/server.js';
import { GeminiLLM } from './summarizer/llm.js';
import { getConfig, updateConfig } from './config/config.js';

// This file sets up and tests the core functionality without running unit tests
async function testSetup() {
  try {
    console.log('Testing MCP Server setup...');
    const server = createMcpServer();

    console.log('Available tools:');
    server.tools.getAll().forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });

    console.log('\nAvailable resources:');
    server.resources.getAll().forEach(resource => {
      console.log(`- ${resource.name}: ${resource.pattern}`);
    });

    console.log('\nAvailable prompts:');
    server.prompts.getAll().forEach(prompt => {
      console.log(`- ${prompt.name}: ${prompt.description}`);
    });

    console.log('\nTesting configuration management...');
    const config = getConfig();
    console.log('Current config:', config);
    
    // Update with test values and restore
    const originalApiKey = config.apiKey;
    updateConfig({ apiKey: 'test-key' });
    console.log('Updated config API key:', getConfig().apiKey);
    updateConfig({ apiKey: originalApiKey });
    
    console.log('\nTesting LLM implementation...');
    if (config.apiKey) {
      const llm = new GeminiLLM(config.apiKey);
      console.log('LLM instance created successfully');
    } else {
      console.log('Skipping LLM test (no API key configured)');
    }
    
    console.log('\nTest setup completed successfully!');
  } catch (error) {
    console.error('Test setup failed:', error);
  }
}

// Run the test setup
testSetup();