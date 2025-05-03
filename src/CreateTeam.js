import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function CreateTeam({ token, team = null }) {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState(team ? team.players : []);
  const [captain, setCaptain] = useState(team ? team.captain : '');
  const [viceCaptain, setViceCaptain] = useState(team ? team.viceCaptain : '');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/matches`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const match = res.data.find((m) => m.id === parseInt(matchId));
        if (match) setPlayers(match.players);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch match');
      }
    };
    if (token) fetchMatch();
  }, [token, matchId]);

  const handlePlayerToggle = (player) => {
    if (selectedPlayers.includes(player.name)) {
      setSelectedPlayers(selectedPlayers.filter((p) => p !== player.name));
      if (captain === player.name) setCaptain('');
      if (viceCaptain === player.name) setViceCaptain('');
    } else if (selectedPlayers.length < 11) {
      setSelectedPlayers([...selectedPlayers, player.name]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const roles = players.reduce((acc, p) => {
      if (selectedPlayers.includes(p.name)) {
        acc[p.role] = (acc[p.role] || 0) + 1;
      }
      return acc;
    }, {});
    const teamCounts = players.reduce((acc, p) => {
      if (selectedPlayers.includes(p.name)) {
        acc[p.team] = (acc[p.team] || 0) + 1;
      }
      return acc;
    }, {});
    if (
      selectedPlayers.length !== 11 ||
      roles.Wicketkeeper < 1 ||
      roles.Batsman < 1 ||
      roles.Bowler < 1 ||
      roles.Allrounder < 1 ||
      Object.values(teamCounts).some((count) => count > 7) ||
      !captain ||
      !viceCaptain ||
      captain === viceCaptain
    ) {
      setError('Select exactly 11 players with at least 1 Wicketkeeper, Batsman, Bowler, Allrounder, max 7 from one team, and unique Captain/Vice-Captain');
      return;
    }
    try {
      if (team) {
        await axios.put(
          `http://localhost:5000/api/teams/${team.id}`,
          { players: selectedPlayers, captain, viceCaptain },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          'http://localhost:5000/api/teams',
          { matchId: parseInt(matchId), players: selectedPlayers, captain, viceCaptain },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      navigate('/my-team');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save team');
    }
  };

  return (
    <div className="card">
      <div className="card-header" style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
        <h3 className="card-title">{team ? 'Edit' : 'Create'} Team for Match {matchId}</h3>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <h4>Select 11 Players:</h4>
          <div className="row mb-3">
            {players.map((player) => (
              <div key={player.name} className="col-md-3 mb-2">
                <div className="card h-100">
                  <img src={player.image} alt={player.name} className="card-img-top" style={{ height: '100px', objectFit: 'cover' }} />
                  <div className="card-body p-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={selectedPlayers.includes(player.name)}
                        onChange={() => handlePlayerToggle(player)}
                        disabled={!selectedPlayers.includes(player.name) && selectedPlayers.length >= 11}
                        id={player.name}
                      />
                      <label className="form-check-label" htmlFor={player.name}>
                        {player.name} ({player.role})
                      </label>
                    </div>
                    {selectedPlayers.includes(player.name) && (
                      <div className="mt-2">
                        <button
                          type="button"
                          className={`btn btn-sm ${captain === player.name ? 'btn-primary' : 'btn-outline-primary'} me-1`}
                          onClick={() => setCaptain(player.name)}
                        >
                          Captain
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${viceCaptain === player.name ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setViceCaptain(player.name)}
                        >
                          Vice-Captain
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="submit" className="btn" style={{ backgroundColor: '#f97316', color: '#ffffff' }} disabled={selectedPlayers.length !== 11}>
            {team ? 'Update' : 'Create'} Team
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateTeam;