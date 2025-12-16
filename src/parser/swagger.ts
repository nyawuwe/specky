/**
 * Swagger/OpenAPI Parser Module
 * Parses OpenAPI 2.0 (Swagger) and OpenAPI 3.x specifications
 */

import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import type {
  ParsedSpec,
  ParsedEndpoint,
  ParameterInfo,
  RequestBodyInfo,
  ResponseInfo,
  AnyOpenAPISpec,
} from '../types/index.js';

/**
 * Check if spec is OpenAPI 3.x
 */
function isOpenAPIV3(spec: AnyOpenAPISpec): spec is OpenAPIV3.Document | OpenAPIV3_1.Document {
  return 'openapi' in spec && typeof spec.openapi === 'string' && spec.openapi.startsWith('3.');
}

/**
 * Check if spec is Swagger 2.0
 */
function isSwagger2(spec: AnyOpenAPISpec): spec is OpenAPIV2.Document {
  return 'swagger' in spec && spec.swagger === '2.0';
}

/**
 * Extract base URL from spec
 */
function extractBaseUrl(spec: AnyOpenAPISpec): string {
  if (isOpenAPIV3(spec)) {
    const server = spec.servers?.[0];
    return server?.url || 'http://localhost';
  } else if (isSwagger2(spec)) {
    const scheme = spec.schemes?.[0] || 'https';
    const host = spec.host || 'localhost';
    const basePath = spec.basePath || '';
    return `${scheme}://${host}${basePath}`;
  }
  return 'http://localhost';
}

/**
 * Convert OpenAPI type to JSON Schema type
 */
function getJsonType(schema: Record<string, unknown> | undefined): string {
  if (!schema) return 'string';
  const type = schema.type as string;
  if (type === 'integer') return 'number';
  return type || 'string';
}

/**
 * Parse parameter from OpenAPI 2.0 or 3.x
 */
function parseParameter(
  param: OpenAPIV2.ParameterObject | OpenAPIV3.ParameterObject
): ParameterInfo {
  // Get schema - in OpenAPI 3.x it's in param.schema, in Swagger 2.0 it's on the param itself
  const rawSchema = 'schema' in param && param.schema ? param.schema : param;
  const schema = rawSchema as Record<string, unknown>;
  
  return {
    name: param.name,
    required: param.required || false,
    description: param.description,
    type: getJsonType(schema),
    format: schema.format as string | undefined,
    enum: schema.enum as string[] | undefined,
    default: schema.default,
  };
}

/**
 * Parse request body from OpenAPI 3.x
 */
function parseRequestBody(
  requestBody: OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject | undefined
): RequestBodyInfo | undefined {
  if (!requestBody) return undefined;

  const content = requestBody.content;
  const contentType = Object.keys(content)[0] || 'application/json';
  const mediaType = content[contentType];

  return {
    required: requestBody.required || false,
    description: requestBody.description,
    contentType,
    schema: (mediaType?.schema as Record<string, unknown>) || {},
  };
}

/**
 * Parse body parameter from Swagger 2.0
 */
function parseBodyParam(
  params: OpenAPIV2.ParameterObject[]
): RequestBodyInfo | undefined {
  const bodyParam = params.find((p) => p.in === 'body') as OpenAPIV2.InBodyParameterObject | undefined;
  if (!bodyParam) return undefined;

  return {
    required: bodyParam.required || false,
    description: bodyParam.description,
    contentType: 'application/json',
    schema: (bodyParam.schema as Record<string, unknown>) || {},
  };
}

/**
 * Parse responses from OpenAPI spec
 */
function parseResponses(
  responses: OpenAPIV2.ResponsesObject | OpenAPIV3.ResponsesObject | OpenAPIV3_1.ResponsesObject
): ResponseInfo[] {
  const result: ResponseInfo[] = [];

  for (const [statusCode, response] of Object.entries(responses)) {
    if (!response || typeof response !== 'object') continue;
    
    const resp = response as OpenAPIV3.ResponseObject;
    const content = resp.content;
    const contentType = content ? Object.keys(content)[0] : undefined;
    const schema = contentType && content ? (content[contentType]?.schema as Record<string, unknown>) : undefined;

    result.push({
      statusCode,
      description: resp.description,
      contentType,
      schema,
    });
  }

  return result;
}

