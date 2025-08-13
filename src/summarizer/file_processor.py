"""
File processing utilities for code summarization.

This module demonstrates key patterns in agentic AI file processing:
1. Recursive directory traversal with filtering
2. Gitignore respect (important for real codebases)
3. File type detection and language mapping
4. Batch processing for efficiency
5. Error handling and recovery
"""

import asyncio
import os
from pathlib import Path
from typing import List, Dict, Any, Optional, Set
import logging
import aiofiles

# For gitignore handling - in a real implementation you might use python-gitignore
# For now, we'll implement basic gitignore parsing
import fnmatch

logger = logging.getLogger(__name__)


# File extension to language mapping
# This is crucial for providing context to the LLM
EXTENSION_TO_LANGUAGE = {
    '.py': 'Python',
    '.js': 'JavaScript',
    '.ts': 'TypeScript',
    '.jsx': 'JavaScript (React)',
    '.tsx': 'TypeScript (React)',
    '.java': 'Java',
    '.cpp': 'C++',
    '.c': 'C',
    '.go': 'Go',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.cs': 'C#',
    '.swift': 'Swift',
    '.rs': 'Rust',
    '.kt': 'Kotlin',
    '.scala': 'Scala',
    '.vue': 'Vue.js',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.less': 'Less',
}

# Directories to always skip (common build/dependency directories)
SKIP_DIRECTORIES = {
    'node_modules', 'dist', 'build', '.git', 'out', 'coverage',
    '.next', '.nuxt', 'bin', 'obj', 'target', 'vendor',
    'venv', '.venv', 'env', '.env', '__pycache__', '.pytest_cache'
}

# File size limits (important for LLM token limits)
MAX_FILE_SIZE_BYTES = 200 * 1024  # 200KB
DEFAULT_BATCH_SIZE = 5


