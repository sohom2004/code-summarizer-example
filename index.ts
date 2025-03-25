// index.ts
import dotenv from 'dotenv';
import { Command } from 'commander';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Import core summarizer functionality
import { GeminiLLM } from './src/summarizer/llm.js';
import { 
  findCodeFiles, 
  summarizeFile, 
  summarizeFiles, 
  writeSummariesToFile 
} from './src/summarizer/files.js';
import { SummaryOptions, MAX_FILE_SIZE_BYTES, DEFAULT_BATCH_SIZE } from './src/summarizer/types.js';

// Import MCP server
import { startServer } from './src/mcp/server.js';

// Import configuration
import { 
  getConfig, 
  updateConfig, 
  setApiKey, 
  setPort, 
  setSummaryOptions, 
  resetConfig 
} from './src/config/config.js';

// Main function
async function main() {
  try {
    const program = new Command();
    
    program
      .name('code-summarizer')
      .description('A tool to summarize code files using Gemini Flash 2.0')
      .version('1.0.0');
    
    // Default summarize command (original functionality)
    program
      .command('summarize')
      .description('Summarize code files in a directory')
      .argument('[rootDir]', 'Root directory to scan', process.cwd())
      .argument('[outputFile]', 'Output file for summaries', 'summaries.txt')
      .option('-d, --detail <level>', 'Detail level (low, medium, high)', 'medium')
      .option('-l, --max-length <number>', 'Maximum summary length in characters', '500')
      .action(async (rootDir, outputFile, options) => {
        // Validate detail level
        if (!['low', 'medium', 'high'].includes(options.detail)) {
          throw new Error(`Invalid detail level: ${options.detail}. Use 'low', 'medium', or 'high'.`);
        }

        // Validate max length
        const maxLength = parseInt(options.maxLength);
        if (isNaN(maxLength) || maxLength <= 0) {
          throw new Error(`Invalid max length: ${options.maxLength}. Use a positive number.`);
        }

        // Validate the root directory
        if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
          throw new Error(`Invalid directory: ${rootDir}`);
        }
        
        console.log(`Scanning directory: ${rootDir}`);
        console.log(`Output file: ${outputFile}`);
        console.log(`Detail level: ${options.detail}`);
        console.log(`Max length: ${maxLength}`);
        
        // Get config for API key
        const config = getConfig();
        const apiKey = config.apiKey || process.env.GOOGLE_API_KEY;
        
        if (!apiKey) {
          throw new Error('API key not set. Use the "config set --api-key <key>" command or set GOOGLE_API_KEY in .env file.');
        }
        
        // Initialize the LLM
        const llm = new GeminiLLM(apiKey);
        
        // Find all code files
        console.log('Finding code files...');
        const codeFiles = await findCodeFiles(rootDir);
        console.log(`Found ${codeFiles.length} code files to process`);
        
        if (codeFiles.length === 0) {
          console.log('No code files found to summarize.');
          return;
        }
        
        // Create summary options
        const summaryOptions: SummaryOptions = {
          detailLevel: options.detail as 'low' | 'medium' | 'high',
          maxLength: maxLength
        };
        
        // Summarize the files
        console.log('Generating summaries...');
        const summaries = await summarizeFiles(codeFiles, rootDir, llm, 5, summaryOptions);
        
        // Write summaries to the output file
        await writeSummariesToFile(summaries, outputFile);
        
        console.log('Code summarization completed successfully!');
      });
      
    // MCP server command
    program
      .command('server')
      .description('Start the MCP server')
      .action(async () => {
        await startServer();
      });
      
    // Configuration commands
    const configCommand = program
      .command('config')
      .description('Manage configuration settings');
      
    configCommand
      .command('show')
      .description('Show current configuration')
      .action(() => {
        const config = getConfig();
        console.log(JSON.stringify(config, null, 2));
      });
      
    configCommand
      .command('set')
      .description('Set configuration options')
      .option('--api-key <key>', 'Set the Gemini API key')
      .option('--port <port>', 'Set the MCP server port')
      .option('--detail-level <level>', 'Set default detail level (low, medium, high)')
      .option('--max-length <length>', 'Set default maximum summary length')
      .action((options) => {
        const updates: any = {};
        
        if (options.apiKey) {
          updates.apiKey = options.apiKey;
        }
        
        if (options.port) {
          const port = parseInt(options.port);
          if (isNaN(port) || port <= 0) {
            throw new Error(`Invalid port: ${options.port}. Use a positive number.`);
          }
          updates.port = port;
        }
        
        if (options.detailLevel) {
          if (!['low', 'medium', 'high'].includes(options.detailLevel)) {
            throw new Error(`Invalid detail level: ${options.detailLevel}. Use 'low', 'medium', or 'high'.`);
          }
          
          updates.summaryOptions = {
            ...getConfig().summaryOptions,
            detailLevel: options.detailLevel
          };
        }
        
        if (options.maxLength) {
          const maxLength = parseInt(options.maxLength);
          if (isNaN(maxLength) || maxLength <= 0) {
            throw new Error(`Invalid max length: ${options.maxLength}. Use a positive number.`);
          }
          
          updates.summaryOptions = {
            ...updates.summaryOptions || getConfig().summaryOptions,
            maxLength
          };
        }
        
        // Update config
        if (Object.keys(updates).length > 0) {
          const newConfig = updateConfig(updates);
          console.log('Configuration updated:');
          console.log(JSON.stringify(newConfig, null, 2));
        } else {
          console.log('No configuration changes specified.');
        }
      });
      
    configCommand
      .command('reset')
      .description('Reset configuration to defaults')
      .action(() => {
        resetConfig();
        console.log('Configuration reset to defaults.');
      });
      
    program.parse(process.argv);
    
    // If no command is specified, show help
    if (!process.argv.slice(2).length) {
      program.outputHelp();
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Export for testing
export {
  findCodeFiles,
  summarizeFile,
  summarizeFiles,
  writeSummariesToFile,
  GeminiLLM,
  MAX_FILE_SIZE_BYTES,
  DEFAULT_BATCH_SIZE
};

// Re-export types and constants for backward compatibility with tests
export { extensionToLanguage, skipDirectories } from './src/summarizer/types.js';
export type { SummaryOptions } from './src/summarizer/types.js';
export type { LLM } from './src/summarizer/llm.js';

// Only run main when file is executed directly, not when imported
// For ESM we need to check if this is the main module
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''));
if (isMainModule) {
  main();
}