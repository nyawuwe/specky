/**
 * MCP Tool Generator
 * Converts parsed OpenAPI endpoints to MCP tools
 */
import type { ParsedSpec, ParsedEndpoint, GeneratedTool } from '../types/index.js';
/**
 * Convert a single endpoint to MCP tool
 */
export declare function endpointToTool(endpoint: ParsedEndpoint): GeneratedTool;
/**
 * Generate all MCP tools from parsed spec
 */
export declare function generateTools(spec: ParsedSpec): GeneratedTool[];
/**
 * Group tools by tag
 */
export declare function groupToolsByTag(tools: GeneratedTool[]): Map<string, GeneratedTool[]>;
/**
 * Get summary of generated tools
 */
export declare function getToolsSummary(tools: GeneratedTool[]): {
    total: number;
    byMethod: Record<string, number>;
    byTag: Record<string, number>;
};
//# sourceMappingURL=mcp-tools.d.ts.map