/**
 * Generate operation ID if not present
 */
function generateOperationId(method: string, path: string): string {
  // Convert /pets/{petId}/photos to getPetsPetIdPhotos
  const cleanPath = path
    .replace(/\{([^}]+)\}/g, (_, param) => param.charAt(0).toUpperCase() + param.slice(1))
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word, i) => (i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join('');

  return `${method.toLowerCase()}${cleanPath.charAt(0).toUpperCase()}${cleanPath.slice(1)}`;
}

/**
 * Parse a single path operation
 */
function parseOperation(
  method: string,
  path: string,
  operation: OpenAPIV2.OperationObject | OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject,
  pathParams: (OpenAPIV2.ParameterObject | OpenAPIV3.ParameterObject)[],
  isV3: boolean
): ParsedEndpoint {
  const allParams = [...pathParams, ...((operation.parameters || []) as (OpenAPIV2.ParameterObject | OpenAPIV3.ParameterObject)[])];
  
  // Filter parameters by location
  const pathParameters = allParams.filter((p) => p.in === 'path').map(parseParameter);
  const queryParameters = allParams.filter((p) => p.in === 'query').map(parseParameter);
  const headerParameters = allParams.filter((p) => p.in === 'header').map(parseParameter);

  // Parse request body
  let requestBody: RequestBodyInfo | undefined;
  if (isV3) {
    const v3Op = operation as OpenAPIV3.OperationObject;
    requestBody = parseRequestBody(v3Op.requestBody as OpenAPIV3.RequestBodyObject | undefined);
  } else {
    requestBody = parseBodyParam(allParams as OpenAPIV2.ParameterObject[]);
  }

  // Parse security
  const security: string[] = [];
  if (operation.security) {
    for (const sec of operation.security) {
      security.push(...Object.keys(sec));
    }
  }

  return {
    operationId: operation.operationId || generateOperationId(method, path),
    method: method as ParsedEndpoint['method'],
    path,
    summary: operation.summary,
    description: operation.description,
    pathParams: pathParameters,
    queryParams: queryParameters,
    headerParams: headerParameters,
    requestBody,
    responses: parseResponses(operation.responses || {}),
    tags: operation.tags || [],
    security,
  };
}

/**
 * Parse OpenAPI/Swagger specification
 * @param specPath - Path or URL to the spec file
 * @returns Parsed spec with endpoints
 */
export async function parseSpec(specPath: string): Promise<ParsedSpec> {
  // Parse and dereference the spec (resolves all $refs)
  const api = await SwaggerParser.dereference(specPath) as AnyOpenAPISpec;

  const isV3 = isOpenAPIV3(api);
  const info = api.info;
  const baseUrl = extractBaseUrl(api);

  const endpoints: ParsedEndpoint[] = [];
  const paths = api.paths || {};

  // Iterate through all paths
  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    const item = pathItem as OpenAPIV3.PathItemObject;
    const pathParams = (item.parameters || []) as (OpenAPIV2.ParameterObject | OpenAPIV3.ParameterObject)[];

    // HTTP methods to check
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

    for (const method of methods) {
      const operation = item[method];
      if (operation) {
        endpoints.push(parseOperation(method, path, operation, pathParams, isV3));
      }
    }
  }

  return {
    title: info.title,
    version: info.version,
    description: info.description,
    baseUrl,
    endpoints,
  };
}

/**
 * Load spec from URL or file path
 */
export async function loadSpec(specPath: string): Promise<AnyOpenAPISpec> {
  return await SwaggerParser.parse(specPath) as AnyOpenAPISpec;
}

/**
 * Validate spec
 */
export async function validateSpec(specPath: string): Promise<boolean> {
  try {
    await SwaggerParser.validate(specPath);
    return true;
  } catch {
    return false;
  }
}
