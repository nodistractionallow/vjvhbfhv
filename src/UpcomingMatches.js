import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function UpcomingMatches({ token }) {
  const [matches, setMatches] = useState([]);
  const [contests, setContests] = useState({});
  const [error, setError] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/matches', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const upcoming = res.data.filter((match) => match.status === 'upcoming');
        setMatches(upcoming);
        const contestPromises = upcoming.map((match) =>
          axios.get(`http://localhost:5000/api/matches/${match.id}/contests`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        );
        const contestResponses = await Promise.all(contestPromises);
        const contestMap = upcoming.reduce((acc, match, index) => {
          acc[match.id] = contestResponses[index].data;
          return acc;
        }, {});
        setContests(contestMap);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch matches');
      }
    };
    if (token) fetchMatches();
  }, [token]);

  const handleJoinContest = async (contestId, teamId) => {
    try {
      await axios.post(
        `http://localhost:5000/api/contests/${contestId}/enter`,
        { teamId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContests((prev) => ({
        ...prev,
        [selectedMatchId]: prev[selectedMatchId].map((c) =>
          c.id === contestId ? { ...c, userEntered: true } : c
        ),
      }));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join contest');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Upcoming Matches</h3>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-error">{error}</div>}
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
              <div className="text-center mb-2">Team Creation Deadline: {match.deadline}</div>
              <div className="text-center">
                <Link to={`/create-team/${match.id}`} className="btn btn-orange me-2">Create Team</Link>
                <button
                  className="btn btn-primary"
                  onClick={() => setSelectedMatchId(match.id)}
                  disabled={!match.userHasTeam}
                >
                  Join Contest
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedMatchId && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Join Contest - Match {selectedMatchId}</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedMatchId(null)}></button>
              </div>
              <div className="modal-body">
                {contests[selectedMatchId]?.map((contest) => (
                  <div key={contest.id} className="mb-3 p-2 border rounded">
                    <p>
                      <strong>Type:</strong> {contest.type === 'admin' ? 'Vs Admin' : 'Vs User'}
                    </p>
                    <p><strong>Entry Fee:</strong> {contest.entryFee} coins</p>
                    <p><strong>Reward:</strong> {contest.reward} coins</p>
                    <button
                      className="btn btn-orange w-100"
                      onClick={() => {
                        const team = matches.find((m) => m.id === selectedMatchId).userHasTeam;
                        handleJoinContest(contest.id, team.id);
                      }}
                      disabled={contest.userEntered}
                    >
                      {contest.userEntered ? 'Joined' : 'Join Contest'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UpcomingMatches;