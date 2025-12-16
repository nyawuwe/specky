/**
 * Authentication Handlers
 * Handles API authentication for various strategies
 */
/**
 * Get authorization headers based on auth config
 */
export function getAuthHeaders(auth) {
    if (!auth || auth.type === 'none') {
        return {};
    }
    const headers = {};
    switch (auth.type) {
        case 'bearer':
            if (auth.token) {
                headers['Authorization'] = `Bearer ${auth.token}`;
            }
            break;
        case 'apikey':
            if (auth.token) {
                const headerName = auth.headerName || 'X-API-Key';
                headers[headerName] = auth.token;
            }
            break;
        case 'basic':
            if (auth.username && auth.password) {
                const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
                headers['Authorization'] = `Basic ${credentials}`;
            }
            break;
        case 'oauth2':
            // OAuth2 token should be set after obtaining it
            if (auth.token) {
                headers['Authorization'] = `Bearer ${auth.token}`;
            }
            break;
    }
    return headers;
}
/**
 * OAuth2 client credentials flow
 */
export async function getOAuth2Token(auth) {
    if (auth.type !== 'oauth2' || !auth.tokenUrl || !auth.clientId || !auth.clientSecret) {
        return null;
    }
    try {
        const response = await fetch(auth.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: auth.clientId,
                client_secret: auth.clientSecret,
            }),
        });
        if (!response.ok) {
            throw new Error(`OAuth2 token request failed: ${response.statusText}`);
        }
        const data = await response.json();
        return data.access_token;
    }
    catch (error) {
        console.error('Failed to obtain OAuth2 token:', error);
        return null;
    }
}
/**
 * Create an authenticated fetch function
 */
export function createAuthenticatedFetch(auth) {
    const authHeaders = getAuthHeaders(auth);
    return async (url, init) => {
        const headers = new Headers(init?.headers);
        for (const [key, value] of Object.entries(authHeaders)) {
            headers.set(key, value);
        }
        return fetch(url, {
            ...init,
            headers,
        });
    };
}
/**
 * Parse auth config from CLI options
 */
export function parseAuthFromOptions(options) {
    const type = (options.auth || 'none');
    return {
        type,
        token: options.token || options.key,
        headerName: options.header,
        username: options.username,
        password: options.password,
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        tokenUrl: options.tokenUrl,
    };
}
//# sourceMappingURL=handlers.js.map