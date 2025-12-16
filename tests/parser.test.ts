/**
 * Parser Tests
 */
import { describe, it, expect } from 'vitest';
import { parseSpec, validateSpec } from '../src/parser/swagger.js';

const PETSTORE_URL = 'https://petstore.swagger.io/v2/swagger.json';

describe('Swagger Parser', () => {
  it('should parse Petstore spec from URL', async () => {
    const spec = await parseSpec(PETSTORE_URL);
    
    expect(spec).toBeDefined();
    expect(spec.title).toBe('Swagger Petstore');
    expect(spec.endpoints.length).toBeGreaterThan(0);
  });

  it('should extract base URL correctly', async () => {
    const spec = await parseSpec(PETSTORE_URL);
    
    expect(spec.baseUrl).toContain('petstore.swagger.io');
  });

  it('should parse all HTTP methods', async () => {
    const spec = await parseSpec(PETSTORE_URL);
    
    const methods = new Set(spec.endpoints.map(e => e.method));
    expect(methods.has('get')).toBe(true);
    expect(methods.has('post')).toBe(true);
    expect(methods.has('delete')).toBe(true);
  });

  it('should parse path parameters', async () => {
    const spec = await parseSpec(PETSTORE_URL);
    
    const petById = spec.endpoints.find(e => e.path === '/pet/{petId}' && e.method === 'get');
    expect(petById).toBeDefined();
    expect(petById?.pathParams.length).toBeGreaterThan(0);
    expect(petById?.pathParams[0].name).toBe('petId');
  });

  it('should validate valid spec', async () => {
    const isValid = await validateSpec(PETSTORE_URL);
    expect(isValid).toBe(true);
  });
});
