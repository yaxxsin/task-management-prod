// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
    // Auth endpoints
    AUTH_REGISTER: `${API_URL}/api/auth/register`,
    AUTH_LOGIN: `${API_URL}/api/auth/login`,
    AUTH_GOOGLE: `${API_URL}/api/auth/google`,
    AUTH_FACEBOOK: `${API_URL}/api/auth/facebook`,
    AUTH_FORGOT_PASSWORD: `${API_URL}/api/auth/forgot-password`,
    AUTH_RESET_PASSWORD: `${API_URL}/api/auth/reset-password`,
    AUTH_VERIFY_RESET_TOKEN: `${API_URL}/api/auth/verify-reset-token`,

    // Storage endpoints
    STORAGE: `${API_URL}/api/storage`,

    // Sharing endpoints
    INVITE: `${API_URL}/api/invite`,
    INVITATIONS: `${API_URL}/api/invitations`,
    SHARED: `${API_URL}/api/shared`,
    SHARED_PROPAGATE: `${API_URL}/api/shared/propagate`,
    SHARED_LEAVE: `${API_URL}/api/shared/leave`,
    RESOURCE_MEMBERS: `${API_URL}/api/resource/members`,

    // Socket.io
    SOCKET_URL: API_URL,
};

export default API_URL;
