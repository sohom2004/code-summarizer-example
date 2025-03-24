// Interface for summary options
export interface SummaryOptions {
  detailLevel: 'low' | 'medium' | 'high';
  maxLength: number; // Maximum length in characters
}

// Interface for file summary
export interface FileSummary {
  relativePath: string;
  summary: string;
}

// Constants
export const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500KB
export const DEFAULT_BATCH_SIZE = 5;

// Map file extensions to language names
export const extensionToLanguage: Record<string, string> = {
  '.ts': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript (React)',
  '.tsx': 'TypeScript (React)',
  '.py': 'Python',
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
};

// Always skip these directories
export const skipDirectories = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  'bin',
  'obj',
  'target',
  'vendor',
  'venv',
  '.venv',
  'env',
  '.env',
  '__pycache__',
]);