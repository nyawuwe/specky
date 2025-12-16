/**
 * Swagger/OpenAPI Parser Module
 * Parses OpenAPI 2.0 (Swagger) and OpenAPI 3.x specifications
 */
import type { ParsedSpec, AnyOpenAPISpec } from '../types/index.js';
/**
 * Parse OpenAPI/Swagger specification
 * @param specPath - Path or URL to the spec file
 * @returns Parsed spec with endpoints
 */
export declare function parseSpec(specPath: string): Promise<ParsedSpec>;
/**
 * Load spec from URL or file path
 */
export declare function loadSpec(specPath: string): Promise<AnyOpenAPISpec>;
/**
 * Validate spec
 */
export declare function validateSpec(specPath: string): Promise<boolean>;
//# sourceMappingURL=swagger.d.ts.map