/**
 * Specky - Swagger to MCP Server
 * 🦔 Transform Swagger/OpenAPI specs into MCP servers for LLMs
 */

// Types
export type {
  AuthConfig,
  SpeckyConfig,
  ParsedEndpoint,
  ParameterInfo,
  RequestBodyInfo,
  ResponseInfo,
  GeneratedTool,
  ParsedSpec,
} from './types/index.js';

// Parser
export {
  parseSpec,
  loadSpec,
  validateSpec,
} from './parser/swagger.js';

// Generator
export {
  endpointToTool,
  generateTools,
  groupToolsByTag,
  getToolsSummary,
} from './generator/mcp-tools.js';

// Auth
export {
  getAuthHeaders,
  getOAuth2Token,
  createAuthenticatedFetch,
  parseAuthFromOptions,
} from './auth/handlers.js';

// Server
export {
  createSpeckyServer,
  runSpeckyServer,
} from './server/mcp-server.js';

// Search Mode Server
export {
  createSearchModeServer,
} from './server/search-mode.js';
