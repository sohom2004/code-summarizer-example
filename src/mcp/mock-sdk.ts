// This file provides mock implementations of the MCP SDK classes
// It's used for building and testing without requiring the actual MCP SDK

export class McpServer {
  private options: any;
  public prompts: { add: (prompt: any) => void; getAll: () => any[] };
  public resources: { add: (resource: any) => void; getAll: () => any[] };
  public tools: { add: (tool: any) => void; getAll: () => any[] };

  constructor(options: any) {
    this.options = options;
    
    // Initialize collections
    const promptsList: any[] = [];
    const resourcesList: any[] = [];
    const toolsList: any[] = [];
    
    this.prompts = {
      add: (prompt: any) => promptsList.push(prompt),
      getAll: () => promptsList
    };
    
    this.resources = {
      add: (resource: any) => resourcesList.push(resource),
      getAll: () => resourcesList
    };
    
    this.tools = {
      add: (tool: any) => toolsList.push(tool),
      getAll: () => toolsList
    };
  }
  
  async start(): Promise<void> {
    console.log(`[Mock MCP Server] Started on port ${this.options.port}`);
  }
  
  async stop(): Promise<void> {
    console.log('[Mock MCP Server] Stopped');
  }
}

export class McpPromptTemplate {
  public name: string;
  public description: string;
  private schema: any;
  private renderFn: (data: any) => string;
  
  constructor(options: any) {
    this.name = options.name;
    this.description = options.description;
    this.schema = options.schema;
    this.renderFn = options.render;
  }
  
  render(data: any): string {
    return this.renderFn(data);
  }
}

export class McpResource {
  public name: string;
  public namespace: string;
  public pattern: string;
  public description: string;
  private fetchFn: (uri: any, context?: any) => Promise<any>;
  
  constructor(options: any) {
    this.name = options.name;
    this.namespace = options.namespace;
    this.pattern = options.pattern;
    this.description = options.description;
    this.fetchFn = options.fetch;
  }
  
  async fetch(uri: any, context?: any): Promise<any> {
    return this.fetchFn(uri, context);
  }
}

export class McpTool {
  public name: string;
  public description: string;
  private schema: any;
  private invokeFn: (data: any, context?: any) => Promise<any>;
  
  constructor(options: any) {
    this.name = options.name;
    this.description = options.description;
    this.schema = options.schema;
    this.invokeFn = options.invoke;
  }
  
  async invoke(data: any, context?: any): Promise<any> {
    return this.invokeFn(data, context);
  }
}