class GitignoreParser:
    """
    Simple gitignore parser.
    
    In production, you'd use a more robust library, but this demonstrates
    the concept of respecting project conventions in agentic AI tools.
    """
    
    def __init__(self, gitignore_path: Path):
        self.patterns = []
        if gitignore_path.exists():
            with open(gitignore_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        self.patterns.append(line)
    
    def should_ignore(self, path: str) -> bool:
        """Check if a path should be ignored based on gitignore patterns."""
        for pattern in self.patterns:
            if fnmatch.fnmatch(path, pattern):
                return True
        return False


async def find_code_files(root_dir: Path) -> List[Path]:
    """
    Recursively find all code files in a directory.
    
    This function demonstrates several important concepts:
    1. Async file operations for better performance
    2. Gitignore respect for real-world usage
    3. File filtering based on extensions
    4. Directory skipping for efficiency
    
    Args:
        root_dir: Root directory to search
        
    Returns:
        List of code file paths
    """
    logger.info(f"Scanning directory: {root_dir}")
    
    # Initialize gitignore parser
    gitignore = GitignoreParser(root_dir / '.gitignore')
    
    code_files = []
    
    async def scan_directory(directory: Path):
        """Recursively scan a directory for code files."""
        try:
            for item in directory.iterdir():
                # Get relative path for gitignore checking
                relative_path = item.relative_to(root_dir)
                
                # Check gitignore
                if gitignore.should_ignore(str(relative_path)):
                    logger.debug(f"Ignoring (gitignore): {relative_path}")
                    continue
                
                if item.is_directory():
                    # Skip common build/dependency directories
                    if item.name in SKIP_DIRECTORIES:
                        logger.debug(f"Skipping directory: {item.name}")
                        continue
                    
                    # Recursively scan subdirectory
                    await scan_directory(item)
                
                elif item.is_file():
                    # Check if it's a code file
                    if item.suffix.lower() in EXTENSION_TO_LANGUAGE:
                        code_files.append(item)
                        logger.debug(f"Found code file: {relative_path}")
        
        except PermissionError:
            logger.warning(f"Permission denied accessing: {directory}")
        except Exception as e:
            logger.error(f"Error scanning {directory}: {e}")
    
    await scan_directory(root_dir)
    
    logger.info(f"Found {len(code_files)} code files")
    return code_files


async def summarize_file(file_path: Path, llm, options: Dict[str, Any]) -> Dict[str, Any]:
    """
    Summarize a single code file.
    
    This function demonstrates:
    1. File size checking (important for LLM limits)
    2. Async file reading
    3. Language detection
    4. Error handling and recovery
    
    Args:
        file_path: Path to the file to summarize
        llm: LLM instance for summarization
        options: Summarization options
        
    Returns:
        Dictionary with file info and summary
    """
    try:
        # Check file size first
        file_size = file_path.stat().st_size
        if file_size > MAX_FILE_SIZE_BYTES:
            logger.warning(f"File too large ({file_size} bytes): {file_path}")
            return {
                'file_path': str(file_path),
                'summary': 'File is too large to summarize.',
                'error': 'file_too_large'
            }
        
        # Read file content asynchronously
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            content = await f.read()
        
        # Detect language
        language = EXTENSION_TO_LANGUAGE.get(file_path.suffix.lower(), 'Unknown')
        
        # Log file stats for debugging
        line_count = content.count('\n') + 1
        char_count = len(content)
        logger.debug(f"Processing {file_path.name}: {line_count} lines, {char_count} chars, {language}")
        
        # Generate summary
        summary = await llm.summarize(content, language, options)
        
        return {
            'file_path': str(file_path),
            'language': language,
            'summary': summary,
            'stats': {
                'lines': line_count,
                'characters': char_count,
                'size_bytes': file_size
            }
        }
    
    except UnicodeDecodeError:
        logger.error(f"Could not decode file (binary?): {file_path}")
        return {
            'file_path': str(file_path),
            'summary': 'Could not read file (appears to be binary).',
            'error': 'decode_error'
        }
    
    except Exception as e:
        logger.error(f"Error processing {file_path}: {e}")
        return {
            'file_path': str(file_path),
            'summary': f'Error processing file: {str(e)}',
            'error': 'processing_error'
        }


async def summarize_files_batch(file_paths: List[Path], llm, options: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Summarize multiple files concurrently.
    
    This demonstrates:
    1. Concurrent processing for efficiency
    2. Batch size management to avoid overwhelming the API
    3. Progress tracking
    4. Error isolation (one file failure doesn't stop others)
    
    Args:
        file_paths: List of file paths to process
        llm: LLM instance
        options: Summarization options
        
    Returns:
        List of summary results
    """
    batch_size = options.get('batch_size', DEFAULT_BATCH_SIZE)
    all_results = []
    
    # Process files in batches to manage API rate limits
    for i in range(0, len(file_paths), batch_size):
        batch = file_paths[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(file_paths) + batch_size - 1) // batch_size
        
        logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} files)")
        
        # Create tasks for concurrent processing
        tasks = [summarize_file(file_path, llm, options) for file_path in batch]
        
        # Execute batch concurrently
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        for j, result in enumerate(batch_results):
            if isinstance(result, Exception):
                logger.error(f"Batch processing error for {batch[j]}: {result}")
                all_results.append({
                    'file_path': str(batch[j]),
                    'summary': f'Batch processing failed: {str(result)}',
                    'error': 'batch_error'
                })
            else:
                all_results.append(result)
        
        # Small delay between batches to be respectful to the API
        if i + batch_size < len(file_paths):
            await asyncio.sleep(1)
    
    return all_results


async def summarize_directory(root_dir: Path, output_path: Path, llm, options: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Main function to summarize all code files in a directory.
    
    This orchestrates the entire workflow:
    1. File discovery
    2. Batch processing
    3. Result aggregation
    4. Output generation
    
    Args:
        root_dir: Directory to process
        output_path: Where to save results
        llm: LLM instance
        options: Processing options
        
    Returns:
        List of summary results
    """
    # Find all code files
    code_files = await find_code_files(root_dir)
    
    if not code_files:
        logger.info("No code files found to process")
        return []
    
    # Process all files
    logger.info(f"Processing {len(code_files)} files...")
    results = await summarize_files_batch(code_files, llm, options)
    
    # Generate output file
    if output_path:
        await write_summaries_to_file(results, output_path, root_dir)
    
    return results


async def write_summaries_to_file(results: List[Dict[str, Any]], output_path: Path, root_dir: Path):
    """
    Write summaries to an output file.
    
    This demonstrates structured output generation for agentic AI tools.
    """
    logger.info(f"Writing summaries to {output_path}")
    
    async with aiofiles.open(output_path, 'w', encoding='utf-8') as f:
        for result in results:
            # Calculate relative path for cleaner output
            file_path = Path(result['file_path'])
            try:
                relative_path = file_path.relative_to(root_dir)
            except ValueError:
                relative_path = file_path
            
            await f.write(f"{relative_path}\n")
            await f.write(f"{result['summary']}\n\n")
    
    logger.info(f"Summaries written to {output_path}")