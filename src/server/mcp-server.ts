/**
 * MCP Server Module
 * Creates and runs an MCP server from OpenAPI spec
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { parseSpec } from '../parser/swagger.js';
import { generateTools } from '../generator/mcp-tools.js';
import { createAuthenticatedFetch } from '../auth/handlers.js';
import type { SpeckyConfig, GeneratedTool, ParsedEndpoint } from '../types/index.js';

/**
 * Build URL with path and query parameters
 */
function buildUrl(
  baseUrl: string,
  endpoint: ParsedEndpoint,
  args: Record<string, unknown>
): string {
  let url = baseUrl + endpoint.path;

  // Replace path parameters
  for (const param of endpoint.pathParams) {
    const value = args[param.name];
    if (value !== undefined) {
      url = url.replace(`{${param.name}}`, encodeURIComponent(String(value)));
    }
  }

  // Add query parameters
  const queryParams = new URLSearchParams();
  for (const param of endpoint.queryParams) {
    const value = args[param.name];
    if (value !== undefined) {
      queryParams.set(param.name, String(value));
    }
  }

  const queryString = queryParams.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  return url;
}

/**
 * Extract body from arguments
 */
function extractBody(
  endpoint: ParsedEndpoint,
  args: Record<string, unknown>
): unknown | undefined {
  if (!endpoint.requestBody) return undefined;

  // If there's a 'body' argument, use it directly
  if (args.body !== undefined) {
    return args.body;
  }

  // Otherwise, collect all non-path, non-query args as body
  const bodyArgs: Record<string, unknown> = {};
  const pathParamNames = new Set(endpoint.pathParams.map((p) => p.name));
  const queryParamNames = new Set(endpoint.queryParams.map((p) => p.name));

  for (const [key, value] of Object.entries(args)) {
    if (!pathParamNames.has(key) && !queryParamNames.has(key)) {
      bodyArgs[key] = value;
    }
  }

  return Object.keys(bodyArgs).length > 0 ? bodyArgs : undefined;
}

/**
 * Execute an API call
 */
async function executeApiCall(
  baseUrl: string,
  endpoint: ParsedEndpoint,
  args: Record<string, unknown>,
  authenticatedFetch: (url: string, init?: RequestInit) => Promise<Response>
): Promise<unknown> {
  const url = buildUrl(baseUrl, endpoint, args);
  const body = extractBody(endpoint, args);

  const headers: Record<string, string> = {};
  if (endpoint.requestBody?.contentType) {
    headers['Content-Type'] = endpoint.requestBody.contentType;
  }

  // Add header parameters
  for (const param of endpoint.headerParams) {
    const value = args[param.name];
    if (value !== undefined) {
      headers[param.name] = String(value);
    }
  }

  const response = await authenticatedFetch(url, {
    method: endpoint.method.toUpperCase(),
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    return await response.json();
  } else {
    return await response.text();
  }
}

/**
 * Create Specky MCP Server
 */
export async function createSpeckyServer(config: SpeckyConfig): Promise<{
  server: Server;
  tools: GeneratedTool[];
  start: () => Promise<void>;
}> {
  // Parse the spec
  const spec = await parseSpec(config.spec);
  const baseUrl = config.baseUrl || spec.baseUrl;

  // Generate tools
  const tools = generateTools(spec);

  // Create authenticated fetch
  const authenticatedFetch = createAuthenticatedFetch(config.auth);

  // Create MCP server
  const server = new Server(
    {
      name: config.serverName || `specky-${spec.title.toLowerCase().replace(/\s+/g, '-')}`,
      version: config.serverVersion || '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Handle call tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = (request.params.arguments || {}) as Record<string, unknown>;

    const tool = tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    if (config.verbose) {
      console.error(`[Specky] Calling ${tool.endpoint.method.toUpperCase()} ${tool.endpoint.path}`);
    }

    try {
      const result = await executeApiCall(baseUrl, tool.endpoint, args, authenticatedFetch);

      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start function
  const start = async () => {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  };

  return { server, tools, start };
}

/**
 * Run Specky server with config
 */
export async function runSpeckyServer(config: SpeckyConfig): Promise<void> {
  const { start } = await createSpeckyServer(config);
  await start();
}
