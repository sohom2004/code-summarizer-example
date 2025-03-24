import { GoogleGenerativeAI } from '@google/generative-ai';
import { SummaryOptions } from './types.js';

// Interface for LLM implementations
export interface LLM {
  summarize(code: string, language: string, options?: SummaryOptions): Promise<string>;
}

// Gemini Flash 2.0 implementation
export class GeminiLLM implements LLM {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async summarize(code: string, language: string, options?: SummaryOptions): Promise<string> {
    try {
      // Default options
      const summaryOptions: SummaryOptions = {
        detailLevel: options?.detailLevel || 'medium',
        maxLength: options?.maxLength || 500
      };
      
      // Customize prompt based on detail level using a mapping object
      const detailPromptMap = {
        'low': 'Keep it very brief, focusing only on the main purpose.',
        'medium': '',
        'high': 'Provide a detailed analysis including functions, methods, and how they interact.'
      };
      
      const detailPrompt = detailPromptMap[summaryOptions.detailLevel];
      
      const prompt = `Provide an overview summary of the code in this ${language} file.
${detailPrompt}
Keep the summary under ${summaryOptions.maxLength} characters.

${code}`;
      
      // Initialize the Google Generative AI client
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      const result = await model.generateContent(prompt);
      return result.response.text() || "Failed to generate summary.";
    } catch (error) {
      console.error(`Error summarizing with Gemini: ${error instanceof Error ? error.message : String(error)}`);
      return "Failed to generate summary.";
    }
  }
}