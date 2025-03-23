# Code Summarizer

A command-line tool that summarizes code files in a given directory using Gemini Flash 2.0.

## Features

- Recursively processes code files in a directory
- Respects `.gitignore` rules
- Skips irrelevant directories like `node_modules`, `dist`, etc.
- Summarizes code files using Gemini Flash 2.0
- Outputs summaries to a text file
- Modular design for easy integration into other applications

## Requirements

- Node.js 18+
- pnpm

## Installation

1. Clone the repository
   ```bash
   git clone https://github.com/nicobailon/code-summarizer.git
   cd code-summarizer
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env` file with your Google API key:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

## Usage

```bash
# Summarize code in the current directory (output to summaries.txt)
pnpm start

# Summarize code in a specific directory
pnpm start /path/to/codebase

# Specify both directory and output file
pnpm start /path/to/codebase output.txt

# Show help
pnpm start --help
```

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
4. It sends the code to Gemini Flash 2.0 with a prompt to summarize.
5. The summaries are collected and written to the specified output file.

## Configuration

- The tool uses a file size limit of 500KB to avoid issues with large files.
- Files are processed in batches of 5 to avoid overwhelming the API.
- These values can be adjusted in the code if needed.

## Output Format

The output file will have the following format:

```
relative/path/to/file
Summary text here

relative/path/to/next/file
Next summary text here
```

## Project Structure

- `index.ts`: Main implementation file
- `tsconfig.json`: TypeScript configuration
- `package.json`: Project dependencies and scripts
- `.env.example`: Template for setting up environment variables
- `.gitignore`: Files and directories to ignore in Git

## Future Improvements

- Support for more file types
- Configuration options via command-line flags
- Rate limiting and retry logic for API calls
- Support for alternative LLM providers
- Integration with an Electron app for a GUI interface
