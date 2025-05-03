import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function MyTeam({ token }) {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState({});
  const [error, setError] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamsRes = await axios.get('http://localhost:5000/api/teams', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const matchesRes = await axios.get('http://localhost:5000/api/matches', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const matchMap = matchesRes.data.reduce((acc, m) => ({ ...acc, [m.id]: m }), {});
        setMatches(matchMap);
        const teamsWithPoints = await Promise.all(
          teamsRes.data.map(async (team) => {
            const res = await axios.get(`http://localhost:5000/api/matches/${team.matchId}/leaderboard`, {
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => ({ data: { userEntry: null } }));
            return {
              ...team,
              points: res.data.userEntry?.points || 0,
              rank: res.data.userEntry?.rank || 'N/A',
            };
          })
        );
        setTeams(teamsWithPoints);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch teams');
      }
    };
    if (token) fetchData();
  }, [token]);

  const handleTeamClick = (team) => {
    setSelectedTeam({
      ...team,
      scores: team.players.reduce((acc, player) => {
        acc[player] = team.points / team.players.length; // Approximate
        return acc;
      }, {}),
    });
  };

  return (
    <div className="card">
      <div className="card-header" style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
        <h3 className="card-title">My Teams</h3>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="list-group">
          {teams.map((team) => (
            <div key={team.id} className="list-group-item">
              <div className="text-center mb-2">
                <strong>Match ID: {team.matchId}</strong>
              </div>
              <div className="d-flex align-items-center justify-content-center mb-2">
                <div className="text-center me-3">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/mai/1/11/India_national_cricket_team.png"
                    alt="India Logo"
                    style={{ width: '40px', height: '40px' }}
                  />
                  <div>{matches[team.matchId]?.team1}</div>
                </div>
                <div className="mx-3 fw-bold">VS</div>
                <div className="text-center ms-3">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/en/3/3f/Cricket_Australia.png"
                    alt="Australia Logo"
                    style={{ width: '40px', height: '40px' }}
                  />
                  <div>{matches[team.matchId]?.team2}</div>
                </div>
              </div>
              <div className="text-center mb-2">
                Teams in Match: {Object.values(teams).filter((t) => t.matchId === team.matchId).length}
              </div>
              <div className="d-flex justify-content-between align-items-center bg-light p-2 rounded">
                <span role="button" className="text-primary" onClick={() => handleTeamClick(team)}>
                  Team {team.id}
                </span>
                <span>Points: {team.points} | Rank: {team.rank}</span>
                {matches[team.matchId]?.status === 'upcoming' && new Date(matches[team.matchId]?.deadline) > new Date() && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => navigate(`/create-team/${team.matchId}`, { state: { team } })}
                  >
                    Edit Team
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedTeam && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Team {selectedTeam.id} Players</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedTeam(null)}></button>
              </div>
              <div className="modal-body">
                <ul className="list-group">
                  {selectedTeam.players.map((player) => (
                    <li key={player} className="list-group-item">
                      {player}: {selectedTeam.scores[player] || 0} points
                      {player === selectedTeam.captain && ' (Captain)'}
                      {player === selectedTeam.viceCaptain && ' (Vice-Captain)'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyTeam;