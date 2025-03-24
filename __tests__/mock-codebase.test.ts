import * as path from 'path';
import { existsSync } from 'fs';
import * as fs from 'fs';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { findCodeFiles, GeminiLLM, summarizeFiles, SummaryOptions } from '../index.js';

// Mock the Google Generative AI client
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: { text: () => 'Mocked summary for testing' }
      })
    }))
  }))
}));

// This test uses actual file operations on the mock codebase
describe('Mock Codebase Integration Tests', () => {
  const mockCodebasePath = path.join(__dirname, '..', '__mocks__', 'mock-codebase');
  
  beforeAll(() => {
    // Ensure the mock codebase exists
    if (!existsSync(mockCodebasePath)) {
      throw new Error(`Mock codebase not found at ${mockCodebasePath}`);
    }
    
    // Set environment variable for testing
    process.env.GOOGLE_API_KEY = 'test-api-key';
  });
  
  it('should find all code files in the mock codebase', async () => {
    const files = await findCodeFiles(mockCodebasePath);
    
    // Should find the JavaScript files
    expect(files).toContain(path.join(mockCodebasePath, 'src', 'index.js'));
    expect(files).toContain(path.join(mockCodebasePath, 'src', 'utils', 'helpers.js'));
    expect(files).toContain(path.join(mockCodebasePath, 'tests', 'test.js'));
    
    // Should not include the README.md or .gitignore
    const filePaths = files.map(file => path.basename(file));
    expect(filePaths).not.toContain('README.md');
    expect(filePaths).not.toContain('.gitignore');
  });
  
  it('should summarize files with different detail levels', async () => {
    // Only test with a couple of files to keep the test fast
    const testFiles = [
      path.join(mockCodebasePath, 'src', 'index.js'),
      path.join(mockCodebasePath, 'src', 'utils', 'helpers.js')
    ];
    
    const llm = new GeminiLLM('test-api-key');
    
    // Test with low detail level
    const lowDetailOptions: SummaryOptions = {
      detailLevel: 'low',
      maxLength: 100
    };
    
    const lowDetailSummaries = await summarizeFiles(testFiles, mockCodebasePath, llm, 2, lowDetailOptions);
    
    expect(lowDetailSummaries.length).toBe(2);
    expect(lowDetailSummaries[0].relativePath).toBe(path.relative(mockCodebasePath, testFiles[0]));
    expect(lowDetailSummaries[0].summary).toBe('Mocked summary for testing');
    
    // Test with high detail level
    const highDetailOptions: SummaryOptions = {
      detailLevel: 'high',
      maxLength: 1000
    };
    
    const highDetailSummaries = await summarizeFiles(testFiles, mockCodebasePath, llm, 2, highDetailOptions);
    
    expect(highDetailSummaries.length).toBe(2);
    expect(highDetailSummaries[0].summary).toBe('Mocked summary for testing');
    
    // In a real test we would verify the prompts were constructed correctly,
    // but since we're just mocking the API response, we'll just verify 
    // that we got the right number of summaries
    expect(lowDetailSummaries.length).toBe(2);
    expect(highDetailSummaries.length).toBe(2);
  });
});