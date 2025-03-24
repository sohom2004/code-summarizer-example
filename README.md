# Code Summarizer

A command-line tool that summarizes code files in a given directory using Gemini Flash 2.0. Now with MCP server support for integration with LLM tools!

## Features

- Recursively processes code files in a directory
- Respects `.gitignore` rules
- Skips irrelevant directories like `node_modules`, `dist`, etc.
- Summarizes code files using Gemini Flash 2.0
- Outputs summaries to a text file
- Configurable detail level and summary length
- MCP server for integration with Claude Desktop and other LLM tools
- Modular design for easy integration into other applications
- Secure API key management
- Authentication for MCP server endpoints
- Retry mechanism with exponential backoff for LLM calls
- Rate limiting to prevent abuse

## Requirements

- Node.js 18+

## Installation

1. Clone the repository
   ```bash
   git clone https://github.com/nicobailon/code-summarizer.git
   cd code-summarizer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your Google API key:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

4. Build the project:
   ```bash
   npm run build
   ```

## MCP Server Setup and Integration

The code summarizer includes a Model Context Protocol (MCP) server that allows LLM tools like Claude Desktop, Cursor AI, and Cline to access code summaries and file content.

### Starting the MCP Server

```bash
# Start the MCP server
npm start -- server
```

By default, the server runs on port 24312. You can change this in your configuration:

```bash
# Set custom MCP server port
npm start -- config set --port 8080
```

### Connecting with Claude Desktop

1. Start the code-summarizer MCP server
2. Open Claude Desktop and click on the Claude menu, then "Settings..."
3. Navigate to the "Developer" section
4. Create a file at `~/.claude/claude_desktop_config.json` (macOS/Linux) or `%USERPROFILE%\.claude\claude_desktop_config.json` (Windows) with this content:

```json
{
  "code-summarizer": {
    "command": "npx",
    "args": ["-y", "your-path-to-code-summarizer/bin/code-summarizer.js", "server"],
    "env": {
      "GOOGLE_API_KEY": "your_api_key_here"
    }
  }
}
```

5. Restart Claude Desktop
6. After restarting, you can ask Claude to access your codebase, e.g., "Summarize the files in my project"

**Example prompts for Claude Desktop:**
- "Can you summarize all the JavaScript files in my project?"
- "Please give me a high-level overview of my codebase."
- "Explain what the file 'src/config/config.ts' does."
- "Find all functions related to authentication in my code."

### Connecting with Cursor AI

1. Start the code-summarizer MCP server
2. Create a `.cursor/mcp.json` file in your project directory:

```json
{
  "mcpServers": {
    "code-summarizer": {
      "transport": "sse",
      "url": "http://localhost:24312/sse",
      "headers": {
        "x-api-key": "your_api_key_here"
      }
    }
  }
}
```

3. Restart Cursor or reload your project
4. Ask Cursor about your code, e.g., "Can you summarize my codebase?"

**Example prompts for Cursor:**
- "Summarize the structure of this codebase for me."
- "What are the key components in this project?"
- "Give me a detailed explanation of the MCP server implementation."
- "Help me understand how the retry mechanism works."

### Connecting with Cline

1. Start the code-summarizer MCP server
2. In Cline, you can add the MCP server with a command:

```
/mcp add code-summarizer http://localhost:24312/sse
```

3. Then authenticate with your API key:

```
/mcp config code-summarizer headers.x-api-key your_api_key_here
```

4. You can then ask Cline to use the code-summarizer, e.g., "Please summarize my code files"

**Example prompts for Cline:**
- "What does each file in my project do?"
- "Create a summary of all TypeScript files."
- "Explain the authentication flow in this codebase."
- "What are the main functions in the 'summarizer' directory?"

### What You Can Do with the MCP Integration

Using the MCP integration, you can:

1. **Get file summaries**: Request concise explanations of what specific files do
2. **Explore directories**: Browse through your codebase structure
3. **Batch processing**: Summarize multiple files at once
4. **Targeted queries**: Find specific patterns or functionality in your code
5. **Customize summaries**: Control detail level and summary length
6. **Update settings**: Change configuration options through the MCP interface

The MCP server exposes your codebase to the LLM tools in a structured way, allowing them to read, navigate, and summarize your code without having to paste code snippets manually.

## MCP Server Integration Details

### MCP Resources

- `code://file/*` - Access individual code files
- `code://directory/*` - List code files in a directory
- `summary://file/*` - Get summary for a specific file
- `summary://batch/*` - Get summaries for multiple files

### MCP Tools

- `summarize_file` - Summarize a single file with options
- `summarize_directory` - Summarize a directory with options
- `set_config` - Update configuration options

### MCP Prompts

- `code_summary` - Prompt template for summarizing code
- `directory_summary` - Prompt template for summarizing entire directories

## Troubleshooting

### Common MCP Connection Issues

1. **Connection Refused**
   - Make sure the MCP server is running (`npm start -- server`)
   - Verify the port is correct in your configuration
   - Check for firewall issues blocking the connection

