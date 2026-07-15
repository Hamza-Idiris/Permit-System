import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import LoadingScreen from '../components/LoadingScreen';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Define logout here so it's accessible for interceptors if needed, 
  // but better to use a ref or just directly call it from context.
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  // Setup Axios defaults & interceptors
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }

    // Response interceptor to handle token expiration/unauthorized access
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // Don't intercept 401s from login or profile/password authorization checks
          if (
            error.config.url.includes('/api/auth/login') ||
            error.config.url.includes('/api/users/profile') ||
            error.config.url.includes('/api/users/change-password')
          ) {
            return Promise.reject(error);
          }

          logout();
          if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [token]);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          // Decode local token for immediate UI feedback
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUser({ id: payload.id, role: payload.role, fullName: payload.fullName, district: payload.district });

          // Actually verify with backend
          const res = await axios.get('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (res.data.success) {
            setUser(res.data.data);
          } else {
            logout();
          }
        } catch (e) {
          console.error("Token verification failed", e);
          logout();
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password,
      });

      if (res.data.success) {
        setToken(res.data.token);
        localStorage.setItem('token', res.data.token);
        // User will be updated by the verifyToken effect or set here manually
        setUser({
          id: res.data._id,
          role: res.data.role,
          email: res.data.email,
          fullName: res.data.fullName,
          district: res.data.district
        });
        return res.data;
      }
    } catch (error) {
      throw error.response ? error.response.data : new Error('Login failed');
    }
  };

  const register = async (userData) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', userData);
      return res.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error('Registration failed');
    }
  };

  const updateToken = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateToken }}>
      {loading ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;

