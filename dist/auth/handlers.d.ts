/**
 * Authentication Handlers
 * Handles API authentication for various strategies
 */
import type { AuthConfig } from '../types/index.js';
/**
 * Get authorization headers based on auth config
 */
export declare function getAuthHeaders(auth: AuthConfig | undefined): Record<string, string>;
/**
 * OAuth2 client credentials flow
 */
export declare function getOAuth2Token(auth: AuthConfig): Promise<string | null>;
/**
 * Create an authenticated fetch function
 */
export declare function createAuthenticatedFetch(auth: AuthConfig | undefined): (url: string, init?: RequestInit) => Promise<Response>;
/**
 * Parse auth config from CLI options
 */
export declare function parseAuthFromOptions(options: {
    auth?: string;
    token?: string;
    key?: string;
    header?: string;
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
}): AuthConfig;
//# sourceMappingURL=handlers.d.ts.map