import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import UpcomingMatches from './UpcomingMatches';
import MyTeam from './MyTeam';
import LiveMatches from './LiveMatches';
import CompletedMatches from './CompletedMatches';
import CreateTeam from './CreateTeam';
import Account from './Account';
import './index.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [coins, setCoins] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCoins = async () => {
      if (token) {
        try {
          const res = await axios.get('http://localhost:5000/api/users', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setCoins(res.data.coins);
        } catch (err) {
          console.error('Coin fetch error:', err.response?.data?.message || err.message);
          if (err.response?.status === 401) {
            localStorage.removeItem('token');
            setToken('');
            navigate('/account');
          }
        }
      }
    };
    fetchCoins();
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setCoins(0);
    navigate('/account');
  };

  return (
    <div className="container-fluid">
      <nav className="navbar navbar-expand-lg navbar-dark">
        <div className="container">
          <Link className="navbar-brand" to="/">Fantasy Cricket</Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/upcoming-matches">Upcoming Matches</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/my-team">My Teams</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/live-matches">Live Matches</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/completed-matches">Completed Matches</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/account">Account</Link>
              </li>
            </ul>
            {token && (
              <div className="d-flex align-items-center">
                <span className="text-white me-3">Coins: {coins}</span>
                <button className="btn btn-orange btn-sm" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </nav>
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={<UpcomingMatches token={token} setCoins={setCoins} />} />
          <Route path="/upcoming-matches" element={<UpcomingMatches token={token} setCoins={setCoins} />} />
          <Route path="/my-team" element={<MyTeam token={token} setCoins={setCoins} />} />
          <Route path="/live-matches" element={<LiveMatches token={token} setCoins={setCoins} />} />
          <Route path="/completed-matches" element={<CompletedMatches token={token} setCoins={setCoins} />} />
          <Route path="/create-team/:matchId" element={<CreateTeam token={token} setCoins={setCoins} />} />
          <Route path="/account" element={<Account setToken={setToken} setCoins={setCoins} />} />
        </Routes>
      </div>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}