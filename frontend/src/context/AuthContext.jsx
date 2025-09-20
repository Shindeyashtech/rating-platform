import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser({ ...JSON.parse(userData), token });
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await axios.post('http://localhost:5000/auth/login', { email, password });
      const { token, user: userData } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser({ ...userData, token });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Login failed' };
    }
  };

  const signup = async (name, email, password, address) => {
    try {
      const res = await axios.post('http://localhost:5000/auth/signup', { name, email, password, address });
      return { success: true, message: res.data.message };
    } catch (err) {
      const error = err.response?.data?.errors ? err.response.data.errors.map(e => e.msg).join(', ') : err.response?.data?.error || 'Signup failed';
      return { success: false, error };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updatePassword = async (oldPassword, newPassword) => {
    try {
      const res = await axios.put('http://localhost:5000/auth/password', { oldPassword, newPassword }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      return { success: true, message: res.data.message };
    } catch (err) {
      const error = err.response?.data?.errors ? err.response.data.errors.map(e => e.msg).join(', ') : err.response?.data?.error || 'Update failed';
      return { success: false, error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updatePassword, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
