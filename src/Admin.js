import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Admin({ token }) {
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState('');
  const [player, setPlayer] = useState('');
  const [runs, setRuns] = useState('');
  const [wickets, setWickets] = useState('');
  const [catches, setCatches] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `http://localhost:5000/api/matches/${selectedMatch}/scores`,
        { player, runs: parseInt(runs), wickets: parseInt(wickets), catches: parseInt(catches) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Score updated successfully');
      setError('');
      setPlayer('');
      setRuns('');
      setWickets('');
      setCatches('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update score');
      setSuccess('');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Admin - Update Scores</h3>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <select
              className="form-select"
              value={selectedMatch}
              onChange={(e) => setSelectedMatch(e.target.value)}
            >
              <option value="">Select a Match</option>
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.team1} vs {match.team2} on {match.date}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Player Name"
              value={player}
              onChange={(e) => setPlayer(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <input
              type="number"
              className="form-control"
              placeholder="Runs"
              value={runs}
              onChange={(e) => setRuns(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <input
              type="number"
              className="form-control"
              placeholder="Wickets"
              value={wickets}
              onChange={(e) => setWickets(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <input
              type="number"
              className="form-control"
              placeholder="Catches"
              value={catches}
              onChange={(e) => setCatches(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary w-100">Update Score</button>
        </form>
      </div>
    </div>
  );
}

export default Admin;