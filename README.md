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

### MCP Server

```bash
# Start the MCP server
npm start -- server
```

## Options

- `--detail`, `-d`: Set the level of detail for summaries. Options are 'low', 'medium', or 'high'. Default is 'medium'.
- `--max-length`, `-l`: Maximum length of each summary in characters. Default is 500.

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

## MCP Server Integration

The code summarizer can be used as an MCP (Model Context Protocol) server, allowing integration with tools like Claude Desktop, Cursor, Anthropic's upcoming IDE plugin, and more.

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

## Configuration

- The tool uses a file size limit of 500KB to avoid issues with large files.
- Files are processed in batches of 5 to avoid overwhelming the API.
- Detail level can be set to 'low', 'medium', or 'high'.
- Maximum summary length can be configured (default: 500 characters).
- All settings can be configured via the `config` command.

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
- Rate limiting and retry logic for API calls
- Support for alternative LLM providers
- Integration with an Electron app for a GUI interface
- Enhanced MCP server capabilities