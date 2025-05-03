import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Leaderboard({ token }) {
  const { matchId } = useParams();
  const [userEntry, setUserEntry] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/matches/${matchId}/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserEntry(res.data.userEntry);
        setLeaderboard(res.data.leaderboard);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch leaderboard');
      }
    };
    if (token && matchId) fetchLeaderboard();
  }, [token, matchId]);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Leaderboard - Match {matchId}</h3>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-error">{error}</div>}
        {userEntry && (
          <div className="alert alert-success mb-3">
            <strong>Your Rank:</strong> {userEntry.rank} | <strong>Points:</strong> {userEntry.points}
          </div>
        )}
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Rank</th>
              <th>User</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry) => (
              <tr key={entry.teamId}>
                <td>{entry.rank}</td>
                <td>{entry.email}</td>
                <td>{entry.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="btn btn-primary mt-3"
          onClick={() => navigate('/completed-matches')}
        >
          Back to Completed Matches
        </button>
      </div>
    </div>
  );
}

export default Leaderboard;