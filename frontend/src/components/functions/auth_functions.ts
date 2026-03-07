import axios, { AxiosError } from 'axios';
import type { NavigateFunction } from 'react-router-dom';

axios.defaults.withCredentials = true;

const API_BASE = 'http://localhost:8000';

interface LoginProps {
  username: string;
  password: string;
  setIsAuthenticated: (value: boolean) => void;
  setError: (error: string) => void;
  navigate: NavigateFunction;
}

interface LogoutProps {
  setIsAuthenticated: (value: boolean) => void;
  setError: (error: unknown) => void;
}

export const handleLogin = async (props: LoginProps): Promise<string | undefined> => {
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
    if (error instanceof AxiosError && error.response) {
      errorMessage = error.response.data.error || errorMessage;
    } else if (error instanceof AxiosError && error.request) {
      errorMessage = 'No response from server';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    props.setError(errorMessage);
    return errorMessage;
  }
};

export const handleRefresh = async (): Promise<boolean> => {
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

export const handleLogout = async (props: LogoutProps): Promise<boolean> => {
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
  async (error: AxiosError & { config: { _retry?: boolean } }) => {
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
