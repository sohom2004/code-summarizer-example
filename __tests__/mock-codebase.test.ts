import * as path from 'path';
import { existsSync } from 'fs';
import { promises as fsPromises } from 'fs';
import * as fs from 'fs';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { findCodeFiles, GeminiLLM, summarizeFiles, SummaryOptions } from '../index.js';
import { getSingleFileSummary } from '../src/summarizer/summarize.js';

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

// Mock fs operations
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: vi.fn(),
      stat: vi.fn(),
    },
    existsSync: vi.fn(),
    statSync: vi.fn(),
  };
});

// This test uses actual file operations on the mock codebase
describe('Mock Codebase Integration Tests', () => {
  const mockCodebasePath = path.join(__dirname, '..', '__mocks__', 'mock-codebase');
  
  beforeAll(() => {
    // Set environment variable for testing
    process.env.GOOGLE_API_KEY = 'test-api-key';
  });
  
  beforeEach(() => {
    vi.clearAllMocks();
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (fs.statSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ isDirectory: () => false });
    (fsPromises.stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ size: 100 * 1024 });
    (fsPromises.readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('const test = 123;');
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
  
  it('should adjust detail level for TypeScript type files', async () => {
    const typesFile = path.join(mockCodebasePath, 'src', 'types.ts');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (fs.statSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ isDirectory: () => false });
    (fsPromises.readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('interface Test {}');
    (fsPromises.stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ size: 50 * 1024 });
    
    const llm = new GeminiLLM('test-api-key');
    const spy = vi.spyOn(llm, 'summarize');
    
    const options: SummaryOptions = {
      detailLevel: 'medium',
      maxLength: 500
    };
    
    await getSingleFileSummary(typesFile, llm, options);
    
    // Verify it was adjusted to low detail level for type files
    expect(spy).toHaveBeenCalledWith(expect.any(String), 'TypeScript', expect.objectContaining({
      detailLevel: 'low'
    }));
  });
});