import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const StoreOwnerDashboard = () => {
  const { user, updatePassword } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState({});
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get('http://localhost:5000/store-owner/dashboard', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setDashboardData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePassword = async () => {
    const result = await updatePassword(oldPassword, newPassword);
    setMessage(result.success ? result.message : result.error);
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Store Owner Dashboard</h2>
      </div>

      {dashboardData.store && (
        <div className="card">
          <h3>Store Info</h3>
          <p>Name: {dashboardData.store.name}</p>
          <p>Email: {dashboardData.store.email}</p>
          <p>Address: {dashboardData.store.address}</p>
          <p>Average Rating: {dashboardData.averageRating || 'N/A'}</p>
        </div>
      )}

      <div className="card">
        <h3>Ratings</h3>
        <ul>
          {dashboardData.ratings?.map(rating => (
            <li key={rating.id}>
              User: {rating.user.name} ({rating.user.email}) - Rating: {rating.rating}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
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

export default StoreOwnerDashboard;
