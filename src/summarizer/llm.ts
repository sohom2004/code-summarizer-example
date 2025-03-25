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
      console.log(`[RETRY] Maximum retries (${retryOptions.maxRetries}) reached, giving up.`);
      throw error; // Max retries reached, propagate the error
    }
    
    // Determine if the error is retryable
    let isRetryable = false;
    
    if (error instanceof LLMError) {
      isRetryable = error.isRetryable;
      console.log(`[RETRY] LLMError retryable status: ${isRetryable}`);
    } else if (error instanceof Error) {
      // Check for network errors or status code errors
      const statusCodeMatch = error.message.match(/status code (\d+)/i);
      if (statusCodeMatch) {
        const statusCode = parseInt(statusCodeMatch[1], 10);
        isRetryable = retryOptions.retryableStatusCodes.includes(statusCode);
        console.log(`[RETRY] Status code ${statusCode}, retryable: ${isRetryable}`);
      } else {
        // Network errors are generally retryable
        const isNetworkError = error.message.includes('network') || 
                          error.message.includes('timeout') ||
                          error.message.includes('connection');
        
        // Content/token errors are not retryable
        const isContentError = error.message.includes('exceeds maximum') ||
                          error.message.includes('too large') ||
                          error.message.includes('token limit');
        
        isRetryable = isNetworkError && !isContentError;
        console.log(`[RETRY] Error type: ${isNetworkError ? 'Network' : (isContentError ? 'Content' : 'Other')}, retryable: ${isRetryable}`);
      }
    }
    
    if (!isRetryable) {
      console.log(`[RETRY] Error not retryable, propagating.`);
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
    console.warn(`[RETRY] Retrying LLM call (${retryCount + 1}/${retryOptions.maxRetries}) after ${delayWithJitter}ms delay`);
    
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
      
      // Calculate token estimate (approximate)
      const totalChars = prompt.length;
      const estimatedTokens = Math.ceil(totalChars / 4);
      
      console.log(`[${requestId}] Summarizing ${language} code, detail level: ${summaryOptions.detailLevel}`);
      console.log(`[${requestId}] Estimated prompt tokens: ~${estimatedTokens}`);
      
      // Check if we're likely approaching token limits (32k is common for many models)
      if (estimatedTokens > 30000) {
        console.warn(`[${requestId}] WARNING: Prompt may exceed token limits (~${estimatedTokens} tokens)`);
      }
      
      // Use retry mechanism for the actual API call
      return await withRetry(async () => {
        console.log(`[${requestId}] Initializing Gemini API call`);
        // Initialize the Google Generative AI client
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const startTime = Date.now();
        console.log(`[${requestId}] Sending request to Gemini API`);
        
        const result = await model.generateContent(prompt);
        const elapsed = Date.now() - startTime;
        
        console.log(`[${requestId}] Gemini response received in ${elapsed}ms`);
        
        // Check if response is empty or malformed
        const responseText = result.response.text();
        if (!responseText) {
          console.warn(`[${requestId}] Received empty response from Gemini API`);
          return "Failed to generate summary.";
        }
        
        return responseText;
      }, this.retryOptions);
    } catch (error) {
      // Extract API-specific error information if available
      const errorDetails = error.response?.data || {};
      const statusCode = error.response?.status;
      
      console.error(`[${requestId}] Error summarizing with Gemini:`);
      console.error(`  Message: ${error instanceof Error ? error.message : String(error)}`);
      
      if (statusCode) {
        console.error(`  Status: ${statusCode}`);
      }
      
      if (error.response) {
        console.error(`  Response: ${JSON.stringify(errorDetails)}`);
      }
      
      // Determine if this is a token limit error
      const isTokenLimitError = (error instanceof Error && 
        (error.message.includes('exceeds maximum') || 
         error.message.includes('too large') ||
         error.message.includes('token limit')));
      
      throw new LLMError(
        `Failed to generate summary: ${error instanceof Error ? error.message : String(error)}`,
        { 
          isRetryable: !isTokenLimitError, // Don't retry token limit errors
          context: { language, requestId, isTokenLimitError } 
        }
      );
    }
  }
}