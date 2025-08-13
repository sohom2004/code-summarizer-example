"""
Gemini LLM implementation with retry logic and error handling.

This demonstrates key patterns for working with LLMs in agentic AI:
1. Retry logic with exponential backoff
2. Error categorization and handling
3. Token limit management
4. Request/response logging for debugging
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional
import random

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from ..config.settings import get_config

# Set up logging for debugging LLM interactions
logger = logging.getLogger(__name__)


class LLMError(Exception):
    """
    Custom exception for LLM-related errors.
    
    This helps categorize errors for better handling:
    - Retryable vs non-retryable errors
    - Rate limits vs content issues
    - Network vs API errors
    """
    def __init__(self, message: str, is_retryable: bool = True, context: Optional[Dict] = None):
        super().__init__(message)
        self.is_retryable = is_retryable
        self.context = context or {}


class RetryConfig:
    """Configuration for retry logic."""
    def __init__(self, max_retries: int = 3, initial_delay: float = 1.0, 
                 max_delay: float = 10.0, backoff_factor: float = 2.0):
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.backoff_factor = backoff_factor


async def with_retry(func, retry_config: RetryConfig, request_id: str):
    """
    Async retry decorator with exponential backoff and jitter.
    
    This is a crucial pattern for agentic AI applications:
    - Handles transient failures gracefully
    - Prevents thundering herd problems with jitter
    - Logs retry attempts for debugging
    - Respects rate limits
    """
    for attempt in range(retry_config.max_retries + 1):
        try:
            return await func()
        except Exception as e:
            # Determine if we should retry
            is_last_attempt = attempt == retry_config.max_retries
            
            if is_last_attempt:
                logger.error(f"[{request_id}] Final attempt failed: {e}")
                raise
            
            # Check if error is retryable
            is_retryable = True
            if isinstance(e, LLMError):
                is_retryable = e.is_retryable
            elif "token limit" in str(e).lower() or "too large" in str(e).lower():
                is_retryable = False
            
            if not is_retryable:
                logger.error(f"[{request_id}] Non-retryable error: {e}")
                raise
            
            # Calculate delay with exponential backoff and jitter
            delay = min(
                retry_config.initial_delay * (retry_config.backoff_factor ** attempt),
                retry_config.max_delay
            )
            # Add jitter (±20%)
            jitter = delay * 0.2 * (2 * random.random() - 1)
            final_delay = delay + jitter
            
            logger.warning(f"[{request_id}] Attempt {attempt + 1} failed, retrying in {final_delay:.2f}s: {e}")
            await asyncio.sleep(final_delay)


class GeminiLLM:
    """
    Gemini LLM client with robust error handling and retry logic.
    
    This class demonstrates best practices for LLM integration:
    - Proper API client initialization
    - Safety settings configuration
    - Request tracking and logging
    - Error handling and recovery
    """
    
    def __init__(self, api_key: str, retry_config: Optional[RetryConfig] = None):
        """
        Initialize the Gemini client.
        
        Args:
            api_key: Google API key for Gemini
            retry_config: Configuration for retry behavior
        """
        self.api_key = api_key
        self.retry_config = retry_config or RetryConfig()
        
        # Configure the Gemini client
        genai.configure(api_key=api_key)
        
        # Initialize the model with safety settings
        # These settings are important for production use
        self.model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            safety_settings={
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }
        )
    
    def _create_prompt(self, code: str, language: str, options: Dict[str, Any]) -> str:
        """
        Create a structured prompt for code summarization.
        
        This demonstrates prompt engineering best practices:
        - Clear instructions
        - Context setting
        - Parameter specification
        - Output format guidance
        """
        detail_level = options.get('detail_level', 'medium')
        max_length = options.get('max_length', 500)
        
        # Map detail levels to specific instructions
        detail_instructions = {
            'low': 'Keep it very brief, focusing only on the main purpose.',
            'medium': 'Provide a balanced overview of the code\'s purpose and key components.',
            'high': 'Provide a detailed analysis including functions, methods, classes, and their interactions.'
        }
        
        detail_instruction = detail_instructions.get(detail_level, detail_instructions['medium'])
        
        return f"""Provide an overview summary of the code in this {language} file.

{detail_instruction}
Keep the summary under {max_length} characters.
Focus on what the code does, not how it's implemented.

Code to analyze:
```{language.lower()}
{code}
```"""
    
    async def summarize(self, code: str, language: str, options: Optional[Dict[str, Any]] = None) -> str:
        """
        Summarize code using Gemini with retry logic.
        
        This is the main interface for the LLM, demonstrating:
        - Input validation
        - Request tracking
        - Error handling
        - Response processing
        
        Args:
            code: Source code to summarize
            language: Programming language
            options: Summarization options
            
        Returns:
            Summary text
            
        Raises:
            LLMError: If summarization fails after retries
        """
        # Generate unique request ID for tracking
        request_id = f"req_{int(time.time())}_{random.randint(1000, 9999)}"
        
        # Prepare options
        options = options or {}
        
        # Create the prompt
        prompt = self._create_prompt(code, language, options)
        
        # Estimate token count (rough approximation)
        estimated_tokens = len(prompt) // 4
        logger.info(f"[{request_id}] Summarizing {language} code, ~{estimated_tokens} tokens")
        
        # Check for potential token limit issues
        if estimated_tokens > 30000:  # Conservative limit
            logger.warning(f"[{request_id}] Large prompt may hit token limits")
        
        async def _make_request():
            """Inner function for the actual API call."""
            start_time = time.time()
            
            try:
                # Make the API call
                response = await self.model.generate_content_async(prompt)
                
                # Check if response was blocked
                if not response.text:
                    if response.prompt_feedback:
                        reason = response.prompt_feedback.block_reason
                        raise LLMError(f"Content blocked: {reason}", is_retryable=False)
                    else:
                        raise LLMError("Empty response from Gemini", is_retryable=True)
                
                elapsed = time.time() - start_time
                logger.info(f"[{request_id}] Response received in {elapsed:.2f}s")
                
                return response.text
                
            except Exception as e:
                elapsed = time.time() - start_time
                logger.error(f"[{request_id}] Request failed after {elapsed:.2f}s: {e}")
                
                # Categorize the error
                error_msg = str(e).lower()
                if "quota" in error_msg or "rate limit" in error_msg:
                    raise LLMError(f"Rate limit exceeded: {e}", is_retryable=True)
                elif "token" in error_msg or "too large" in error_msg:
                    raise LLMError(f"Content too large: {e}", is_retryable=False)
                elif "api key" in error_msg or "authentication" in error_msg:
                    raise LLMError(f"Authentication error: {e}", is_retryable=False)
                else:
                    raise LLMError(f"API error: {e}", is_retryable=True)
        
        # Execute with retry logic
        try:
            return await with_retry(_make_request, self.retry_config, request_id)
        except Exception as e:
            logger.error(f"[{request_id}] All retry attempts failed")
            if isinstance(e, LLMError):
                raise
            else:
                raise LLMError(f"Unexpected error: {e}", is_retryable=False)