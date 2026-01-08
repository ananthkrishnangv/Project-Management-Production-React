import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'DIRECTOR' | 'SUPERVISOR' | 'PROJECT_HEAD' | 'EMPLOYEE' | 'EXTERNAL_OWNER';
    designation?: string;
    profileImage?: string;
    twoFactorEnabled?: boolean;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (email: string, password: string, twoFactorCode?: string) => Promise<boolean>;
    logout: () => void;
    refreshAccessToken: () => Promise<boolean>;
    setUser: (user: User) => void;
    clearError: () => void;
}

const API_URL = '/api';

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (email: string, password: string, twoFactorCode?: string) => {
                set({ isLoading: true, error: null });

                try {
                    const response = await fetch(`${API_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, twoFactorCode }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        set({ isLoading: false, error: data.error || 'Login failed' });
                        return false;
                    }

                    if (data.requiresTwoFactor) {
                        set({ isLoading: false, error: '2FA_REQUIRED' });
                        return false;
                    }

                    set({
                        user: data.user,
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });

                    return true;
                } catch (error) {
                    set({ isLoading: false, error: 'Network error. Please try again.' });
                    return false;
                }
            },

            logout: async () => {
                const { refreshToken, accessToken } = get();

                try {
                    await fetch(`${API_URL}/auth/logout`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                        },
                        body: JSON.stringify({ refreshToken }),
                    });
                } catch (error) {
                    // Ignore logout errors
                }

                // Clear state
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                    error: null,
                });

                // Clear all storage
                localStorage.removeItem('csir-serc-auth');
                sessionStorage.clear();

                // Clear all cookies
                document.cookie.split(';').forEach((c) => {
                    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                });
            },

            refreshAccessToken: async () => {
                const { refreshToken } = get();

                if (!refreshToken) {
                    get().logout();
                    return false;
                }

                try {
                    const response = await fetch(`${API_URL}/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken }),
                    });

                    if (!response.ok) {
                        get().logout();
                        return false;
                    }

                    const data = await response.json();

                    set({
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken,
                    });

                    return true;
                } catch (error) {
                    get().logout();
                    return false;
                }
            },

            setUser: (user: User) => {
                set({ user });
            },

            clearError: () => {
                set({ error: null });
            },
        }),
        {
            name: 'csir-serc-auth',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
