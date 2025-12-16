/**
 * CLI UI Components
 * Beautiful terminal interface using Chalk, Ora, Boxen, and Figlet
 */
import { type Ora } from 'ora';
import type { GeneratedTool } from '../types/index.js';
/**
 * Display Specky banner
 */
export declare function showBanner(version: string): void;
/**
 * Create a spinner
 */
export declare function createSpinner(text: string): Ora;
/**
 * Log success message
 */
export declare function logSuccess(message: string): void;
/**
 * Log error message
 */
export declare function logError(message: string): void;
/**
 * Log info message
 */
export declare function logInfo(message: string): void;
/**
 * Log warning message
 */
export declare function logWarning(message: string): void;
/**
 * Display tools table
 */
export declare function showToolsTable(tools: GeneratedTool[]): void;
/**
 * Display spec info
 */
export declare function showSpecInfo(title: string, version: string, baseUrl: string): void;
/**
 * Display server ready message
 */
export declare function showServerReady(): void;
/**
 * Display summary statistics
 */
export declare function showSummary(total: number, byMethod: Record<string, number>): void;
//# sourceMappingURL=ui.d.ts.map