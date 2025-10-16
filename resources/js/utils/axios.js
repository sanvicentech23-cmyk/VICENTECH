import axios from 'axios';

// Get CSRF token from meta tag or cookie
const getCsrfToken = () => {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (token) return token;
    
    // Fallback: get from cookie
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'XSRF-TOKEN') {
            return decodeURIComponent(value);
        }
    }
    return null;
};

// Create an instance for API routes
export const api = axios.create({
    baseURL: '/api', // <--- THIS IS IMPORTANT
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    withCredentials: true
});

// Add CSRF token to requests and debug logging
api.interceptors.request.use(async config => {
    // For POST requests, ensure we have a CSRF token
    if (config.method === 'post' || config.method === 'put' || config.method === 'patch' || config.method === 'delete') {
        let token = getCsrfToken();
        
        // If no token found, try to get CSRF cookie first
        if (!token && config.url !== '/sanctum/csrf-cookie') {
            try {
                // Use the base axios instance to avoid infinite loop
                const baseAxios = axios.create({ withCredentials: true });
                await baseAxios.get('/sanctum/csrf-cookie');
                token = getCsrfToken();
            } catch (e) {
                console.warn('Failed to get CSRF cookie:', e);
            }
        }
        
        if (token) {
            config.headers['X-CSRF-TOKEN'] = token;
        }
    }
    
    // Debug logging
    // console.log('API Request:', {
    //     method: config.method?.toUpperCase(),
    //     url: config.url,
    //     baseURL: config.baseURL,
    //     fullURL: `${config.baseURL}${config.url}`,
    //     hasCSRF: !!config.headers['X-CSRF-TOKEN']
    // });
    
    return config;
}, error => {
    return Promise.reject(error);
});

// Create an instance for auth routes
export const auth = axios.create({
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    withCredentials: true
});

// Add error handling interceptors
const handleError = error => {
    const status = error.response?.status;
    const reqUrl = `${error.config?.baseURL || ''}${error.config?.url || ''}`;
    // Suppress expected guest 401 for auth check
    if (status === 401 && (error.config?.url === '/me' || reqUrl.endsWith('/api/me'))) {
        return Promise.reject(error);
    }
    if (status === 500) {
        console.error('Server error:', error.response?.data);
    }
    return Promise.reject(error);
};

api.interceptors.response.use(response => response, handleError);
auth.interceptors.response.use(response => response, handleError);

export default api; 