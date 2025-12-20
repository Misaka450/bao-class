import { create } from 'zustand';
import { parseToken, isTokenExpired } from '../utils/jwt';

interface User {
    id: number;
    username: string;
    role: 'admin' | 'head_teacher' | 'teacher' | 'student' | 'parent';
    name: string;
    avatar?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    login: (user: User, token: string) => void;
    logout: () => void;
}

// Initialize state from localStorage
const getInitialState = () => {
    const token = localStorage.getItem('token');
    let user: User | null = null;

    if (token) {
        if (isTokenExpired(token)) {
            localStorage.removeItem('token');
            return { token: null, user: null };
        }

        const decoded = parseToken(token);
        if (decoded) {
            user = {
                id: decoded.userId,
                username: decoded.username,
                role: decoded.role,
                name: decoded.username, // Fallback as name is not in token usually, or map if available
                avatar: undefined
            };
        }
    }

    return { token: token || null, user };
};

const initialState = getInitialState();

export const useAuthStore = create<AuthState>((set) => ({
    user: initialState.user,
    token: initialState.token,
    login: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token });
    },
    logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
    },
}));