2. **Authentication Errors**
   - Verify you've added the correct API key in the headers (`x-api-key`)
   - Check that your API key is valid and properly formatted
   - Make sure environment variables are set correctly

3. **Transport Errors**
   - Ensure the correct transport type is specified (SSE)
   - Check that the URL includes the correct endpoint (`/sse`)
   - Verify network connectivity between the client and server

4. **Permission Issues**
   - Ensure the MCP server has read access to your codebase
   - Check file permissions if summarizing fails for specific files

5. **Claude Desktop Not Finding the MCP Server**
   - Verify the path in `claude_desktop_config.json` is correct
   - Make sure the command and args point to the right location
   - Check Claude Desktop logs for any configuration errors

6. **Rate Limiting**
   - If you see "Too many requests" errors, wait and try again later
   - Consider adjusting the rate limiting settings in the server code

For other issues, check the server logs or open an issue on the GitHub repository.

## Usage

### Command Line Interface

```bash
# Default command (summarize)
npm start -- summarize [directory] [output-file] [options]

# Summarize code in the current directory (output to summaries.txt)
npm start -- summarize

# Summarize code with specific detail level and max length
npm start -- summarize --detail high --max-length 1000

# Show help
npm start -- --help
```

### Configuration Management

```bash
# Set your API key
npm start -- config set --api-key "your-api-key" 

# Set default detail level and max length
npm start -- config set --detail-level high --max-length 1000

# Set MCP server port (default: 24312)
npm start -- config set --port 8080

# Show current configuration
npm start -- config show

# Reset configuration to defaults
npm start -- config reset
```

### API Authentication

When connecting to the MCP server, you need to include your API key in the request headers:

```
x-api-key: your_api_key_here
```

All endpoints (except `/health`) require authentication.

## Options

- `--detail`, `-d`: Set the level of detail for summaries. Options are 'low', 'medium', or 'high'. Default is 'medium'.
- `--max-length`, `-l`: Maximum length of each summary in characters. Default is 500.

## Security Features

### API Key Management

- API keys are stored securely and prioritize environment variables over configuration files
- Keys are validated for proper format before use
- API keys are never exposed in logs or error messages
- Configuration file doesn't store API keys when they're provided via environment variables

### Authentication

- All MCP server endpoints (except health check) require authentication via API key
- Authentication uses the `x-api-key` header for secure transmission
- Failed authentication attempts are logged for security monitoring

### Rate Limiting

- Built-in rate limiting prevents abuse of the service
- Default: 60 requests per minute per IP address
- Configurable through server settings

### Error Handling

- Structured error system with categorization
- Sensitive information is never exposed in error messages
- Proper error codes are returned for different failure scenarios

### LLM Call Resilience 

- Automatic retry with exponential backoff for transient failures
- Configurable retry settings including max retries, delays, and backoff factor
- Jitter added to retry timing to prevent thundering herd problems
- Request ID tracking for tracing issues across the system

## Supported File Types

- TypeScript (.ts, .tsx)
- JavaScript (.js, .jsx)
- Python (.py)
- Java (.java)
- C++ (.cpp)
- C (.c)
- Go (.go)
- Ruby (.rb)
- PHP (.php)
- C# (.cs)
- Swift (.swift)
- Rust (.rs)
- Kotlin (.kt)
- Scala (.scala)
- Vue (.vue)
- HTML (.html)
- CSS (.css, .scss, .less)

## How It Works

1. The tool scans the specified directory recursively, respecting `.gitignore` rules.
2. It filters files based on supported extensions.
3. For each supported file, it reads the content and determines the programming language.
4. It sends the code to Gemini Flash 2.0 with a prompt to summarize, including detail level and length constraints.
5. The summaries are collected and written to the specified output file.

## Output Format

The output file will have the following format:

```
relative/path/to/file
Summary text here

relative/path/to/next/file
Next summary text here
```

## Project Structure

- `index.ts`: Main CLI implementation
- `src/`: Source code directory
  - `summarizer/`: Core summarization functionality
  - `mcp/`: MCP server implementation
  - `config/`: Configuration management
- `bin/`: CLI entrypoint
- `config.json`: Default configuration file
- `tsconfig.json`: TypeScript configuration
- `package.json`: Project dependencies and scripts
- `.env.example`: Template for setting up environment variables
- `.gitignore`: Files and directories to ignore in Git
- `__tests__`: Unit and integration tests
- `__mocks__/mock-codebase`: Mock codebase for testing

## Environment Variables

The following environment variables can be used to configure the application:

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Your Google Gemini API key | None (required) |
| `PORT` | Port for the MCP server | 24312 |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | http://localhost:3000 |
| `LOG_LEVEL` | Logging level (error, warn, info, debug) | info |

See `.env.example` for a template.

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Test MCP server setup
npm run test:setup
```

## Future Improvements

- Support for more file types
- Support for alternative LLM providers
- Integration with an Electron app for a GUI interface
- Enhanced MCP server capabilities
- Advanced token usage tracking
- OpenTelemetry-based observability
- Enhanced audit logging capabilities
- Secret scanning integration