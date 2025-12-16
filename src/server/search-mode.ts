/**
 * Search Mode MCP Server
 * Provides a dynamic search-first approach to API discovery
 * 
 * Instead of exposing all endpoints as tools, this mode exposes:
 * 1. search_endpoints - Find relevant API endpoints
 * 2. call_endpoint - Call any endpoint dynamically
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
import type { SpeckyConfig, GeneratedTool, ParsedEndpoint, ParsedSpec } from '../types/index.js';

/**
 * Search endpoints by query
 */
function searchEndpoints(
  tools: GeneratedTool[],
  query: string,
  options?: {
    tags?: string[];
    methods?: string[];
    limit?: number;
  }
): GeneratedTool[] {
  const queryLower = query.toLowerCase();
  const limit = options?.limit || 10;

  let filtered = tools;

  // Filter by tags if specified
  if (options?.tags && options.tags.length > 0) {
    const tagsLower = options.tags.map((t) => t.toLowerCase());
    filtered = filtered.filter((tool) =>
      tool.endpoint.tags.some((tag) => tagsLower.includes(tag.toLowerCase()))
    );
  }

  // Filter by methods if specified
  if (options?.methods && options.methods.length > 0) {
    const methodsLower = options.methods.map((m) => m.toLowerCase());
    filtered = filtered.filter((tool) =>
      methodsLower.includes(tool.endpoint.method.toLowerCase())
    );
  }

  // Search by query in name, description, path, summary
  const scored = filtered.map((tool) => {
    let score = 0;
    const searchFields = [
      tool.name,
      tool.description,
      tool.endpoint.path,
      tool.endpoint.summary || '',
      tool.endpoint.operationId,
      ...tool.endpoint.tags,
    ].map((s) => s.toLowerCase());

    for (const field of searchFields) {
      if (field.includes(queryLower)) {
        score += 10;
      }
      // Partial word match
      const words = queryLower.split(/\s+/);
      for (const word of words) {
        if (field.includes(word)) {
          score += 5;
        }
      }
    }

    return { tool, score };
  });

  // Sort by score and return top results
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.tool);
}

/**
 * Format endpoint for display
 */
function formatEndpointForDisplay(tool: GeneratedTool): object {
  const { endpoint } = tool;
  return {
    id: tool.name,
    method: endpoint.method.toUpperCase(),
    path: endpoint.path,
    summary: endpoint.summary || tool.description.split('\n')[0],
    tags: endpoint.tags,
    parameters: [
      ...endpoint.pathParams.map((p) => ({
        name: p.name,
        in: 'path',
        required: p.required,
        type: p.type,
        description: p.description,
      })),
      ...endpoint.queryParams.map((p) => ({
        name: p.name,
        in: 'query',
        required: p.required,
        type: p.type,
        description: p.description,
      })),
    ],
    hasRequestBody: !!endpoint.requestBody,
  };
}

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
 * Execute an API call
 */
async function executeApiCall(
  baseUrl: string,
  endpoint: ParsedEndpoint,
  args: Record<string, unknown>,
  authenticatedFetch: (url: string, init?: RequestInit) => Promise<Response>
): Promise<unknown> {
  const url = buildUrl(baseUrl, endpoint, args);
  
  // Extract body from remaining args
  const pathParamNames = new Set(endpoint.pathParams.map((p) => p.name));
  const queryParamNames = new Set(endpoint.queryParams.map((p) => p.name));
  const bodyArgs: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(args)) {
    if (!pathParamNames.has(key) && !queryParamNames.has(key) && key !== 'endpoint_id') {
      bodyArgs[key] = value;
    }
  }

  const body = Object.keys(bodyArgs).length > 0 ? bodyArgs : undefined;

  const headers: Record<string, string> = {};
  if (endpoint.requestBody?.contentType) {
    headers['Content-Type'] = endpoint.requestBody.contentType;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
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
 * Create Search Mode MCP Server
 */
export async function createSearchModeServer(config: SpeckyConfig): Promise<{
  server: Server;
  tools: GeneratedTool[];
  spec: ParsedSpec;
  start: () => Promise<void>;
}> {
  // Parse the spec
  const spec = await parseSpec(config.spec);
  const baseUrl = config.baseUrl || spec.baseUrl;

  // Generate all tools (for internal use)
  const allTools = generateTools(spec);

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

  // Define the two meta-tools
  const metaTools = [
    {
      name: 'search_endpoints',
      description: `Search for API endpoints in ${spec.title}. Use this to find the right endpoint before calling it. Returns matching endpoints with their IDs, methods, paths, and parameters.`,
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'Search query (e.g., "create pet", "get user", "delete order")',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: `Optional: Filter by tags. Available tags: ${[...new Set(allTools.flatMap((t) => t.endpoint.tags))].join(', ')}`,
          },
          methods: {
            type: 'array',
            items: { type: 'string', enum: ['get', 'post', 'put', 'patch', 'delete'] },
            description: 'Optional: Filter by HTTP methods',
          },
          limit: {
            type: 'number',
            description: 'Optional: Maximum results (default: 10)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'call_endpoint',
      description: `Call an API endpoint by its ID. First use search_endpoints to find the endpoint ID, then use this tool with the endpoint_id and any required parameters.`,
      inputSchema: {
        type: 'object' as const,
        properties: {
          endpoint_id: {
            type: 'string',
            description: 'The endpoint ID returned from search_endpoints (e.g., "get_pet_pet_id", "post_pet")',
          },
        },
        required: ['endpoint_id'],
        additionalProperties: true,
      },
    },
  ];

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: metaTools };
  });

  // Handle call tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = (request.params.arguments || {}) as Record<string, unknown>;

    if (toolName === 'search_endpoints') {
      const query = args.query as string;
      const tags = args.tags as string[] | undefined;
      const methods = args.methods as string[] | undefined;
      const limit = args.limit as number | undefined;

      const results = searchEndpoints(allTools, query, { tags, methods, limit });

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No endpoints found matching "${query}". Try different keywords or browse available tags: ${[...new Set(allTools.flatMap((t) => t.endpoint.tags))].join(', ')}`,
            },
          ],
        };
      }

      const formatted = results.map(formatEndpointForDisplay);

      return {
        content: [
          {
            type: 'text',
            text: `Found ${results.length} matching endpoint(s):\n\n${JSON.stringify(formatted, null, 2)}\n\nUse call_endpoint with the endpoint "id" and required parameters to call an endpoint.`,
          },
        ],
      };
    }

    if (toolName === 'call_endpoint') {
      const endpointId = args.endpoint_id as string;
      
      if (!endpointId) {
        return {
          content: [{ type: 'text', text: 'Error: endpoint_id is required' }],
          isError: true,
        };
      }

      const tool = allTools.find((t) => t.name === endpointId);
      
      if (!tool) {
        // Try fuzzy match
        const similar = allTools.filter((t) => 
          t.name.includes(endpointId) || endpointId.includes(t.name)
        );
        
        if (similar.length > 0) {
          return {
            content: [
              {
                type: 'text',
                text: `Endpoint "${endpointId}" not found. Did you mean: ${similar.map((t) => t.name).join(', ')}?`,
              },
            ],
            isError: true,
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Endpoint "${endpointId}" not found. Use search_endpoints to find available endpoints.`,
            },
          ],
          isError: true,
        };
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
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true,
        };
      }
    }

    return {
      content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
      isError: true,
    };
  });

  // Start function
  const start = async () => {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  };

  return { server, tools: allTools, spec, start };
}
