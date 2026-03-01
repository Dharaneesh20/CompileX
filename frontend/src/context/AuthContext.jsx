import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { signInWithGoogle, signInWithGithub, firebaseSignOut, auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                // prefer stored rich profile, fall back to decoded payload
                const stored = JSON.parse(localStorage.getItem('userProfile') || 'null');
                setUser(stored || {
                    id: payload.user_id,
                    email: payload.email,
                    name: payload.name || payload.email?.split('@')[0],
                    photoURL: null,
                });
            } catch {
                logout();
            }
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('userProfile');
            setUser(null);
        }
    }, [token]);

    /** Email/password login — blocked until email is verified */
    const login = async (email, password) => {
        setLoading(true);
        try {
            // Check Firebase email verification first
            try {
                const fbCred = await signInWithEmailAndPassword(auth, email, password);
                if (!fbCred.user.emailVerified) {
                    await firebaseSignOut();
                    return { success: false, error: 'Please verify your email first. Check your inbox for the verification link.', needsVerification: true };
                }
            } catch (fbErr) {
                // If Firebase doesn't know this user (e.g. pre-Firebase accounts), fall through
                if (fbErr.code !== 'auth/user-not-found' && fbErr.code !== 'auth/invalid-credential') {
                    if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-login-credentials') {
                        return { success: false, error: 'Invalid email or password.' };
                    }
                    // Otherwise fall through to backend auth
                }
            }
            const res = await api.post('/auth/login', { email, password });
            setToken(res.data.token);
            const u = res.data.user;
            localStorage.setItem('userProfile', JSON.stringify(u));
            setUser(u);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Login failed' };
        } finally {
            setLoading(false);
        }
    };

    /** Email/password register — creates backend user + Firebase user + sends verification email */
    const register = async (name, email, password) => {
        setLoading(true);
        try {
            // 1. Create user in our backend (MongoDB)
            const res = await api.post('/auth/register', { name, email, password });

            // 2. Create Firebase user and send verification email
            try {
                let fbUser;
                try {
                    const fbCred = await createUserWithEmailAndPassword(auth, email, password);
                    fbUser = fbCred.user;
                } catch (e) {
                    if (e.code === 'auth/email-already-in-use') {
                        const fbCred = await signInWithEmailAndPassword(auth, email, password);
                        fbUser = fbCred.user;
                    } else throw e;
                }
                if (!fbUser.emailVerified) {
                    await sendEmailVerification(fbUser);
                }
            } catch (fbErr) {
                console.warn('Firebase email verification step failed:', fbErr.message);
            }

            // 3. Don't log them in yet — return a flag to redirect to /verify-email
            const u = res.data.user;
            return { success: true, needsVerification: true, email: u.email };
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Registration failed' };
        } finally {
            setLoading(false);
        }
    };

    /** Real Google Sign-In via Firebase popup */
    const googleLogin = async () => {
        setLoading(true);
        try {
            const result = await signInWithGoogle();
            const firebaseUser = result.user;
            const idToken = await firebaseUser.getIdToken();

            // Send Firebase ID token to our backend to create/find the user and get a JWT
            const res = await api.post('/auth/firebase', { idToken });

            const u = {
                id: res.data.user.id,
                email: res.data.user.email,
                name: res.data.user.name || firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
            };

            setToken(res.data.token);
            localStorage.setItem('userProfile', JSON.stringify(u));
            setUser(u);
            return { success: true };
        } catch (error) {
            const msg = error.response?.data?.error || error.message || 'Google sign-in failed';
            return { success: false, error: msg };
        } finally {
            setLoading(false);
        }
    };

    /** Real GitHub Sign-In via Firebase popup */
    const githubLogin = async () => {
        setLoading(true);
        try {
            const result = await signInWithGithub();
            const firebaseUser = result.user;
            const idToken = await firebaseUser.getIdToken();
            const res = await api.post('/auth/firebase', { idToken });
            const u = {
                id: res.data.user.id,
                email: res.data.user.email,
                name: res.data.user.name || firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
            };
            setToken(res.data.token);
            localStorage.setItem('userProfile', JSON.stringify(u));
            setUser(u);
            return { success: true };
        } catch (error) {
            const msg = error.response?.data?.error || error.message || 'GitHub sign-in failed';
            return { success: false, error: msg };
        } finally {
            setLoading(false);
        }
    };

    /** Legacy mock OAuth (kept for compatibility) */
    const oauthLogin = async (provider) => {
        if (provider === 'Google') return googleLogin();
        if (provider === 'GitHub') return githubLogin();
        setLoading(true);
        try {
            const res = await api.post('/auth/oauth', { provider });
            setToken(res.data.token);
            setUser(res.data.user);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'OAuth failed' };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try { await firebaseSignOut(); } catch { }
        setToken(null);
    };

    const forgotPassword = async (email) => {
        try {
            // First check whether this email is an email-auth account
            const res = await api.post('/auth/forgot-password', { email });
            if (res.data.message === 'ok') {
                // Firebase sends the actual reset email
                await sendPasswordResetEmail(auth, email);
            }
            return { success: true };
        } catch (error) {
            const msg = error.response?.data?.error || error.message || 'Failed to send reset email';
            return { success: false, error: msg };
        }
    };

    const changePassword = async (oldPassword, newPassword) => {
        try {
            await api.post('/auth/change-password', { oldPassword, newPassword });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Failed to change password' };
        }
    };

    const deleteProject = async (projectId) => {
        try {
            await api.delete(`/projects/${projectId}`);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Failed to delete project' };
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, googleLogin, githubLogin, oauthLogin, logout, forgotPassword, changePassword, deleteProject, api }}>
            {children}
        </AuthContext.Provider>
    );
};
