/**
 * MCP Tool Generator
 * Converts parsed OpenAPI endpoints to MCP tools
 */

import type {
  ParsedSpec,
  ParsedEndpoint,
  GeneratedTool,
  ParameterInfo,
} from '../types/index.js';

/**
 * Convert ParameterInfo to JSON Schema property
 */
function paramToJsonSchema(param: ParameterInfo): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: param.type,
    description: param.description,
  };

  if (param.format) {
    schema.format = param.format;
  }

  if (param.enum && param.enum.length > 0) {
    schema.enum = param.enum;
  }

  if (param.default !== undefined) {
    schema.default = param.default;
  }

  return schema;
}

/**
 * Generate tool name from endpoint
 * Converts operationId to snake_case
 */
function generateToolName(endpoint: ParsedEndpoint): string {
  // Use operationId and convert to snake_case
  return endpoint.operationId
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toLowerCase();
}

/**
 * Generate tool description
 */
function generateToolDescription(endpoint: ParsedEndpoint): string {
  const parts: string[] = [];

  // Add summary or generated description
  if (endpoint.summary) {
    parts.push(endpoint.summary);
  } else {
    parts.push(`${endpoint.method.toUpperCase()} ${endpoint.path}`);
  }

  // Add detailed description if available
  if (endpoint.description && endpoint.description !== endpoint.summary) {
    parts.push(endpoint.description);
  }

  // Add tags
  if (endpoint.tags.length > 0) {
    parts.push(`Tags: ${endpoint.tags.join(', ')}`);
  }

  return parts.join('\n\n');
}

/**
 * Generate input schema for MCP tool
 */
function generateInputSchema(endpoint: ParsedEndpoint): {
  type: 'object';
  properties: Record<string, unknown>;
  required: string[];
} {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  // Add path parameters
  for (const param of endpoint.pathParams) {
    properties[param.name] = paramToJsonSchema(param);
    if (param.required) {
      required.push(param.name);
    }
  }

  // Add query parameters
  for (const param of endpoint.queryParams) {
    properties[param.name] = paramToJsonSchema(param);
    if (param.required) {
      required.push(param.name);
    }
  }

  // Add request body
  if (endpoint.requestBody) {
    const bodySchema = endpoint.requestBody.schema;
    
    // If body is an object with properties, flatten them
    if (bodySchema.type === 'object' && bodySchema.properties) {
      const bodyProps = bodySchema.properties as Record<string, unknown>;
      const bodyRequired = (bodySchema.required as string[]) || [];
      
      for (const [propName, propSchema] of Object.entries(bodyProps)) {
        properties[propName] = propSchema;
        if (bodyRequired.includes(propName) && endpoint.requestBody.required) {
          required.push(propName);
        }
      }
    } else {
      // Otherwise add as 'body' parameter
      properties['body'] = {
        ...bodySchema,
        description: endpoint.requestBody.description || 'Request body',
      };
      if (endpoint.requestBody.required) {
        required.push('body');
      }
    }
  }

  return {
    type: 'object',
    properties,
    required,
  };
}

/**
 * Convert a single endpoint to MCP tool
 */
export function endpointToTool(endpoint: ParsedEndpoint): GeneratedTool {
  return {
    name: generateToolName(endpoint),
    description: generateToolDescription(endpoint),
    inputSchema: generateInputSchema(endpoint),
    endpoint,
  };
}

/**
 * Generate all MCP tools from parsed spec
 */
export function generateTools(spec: ParsedSpec): GeneratedTool[] {
  return spec.endpoints.map(endpointToTool);
}

/**
 * Group tools by tag
 */
export function groupToolsByTag(tools: GeneratedTool[]): Map<string, GeneratedTool[]> {
  const groups = new Map<string, GeneratedTool[]>();

  for (const tool of tools) {
    const tags = tool.endpoint.tags.length > 0 ? tool.endpoint.tags : ['default'];
    
    for (const tag of tags) {
      const existing = groups.get(tag) || [];
      existing.push(tool);
      groups.set(tag, existing);
    }
  }

  return groups;
}

/**
 * Get summary of generated tools
 */
export function getToolsSummary(tools: GeneratedTool[]): {
  total: number;
  byMethod: Record<string, number>;
  byTag: Record<string, number>;
} {
  const byMethod: Record<string, number> = {};
  const byTag: Record<string, number> = {};

  for (const tool of tools) {
    const method = tool.endpoint.method.toUpperCase();
    byMethod[method] = (byMethod[method] || 0) + 1;

    for (const tag of tool.endpoint.tags) {
      byTag[tag] = (byTag[tag] || 0) + 1;
    }
  }

  return {
    total: tools.length,
    byMethod,
    byTag,
  };
}
