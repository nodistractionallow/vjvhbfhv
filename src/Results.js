import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Results({ token }) {
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const matchesRes = await axios.get('http://localhost:5000/api/matches', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const completedMatches = matchesRes.data.filter((m) => m.status === 'completed');
        const resultsPromises = completedMatches.map((match) =>
          axios.post(
            `http://localhost:5000/api/matches/${match.id}/calculate-winner`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          )
        );
        const resultsResponses = await Promise.all(resultsPromises);
        setResults(
          completedMatches.map((match, index) => ({
            match,
            winner: resultsResponses[index].data.winner,
          }))
        );
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch results');
      }
    };
    if (token) fetchResults();
  }, [token]);

  return (
    <div className="results">
      <h2>Match Results</h2>
      {error && <p className="error">{error}</p>}
      <ul>
        {results.map(({ match, winner }) => (
          <li key={match.id}>
            {match.team1} vs {match.team2} - Winner: {winner?.email || 'None'} (
            {winner?.points || 0} points)
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Results;