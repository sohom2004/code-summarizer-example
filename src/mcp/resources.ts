import * as fs from 'fs';
import * as path from 'path';
import { McpResource } from './mock-sdk.js';
import { findCodeFiles } from '../summarizer/files.js';
import { extensionToLanguage } from '../summarizer/types.js';

/**
 * Resource for accessing code files
 */
export const codeFileResource = new McpResource({
  name: 'code_file',
  namespace: 'code',
  pattern: 'code://file/*',
  description: 'Access individual code files',
  async fetch(uri) {
    try {
      // Extract file path from URI
      const filePath = decodeURIComponent(uri.pathname.substring(1)); // Remove leading slash
      
      // Verify file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      // Read file content
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      
      // Get file extension and language
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
});

/**
 * Resource for listing code files in a directory
 */
export const codeDirectoryResource = new McpResource({
  name: 'code_directory',
  namespace: 'code',
  pattern: 'code://directory/*',
  description: 'List code files in a directory',
  async fetch(uri) {
    try {
      // Extract directory path from URI
      const dirPath = decodeURIComponent(uri.pathname.substring(1)); // Remove leading slash
      
      // Verify directory exists
      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        throw new Error(`Directory not found: ${dirPath}`);
      }
      
      // Find all code files
      const codeFiles = await findCodeFiles(dirPath);
      
      // Create a listing of files
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
});

/**
 * Resource for accessing summary for a specific file
 */
export const fileSummaryResource = new McpResource({
  name: 'file_summary',
  namespace: 'summary',
  pattern: 'summary://file/*',
  description: 'Get summary for a specific file',
  async fetch(uri, context) {
    try {
      // This will be implemented in the tool handler
      // The resource is registered but will be populated by the summarize_file tool
      const results = context.getTempData(uri.href);
      
      if (!results) {
        throw new Error(`Summary not found. Use the summarize_file tool first to generate a summary.`);
      }
      
      return {
        contents: [{
          uri: uri.href,
          text: results.summary,
          metadata: {
            filePath: results.filePath,
            language: results.language,
            detailLevel: results.detailLevel
          }
        }]
      };
    } catch (error) {
      throw new Error(`Error accessing summary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
});

/**
 * Resource for accessing batch summaries
 */
export const batchSummaryResource = new McpResource({
  name: 'batch_summary',
  namespace: 'summary',
  pattern: 'summary://batch/*',
  description: 'Get summaries for multiple files',
  async fetch(uri, context) {
    try {
      // This will be implemented in the tool handler
      // The resource is registered but will be populated by the summarize_directory tool
      const results = context.getTempData(uri.href);
      
      if (!results) {
        throw new Error(`Batch summary not found. Use the summarize_directory tool first to generate summaries.`);
      }
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(results.summaries, null, 2),
          metadata: {
            directory: results.directory,
            fileCount: results.summaries.length,
            detailLevel: results.detailLevel
          }
        }]
      };
    } catch (error) {
      throw new Error(`Error accessing batch summary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
});