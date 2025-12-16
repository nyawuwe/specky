// Type definitions for Specky

import type { OpenAPI, OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

/**
 * Authentication configuration options
 */
export interface AuthConfig {
  type: 'none' | 'apikey' | 'bearer' | 'basic' | 'oauth2';
  /** API key value or Bearer token */
  token?: string;
  /** Header name for API key (default: X-API-Key) */
  headerName?: string;
  /** Username for basic auth */
  username?: string;
  /** Password for basic auth */
  password?: string;
  /** OAuth2 client ID */
  clientId?: string;
  /** OAuth2 client secret */
  clientSecret?: string;
  /** OAuth2 token URL */
  tokenUrl?: string;
}

/**
 * Specky server configuration
 */
export interface SpeckyConfig {
  /** Path or URL to Swagger/OpenAPI spec */
  spec: string;
  /** Authentication configuration */
  auth?: AuthConfig;
  /** Override base URL from spec */
  baseUrl?: string;
  /** Verbose logging */
  verbose?: boolean;
  /** Server name for MCP */
  serverName?: string;
  /** Server version */
  serverVersion?: string;
}

/**
 * Parsed endpoint from OpenAPI spec
 */
export interface ParsedEndpoint {
  /** Operation ID or generated ID */
  operationId: string;
  /** HTTP method */
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';
  /** Path template (e.g., /pets/{id}) */
  path: string;
  /** Human-readable summary */
  summary?: string;
  /** Detailed description */
  description?: string;
  /** Path parameters */
  pathParams: ParameterInfo[];
  /** Query parameters */
  queryParams: ParameterInfo[];
  /** Header parameters */
  headerParams: ParameterInfo[];
  /** Request body schema */
  requestBody?: RequestBodyInfo;
  /** Response schemas */
  responses: ResponseInfo[];
  /** Tags for grouping */
  tags: string[];
  /** Security requirements */
  security: string[];
}

/**
 * Parameter information
 */
export interface ParameterInfo {
  name: string;
  required: boolean;
  description?: string;
  type: string;
  format?: string;
  enum?: string[];
  default?: unknown;
}

/**
 * Request body information
 */
export interface RequestBodyInfo {
  required: boolean;
  description?: string;
  contentType: string;
  schema: Record<string, unknown>;
}

/**
 * Response information
 */
export interface ResponseInfo {
  statusCode: string;
  description?: string;
  contentType?: string;
  schema?: Record<string, unknown>;
}

/**
 * Generated MCP tool
 */
export interface GeneratedTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
  endpoint: ParsedEndpoint;
}

/**
 * Parsed OpenAPI document
 */
export interface ParsedSpec {
  title: string;
  version: string;
  description?: string;
  baseUrl: string;
  endpoints: ParsedEndpoint[];
}

export type AnyOpenAPISpec = OpenAPI.Document | OpenAPIV2.Document | OpenAPIV3.Document | OpenAPIV3_1.Document;
