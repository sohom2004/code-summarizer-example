import { McpPromptTemplate } from './mock-sdk.js';
import { z } from 'zod';

/**
 * Prompt template for code summarization
 */
export const codeSummaryPrompt = new McpPromptTemplate({
  name: 'code_summary',
  description: 'Prompt template for generating code summaries',
  schema: z.object({
    code: z.string().describe('The source code to summarize'),
    language: z.string().describe('The programming language of the code'),
    detailLevel: z.enum(['low', 'medium', 'high']).default('medium')
      .describe('The level of detail for the summary'),
    maxLength: z.number().int().positive().default(500)
      .describe('Maximum length in characters for the summary')
  }),
  render: ({ code, language, detailLevel, maxLength }) => {
    // Customize prompt based on detail level
    const detailPromptMap = {
      'low': 'Keep it very brief, focusing only on the main purpose.',
      'medium': '',
      'high': 'Provide a detailed analysis including functions, methods, and how they interact.'
    };
    
    const detailPrompt = detailPromptMap[detailLevel];
    
    return `Provide an overview summary of the code in this ${language} file.
${detailPrompt}
Keep the summary under ${maxLength} characters.

${code}`;
  }
});

/**
 * Prompt template for directory summarization
 */
export const directorySummaryPrompt = new McpPromptTemplate({
  name: 'directory_summary',
  description: 'Prompt template for summarizing a directory of code files',
  schema: z.object({
    fileSummaries: z.array(z.object({
      path: z.string(),
      summary: z.string()
    })).describe('List of file summaries in the directory'),
    directoryPath: z.string().describe('Path to the directory being summarized')
  }),
  render: ({ fileSummaries, directoryPath }) => {
    const summariesList = fileSummaries
      .map(file => `File: ${file.path}\nSummary: ${file.summary}`)
      .join('\n\n');
    
    return `Provide a high-level overview of the codebase in the directory ${directoryPath} based on the following file summaries:

${summariesList}

Analyze the purpose, structure, and relationships between components. Identify key patterns, architecture, and highlight important files or modules.`;
  }
});