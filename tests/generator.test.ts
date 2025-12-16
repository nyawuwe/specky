/**
 * MCP Tools Generator Tests
 */
import { describe, it, expect } from 'vitest';
import { parseSpec } from '../src/parser/swagger.js';
import { generateTools, getToolsSummary, groupToolsByTag } from '../src/generator/mcp-tools.js';

const PETSTORE_URL = 'https://petstore.swagger.io/v2/swagger.json';

describe('MCP Tools Generator', () => {
  it('should generate tools from parsed spec', async () => {
    const spec = await parseSpec(PETSTORE_URL);
    const tools = generateTools(spec);
    
    expect(tools.length).toBe(spec.endpoints.length);
  });

  it('should generate valid tool names (snake_case)', async () => {
    const spec = await parseSpec(PETSTORE_URL);
    const tools = generateTools(spec);
    
    for (const tool of tools) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('should include input schema with required fields', async () => {
    const spec = await parseSpec(PETSTORE_URL);
    const tools = generateTools(spec);
    
    for (const tool of tools) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
      expect(Array.isArray(tool.inputSchema.required)).toBe(true);
    }
  });

  it('should generate summary statistics', async () => {
    const spec = await parseSpec(PETSTORE_URL);
    const tools = generateTools(spec);
    const summary = getToolsSummary(tools);
    
    expect(summary.total).toBe(tools.length);
    expect(summary.byMethod).toBeDefined();
    expect(summary.byMethod['GET']).toBeGreaterThan(0);
  });

  it('should group tools by tag', async () => {
    const spec = await parseSpec(PETSTORE_URL);
    const tools = generateTools(spec);
    const groups = groupToolsByTag(tools);
    
    expect(groups.size).toBeGreaterThan(0);
    expect(groups.has('pet')).toBe(true);
  });
});
