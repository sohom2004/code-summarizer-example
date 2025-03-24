import { GoogleGenerativeAI } from '@google/generative-ai';
import { SummaryOptions } from './types.js';
import { LLMError } from '../error/index.js';

// Retry configuration for LLM calls
export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  retryableStatusCodes: number[];
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffFactor: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504]
};

// Interface for LLM implementations
export interface LLM {
  summarize(code: string, language: string, options?: SummaryOptions): Promise<string>;
}

// Implementation of async retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  retryOptions: RetryOptions = DEFAULT_RETRY_OPTIONS,
  retryCount = 0
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Check if we should retry
    if (retryCount >= retryOptions.maxRetries) {
      throw error; // Max retries reached, propagate the error
    }
    
    // Determine if the error is retryable
    let isRetryable = false;
    
    if (error instanceof LLMError) {
      isRetryable = error.isRetryable;
    } else if (error instanceof Error) {
      // Check for network errors or status code errors
      const statusCodeMatch = error.message.match(/status code (\d+)/i);
      if (statusCodeMatch) {
        const statusCode = parseInt(statusCodeMatch[1], 10);
        isRetryable = retryOptions.retryableStatusCodes.includes(statusCode);
      } else {
        // Network errors are generally retryable
        isRetryable = error.message.includes('network') || 
                      error.message.includes('timeout') ||
                      error.message.includes('connection');
      }
    }
    
    if (!isRetryable) {
      throw error; // Not retryable, propagate the error
    }
    
    // Calculate delay with exponential backoff and jitter
    const delay = Math.min(
      retryOptions.initialDelayMs * Math.pow(retryOptions.backoffFactor, retryCount),
      retryOptions.maxDelayMs
    );
    // Add jitter (±20%)
    const jitter = 0.8 + Math.random() * 0.4;
    const delayWithJitter = Math.floor(delay * jitter);
    
    // Log retry attempt
    console.warn(`Retrying LLM call (${retryCount + 1}/${retryOptions.maxRetries}) after ${delayWithJitter}ms delay`);
    
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, delayWithJitter));
    return withRetry(fn, retryOptions, retryCount + 1);
  }
}

// Gemini Flash 2.0 implementation
export class GeminiLLM implements LLM {
  private apiKey: string;
  private retryOptions: RetryOptions;

  constructor(apiKey: string, retryOptions?: Partial<RetryOptions>) {
    this.apiKey = apiKey;
    this.retryOptions = {
      ...DEFAULT_RETRY_OPTIONS,
      ...retryOptions
    };
  }

  async summarize(code: string, language: string, options?: SummaryOptions): Promise<string> {
    // Create a unique ID for this request for tracing
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
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
      
      // Log basic info about the request
      console.log(`[${requestId}] Summarizing ${language} code, detail level: ${summaryOptions.detailLevel}`);
      
      // Use retry mechanism for the actual API call
      return await withRetry(async () => {
        // Initialize the Google Generative AI client
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const startTime = Date.now();
        const result = await model.generateContent(prompt);
        const elapsed = Date.now() - startTime;
        
        console.log(`[${requestId}] LLM response received in ${elapsed}ms`);
        
        return result.response.text() || "Failed to generate summary.";
      }, this.retryOptions);
    } catch (error) {
      // Convert to LLMError and rethrow
      console.error(`[${requestId}] Error summarizing with Gemini: ${error instanceof Error ? error.message : String(error)}`);
      
      throw new LLMError(
        `Failed to generate summary: ${error instanceof Error ? error.message : String(error)}`,
        { context: { language, requestId } }
      );
    }
  }
}