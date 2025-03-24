# Code Summarizer

A command-line tool that summarizes code files in a given directory using Gemini Flash 2.0.

## Features

- Recursively processes code files in a directory
- Respects `.gitignore` rules
- Skips irrelevant directories like `node_modules`, `dist`, etc.
- Summarizes code files using Gemini Flash 2.0
- Outputs summaries to a text file
- Configurable detail level and summary length
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

## Usage

```bash
# Summarize code in the current directory (output to summaries.txt)
npm start

# Summarize code with specific detail level
npm start -- --detail high

# Set maximum summary length
npm start -- --max-length 1000

# Specify both directory and output file with options
npm start -- /path/to/codebase output.txt --detail low --max-length 500

# Show help
npm start -- --help
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

## Configuration

- The tool uses a file size limit of 500KB to avoid issues with large files.
- Files are processed in batches of 5 to avoid overwhelming the API.
- Detail level can be set to 'low', 'medium', or 'high'.
- Maximum summary length can be configured (default: 500 characters).

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
- `__tests__`: Unit and integration tests
- `__mocks__/mock-codebase`: Mock codebase for testing

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Future Improvements

- Support for more file types
- Rate limiting and retry logic for API calls
- Support for alternative LLM providers
- Integration with an Electron app for a GUI interface
