import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

function Account({ token, handleLogout }) {
  const decoded = jwtDecode(token);
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCoins(res.data.coins);
      } catch (err) {
        console.error(err);
      }
    };
    if (token) fetchCoins();
  }, [token]);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Account</h3>
      </div>
      <div className="card-body">
        <p><strong>Name:</strong> {decoded.email}</p>
        <p><strong>Coins:</strong> {coins}</p>
        <button className="btn btn-orange" onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}

export default Account;