/**
 * Custom error classes for better error handling and categorization
 */

// Base error class with additional properties
export class BaseError extends Error {
  public readonly code: string;
  public readonly isRetryable: boolean;
  public readonly statusCode: number;
  public readonly context?: Record<string, any>;

  constructor(message: string, options?: {
    code?: string;
    isRetryable?: boolean;
    statusCode?: number;
    context?: Record<string, any>;
  }) {
    super(message);
    this.name = this.constructor.name;
    this.code = options?.code || 'UNKNOWN_ERROR';
    this.isRetryable = options?.isRetryable || false;
    this.statusCode = options?.statusCode || 500;
    this.context = options?.context;
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Authentication related errors
export class AuthError extends BaseError {
  constructor(message: string, options?: {
    isRetryable?: boolean;
    context?: Record<string, any>;
  }) {
    super(message, {
      ...(options || {}),
      code: 'AUTH_ERROR',
      statusCode: 401,
    });
  }
}

// API key specific errors
export class ApiKeyError extends BaseError {
  constructor(message: string, options?: {
    isRetryable?: boolean;
    context?: Record<string, any>;
  }) {
    super(message, {
      ...(options || {}),
      code: 'INVALID_API_KEY',
      statusCode: 401,
    });
  }
}

// LLM related errors
export class LLMError extends BaseError {
  constructor(message: string, options?: {
    isRetryable?: boolean;
    statusCode?: number;
    context?: Record<string, any>;
  }) {
    super(message, {
      ...(options || {}),
      code: 'LLM_ERROR',
      isRetryable: options?.isRetryable !== undefined ? options.isRetryable : true,
    });
  }
}

// File system related errors
export class FileSystemError extends BaseError {
  constructor(message: string, options?: {
    isRetryable?: boolean;
    statusCode?: number;
    context?: Record<string, any>;
  }) {
    super(message, {
      ...(options || {}),
      code: 'FILE_SYSTEM_ERROR',
    });
  }
}

// Configuration related errors
export class ConfigError extends BaseError {
  constructor(message: string, options?: {
    isRetryable?: boolean;
    statusCode?: number;
    context?: Record<string, any>;
  }) {
    super(message, {
      ...(options || {}),
      code: 'CONFIG_ERROR',
    });
  }
}

// Helper to wrap an error in appropriate custom error type
export function wrapError(error: unknown, defaultMessage = 'An unexpected error occurred'): BaseError {
  if (error instanceof BaseError) {
    return error;
  }
  
  const message = error instanceof Error ? error.message : String(error);
  
  // Categorize based on message patterns
  if (message.includes('API key') || message.includes('apiKey')) {
    return new ApiKeyError(message);
  }
  
  if (message.includes('file not found') || message.includes('ENOENT')) {
    return new FileSystemError(message);
  }
  
  if (message.includes('config') || message.includes('configuration')) {
    return new ConfigError(message);
  }
  
  // Default case
  return new BaseError(message || defaultMessage);
}

// Error handler for logging and response formatting
export function handleError(error: unknown): { message: string; code: string; status: number } {
  const wrappedError = wrapError(error);
  
  // Log error with context if available
  console.error(`[${wrappedError.code}] ${wrappedError.message}`, 
    wrappedError.context ? wrappedError.context : '');
  
  return {
    message: wrappedError.message,
    code: wrappedError.code,
    status: wrappedError.statusCode
  };
} 