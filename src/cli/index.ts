#!/usr/bin/env node
/**
 * Specky CLI Entry Point
 * Transform Swagger/OpenAPI specs into MCP servers
 */

import { Command } from 'commander';
import { parseSpec } from '../parser/swagger.js';
import { generateTools, getToolsSummary } from '../generator/mcp-tools.js';
import { parseAuthFromOptions } from '../auth/handlers.js';
import { createSpeckyServer } from '../server/mcp-server.js';
import { createSearchModeServer } from '../server/search-mode.js';
import {
  showBanner,
  createSpinner,
  logSuccess,
  logError,
  logInfo,
  logWarning,
  showToolsTable,
  showSpecInfo,
  showServerReady,
  showSummary,
} from './ui.js';

// Package version
const VERSION = '1.0.0';

// Create CLI program
const program = new Command();

program
  .name('specky')
  .description('🦔 Transform Swagger/OpenAPI specs into MCP servers for LLMs')
  .version(VERSION)
  .argument('<spec>', 'Path or URL to Swagger/OpenAPI spec (JSON or YAML)')
  .option('-a, --auth <type>', 'Authentication type: none|apikey|bearer|basic|oauth2', 'none')
  .option('-t, --token <token>', 'Bearer token or API key value')
  .option('-k, --key <key>', 'API key value (alias for --token)')
  .option('--header <name>', 'Header name for API key (default: X-API-Key)')
  .option('-u, --username <username>', 'Username for basic auth')
  .option('-p, --password <password>', 'Password for basic auth')
  .option('--client-id <id>', 'OAuth2 client ID')
  .option('--client-secret <secret>', 'OAuth2 client secret')
  .option('--token-url <url>', 'OAuth2 token URL')
  .option('-b, --base-url <url>', 'Override base URL from spec')
  .option('-m, --mode <mode>', 'Server mode: search (default) or full', 'search')
  .option('--tags <tags>', 'Filter endpoints by tags (comma-separated)')
  .option('--include <pattern>', 'Include only paths matching pattern (regex)')
  .option('--exclude <pattern>', 'Exclude paths matching pattern (regex)')
  .option('-v, --verbose', 'Verbose output')
  .option('--no-banner', 'Hide banner')
  .option('--list', 'List tools and exit (don\'t start server)')
  .action(async (spec: string, options) => {
    try {
      // Show banner
      if (options.banner !== false) {
        showBanner(VERSION);
      }

      // Parse spec
      const spinner = createSpinner(`Parsing ${spec}...`);
      spinner.start();

      let parsedSpec;
      try {
        parsedSpec = await parseSpec(spec);
        spinner.succeed(`Loaded ${parsedSpec.endpoints.length} endpoints from ${parsedSpec.title}`);
      } catch (error) {
        spinner.fail('Failed to parse spec');
        const message = error instanceof Error ? error.message : 'Unknown error';
        logError(message);
        process.exit(1);
      }

      // Apply filters
      let filteredEndpoints = parsedSpec.endpoints;

      // Filter by tags
      if (options.tags) {
        const tags = (options.tags as string).split(',').map((t: string) => t.trim().toLowerCase());
        filteredEndpoints = filteredEndpoints.filter((ep) =>
          ep.tags.some((tag) => tags.includes(tag.toLowerCase()))
        );
        logInfo(`Filtered by tags: ${tags.join(', ')} (${filteredEndpoints.length} endpoints)`);
      }

      // Filter by include pattern
      if (options.include) {
        const pattern = new RegExp(options.include as string);
        filteredEndpoints = filteredEndpoints.filter((ep) => pattern.test(ep.path));
        logInfo(`Include pattern: ${options.include} (${filteredEndpoints.length} endpoints)`);
      }

      // Filter by exclude pattern
      if (options.exclude) {
        const pattern = new RegExp(options.exclude as string);
        filteredEndpoints = filteredEndpoints.filter((ep) => !pattern.test(ep.path));
        logInfo(`Exclude pattern: ${options.exclude} (${filteredEndpoints.length} endpoints)`);
      }

      // Update parsedSpec with filtered endpoints
      parsedSpec = { ...parsedSpec, endpoints: filteredEndpoints };

      // Show spec info
      showSpecInfo(
        parsedSpec.title,
        parsedSpec.version,
        options.baseUrl || parsedSpec.baseUrl
      );

      // Generate tools
      const tools = generateTools(parsedSpec);
      const summary = getToolsSummary(tools);
      showSummary(summary.total, summary.byMethod);

      // Show mode info
      const mode = options.mode || 'search';
      if (mode === 'search') {
        logInfo('Mode: search (2 meta-tools: search_endpoints + call_endpoint)');
      } else {
        logWarning(`Mode: full (${tools.length} tools exposed directly)`);
      }

      // Show tools table
      if (options.verbose || options.list) {
        showToolsTable(tools);
      }

      // Exit if --list
      if (options.list) {
        process.exit(0);
      }

      // Parse auth config
      const authConfig = parseAuthFromOptions(options);
      if (authConfig.type !== 'none') {
        logInfo(`Using ${authConfig.type} authentication`);
      }

      // Start MCP server
      const serverSpinner = createSpinner('Starting MCP server...');
      serverSpinner.start();

      try {
        const config = {
          spec,
          auth: authConfig,
          baseUrl: options.baseUrl,
          verbose: options.verbose,
        };

        let start: () => Promise<void>;

        if (mode === 'search') {
          const result = await createSearchModeServer(config);
          start = result.start;
        } else {
          const result = await createSpeckyServer(config);
          start = result.start;
        }

        serverSpinner.succeed('MCP server initialized');
        showServerReady();

        // Start and wait
        await start();
      } catch (error) {
        serverSpinner.fail('Failed to start MCP server');
        const message = error instanceof Error ? error.message : 'Unknown error';
        logError(message);
        process.exit(1);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logError(message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
