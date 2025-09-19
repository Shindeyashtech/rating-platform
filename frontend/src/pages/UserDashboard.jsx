import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const UserDashboard = () => {
  const { user, updatePassword } = useContext(AuthContext);
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleUpdatePassword = async () => {
    const result = await updatePassword(oldPassword, newPassword);
    setMessage(result.success ? result.message : result.error);
  };

  return (
    <div>
      <h2>User Dashboard</h2>
      <button onClick={() => navigate('/stores')}>View Stores</button>

      <div>
        <h3>Update Password</h3>
        <input
          type="password"
          placeholder="Old Password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button onClick={handleUpdatePassword}>Update</button>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
};

export default UserDashboard;
