import axios from 'axios';

axios.defaults.withCredentials = true;

const API_BASE = 'http://localhost:8000';

export const handleLogin = async (props) => {
    /*
    Args:
        - username
        - password
        - setIsAuthenticated
        - setError

    Output:
        - Backend sets httpOnly cookies with tokens
        - Stores user info in localStorage for UI state
    */
    try {
        const response = await axios.post(
            `${API_BASE}/authorization/proxy-login/`,
            {
                username: props.username,
                password: props.password,
            },
            { withCredentials: true }
        );

        localStorage.setItem('user', JSON.stringify(response.data.user));
        props.setIsAuthenticated(true);
        props.navigate("/");

    } catch (error) {
        let errorMessage = 'An error occurred.';
        if (error.response) {
            errorMessage = error.response.data.error || errorMessage;
        } else if (error.request) {
            errorMessage = 'No response from server';
        } else {
            errorMessage = error.message;
        }
        props.setError(errorMessage);
        return errorMessage;
    }
};

export const handleRefresh = async () => {
    try {
        await axios.post(
            `${API_BASE}/authorization/proxy-refresh/`,
            {},
            { withCredentials: true }
        );
        return true;
    } catch (error) {
        return false;
    }
};

export const handleLogout = async (props) => {
    /*
    Args:
        - setIsAuthenticated
        - setError
    */
    try {
        await axios.post(
            `${API_BASE}/authorization/proxy-logout/`,
            {},
            { withCredentials: true }
        );
        localStorage.removeItem('user');
        props.setIsAuthenticated(false);
        return true;
    } catch (error) {
        props.setError(error);
        return false;
    }
};


/*
Axios interceptor for an Unauthorized 401 response
*/
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshed = await handleRefresh();
            if (refreshed) {
                return axios(originalRequest);
            }
            localStorage.removeItem('user');
        }
        return Promise.reject(error);
    }
);
