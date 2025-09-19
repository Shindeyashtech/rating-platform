import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const Stores = () => {
  const { user } = useContext(AuthContext);
  const [stores, setStores] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [searchAddress, setSearchAddress] = useState('');

  useEffect(() => {
    fetchStores();
  }, [searchName, searchAddress]);

  const fetchStores = async () => {
    try {
      const params = {};
      if (searchName) params.name = searchName;
      if (searchAddress) params.address = searchAddress;
      const res = await axios.get('http://localhost:5000/stores', {
        headers: { Authorization: `Bearer ${user.token}` },
        params
      });
      setStores(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const submitRating = async (storeId, rating) => {
    try {
      await axios.post('http://localhost:5000/ratings', { storeId, rating }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchStores(); // Refresh to update user rating
    } catch (err) {
      alert(err.response?.data?.error || 'Error submitting rating');
    }
  };

  return (
    <div>
      <h2>Stores</h2>
      <div>
        <input
          placeholder="Search by name"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />
        <input
          placeholder="Search by address"
          value={searchAddress}
          onChange={(e) => setSearchAddress(e.target.value)}
        />
      </div>
      <ul>
        {stores.map(store => (
          <li key={store.id}>
            <h3>{store.name}</h3>
            <p>{store.address}</p>
            <p>Overall Rating: {store.overallRating || 'N/A'}</p>
            <p>Your Rating: {store.userRating || 'Not rated'}</p>
            <select onChange={(e) => submitRating(store.id, e.target.value)}>
              <option value="">Rate</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Stores;
