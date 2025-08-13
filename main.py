#!/usr/bin/env python3
"""
Main entry point for the Python MCP Code Summarizer.

This demonstrates key concepts in agentic AI and MCP servers:
1. Command-line interface for human interaction
2. MCP server for AI agent integration
3. Configuration management for different environments
4. Modular architecture for maintainability
"""

import asyncio
import sys
from pathlib import Path
from typing import Optional

import click
from dotenv import load_dotenv

# Load environment variables early
load_dotenv()

# Import our modules (organized for clarity)
from src.config.settings import get_config, update_config, reset_config
from src.summarizer.gemini_llm import GeminiLLM
from src.summarizer.file_processor import find_code_files, summarize_directory
from src.mcp.server import start_mcp_server


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """
    A tool to summarize code files using Gemini Flash 2.0.
    
    This CLI demonstrates how agentic AI tools can be built with:
    - Human-friendly command interfaces
    - AI agent integration via MCP
    - Flexible configuration management
    """
    pass


@cli.command()
@click.argument('root_dir', default='.', type=click.Path(exists=True))
@click.argument('output_file', default='summaries.txt')
@click.option('--detail', '-d', 
              type=click.Choice(['low', 'medium', 'high']), 
              default='medium',
              help='Level of detail for summaries')
@click.option('--max-length', '-l', 
              type=int, 
              default=500,
              help='Maximum summary length in characters')
async def summarize(root_dir: str, output_file: str, detail: str, max_length: int):
    """
    Summarize code files in a directory.
    
    This command demonstrates the core workflow:
    1. Discover code files (respecting .gitignore)
    2. Process them through an LLM
    3. Generate structured summaries
    
    Args:
        root_dir: Directory to scan for code files
        output_file: Where to save the summaries
        detail: How detailed the summaries should be
        max_length: Maximum characters per summary
    """
    try:
        # Get configuration (demonstrates config management)
        config = get_config()
        api_key = config.api_key or None
        
        if not api_key:
            click.echo("❌ API key not set. Use 'python main.py config set --api-key <key>' or set GOOGLE_API_KEY environment variable.")
            sys.exit(1)
        
        # Initialize the LLM (demonstrates dependency injection pattern)
        llm = GeminiLLM(api_key)
        
        # Create summary options (demonstrates structured configuration)
        options = {
            'detail_level': detail,
            'max_length': max_length
        }
        
        click.echo(f"🔍 Scanning directory: {root_dir}")
        click.echo(f"📝 Output file: {output_file}")
        click.echo(f"🎯 Detail level: {detail}")
        click.echo(f"📏 Max length: {max_length}")
        
        # Process the directory (main business logic)
        summaries = await summarize_directory(
            root_dir=Path(root_dir),
            output_path=Path(output_file),
            llm=llm,
            options=options
        )
        
        click.echo(f"✅ Successfully processed {len(summaries)} files!")
        
    except Exception as e:
        click.echo(f"❌ Error: {e}")
        sys.exit(1)


@cli.command()
async def server():
    """
    Start the MCP server for AI agent integration.
    
    This demonstrates how to create an MCP server that AI agents
    (like Claude, Cursor, etc.) can connect to and use your tools.
    
    The server exposes:
    - Resources: Access to code files and summaries
    - Tools: Functions agents can call
    - Prompts: Templates for common tasks
    """
    try:
        click.echo("🚀 Starting MCP server...")
        await start_mcp_server()
    except KeyboardInterrupt:
        click.echo("\n👋 MCP server stopped")
    except Exception as e:
        click.echo(f"❌ Server error: {e}")
        sys.exit(1)


@cli.group()
def config():
    """Manage configuration settings."""
    pass


@config.command('show')
def config_show():
    """Show current configuration."""
    config = get_config()
    # Don't show the actual API key for security
    safe_config = {
        'api_key': '***' if config.api_key else None,
        'port': config.port,
        'summary_options': config.summary_options
    }
    click.echo("Current configuration:")
    for key, value in safe_config.items():
        click.echo(f"  {key}: {value}")


@config.command('set')
@click.option('--api-key', help='Set the Gemini API key')
@click.option('--port', type=int, help='Set the MCP server port')
@click.option('--detail-level', 
              type=click.Choice(['low', 'medium', 'high']),
              help='Set default detail level')
@click.option('--max-length', type=int, help='Set default maximum summary length')
def config_set(api_key: Optional[str], port: Optional[int], 
               detail_level: Optional[str], max_length: Optional[int]):
    """Set configuration options."""
    updates = {}
    
    if api_key:
        updates['api_key'] = api_key
    if port:
        updates['port'] = port
    if detail_level or max_length:
        current_config = get_config()
        summary_options = current_config.summary_options.copy()
        if detail_level:
            summary_options['detail_level'] = detail_level
        if max_length:
            summary_options['max_length'] = max_length
        updates['summary_options'] = summary_options
    
    if updates:
        new_config = update_config(updates)
        click.echo("✅ Configuration updated!")
    else:
        click.echo("No changes specified.")


@config.command('reset')
def config_reset():
    """Reset configuration to defaults."""
    reset_config()
    click.echo("✅ Configuration reset to defaults.")


def main():
    """
    Main entry point that handles async commands.
    
    This pattern is common in modern Python CLI tools that need
    to handle async operations (like API calls).
    """
    # Check if we're running an async command
    if len(sys.argv) > 1 and sys.argv[1] in ['summarize', 'server']:
        # Run async version
        asyncio.run(cli())
    else:
        # Run sync version for config commands
        cli()


if __name__ == '__main__':
    main()