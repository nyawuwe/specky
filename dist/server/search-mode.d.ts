/**
 * Search Mode MCP Server
 * Provides a dynamic search-first approach to API discovery
 *
 * Instead of exposing all endpoints as tools, this mode exposes:
 * 1. search_endpoints - Find relevant API endpoints
 * 2. call_endpoint - Call any endpoint dynamically
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { SpeckyConfig, GeneratedTool, ParsedSpec } from '../types/index.js';
/**
 * Create Search Mode MCP Server
 */
export declare function createSearchModeServer(config: SpeckyConfig): Promise<{
    server: Server;
    tools: GeneratedTool[];
    spec: ParsedSpec;
    start: () => Promise<void>;
}>;
//# sourceMappingURL=search-mode.d.ts.map