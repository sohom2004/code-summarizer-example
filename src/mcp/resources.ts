import * as fs from 'fs';
import * as path from 'path';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { findCodeFiles } from '../summarizer/files.js';
import { extensionToLanguage } from '../summarizer/types.js';

/**
 * Resource for accessing code files
 */
export const codeFileResource = {
  name: 'code_file',
  pattern: new ResourceTemplate('code://file/{filePath}', { list: undefined }),
  async fetch(uri, { filePath }) {
    try {
      // Decode the file path
      const decodedPath = decodeURIComponent(filePath);
      
      // Verify file exists
      if (!fs.existsSync(decodedPath)) {
        throw new Error(`File not found: ${decodedPath}`);
      }
      
      // Read file content
      const fileContent = await fs.promises.readFile(decodedPath, 'utf-8');
      
      // Get file extension and language
      const ext = path.extname(decodedPath).toLowerCase();
      const language = ext in extensionToLanguage 
        ? extensionToLanguage[ext] 
        : (ext && ext.length > 1 ? ext.slice(1) : 'text');
      
      return {
        contents: [{
          uri: uri.href,
          text: fileContent,
          metadata: {
            language,
            path: decodedPath
          }
        }]
      };
    } catch (error) {
      throw new Error(`Error accessing code file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

/**
 * Resource for listing code files in a directory
 */
export const codeDirectoryResource = {
  name: 'code_directory',
  pattern: new ResourceTemplate('code://directory/{dirPath}', { list: undefined }),
  async fetch(uri, { dirPath }) {
    try {
      // Decode the directory path
      const decodedPath = decodeURIComponent(dirPath);
      
      // Verify directory exists
      if (!fs.existsSync(decodedPath) || !fs.statSync(decodedPath).isDirectory()) {
        throw new Error(`Directory not found: ${decodedPath}`);
      }
      
      // Find all code files
      const codeFiles = await findCodeFiles(decodedPath);
      
      // Create a listing of files
      const fileList = codeFiles.map(file => ({
        path: file,
        relativePath: path.relative(decodedPath, file),
        extension: path.extname(file).toLowerCase(),
        language: extensionToLanguage[path.extname(file).toLowerCase()] || 'text'
      }));
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(fileList, null, 2),
          metadata: {
            type: 'code-file-list',
            directory: decodedPath,
            fileCount: fileList.length
          }
        }]
      };
    } catch (error) {
      throw new Error(`Error accessing code directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

/**
 * Resource for accessing summary for a specific file
 */
export const fileSummaryResource = {
  name: 'file_summary',
  pattern: new ResourceTemplate('summary://file/{filePath}', { list: undefined }),
  async fetch(uri, { filePath }, context) {
    try {
      // Decode the file path
      const decodedPath = encodeURIComponent(decodeURIComponent(filePath));
      const resourceUri = `summary://file/${decodedPath}`;
      
      // Get the summary data from context
      const results = context.getTempData(resourceUri);
      
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
};

/**
 * Resource for accessing batch summaries
 */
export const batchSummaryResource = {
  name: 'batch_summary',
  pattern: new ResourceTemplate('summary://batch/{dirPath}', { list: undefined }),
  async fetch(uri, { dirPath }, context) {
    try {
      // Decode the directory path
      const decodedPath = encodeURIComponent(decodeURIComponent(dirPath));
      const resourceUri = `summary://batch/${decodedPath}`;
      
      // Get the summary data from context
      const results = context.getTempData(resourceUri);
      
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
};