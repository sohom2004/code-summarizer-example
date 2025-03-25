import * as fs from 'fs';
import * as path from 'path';
import { SummaryOptions, FileSummary, DEFAULT_BATCH_SIZE } from './types.js';
import { LLM } from './llm.js';
import { findCodeFiles, summarizeFiles, writeSummariesToFile } from './files.js';

/**
 * Summarize a directory of code files
 */
export async function summarizeDirectory(
  rootDir: string,
  outputPath: string,
  llm: LLM,
  options?: SummaryOptions,
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<FileSummary[]> {
  // Validate the root directory
  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    throw new Error(`Invalid directory: ${rootDir}`);
  }
  
  // Find all code files
  console.log('Finding code files...');
  const codeFiles = await findCodeFiles(rootDir);
  console.log(`Found ${codeFiles.length} code files to process`);
  
  if (codeFiles.length === 0) {
    console.log('No code files found to summarize.');
    return [];
  }
  
  // Summarize the files
  console.log('Generating summaries...');
  const summaries = await summarizeFiles(codeFiles, rootDir, llm, batchSize, options);
  
  // Write summaries to the output file if provided
  if (outputPath) {
    await writeSummariesToFile(summaries, outputPath);
  }
  
  return summaries;
}

/**
 * Get a summary of a single file
 */
export async function getSingleFileSummary(
  filePath: string,
  llm: LLM,
  options?: SummaryOptions
): Promise<string> {
  try {
    // Get directory to use as root
    const rootDir = fs.statSync(filePath).isDirectory() 
      ? filePath 
      : path.dirname(filePath);
    
    // Validate the file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Adjust options based on file extension/type
    let adjustedOptions = { ...options };
    const ext = path.extname(filePath).toLowerCase();
    
    // For TypeScript type definition files, use a lower detail level to reduce token count
    if ((ext === '.ts' || ext === '.d.ts') && 
        (filePath.includes('types') || filePath.includes('interfaces') || filePath.includes('setup'))) {
      console.log(`Adjusting detail level for type/setup file: ${filePath}`);
      adjustedOptions.detailLevel = 'low';
    }
    
    // Call summarizeFile to get the summary
    const result = await import('./files.js').then(m => 
      m.summarizeFile(filePath, rootDir, llm, undefined, adjustedOptions)
    );
    return result.summary;
  } catch (error) {
    console.error(`Error summarizing file: ${error instanceof Error ? error.message : String(error)}`);
    return "Failed to generate summary.";
  }
}