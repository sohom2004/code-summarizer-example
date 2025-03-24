import * as fs from 'fs';
import * as path from 'path';
import ignorePackage from 'ignore';

import { 
  extensionToLanguage, 
  skipDirectories, 
  FileSummary, 
  SummaryOptions, 
  MAX_FILE_SIZE_BYTES, 
  DEFAULT_BATCH_SIZE 
} from './types.js';
import { LLM } from './llm.js';

// Find all code files in a directory
export async function findCodeFiles(rootDir: string): Promise<string[]> {
  // Check if .gitignore exists
  let gitignoreFilter: any = null;
  const gitignorePath = path.join(rootDir, '.gitignore');
  
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    gitignoreFilter = ignorePackage.default().add(gitignoreContent);
  }
  
  const allFiles: string[] = [];
  
  // Recursive function to scan directories
  async function scanDirectory(dir: string): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);
      
      // Skip if matched by .gitignore
      if (gitignoreFilter && gitignoreFilter.ignores(relativePath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        // Skip directories in the skip list
        if (skipDirectories.has(entry.name)) {
          continue;
        }
        
        // Recursively scan subdirectories
        await scanDirectory(fullPath);
      } else if (entry.isFile()) {
        // Check if the file has a supported extension
        const ext = path.extname(entry.name).toLowerCase();
        if (ext && ext in extensionToLanguage) {
          allFiles.push(fullPath);
        }
      }
    }
  }
  
  await scanDirectory(rootDir);
  return allFiles;
}

// Summarize a single file
export async function summarizeFile(
  filePath: string, 
  rootDir: string, 
  llm: LLM,
  maxFileSizeBytes: number = MAX_FILE_SIZE_BYTES,
  options?: SummaryOptions
): Promise<FileSummary> {
  try {
    // Check file size first
    const stats = await fs.promises.stat(filePath);
    if (stats.size > maxFileSizeBytes) {
      console.warn(`File ${filePath} is too large (${(stats.size / 1024).toFixed(2)}KB). Skipping.`);
      return {
        relativePath: path.relative(rootDir, filePath),
        summary: "File is too large to summarize."
      };
    }

    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    
    // Use the mapped language name or fall back to extension without dot (if ext exists)
    const language = ext in extensionToLanguage 
      ? extensionToLanguage[ext] 
      : (ext && ext.length > 1 ? ext.slice(1) : 'Unknown');
    
    const summary = await llm.summarize(fileContent, language, options);
    const relativePath = path.relative(rootDir, filePath);
    
    return {
      relativePath,
      summary
    };
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    return {
      relativePath: path.relative(rootDir, filePath),
      summary: "Failed to summarize this file."
    };
  }
}

// Summarize multiple files in batches
export async function summarizeFiles(
  filePaths: string[],
  rootDir: string,
  llm: LLM,
  batchSize: number = DEFAULT_BATCH_SIZE,
  options?: SummaryOptions
): Promise<FileSummary[]> {
  const allSummaries: FileSummary[] = [];
  
  // Process files in batches
  for (let i = 0; i < filePaths.length; i += batchSize) {
    const batch = filePaths.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(filePaths.length / batchSize)} (${i + 1}-${Math.min(i + batchSize, filePaths.length)} of ${filePaths.length} files)`);
    
    const batchPromises = batch.map(filePath => {
      console.log(`  Summarizing: ${path.relative(rootDir, filePath)}`);
      return summarizeFile(filePath, rootDir, llm, MAX_FILE_SIZE_BYTES, options);
    });
    
    const batchResults = await Promise.all(batchPromises);
    allSummaries.push(...batchResults);
  }
  
  return allSummaries;
}

// Write summaries to output file
export async function writeSummariesToFile(
  summaries: FileSummary[],
  outputPath: string
): Promise<void> {
  const content = summaries
    .map(summary => `${summary.relativePath}\n${summary.summary}\n`)
    .join('\n');
  
  await fs.promises.writeFile(outputPath, content, 'utf-8');
  console.log(`Summaries written to ${outputPath}`);
}