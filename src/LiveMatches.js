import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function LiveMatches({ token }) {
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedContest, setSelectedContest] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/matches', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const liveMatches = res.data.filter((match) => match.status === 'live' && match.userHasTeam);
        const teamsRes = await axios.get('http://localhost:5000/api/teams', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const teams = teamsRes.data;
        const matchesWithData = await Promise.all(
          liveMatches.map(async (match) => {
            const scoresRes = await axios.get(`http://localhost:5000/api/matches/${match.id}/leaderboard`, {
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => ({ data: { leaderboard: [] } }));
            const team = teams.find((t) => t.matchId === match.id);
            const leaderboard = scoresRes.data.leaderboard || [];
            const userEntry = leaderboard.find((entry) => entry.email === JSON.parse(atob(token.split('.')[1])).email);
            // Calculate points after team is defined
            const points = team
              ? JSON.parse(team.players).reduce((total, player) => {
                  const score = match.scores?.find((s) => s.player === player);
                  let multiplier = 1;
                  if (player === team.captain) multiplier = 2;
                  if (player === team.viceCaptain) multiplier = 1.5;
                  return total + (score ? (score.runs + score.wickets * 20 + score.catches * 10) * multiplier : 0);
                }, 0)
              : 0;
            const contestsRes = await axios.get(`http://localhost:5000/api/matches/${match.id}/contests`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            return { ...match, team, points, rank: userEntry?.rank || 'N/A', contests: contestsRes.data };
          })
        );
        setMatches(matchesWithData);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch matches');
      }
    };
    if (token) fetchMatches();
  }, [token]);

  const handleTeamClick = (team, matchId) => {
    axios.get(`http://localhost:5000/api/matches/${matchId}/leaderboard`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      const scores = res.data.leaderboard.reduce((acc, entry) => {
        const teamPlayers = entry.teamId === team.id ? JSON.parse(team.players) : [];
        teamPlayers.forEach((player) => {
          const score = entry.points / teamPlayers.length;
          acc[player] = score;
        });
        return acc;
      }, {});
      axios.get(`http://localhost:5000/api/matches`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((matchRes) => {
        const match = matchRes.data.find((m) => m.id === matchId);
        const players = match.players;
        setSelectedTeam({ ...team, scores, players });
      });
    });
  };

  const handleContestClick = async (contestId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/contests/${contestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedContest(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch contest');
    }
  };

  return (
    <div className="card">
      <div className="card-header" style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
        <h3 className="card-title">Live Matches</h3>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="list-group">
          {matches.map((match) => (
            <div key={match.id} className="list-group-item">
              <div className="text-center mb-2">
                <strong>Match ID: {match.id}</strong>
              </div>
              <div className="d-flex align-items-center justify-content-center mb-2">
                <div className="text-center me-3">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/mai/1/11/India_national_cricket_team.png"
                    alt="India Logo"
                    style={{ width: '40px', height: '40px' }}
                  />
                  <div>{match.team1}</div>
                </div>
                <div className="mx-3 fw-bold">VS</div>
                <div className="text-center ms-3">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/en/3/3f/Cricket_Australia.png"
                    alt="Australia Logo"
                    style={{ width: '40px', height: '40px' }}
                  />
                  <div>{match.team2}</div>
                </div>
              </div>
              <div className="text-center mb-2">Date: {match.date}</div>
              <div className="text-center mb-2">Status: Live</div>
              {match.team && (
                <div className="d-flex justify-content-between align-items-center bg-light p-2 rounded mt-2">
                  <span
                    role="button"
                    className="text-primary"
                    onClick={() => handleTeamClick(match.team, match.id)}
                  >
                    My Team
                  </span>
                  <span>Score: {match.points} | Rank: {match.rank}</span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/leaderboard/${match.id}`)}
                  >
                    Leaderboard
                  </button>
                </div>
              )}
              <div className="mt-2">
                <h6>Contests:</h6>
                {match.contests.map((contest) => (
                  <button
                    key={contest.id}
                    className="btn btn-outline-primary btn-sm me-2"
                    onClick={() => handleContestClick(contest.id)}
                    disabled={!contest.userEntered}
                  >
                    View {contest.type === 'admin' ? 'Vs Admin' : 'Vs User'} Contest
                  </button>
                ))}
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
                <h5 className="modal-title">My Team Players</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedTeam(null)}></button>
              </div>
              <div className="modal-body">
                <ul className="list-group">
                  {selectedTeam.players.map((player) => {
                    const playerData = selectedTeam.players.find((p) => p.name === player);
                    return (
                      <li key={player} className="list-group-item d-flex align-items-center">
                        {playerData && (
                          <img
                            src={playerData.image}
                            alt={player}
                            style={{ width: '30px', height: '30px', marginRight: '10px' }}
                          />
                        )}
                        <div>
                          {player}: {selectedTeam.scores[player] || 0} points
                          {player === selectedTeam.captain && ' (Captain)'}
                          {player === selectedTeam.viceCaptain && ' (Vice-Captain)'}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedContest && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{selectedContest.type === 'admin' ? 'Vs Admin' : 'Vs User'} Contest</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedContest(null)}></button>
              </div>
              <div className="modal-body">
                <p><strong>Entry Fee:</strong> {selectedContest.entryFee} coins</p>
                <p><strong>Reward:</strong> {selectedContest.reward} coins</p>
                {selectedContest.canViewTeams ? (
                  <ul className="list-group">
                    {selectedContest.entries.map((entry) => (
                      <li key={entry.id} className="list-group-item">
                        <strong>{entry.email}</strong>: {entry.team ? entry.team.players.join(', ') : 'Admin Team'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Opponent team visible after deadline</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveMatches;