import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import UserDashboard from './UserDashboard';
import StoreOwnerDashboard from './StoreOwnerDashboard';

const Dashboard = () => {
  const { user, logout, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  const renderDashboard = () => {
    switch (user.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'normal':
        return <UserDashboard />;
      case 'store_owner':
        return <StoreOwnerDashboard />;
      default:
        return <div>Unknown role</div>;
    }
  };

  return (
    <div>
      <header>
        <h1>Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </header>
      {renderDashboard()}
    </div>
  );
};

export default Dashboard;
