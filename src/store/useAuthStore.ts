import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (user: User, token: string) => void;
    logout: () => void;
}

// Helper function to clear all app data
const clearAllAppData = () => {
    // Clear localStorage (preserving nothing)
    localStorage.clear();

    // Clear IndexedDB databases
    const dbNames = ['ar-generator-db', 'ar-generator-app-storage'];
    dbNames.forEach(dbName => {
        try {
            const req = indexedDB.deleteDatabase(dbName);
            req.onsuccess = () => console.log(`[Auth] Cleared IndexedDB: ${dbName}`);
            req.onerror = () => console.log(`[Auth] Error clearing IndexedDB: ${dbName}`);
        } catch (e) {
            console.log(`[Auth] Failed to delete database ${dbName}:`, e);
        }
    });

    // Clear sessionStorage as well
    sessionStorage.clear();

    console.log('[Auth] All app data cleared on logout');
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            login: (user, token) => set({ user, token, isAuthenticated: true }),
            logout: () => {
                // First clear the auth state
                set({ user: null, token: null, isAuthenticated: false });
                // Then clear all app data
                clearAllAppData();
                // Reload the page to reset all state
                setTimeout(() => {
                    window.location.href = '/login';
                }, 100);
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage), // Keep auth token in localStorage for basic persistence
        }
    )
);
