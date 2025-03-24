// Import from the real MCP SDK
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getConfig, updateConfig, validateApiKey } from '../config/config.js';
import express from 'express';
import cors from 'cors';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';

// Import our tools, resources, etc.
import { 
  findCodeFiles, 
  summarizeFile, 
  summarizeFiles 
} from '../summarizer/files.js';
import { GeminiLLM } from '../summarizer/llm.js';
import { extensionToLanguage, SummaryOptions, MAX_FILE_SIZE_BYTES } from '../summarizer/types.js';
import * as fs from 'fs';
import * as path from 'path';

// Authentication middleware
function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const config = getConfig();
  
  // Check if API key is provided and valid
  if (!apiKey || apiKey !== config.apiKey || !validateApiKey(apiKey.toString())) {
    return res.status(401).json({
      error: 'Unauthorized - Invalid or missing API key'
    });
  }
  
  next();
}

/**
 * Create and configure the MCP server
 */
export function createMcpServer(): McpServer {
  // Get configuration
  const config = getConfig();
  
  // Create server instance
  const server = new McpServer({
    name: 'Code Summarizer',
    version: '1.0.0'
  });
  
  // Register prompts
  server.prompt(
    'code_summary',
    'Generate a summary of code',
    (extra) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: 'Please summarize the following code, focusing on its main purpose and functionality.'
        }
      }]
    })
  );
  
  server.prompt(
    'directory_summary',
    'Generate a summary of a code directory',
    (extra) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: 'Please provide a high-level overview of this codebase, focusing on its structure and key components.'
        }
      }]
    })
  );
  
  // Register code file resource
  server.resource(
    'code_file',
    new ResourceTemplate('code://file/{filePath}', { list: undefined }),
    async (uri, params) => {
      try {
        // Handle case where filePath might be an array
        const filePathParam = Array.isArray(params.filePath) 
          ? params.filePath[0] 
          : params.filePath;
        
        const filePath = decodeURIComponent(filePathParam);
        
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }
        
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
        const ext = path.extname(filePath).toLowerCase();
        const language = ext in extensionToLanguage 
          ? extensionToLanguage[ext]
          : (ext && ext.length > 1 ? ext.slice(1) : 'text');
        
        return {
          contents: [{
            uri: uri.href,
            text: fileContent,
            metadata: {
              language,
              path: filePath
            }
          }]
        };
      } catch (error) {
        throw new Error(`Error accessing code file: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
  
  // Register code directory resource
  server.resource(
    'code_directory',
    new ResourceTemplate('code://directory/{dirPath}', { list: undefined }),
    async (uri, params) => {
      try {
        // Handle case where dirPath might be an array
        const dirPathParam = Array.isArray(params.dirPath) 
          ? params.dirPath[0] 
          : params.dirPath;
        
        const dirPath = decodeURIComponent(dirPathParam);
        
        if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
          throw new Error(`Directory not found: ${dirPath}`);
        }
        
        const codeFiles = await findCodeFiles(dirPath);
        const fileList = codeFiles.map(file => ({
          path: file,
          relativePath: path.relative(dirPath, file),
          extension: path.extname(file).toLowerCase(),
          language: extensionToLanguage[path.extname(file).toLowerCase()] || 'text'
        }));
        
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(fileList, null, 2),
            metadata: {
              type: 'code-file-list',
              directory: dirPath,
              fileCount: fileList.length
            }
          }]
        };
      } catch (error) {
        throw new Error(`Error accessing code directory: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
  
  // Register tools using the proper zod schema format
  server.tool(
    'summarize_file',
    {
      file_path: z.string().describe('Path to the file to summarize'),
      detail_level: z.enum(['low', 'medium', 'high']).optional().describe('Level of detail for the summary'),
      max_length: z.number().positive().int().optional().describe('Maximum length in characters for the summary')
    },
    async (args, extra) => {
      try {
        const { file_path, detail_level, max_length } = args;
        
        // Verify file exists
        if (!fs.existsSync(file_path)) {
          throw new Error(`File not found: ${file_path}`);
        }
        
        // Get configuration and create LLM
        const config = getConfig();
        if (!config.apiKey) {
          throw new Error('API key not configured');
        }
        
        const llm = new GeminiLLM(config.apiKey);
        
        // Prepare options
        const options: SummaryOptions = {
          detailLevel: detail_level || config.summaryOptions.detailLevel,
          maxLength: max_length || config.summaryOptions.maxLength
        };
        
        // The correct way to call summarizeFile based on its signature
        const summary = await summarizeFile(file_path, path.dirname(file_path), llm, MAX_FILE_SIZE_BYTES, options);
        
        return {
          content: [{ 
            type: 'text', 
            text: String(summary.summary) // Extract the summary text and ensure it's a string
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error summarizing file: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  );
  
  server.tool(
    'summarize_directory',
    {
      directory: z.string().describe('Path to the directory to summarize'),
      detail_level: z.enum(['low', 'medium', 'high']).optional().describe('Level of detail for the summaries'),
      max_length: z.number().positive().int().optional().describe('Maximum length in characters for each summary'),
      output_file: z.string().optional().describe('Optional file path to save the summaries')
    },
    async (args, extra) => {
      try {
        const { directory, detail_level, max_length, output_file } = args;
        
        // Verify directory exists
        if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
          throw new Error(`Directory not found: ${directory}`);
        }
        
        // Get configuration and create LLM
        const config = getConfig();
        if (!config.apiKey) {
          throw new Error('API key not configured');
        }
        
        const llm = new GeminiLLM(config.apiKey);
        
        // Prepare options
        const options: SummaryOptions = {
          detailLevel: detail_level || config.summaryOptions.detailLevel,
          maxLength: max_length || config.summaryOptions.maxLength
        };
        
        // Find code files
        const codeFiles = await findCodeFiles(directory);
        
        // Generate summaries
        const summaries = await summarizeFiles(codeFiles, directory, llm, 5, options);
        
        // Output to file if requested
        if (output_file) {
          const summaryText = summaries
            .map(s => `File: ${s.relativePath}\nSummary: ${s.summary}`)
            .join('\n\n');
          await fs.promises.writeFile(output_file, summaryText, 'utf-8');
        }
        
        // Format results as a single string
        const resultText = summaries
          .map(s => `${s.relativePath}\n${s.summary}`)
          .join('\n\n');
        
        return {
          content: [{ 
            type: 'text', 
            text: resultText 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error summarizing directory: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  );
  
  server.tool(
    'set_config',
    {
      api_key: z.string().optional().describe('Gemini API key for summarization'),
      port: z.number().int().positive().optional().describe('Port for the MCP server'),
      detail_level: z.enum(['low', 'medium', 'high']).optional().describe('Default detail level for summaries'),
      max_length: z.number().int().positive().optional().describe('Default maximum length for summaries')
    },
    async (args, extra) => {
      try {
        const { api_key, port, detail_level, max_length } = args;
        
        // Build config update
        const configUpdate: any = {};
        
        if (api_key !== undefined) {
          configUpdate.apiKey = api_key;
        }
        
        if (port !== undefined) {
          configUpdate.port = port;
        }
        
        // Handle summary options
        if (detail_level !== undefined || max_length !== undefined) {
          const currentConfig = getConfig();
          configUpdate.summaryOptions = {
            ...currentConfig.summaryOptions
          };
          
          if (detail_level !== undefined) {
            configUpdate.summaryOptions.detailLevel = detail_level;
          }
          
          if (max_length !== undefined) {
            configUpdate.summaryOptions.maxLength = max_length;
          }
        }
        
        // Update configuration
        const newConfig = updateConfig(configUpdate);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Configuration updated successfully:\n${JSON.stringify(newConfig, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error updating configuration: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  );
  
  return server;
}

/**
 * Start the MCP server
 */
export async function startServer(): Promise<void> {
  try {
    const server = createMcpServer();
    const config = getConfig();
    
    // Create Express app for HTTP transport
    const app = express();
    
    // Add CORS configuration
    const corsOptions = {
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : 'http://localhost:3000',
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'x-api-key'],
      maxAge: 86400 // 24 hours
    };
    app.use(cors(corsOptions));
    
    // Request parsing
    app.use(express.json());
    
    // Rate limiting - simple implementation
    const requestCounts = new Map<string, { count: number, resetTime: number }>();
    app.use((req, res, next) => {
      const ip = req.ip || 'unknown';
      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minute window
      const maxRequests = 60; // 60 requests per minute
      
      // Reset count if window expired
      if (!requestCounts.has(ip) || (requestCounts.get(ip) && requestCounts.get(ip)!.resetTime < now)) {
        requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
        return next();
      }
      
      // Increment count
      const record = requestCounts.get(ip);
      if (record && record.count >= maxRequests) {
        return res.status(429).json({ error: 'Too many requests, please try again later' });
      }
      
      if (record) {
        record.count++;
      }
      next();
    });
    
    // Add authentication to all endpoints except health check
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });
    
    // All other routes require authentication
    app.use((req, res, next) => {
      // Skip auth for health check route
      if (req.path === '/health') {
        return next();
      }
      
      authMiddleware(req, res, next);
    });
    
    // Set up SSE endpoint
    app.get('/sse', async (req, res) => {
      console.log('SSE connection established');
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const transport = new SSEServerTransport('/messages', res);
      await server.connect(transport);
    });
    
    // Set up message endpoint
    app.post('/messages', async (req, res) => {
      // This would need integration with the SSE transport
      console.log('Received message', req.body);
      res.status(200).json({ status: 'ok' });
    });
    
    // Start HTTP server
    const httpServer = app.listen(config.port, () => {
      console.log(`🚀 MCP Server running at http://localhost:${config.port}`);
      console.log('Available endpoints:');
      console.log(`- Health: http://localhost:${config.port}/health`);
      console.log(`- SSE: http://localhost:${config.port}/sse`);
      console.log(`- Messages: http://localhost:${config.port}/messages`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down MCP server...');
      httpServer.close();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('Shutting down MCP server...');
      httpServer.close();
      process.exit(0);
    });
  } catch (error) {
    console.error(`Error starting MCP server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
} 