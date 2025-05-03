import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Matches({ token }) {
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/matches', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMatches(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch matches');
      }
    };
    if (token) fetchMatches();
  }, [token]);

  return (
    <div className="matches">
      <h2>Matches</h2>
      {error && <p className="error">{error}</p>}
      <ul>
        {matches.map((match) => (
          <li key={match.id}>
            {match.team1} vs {match.team2} on {match.date} - Status: {match.status}
            {match.status === 'upcoming' && (
              <Link to={`/create-team/${match.id}`}>Create Team</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Matches;