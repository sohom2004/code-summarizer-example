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
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error(`Error loading config from ${this.filePath}:`, error);
    }
    
    // If no file or error, return defaults
    return {
      ...defaultConfig,
      apiKey: process.env.GOOGLE_API_KEY || defaultConfig.apiKey
    };
  }
  
  save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error(`Error saving config to ${this.filePath}:`, error);
    }
  }
  
  get store(): ConfigType {
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
 * Set API key
 */
export function setApiKey(apiKey: string): void {
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