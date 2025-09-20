import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', address: '', role: 'normal' });
  const [newStore, setNewStore] = useState({ name: '', email: '', address: '', ownerId: '' });

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchStores();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/admin/dashboard', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/admin/users', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStores = async () => {
    try {
      const res = await axios.get('http://localhost:5000/admin/stores', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setStores(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const addUser = async () => {
    try {
      await axios.post('http://localhost:5000/admin/users', newUser, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setNewUser({ name: '', email: '', password: '', address: '', role: 'normal' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Error adding user');
    }
  };

  const addStore = async () => {
    try {
      await axios.post('http://localhost:5000/admin/stores', newStore, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setNewStore({ name: '', email: '', address: '', ownerId: '' });
      fetchStores();
    } catch (err) {
      alert(err.response?.data?.error || 'Error adding store');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Admin Dashboard</h2>
      </div>

      <div className="card">
        <h3>Stats</h3>
        <p>Total Users: {stats.totalUsers}</p>
        <p>Total Stores: {stats.totalStores}</p>
        <p>Total Ratings: {stats.totalRatings}</p>
      </div>

      <div className="card">
        <h3>Add User</h3>
        <input placeholder="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
        <input placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
        <input placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
        <input placeholder="Address" value={newUser.address} onChange={(e) => setNewUser({ ...newUser, address: e.target.value })} />
        <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
          <option value="normal">Normal</option>
          <option value="admin">Admin</option>
          <option value="store_owner">Store Owner</option>
        </select>
        <button onClick={addUser}>Add User</button>
      </div>

      <div className="card">
        <h3>Add Store</h3>
        <input placeholder="Name" value={newStore.name} onChange={(e) => setNewStore({ ...newStore, name: e.target.value })} />
        <input placeholder="Email" value={newStore.email} onChange={(e) => setNewStore({ ...newStore, email: e.target.value })} />
        <input placeholder="Address" value={newStore.address} onChange={(e) => setNewStore({ ...newStore, address: e.target.value })} />
        <input placeholder="Owner ID" value={newStore.ownerId} onChange={(e) => setNewStore({ ...newStore, ownerId: e.target.value })} />
        <button onClick={addStore}>Add Store</button>
      </div>

      <div className="card">
        <h3>Users</h3>
        <ul>
          {users.map(u => <li key={u.id}>{u.name} - {u.email} - {u.role}</li>)}
        </ul>
      </div>

      <div className="card">
        <h3>Stores</h3>
        <ul>
          {stores.map(s => <li key={s.id}>{s.name} - {s.address} - Rating: {s.rating}</li>)}
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
