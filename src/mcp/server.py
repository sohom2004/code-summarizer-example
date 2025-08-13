"""
MCP Server implementation for code summarization.

This demonstrates the core concepts of MCP servers in agentic AI:
1. Resources: Data that AI agents can access
2. Tools: Functions that AI agents can call
3. Prompts: Templates for common tasks
4. Server lifecycle management

MCP enables AI agents (like Claude, Cursor, etc.) to interact with your tools
in a standardized way, making your code summarizer available to any MCP-compatible agent.
"""

import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Resource, Tool, Prompt, TextContent, ImageContent, EmbeddedResource,
    CallToolRequest, GetPromptRequest, GetResourceRequest, ListResourcesRequest,
    ListToolsRequest, ListPromptsRequest
)

from ..config.settings import get_config
from ..summarizer.gemini_llm import GeminiLLM
from ..summarizer.file_processor import find_code_files, summarize_directory, EXTENSION_TO_LANGUAGE

logger = logging.getLogger(__name__)


class CodeSummarizerMCPServer:
    """
    MCP Server for code summarization.
    
    This class demonstrates how to build an MCP server that exposes
    your functionality to AI agents. The key concepts are:
    
    1. Resources: Things agents can read (files, summaries)
    2. Tools: Functions agents can call (summarize, configure)
    3. Prompts: Templates agents can use for common tasks
    """
    
    def __init__(self):
        self.server = Server("code-summarizer")
        self.llm: Optional[GeminiLLM] = None
        self._setup_handlers()
    
    def _setup_handlers(self):
        """Set up all the MCP handlers."""
        
        # Resource handlers - what data can agents access?
        @self.server.list_resources()
        async def list_resources() -> List[Resource]:
            """
            List available resources.
            
            Resources are data that AI agents can read. In our case:
            - Code files in the current directory
            - Previously generated summaries
            """
            resources = []
            
            # Add code files as resources
            try:
                code_files = await find_code_files(Path.cwd())
                for file_path in code_files[:50]:  # Limit to avoid overwhelming
                    relative_path = file_path.relative_to(Path.cwd())
                    resources.append(Resource(
                        uri=f"file://{relative_path}",
                        name=f"Code file: {relative_path}",
                        description=f"{EXTENSION_TO_LANGUAGE.get(file_path.suffix, 'Unknown')} file",
                        mimeType="text/plain"
                    ))
            except Exception as e:
                logger.error(f"Error listing code files: {e}")
            
            return resources
        
        @self.server.get_resource()
        async def get_resource(uri: str) -> str:
            """
            Get the content of a specific resource.
            
            This allows AI agents to read the actual content of files.
            """
            if uri.startswith("file://"):
                file_path = Path(uri[7:])  # Remove "file://" prefix
                try:
                    if file_path.exists() and file_path.is_file():
                        return file_path.read_text(encoding='utf-8')
                    else:
                        raise FileNotFoundError(f"File not found: {file_path}")
                except Exception as e:
                    raise Exception(f"Error reading file: {e}")
            else:
                raise ValueError(f"Unsupported URI scheme: {uri}")
        
        # Tool handlers - what functions can agents call?
        @self.server.list_tools()
        async def list_tools() -> List[Tool]:
            """
            List available tools.
            
            Tools are functions that AI agents can call. Our tools:
            - summarize_file: Summarize a single file
            - summarize_directory: Summarize all files in a directory
            - configure: Update settings
            """
            return [
                Tool(
                    name="summarize_file",
                    description="Summarize a single code file",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "file_path": {
                                "type": "string",
                                "description": "Path to the file to summarize"
                            },
                            "detail_level": {
                                "type": "string",
                                "enum": ["low", "medium", "high"],
                                "description": "Level of detail for the summary",
                                "default": "medium"
                            },
                            "max_length": {
                                "type": "integer",
                                "description": "Maximum length of the summary in characters",
                                "default": 500
                            }
                        },
                        "required": ["file_path"]
                    }
                ),
                Tool(
                    name="summarize_directory",
                    description="Summarize all code files in a directory",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "directory": {
                                "type": "string",
                                "description": "Path to the directory to summarize",
                                "default": "."
                            },
                            "detail_level": {
                                "type": "string",
                                "enum": ["low", "medium", "high"],
                                "description": "Level of detail for summaries",
                                "default": "medium"
                            },
                            "max_length": {
                                "type": "integer",
                                "description": "Maximum length of each summary in characters",
                                "default": 500
                            },
                            "output_file": {
                                "type": "string",
                                "description": "Optional file to save summaries to"
                            }
                        }
                    }
                ),
                Tool(
                    name="configure",
                    description="Update configuration settings",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "api_key": {
                                "type": "string",
                                "description": "Gemini API key"
                            },
                            "port": {
                                "type": "integer",
                                "description": "MCP server port"
                            },
                            "detail_level": {
                                "type": "string",
                                "enum": ["low", "medium", "high"],
                                "description": "Default detail level"
                            },
                            "max_length": {
                                "type": "integer",
                                "description": "Default maximum summary length"
                            }
                        }
                    }
                )
            ]
        
        @self.server.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
            """
            Handle tool calls from AI agents.
            
            This is where the actual work happens when an agent calls one of our tools.
            """
            try:
                if name == "summarize_file":
                    return await self._handle_summarize_file(arguments)
                elif name == "summarize_directory":
                    return await self._handle_summarize_directory(arguments)
                elif name == "configure":
                    return await self._handle_configure(arguments)
                else:
                    raise ValueError(f"Unknown tool: {name}")
            except Exception as e:
                logger.error(f"Tool call error ({name}): {e}")
                return [TextContent(type="text", text=f"Error: {str(e)}")]
        
        # Prompt handlers - what templates can agents use?
        @self.server.list_prompts()
        async def list_prompts() -> List[Prompt]:
            """
            List available prompt templates.
            
            Prompts are templates that help AI agents use your tools effectively.
            """
            return [
                Prompt(
                    name="analyze_codebase",
                    description="Analyze and summarize an entire codebase",
                    arguments=[
                        {
                            "name": "directory",
                            "description": "Directory to analyze",
                            "required": False
                        },
                        {
                            "name": "focus",
                            "description": "What to focus on (architecture, functionality, etc.)",
                            "required": False
                        }
                    ]
                ),
                Prompt(
                    name="explain_file",
                    description="Get a detailed explanation of a specific file",
                    arguments=[
                        {
                            "name": "file_path",
                            "description": "Path to the file to explain",
                            "required": True
                        }
                    ]
                )
            ]
        
        @self.server.get_prompt()
        async def get_prompt(name: str, arguments: Dict[str, Any]) -> str:
            """
            Generate prompt content based on templates.
            
            This helps AI agents use your tools more effectively by providing
            structured prompts for common tasks.
            """
            if name == "analyze_codebase":
                directory = arguments.get("directory", ".")
                focus = arguments.get("focus", "overall architecture and functionality")
                
                return f"""Please analyze the codebase in the directory '{directory}' with a focus on {focus}.

Use the summarize_directory tool to get summaries of all code files, then provide:
1. Overall architecture and structure
2. Key components and their purposes
3. Main functionality and features
4. Notable patterns or design decisions
5. Suggestions for improvement or areas of interest

Start by calling: summarize_directory with directory="{directory}" """
            
            elif name == "explain_file":
                file_path = arguments.get("file_path")
                if not file_path:
                    raise ValueError("file_path is required for explain_file prompt")
                
                return f"""Please provide a detailed explanation of the file '{file_path}'.

Use the summarize_file tool with high detail level to get a comprehensive summary, then explain:
1. What this file does and its purpose
2. Key functions, classes, or components
3. How it fits into the larger codebase
4. Any notable implementation details
5. Potential improvements or concerns

Start by calling: summarize_file with file_path="{file_path}" and detail_level="high" """
            
            else:
                raise ValueError(f"Unknown prompt: {name}")
    
    async def _ensure_llm(self):
        """Ensure LLM is initialized with current config."""
        if self.llm is None:
            config = get_config()
            if not config.api_key:
                raise ValueError("API key not configured. Use the configure tool to set it.")
            self.llm = GeminiLLM(config.api_key)
    
    async def _handle_summarize_file(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """Handle the summarize_file tool call."""
        await self._ensure_llm()
        
        file_path = Path(arguments["file_path"])
        options = {
            "detail_level": arguments.get("detail_level", "medium"),
            "max_length": arguments.get("max_length", 500)
        }
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Import here to avoid circular imports
        from ..summarizer.file_processor import summarize_file
        
        result = await summarize_file(file_path, self.llm, options)
        
        if "error" in result:
            return [TextContent(type="text", text=f"Error: {result['summary']}")]
        
        response = f"File: {result['file_path']}\n"
        response += f"Language: {result.get('language', 'Unknown')}\n"
        response += f"Summary: {result['summary']}\n"
        
        if "stats" in result:
            stats = result["stats"]
            response += f"\nFile Statistics:\n"
            response += f"- Lines: {stats['lines']}\n"
            response += f"- Characters: {stats['characters']}\n"
            response += f"- Size: {stats['size_bytes']} bytes"
        
        return [TextContent(type="text", text=response)]
    
    async def _handle_summarize_directory(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """Handle the summarize_directory tool call."""
        await self._ensure_llm()
        
        directory = Path(arguments.get("directory", "."))
        output_file = arguments.get("output_file")
        options = {
            "detail_level": arguments.get("detail_level", "medium"),
            "max_length": arguments.get("max_length", 500)
        }
        
        if not directory.exists() or not directory.is_directory():
            raise ValueError(f"Directory not found: {directory}")
        
        output_path = Path(output_file) if output_file else None
        results = await summarize_directory(directory, output_path, self.llm, options)
        
        if not results:
            return [TextContent(type="text", text="No code files found to summarize.")]
        
        # Format results
        response = f"Summarized {len(results)} files from {directory}:\n\n"
        
        for result in results:
            file_path = Path(result['file_path'])
            try:
                relative_path = file_path.relative_to(directory)
            except ValueError:
                relative_path = file_path
            
            response += f"**{relative_path}**\n"
            response += f"{result['summary']}\n\n"
        
        if output_file:
            response += f"\nSummaries also saved to: {output_file}"
        
        return [TextContent(type="text", text=response)]
    
    async def _handle_configure(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """Handle the configure tool call."""
        from ..config.settings import update_config
        
        # Filter out None values
        updates = {k: v for k, v in arguments.items() if v is not None}
        
        if not updates:
            config = get_config()
            response = "Current configuration:\n"
            response += f"- API Key: {'***' if config.api_key else 'Not set'}\n"
            response += f"- Port: {config.port}\n"
            response += f"- Detail Level: {config.summary_options.detail_level}\n"
            response += f"- Max Length: {config.summary_options.max_length}"
            return [TextContent(type="text", text=response)]
        
        # Handle summary options
        if 'detail_level' in updates or 'max_length' in updates:
            config = get_config()
            summary_options = config.summary_options.dict()
            
            if 'detail_level' in updates:
                summary_options['detail_level'] = updates.pop('detail_level')
            if 'max_length' in updates:
                summary_options['max_length'] = updates.pop('max_length')
            
            updates['summary_options'] = summary_options
        
        # Update configuration
        new_config = update_config(updates)
        
        # Reset LLM if API key changed
        if 'api_key' in arguments:
            self.llm = None
        
        response = "Configuration updated:\n"
        for key, value in arguments.items():
            if key == 'api_key':
                response += f"- {key}: ***\n"
            else:
                response += f"- {key}: {value}\n"
        
        return [TextContent(type="text", text=response)]


async def start_mcp_server():
    """
    Start the MCP server using stdio transport.
    
    This is the main entry point for the MCP server. It uses stdio transport,
    which is the standard way MCP servers communicate with clients.
    
    The server will:
    1. Initialize the MCP server
    2. Set up all handlers (resources, tools, prompts)
    3. Start listening for client connections
    4. Handle requests until shutdown
    """
    logger.info("Starting Code Summarizer MCP Server...")
    
    # Create server instance
    server_instance = CodeSummarizerMCPServer()
    
    # Run with stdio transport (standard for MCP)
    async with stdio_server() as (read_stream, write_stream):
        await server_instance.server.run(
            read_stream,
            write_stream,
            server_instance.server.create_initialization_options()
        )


if __name__ == "__main__":
    # This allows running the server directly
    asyncio.run(start_mcp_server())