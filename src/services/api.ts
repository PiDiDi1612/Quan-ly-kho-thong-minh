import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '../utils/authStorage';

export interface ConnectionConfig {
    mode: 'SERVER' | 'CLIENT' | null;
    serverIp: string;
}

class ApiService {
    private baseUrl: string = '';
    private socket: Socket | null = null;
    private config: ConnectionConfig = { mode: null, serverIp: '' };

    constructor() {
        this.loadConfig();
        this.determineBaseUrl();
    }

    private loadConfig() {
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('connection_config');
            if (saved) {
                this.config = JSON.parse(saved);
            }
        }
    }

    private determineBaseUrl() {
        if (typeof window === 'undefined') return;

        // 1. If running from file system (Production Electron), ALWAYS use localhost:3000
        if (window.location.protocol === 'file:') {
            this.baseUrl = 'http://localhost:3000';
            return;
        }

        // 2. Load saved config
        if (this.config.mode) {
            if (this.config.mode === 'SERVER') {
                this.baseUrl = 'http://localhost:3000';
            } else {
                this.baseUrl = `http://${this.config.serverIp}:3000`;
            }
            return;
        }

        // 3. Default fallback (Dev mode or First run)
        // If we represent an Electron app, we likely want to hit the local server by default
        this.baseUrl = 'http://localhost:3000';
    }

    public getBaseUrl() {
        return this.baseUrl;
    }

    public getConfig() {
        return this.config;
    }

    public setConfig(mode: 'SERVER' | 'CLIENT', ip: string) {
        this.config = { mode, serverIp: ip || '' };
        localStorage.setItem('connection_config', JSON.stringify(this.config));
        this.determineBaseUrl();
        this.initSocket(); // Re-init socket on config change
    }

    public async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, 'GET');
    }

    public async post<T>(endpoint: string, body?: any): Promise<T> {
        return this.request<T>(endpoint, 'POST', body);
    }

    public async put<T>(endpoint: string, body?: any): Promise<T> {
        return this.request<T>(endpoint, 'PUT', body);
    }

    public async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, 'DELETE');
    }

    private async request<T>(endpoint: string, method: string, body?: any): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            const token = getAuthToken();
            if (token) headers.Authorization = `Bearer ${token}`;

            const res = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined
            });

            if (!res.ok) {
                // Try to extract error message from response body
                let errorMessage = `API Error ${res.status}: ${res.statusText}`;
                try {
                    const errorBody = await res.json();
                    if (errorBody.error) {
                        errorMessage = errorBody.error;
                    }
                } catch {
                    // If can't parse JSON, use default error message
                }
                throw new Error(errorMessage);
            }

            // Return void for empty responses if needed, or check content-type
            const text = await res.text();
            return text ? JSON.parse(text) : {} as T;
        } catch (e) {
            console.error(`API Network Error ${url}:`, e);
            throw e;
        }
    }

    public initSocket(onDataUpdated?: () => void) {
        if (this.socket) {
            this.socket.disconnect();
        }

        if (!this.config.mode) return;

        const token = getAuthToken();
        this.socket = io(this.baseUrl || window.location.origin, {
            auth: token ? { token } : undefined,
            extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined
        });

        if (onDataUpdated) {
            this.socket.on('data_updated', onDataUpdated);
        }
    }

    public disconnectSocket() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const apiService = new ApiService();
