import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

import { getSingleFileSummary, summarizeDirectory } from '../summarizer/summarize.js';
import { GeminiLLM } from '../summarizer/llm.js';
import { getConfig, updateConfig } from '../config/config.js';
import { extensionToLanguage } from '../summarizer/types.js';

/**
 * Tool to summarize a single file
 */
export const summarizeFileTool = {
  name: 'summarize_file',
  description: 'Summarize a single code file with optional configuration',
  schema: z.object({
    file_path: z.string().describe('Path to the file to summarize'),
    detail_level: z.enum(['low', 'medium', 'high']).optional()
      .describe('Level of detail for the summary'),
    max_length: z.number().int().positive().optional()
      .describe('Maximum length in characters for the summary')
  }),
  async invoke({ file_path, detail_level, max_length }, context) {
    try {
      // Verify file exists
      if (!fs.existsSync(file_path)) {
        throw new Error(`File not found: ${file_path}`);
      }

      // Get configuration
      const config = getConfig();
      
      // Check for API key
      if (!config.apiKey) {
        throw new Error('API key not configured. Use the set_config tool to set your API key.');
      }
      
      // Create LLM instance
      const llm = new GeminiLLM(config.apiKey);
      
      // Use provided options or defaults from config
      const options = {
        detailLevel: detail_level || config.summaryOptions.detailLevel,
        maxLength: max_length || config.summaryOptions.maxLength
      };
      
      // Generate summary
      const summary = await getSingleFileSummary(file_path, llm, options);
      
      // Get file extension and language
      const ext = path.extname(file_path).toLowerCase();
      const language = ext in extensionToLanguage 
        ? extensionToLanguage[ext] 
        : (ext && ext.length > 1 ? ext.slice(1) : 'text');
      
      // Store summary in context for resource access
      const resourceUri = `summary://file/${encodeURIComponent(file_path)}`;
      context.setTempData(resourceUri, {
        filePath: file_path,
        language,
        detailLevel: options.detailLevel,
        summary
      });
      
      return {
        content: [{ 
          type: 'text', 
          text: summary
        }],
        resources: [resourceUri]
      };
    } catch (error) {
      throw new Error(`Error summarizing file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

/**
 * Tool to summarize a directory of code files
 */
export const summarizeDirectoryTool = {
  name: 'summarize_directory',
  description: 'Summarize all code files in a directory',
  schema: z.object({
    directory: z.string().describe('Path to the directory to summarize'),
    detail_level: z.enum(['low', 'medium', 'high']).optional()
      .describe('Level of detail for the summaries'),
    max_length: z.number().int().positive().optional()
      .describe('Maximum length in characters for each summary'),
    output_file: z.string().optional()
      .describe('Optional file path to save the summaries')
  }),
  async invoke({ directory, detail_level, max_length, output_file }, context) {
    try {
      // Verify directory exists
      if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
        throw new Error(`Directory not found: ${directory}`);
      }

      // Get configuration
      const config = getConfig();
      
      // Check for API key
      if (!config.apiKey) {
        throw new Error('API key not configured. Use the set_config tool to set your API key.');
      }
      
      // Create LLM instance
      const llm = new GeminiLLM(config.apiKey);
      
      // Use provided options or defaults from config
      const options = {
        detailLevel: detail_level || config.summaryOptions.detailLevel,
        maxLength: max_length || config.summaryOptions.maxLength
      };
      
      // Generate summaries
      const outputPath = output_file || '';
      const summaries = await summarizeDirectory(directory, outputPath, llm, options);
      
      // Format results
      const resultText = summaries
        .map(s => `${s.relativePath}\n${s.summary}`)
        .join('\n\n');
      
      // Store summaries in context for resource access
      const resourceUri = `summary://batch/${encodeURIComponent(directory)}`;
      context.setTempData(resourceUri, {
        directory,
        detailLevel: options.detailLevel,
        summaries
      });
      
      return {
        content: [{ 
          type: 'text', 
          text: resultText 
        }],
        resources: [resourceUri]
      };
    } catch (error) {
      throw new Error(`Error summarizing directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

/**
 * Tool to configure the application
 */
export const setConfigTool = {
  name: 'set_config',
  description: 'Update configuration settings',
  schema: z.object({
    api_key: z.string().optional()
      .describe('Gemini API key for summarization'),
    port: z.number().int().positive().optional()
      .describe('Port for the MCP server'),
    detail_level: z.enum(['low', 'medium', 'high']).optional()
      .describe('Default detail level for summaries'),
    max_length: z.number().int().positive().optional()
      .describe('Default maximum length for summaries')
  }),
  async invoke({ api_key, port, detail_level, max_length }) {
    try {
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
      throw new Error(`Error updating configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};