export const API_CONFIG = {
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api', // Default fallback
    TIMEOUT: 15000,
};

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiRequestOptions extends RequestInit {
    data?: any;
    token?: string;
    requiresAuth?: boolean;
}

class ApiClient {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    private async request<T>(endpoint: string, method: RequestMethod, options: ApiRequestOptions = {}): Promise<T> {
        const { data, token, requiresAuth = true, ...customConfig } = options;

        const url = `${this.baseURL}${endpoint}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(customConfig.headers as any),
        };

        if (requiresAuth) {
            // Try to get token from props first
            let authToken = token;

            // If not provided, try to fetch from Amplify session
            if (!authToken && typeof window !== 'undefined') {
                try {
                    // Dynamic import to avoid circular dependencies if any, or just standard import
                    // However, we can simply import fetchAuthSession from aws-amplify/auth
                    const { fetchAuthSession } = await import('aws-amplify/auth');
                    const session = await fetchAuthSession();
                    authToken = session.tokens?.idToken?.toString();
                } catch (err) {
                    console.warn('Failed to fetch auth session', err);
                }
            }

            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }
        }

        const config: RequestInit = {
            method,
            headers,
            ...customConfig,
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                // Parse error response if generic json
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.message || `Request failed with status ${response.status}`);
            }

            // Return empty object for 204 No Content
            if (response.status === 204) {
                return {} as T;
            }

            return response.json();
        } catch (error) {
            console.error(`API Error [${method} ${endpoint}]:`, error);
            throw error;
        }
    }

    get<T>(endpoint: string, options?: ApiRequestOptions) {
        return this.request<T>(endpoint, 'GET', options);
    }

    post<T>(endpoint: string, data: any, options?: ApiRequestOptions) {
        return this.request<T>(endpoint, 'POST', { ...options, data });
    }

    put<T>(endpoint: string, data: any, options?: ApiRequestOptions) {
        return this.request<T>(endpoint, 'PUT', { ...options, data });
    }

    patch<T>(endpoint: string, data: any, options?: ApiRequestOptions) {
        return this.request<T>(endpoint, 'PATCH', { ...options, data });
    }

    delete<T>(endpoint: string, options?: ApiRequestOptions) {
        return this.request<T>(endpoint, 'DELETE', options);
    }
}

export const api = new ApiClient(API_CONFIG.BASE_URL);
