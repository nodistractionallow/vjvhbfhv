import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminDashboard({ token }) {
  const [matches, setMatches] = useState([]);
  const [contests, setContests] = useState([]);
  const [error, setError] = useState('');
  const [newMatch, setNewMatch] = useState({
    team1: 'India',
    team2: 'Australia',
    date: '',
    deadline: '',
  });
  const [scoreUpdate, setScoreUpdate] = useState({
    matchId: '',
    player: '',
    runs: 0,
    wickets: 0,
    catches: 0,
  });
  const [adminTeam, setAdminTeam] = useState(null);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [captain, setCaptain] = useState('');
  const [viceCaptain, setViceCaptain] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const matchesRes = await axios.get('http://localhost:5000/api/matches', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMatches(matchesRes.data);
        const contestsRes = await axios.get('http://localhost:5000/api/admin/contests', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setContests(contestsRes.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch data');
      }
    };
    if (token) fetchData();
  }, [token]);

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/matches', newMatch, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewMatch({ team1: 'India', team2: 'Australia', date: '', deadline: '' });
      const res = await axios.get('http://localhost:5000/api/matches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMatches(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create match');
    }
  };

  const handleUpdateScore = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/api/matches/${scoreUpdate.matchId}/scores`, scoreUpdate, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setScoreUpdate({ matchId: '', player: '', runs: 0, wickets: 0, catches: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update score');
    }
  };

  const handleEditAdminTeam = async (matchId) => {
    try {
      const matchRes = await axios.get('http://localhost:5000/api/matches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const match = matchRes.data.find((m) => m.id === parseInt(matchId));
      if (!match || new Date(match.deadline) < new Date()) {
        setError('Match not found or deadline passed');
        return;
      }
      const teamsRes = await axios.get('http://localhost:5000/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const team = teamsRes.data.find((t) => t.matchId === parseInt(matchId) && t.userId === 1);
      if (team) {
        setAdminTeam({ ...team, players: match.players });
        setSelectedPlayers(team.players);
        setCaptain(team.captain);
        setViceCaptain(team.viceCaptain);
      } else {
        setError('No admin team found for this match');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch admin team');
    }
  };

  const handlePlayerToggle = (player) => {
    if (selectedPlayers.includes(player.name)) {
      setSelectedPlayers(selectedPlayers.filter((p) => p !== player.name));
      if (captain === player.name) setCaptain('');
      if (viceCaptain === player.name) setViceCaptain('');
    } else if (selectedPlayers.length < 11) {
      setSelectedPlayers([...selectedPlayers, player.name]);
    }
  };

  const roles = adminTeam?.players.reduce((acc, p) => {
    if (selectedPlayers.includes(p.name)) {
      acc[p.role] = (acc[p.role] || 0) + 1;
    }
    return acc;
  }, { Wicketkeeper: 0, Batsman: 0, Bowler: 0, Allrounder: 0 }) || {};

  const teamCounts = adminTeam?.players.reduce((acc, p) => {
    if (selectedPlayers.includes(p.name)) {
      acc[p.team] = (acc[p.team] || 0) + 1;
    }
    return acc;
  }, { India: 0, Australia: 0 }) || {};

  const isValidTeam =
    selectedPlayers.length === 11 &&
    roles.Wicketkeeper >= 1 &&
    roles.Batsman >= 1 &&
    roles.Bowler >= 1 &&
    roles.Allrounder >= 1 &&
    Object.values(teamCounts).every((count) => count <= 7) &&
    captain &&
    viceCaptain &&
    captain !== viceCaptain;

  const handleSaveAdminTeam = async (e) => {
    e.preventDefault();
    if (!isValidTeam) {
      setError('Select exactly 11 players with at least 1 Wicketkeeper, Batsman, Bowler, Allrounder, max 7 from one team, and unique Captain/Vice-Captain');
      return;
    }
    try {
      await axios.put(
        `http://localhost:5000/api/admin/teams/${adminTeam.id}`,
        { players: selectedPlayers, captain, viceCaptain },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAdminTeam(null);
      setSelectedPlayers([]);
      setCaptain('');
      setViceCaptain('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save admin team');
    }
  };

  return (
    <div className="card">
      <div className="card-header" style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
        <h3 className="card-title">Admin Dashboard</h3>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Create Match */}
        <h4>Create Match</h4>
        <form onSubmit={handleCreateMatch} className="mb-4">
          <div className="mb-3">
            <label className="form-label">Team 1</label>
            <input
              type="text"
              className="form-control"
              value={newMatch.team1}
              onChange={(e) => setNewMatch({ ...newMatch, team1: e.target.value })}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Team 2</label>
            <input
              type="text"
              className="form-control"
              value={newMatch.team2}
              onChange={(e) => setNewMatch({ ...newMatch, team2: e.target.value })}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Date (YYYY-MM-DD)</label>
            <input
              type="text"
              className="form-control"
              value={newMatch.date}
              onChange={(e) => setNewMatch({ ...newMatch, date: e.target.value })}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Deadline (YYYY-MM-DD HH:MM:SS)</label>
            <input
              type="text"
              className="form-control"
              value={newMatch.deadline}
              onChange={(e) => setNewMatch({ ...newMatch, deadline: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-orange">Create Match</button>
        </form>

        {/* Update Scores */}
        <h4>Update Player Scores</h4>
        <form onSubmit={handleUpdateScore} className="mb-4">
          <div className="mb-3">
            <label className="form-label">Match ID</label>
            <input
              type="number"
              className="form-control"
              value={scoreUpdate.matchId}
              onChange={(e) => setScoreUpdate({ ...scoreUpdate, matchId: e.target.value })}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Player Name</label>
            <input
              type="text"
              className="form-control"
              value={scoreUpdate.player}
              onChange={(e) => setScoreUpdate({ ...scoreUpdate, player: e.target.value })}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Runs</label>
            <input
              type="number"
              className="form-control"
              value={scoreUpdate.runs}
              onChange={(e) => setScoreUpdate({ ...scoreUpdate, runs: parseInt(e.target.value) || 0 })}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Wickets</label>
            <input
              type="number"
              className="form-control"
              value={scoreUpdate.wickets}
              onChange={(e) => setScoreUpdate({ ...scoreUpdate, wickets: parseInt(e.target.value) || 0 })}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Catches</label>
            <input
              type="number"
              className="form-control"
              value={scoreUpdate.catches}
              onChange={(e) => setScoreUpdate({ ...scoreUpdate, catches: parseInt(e.target.value) || 0 })}
              required
            />
          </div>
          <button type="submit" className="btn btn-orange">Update Score</button>
        </form>

        {/* Edit Admin Team */}
        <h4>Edit Admin Teams</h4>
        <div className="mb-4">
          {matches.map((match) => (
            <div key={match.id} className="list-group-item mb-2">
              <p>
                Match ID: {match.id} | {match.team1} vs {match.team2} | Deadline: {match.deadline}
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleEditAdminTeam(match.id)}
                disabled={new Date(match.deadline) < new Date()}
              >
                Edit Admin Team
              </button>
            </div>
          ))}
        </div>

        {/* Edit Admin Team Modal */}
        {adminTeam && (
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit Admin Team for Match {adminTeam.matchId}</h5>
                  <button type="button" className="btn-close" onClick={() => setAdminTeam(null)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <h5>Team Composition:</h5>
                    <p>Wicketkeepers: {roles.Wicketkeeper || 0} (Min 1)</p>
                    <p>Batsmen: {roles.Batsman || 0} (Min 1)</p>
                    <p>Bowlers: {roles.Bowler || 0} (Min 1)</p>
                    <p>Allrounders: {roles.Allrounder || 0} (Min 1)</p>
                    <p>India: {teamCounts.India || 0} (Max 7)</p>
                    <p>Australia: {teamCounts.Australia || 0} (Max 7)</p>
                    <p>Total Players: {selectedPlayers.length}/11</p>
                  </div>
                  <form onSubmit={handleSaveAdminTeam}>
                    <h6>Select 11 Players:</h6>
                    <div className="row mb-3">
                      {adminTeam.players.map((player) => (
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
                                  id={`admin-${player.name}`}
                                />
                                <label className="form-check-label" htmlFor={`admin-${player.name}`}>
                                  {player.name} ({player.role})
                                </label>
                              </div>
                              {selectedPlayers.includes(player.name) && (
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${captain === player.name ? 'btn-primary' : 'btn-outline-primary'} me-1`}
                                    onClick={() => setCaptain(player.name)}
                                    disabled={viceCaptain === player.name}
                                  >
                                    Captain
                                  </button>
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${viceCaptain === player.name ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setViceCaptain(player.name)}
                                    disabled={captain === player.name}
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
                    <button type="submit" className="btn btn-orange" disabled={!isValidTeam}>
                      Save Team
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Contests */}
        <h4>All Contests</h4>
        <div className="list-group">
          {contests.map((contest) => (
            <div key={contest.id} className="list-group-item">
              <p>
                <strong>Contest ID: {contest.id}</strong> | Match: {contest.team1} vs {contest.team2} | Type: {contest.type === 'admin' ? 'Vs Admin' : 'Vs User'}
              </p>
              <p>Entry Fee: {contest.entryFee} coins | Reward: {contest.reward} coins | Max Entries: {contest.maxEntries}</p>
              <p>Date: {contest.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;