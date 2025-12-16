/**
 * MCP Server Module
 * Creates and runs an MCP server from OpenAPI spec
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { SpeckyConfig, GeneratedTool } from '../types/index.js';
/**
 * Create Specky MCP Server
 */
export declare function createSpeckyServer(config: SpeckyConfig): Promise<{
    server: Server;
    tools: GeneratedTool[];
    start: () => Promise<void>;
}>;
/**
 * Run Specky server with config
 */
export declare function runSpeckyServer(config: SpeckyConfig): Promise<void>;
//# sourceMappingURL=mcp-server.d.ts.map