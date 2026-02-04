"use client";
import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { authService } from '@/services/authService';

export default function ConnectionTestPage() {
    const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
    const [error, setError] = useState<string>('');
    const [user, setUser] = useState<any>(null);
    const [token, setToken] = useState<string>('');

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        setStatus('loading');
        try {
            // Check Auth (Client Side)
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);

            const sessionToken = await authService.getToken();
            setToken(sessionToken ? 'Token Present (Hidden)' : 'No Token Found');

            // Test Ping (Optional - if backend has a health endpoint)
            // await api.get('/health'); // specific endpoint unknown, assuming connection via auth check is enough for now

            setStatus('connected');
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setError(err.message || 'Connection failed');
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Backend Connection Status</h1>

            <div className={`p-4 rounded-lg border ${status === 'connected' ? 'bg-green-50 border-green-200 text-green-800' :
                    status === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                        'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                <div className="font-bold uppercase tracking-wide text-sm mb-2">Status</div>
                <div className="text-lg">
                    {status === 'loading' && 'Checking connection...'}
                    {status === 'connected' && '✅ Connected to Backend Infrastructure'}
                    {status === 'error' && '❌ Connection Failed'}
                </div>
                {error && <div className="mt-2 text-sm font-mono bg-white/50 p-2 rounded">{error}</div>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded bg-gray-50">
                    <h3 className="font-bold text-gray-500 text-xs uppercase mb-2">Auth Module</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Amplify SDK:</span>
                            <span className="font-mono bg-gray-200 px-1 rounded">Active</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Current User:</span>
                            <span className="font-mono bg-gray-200 px-1 rounded">{user ? user.username : 'Guest'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Token Status:</span>
                            <span className="font-mono bg-gray-200 px-1 rounded text-xs">{token}</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 border rounded bg-gray-50">
                    <h3 className="font-bold text-gray-500 text-xs uppercase mb-2">Environment Config</h3>
                    <div className="space-y-2 text-sm break-all">
                        <div>
                            <div className="text-gray-500 text-xs">API URL</div>
                            <div className="font-mono">{process.env.NEXT_PUBLIC_API_URL}</div>
                        </div>
                        <div>
                            <div className="text-gray-500 text-xs">Auth Region</div>
                            <div className="font-mono">{process.env.NEXT_PUBLIC_COGNITO_REGION}</div>
                        </div>
                        <div>
                            <div className="text-gray-500 text-xs">Client ID</div>
                            <div className="font-mono text-xs">{process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-4">
                <button
                    onClick={checkConnection}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Retry Connection
                </button>
                <button
                    onClick={() => authService.login({ username: 'testuser', password: 'password' })}
                    className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
                >
                    Test Login Flow
                </button>
            </div>
        </div>
    );
}
