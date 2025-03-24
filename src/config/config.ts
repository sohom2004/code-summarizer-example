import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigType, defaultConfig } from './schema.js';

// Load environment variables
dotenv.config();

// Simple config store implementation that uses a JSON file
class ConfigStore {
  private data: ConfigType;
  private filePath: string;
  
  constructor() {
    // Use config.json in the project root
    this.filePath = path.resolve(process.cwd(), 'config.json');
    this.data = this.load();
  }
  
  private load(): ConfigType {
    try {
      // Always prioritize environment variables for sensitive data
      const apiKey = process.env.GOOGLE_API_KEY || '';
      
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const fileConfig = JSON.parse(content);
        
        // Don't load API key from file if env var exists
        return {
          ...fileConfig,
          apiKey: apiKey || fileConfig.apiKey || defaultConfig.apiKey
        };
      }
      
      // If no file, use default with environment variables
      return {
        ...defaultConfig,
        apiKey
      };
    } catch (error) {
      console.error(`Error loading config from ${this.filePath}:`, error);
      return {
        ...defaultConfig,
        apiKey: process.env.GOOGLE_API_KEY || defaultConfig.apiKey
      };
    }
  }
  
  save(): void {
    try {
      // Create a sanitized version for storage (without sensitive data)
      const storageData = { ...this.data };
      
      // Only write API key to file if not available as env var
      if (process.env.GOOGLE_API_KEY) {
        storageData.apiKey = ''; // Don't save actual API key to file when using env var
      }
      
      fs.writeFileSync(this.filePath, JSON.stringify(storageData, null, 2));
    } catch (error) {
      console.error(`Error saving config to ${this.filePath}:`, error);
    }
  }
  
  get store(): ConfigType {
    // Always get the most recent environment variable
    if (process.env.GOOGLE_API_KEY) {
      this.data.apiKey = process.env.GOOGLE_API_KEY;
    }
    return this.data;
  }
  
  set(key: string, value: any): void {
    (this.data as any)[key] = value;
    this.save();
  }
  
  clear(): void {
    this.data = {
      ...defaultConfig,
      apiKey: process.env.GOOGLE_API_KEY || defaultConfig.apiKey
    };
    this.save();
  }
}

// Create configuration store
const store = new ConfigStore();

/**
 * Get current configuration
 */
export function getConfig(): ConfigType {
  return store.store;
}

/**
 * Update configuration
 */
export function updateConfig(config: Partial<ConfigType>): ConfigType {
  // Merge with existing config
  const newConfig = { ...store.store, ...config };
  
  // Update store
  Object.entries(config).forEach(([key, value]) => {
    store.set(key, value);
  });
  
  return store.store;
}

/**
 * Validate API key format
 * Returns true if valid, false if invalid
 */
export function validateApiKey(apiKey: string): boolean {
  // Basic validation - adjust based on your API key format
  return /^[A-Za-z0-9_-]{10,}$/.test(apiKey);
}

/**
 * Set API key with validation
 * @throws Error if API key is invalid
 */
export function setApiKey(apiKey: string): void {
  if (!validateApiKey(apiKey)) {
    throw new Error('Invalid API key format');
  }
  updateConfig({ apiKey });
}

/**
 * Set server port
 */
export function setPort(port: number): void {
  updateConfig({ port });
}

/**
 * Set default summary options
 */
export function setSummaryOptions(options: ConfigType['summaryOptions']): void {
  updateConfig({ summaryOptions: options });
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  store.clear();
}