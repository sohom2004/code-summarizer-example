# Code Summarizer Development Guidelines

## Build and Test Commands
- Build: `npm run build` (runs TypeScript compiler)
- Run dev: `npm run dev` (executes the program with tsx)
- Run all tests: `npm test` (runs Vitest)
- Run single test: `npm test -- -t "test name pattern"` (e.g., `npm test -- -t "should find code files"`)
- Test with coverage: `npm test --coverage`

## Code Style

### TypeScript
- Use strict mode and strong typing throughout the codebase
- Interfaces for data structures (e.g., `SummaryOptions`, `FileSummary`)
- Create interfaces for dependencies (e.g., `LLM` interface)

### Imports/Exports
- Group imports by type: node built-ins, external packages, then internal modules
- Export functions and classes for testing at the bottom of files

### Error Handling
- Use try/catch blocks with specific error messages
- Log errors with descriptive context (file path, operation)
- Provide fallback values for failed operations

### Naming Conventions
- Classes: PascalCase (e.g., `GeminiLLM`)
- Variables/functions: camelCase
- Constants: UPPER_CASE for true constants, camelCase for others
- Use descriptive, self-documenting names

### Project Structure
- Core functionality in the main file
- Tests organized in `__tests__` directory with `.test.ts` extension
- Mock data in `__mocks__` directory