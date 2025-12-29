import { create } from 'zustand';
import { parseToken, isTokenExpired } from '../utils/jwt';

interface User {
    id: number;
    username: string;
    role: 'admin' | 'head_teacher' | 'teacher' | 'student' | 'parent';
    name: string;
    avatar?: string;
    authorizedClassIds?: number[] | 'ALL';
    authorizedCourseIds?: number[] | 'ALL';
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
    const userJson = localStorage.getItem('user');
    let user: User | null = null;

    if (token) {
        if (isTokenExpired(token)) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return { token: null, user: null };
        }

        if (userJson) {
            try {
                user = JSON.parse(userJson);
            } catch (e) {
                console.error('Failed to parse user from localStorage', e);
            }
        }

        // Fallback or verify if user is missing but token exists
        if (!user) {
            const decoded = parseToken(token);
            if (decoded) {
                user = {
                    id: decoded.userId,
                    username: decoded.username,
                    role: decoded.role,
                    name: decoded.username,
                    avatar: undefined
                };
            }
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
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token });
    },
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null });
    },
}));
