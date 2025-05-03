const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./fantasy.db');
const JWT_SECRET = 'your_jwt_secret';
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT,
    coins INTEGER DEFAULT 100
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team1 TEXT,
    team2 TEXT,
    date TEXT,
    status TEXT,
    deadline TEXT,
    players TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    matchId INTEGER,
    players TEXT,
    captain TEXT,
    viceCaptain TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matchId INTEGER,
    player TEXT,
    runs INTEGER,
    wickets INTEGER,
    catches INTEGER
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS contests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matchId INTEGER,
    type TEXT,
    entryFee INTEGER,
    reward INTEGER,
    maxEntries INTEGER
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS contest_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contestId INTEGER,
    userId INTEGER,
    teamId INTEGER
  )
`);

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Google Auth
app.post('/api/auth/google', async (req, res) => {
  try {
    const client = new OAuth2Client(CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: req.body.token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (!user) {
        db.run('INSERT INTO users (email, role, coins) VALUES (?, ?, ?)', [email, 'user', 100], function (err) {
          if (err) return res.status(500).json({ message: 'Failed to register user' });
          const token = jwt.sign({ id: this.lastID, email, role: 'user' }, JWT_SECRET);
          res.json({ token });
        });
      } else {
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
        res.json({ token });
      }
    });
  } catch (err) {
    res.status(401).json({ message: 'Google auth failed' });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (email, password, role, coins) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, 'user', 100],
      function (err) {
        if (err) return res.status(400).json({ message: 'User already exists' });
        const token = jwt.sign({ id: this.lastID, email, role: 'user' }, JWT_SECRET);
        res.json({ token });
      }
    );
  } catch (err) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) return res.status(400).json({ message: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({ token });
  });
});

// Get User Data
app.get('/api/users', verifyToken, (req, res) => {
  db.get('SELECT coins FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) return res.status(400).json({ message: 'User not found' });
    res.json({ coins: user.coins });
  });
});

// Create Match (Admin)
app.post('/api/matches', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
  const { team1, team2, date, deadline } = req.body;
  const players = JSON.stringify([
    { name: 'Rohit Sharma', role: 'Batsman', team: 'India', image: 'https://a.espncdn.com/i/headshots/cricket/players/34102.png' },
    { name: 'Shubman Gill', role: 'Batsman', team: 'India', image: 'https://a.espncdn.com/i/headshots/cricket/players/1070173.png' },
    { name: 'Virat Kohli', role: 'Batsman', team: 'India', image: 'https://a.espncdn.com/i/headshots/cricket/players/253802.png' },
    { name: 'Shreyas Iyer', role: 'Batsman', team: 'India', image: 'https://a.espncdn.com/i/headshots/cricket/players/642519.png' },
    { name: 'Sanju Samson', role: 'Wicketkeeper', team: 'India', image: 'https://a.espncdn.com/i/headshots/cricket/players/425970.png' },
    { name: 'Hardik Pandya', role: 'Allrounder', team: 'India', image: 'https://a.espncdn.com/i/headshots/cricket/players/625371.png' },
    { name: 'Ravindra Jadeja', role: 'Allrounder', team: 'India', image: 'https://a.espncdn.com/i/headshots/cricket/players/234675.png' },
    { name: 'Kuldeep Yadav', role: 'Bowler', team: 'India', image: 'https://a.espncdn.com/i/headshots/cricket/players/559235.png' },
    { name: 'Jasprit Bumrah', role: 'Bowler', team: 'India', image: 'https://a.espncdn.com/i/headshots/cricket/players/625383.png' },
    { name: 'Mohammed Siraj', role: 'Bowler', team: 'India', image: 'https://a.espncdn.com/i/headshots/cricket/players/940973.png' },
    { name: 'Mohammed Shami', role: 'Bowler', team: 'India', image: 'https://a.espncdn.com/i/headshots/cricket/players/481896.png' },
    { name: 'David Warner', role: 'Batsman', team: 'Australia', image: 'https://a.espncdn.com/i/headshots/cricket/players/219889.png' },
    { name: 'Travis Head', role: 'Batsman', team: 'Australia', image: 'https://a.espncdn.com/i/headshots/cricket/players/530011.png' },
    { name: 'Mitchell Marsh', role: 'Allrounder', team: 'Australia', image: 'https://a.espncdn.com/i/headshots/cricket/players/272450.png' },
    { name: 'Steve Smith', role: 'Batsman', team: 'Australia', image: 'https://a.espncdn.com/i/headshots/cricket/players/267192.png' },
    { name: 'Marnus Labuschagne', role: 'Batsman', team: 'Australia', image: 'https://a.espncdn.com/i/headshots/cricket/players/787987.png' },
    { name: 'Josh Inglis', role: 'Wicketkeeper', team: 'Australia', image: 'https://a.espncdn.com/i/headshots/cricket/players/662235.png' },
    { name: 'Glenn Maxwell', role: 'Allrounder', team: 'Australia', image: 'https://a.espncdn.com/i/headshots/cricket/players/325026.png' },
    { name: 'Pat Cummins', role: 'Bowler', team: 'Australia', image: 'https://a.espncdn.com/i/headshots/cricket/players/489889.png' },
    { name: 'Mitchell Starc', role: 'Bowler', team: 'Australia', image: 'https://a.espncdn.com/i/headshots/cricket/players/311592.png' },
    { name: 'Josh Hazlewood', role: 'Bowler', team: 'Australia', image: 'https://a.espncdn.com/i/headshots/cricket/players/288284.png' },
    { name: 'Adam Zampa', role: 'Bowler', team: 'Australia', image: 'https://a.espncdn.com/i/headshots/cricket/players/379504.png' },
  ]);
  db.run(
    'INSERT INTO matches (team1, team2, date, status, deadline, players) VALUES (?, ?, ?, ?, ?, ?)',
    [team1, team2, date, 'upcoming', deadline, players],
    function (err) {
      if (err) return res.status(500).json({ message: 'Failed to create match' });
      db.run(
        'INSERT INTO contests (matchId, type, entryFee, reward, maxEntries) VALUES (?, ?, ?, ?, ?)',
        [this.lastID, 'admin', 49, 90, 2],
        (err) => { if (err) console.error(err); }
      );
      db.run(
        'INSERT INTO contests (matchId, type, entryFee, reward, maxEntries) VALUES (?, ?, ?, ?, ?)',
        [this.lastID, 'user', 30, 50, 2],
        (err) => { if (err) console.error(err); }
      );
      // Create Admin Team
      const adminPlayers = JSON.parse(players).slice(0, 11).map(p => p.name);
      const captain = adminPlayers[0];
      const viceCaptain = adminPlayers[1];
      db.run(
        'INSERT INTO teams (userId, matchId, players, captain, viceCaptain) VALUES (?, ?, ?, ?, ?)',
        [1, this.lastID, JSON.stringify(adminPlayers), captain, viceCaptain],
        (err) => { if (err) console.error(err); }
      );
      res.json({ id: this.lastID, team1, team2, date, status: 'upcoming', deadline, players: JSON.parse(players) });
    }
  );
});

// Get Matches
app.get('/api/matches', verifyToken, (req, res) => {
  const currentTime = new Date().toISOString();
  db.all(
    `SELECT m.*, 
            CASE 
              WHEN m.deadline < ? AND NOT EXISTS (
                SELECT 1 FROM scores s 
                WHERE s.matchId = m.id 
                GROUP BY s.matchId 
                HAVING COUNT(DISTINCT s.player) >= 4
              ) THEN 'live'
              WHEN EXISTS (
                SELECT 1 FROM scores s 
                WHERE s.matchId = m.id 
                GROUP BY s.matchId 
                HAVING COUNT(DISTINCT s.player) >= 4
              ) THEN 'completed'
              ELSE m.status
            END AS status
     FROM matches m`,
    [currentTime],
    (err, matches) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch matches' });
      db.all('SELECT matchId FROM teams WHERE userId = ?', [req.user.id], (err, userTeams) => {
        if (err) return res.status(500).json({ message: 'Failed to fetch user teams' });
        const userMatchIds = userTeams.map((t) => t.matchId);
        res.json(
          matches.map((m) => ({
            ...m,
            players: JSON.parse(m.players),
            userHasTeam: userMatchIds.includes(m.id),
          }))
        );
      });
    }
  );
});

// Create Team
app.post('/api/teams', verifyToken, (req, res) => {
  const { matchId, players, captain, viceCaptain } = req.body;
  db.get('SELECT * FROM matches WHERE id = ? AND status = ?', [matchId, 'upcoming'], (err, match) => {
    if (err || !match) return res.status(400).json({ message: 'Invalid or non-upcoming match' });
    if (new Date(match.deadline) < new Date()) return res.status(400).json({ message: 'Team creation deadline passed' });
    const matchPlayers = JSON.parse(match.players);
    const roles = players.reduce((acc, p) => {
      const player = matchPlayers.find((mp) => mp.name === p);
      if (player) acc[player.role] = (acc[player.role] || 0) + 1;
      return acc;
    }, {});
    const teamCounts = players.reduce((acc, p) => {
      const player = matchPlayers.find((mp) => mp.name === p);
      if (player) acc[player.team] = (acc[player.team] || 0) + 1;
      return acc;
    }, {});
    if (
      players.length !== 11 ||
      roles.Wicketkeeper < 1 ||
      roles.Batsman < 1 ||
      roles.Bowler < 1 ||
      roles.Allrounder < 1 ||
      Object.values(teamCounts).some((count) => count > 7) ||
      !players.includes(captain) ||
      !players.includes(viceCaptain) ||
      captain === viceCaptain
    ) {
      return res.status(400).json({ message: 'Invalid team composition' });
    }
    db.run(
      'INSERT INTO teams (userId, matchId, players, captain, viceCaptain) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, matchId, JSON.stringify(players), captain, viceCaptain],
      function (err) {
        if (err) return res.status(500).json({ message: 'Failed to create team' });
        res.json({ id: this.lastID, userId: req.user.id, matchId, players, captain, viceCaptain });
      }
    );
  });
});

// Edit Team
app.put('/api/teams/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { players, captain, viceCaptain } = req.body;
  db.get('SELECT * FROM teams WHERE id = ? AND userId = ?', [id, req.user.id], (err, team) => {
    if (err || !team) return res.status(400).json({ message: 'Team not found' });
    db.get('SELECT * FROM matches WHERE id = ? AND status = ?', [team.matchId, 'upcoming'], (err, match) => {
      if (err || !match) return res.status(400).json({ message: 'Invalid or non-upcoming match' });
      if (new Date(match.deadline) < new Date()) return res.status(400).json({ message: 'Team editing deadline passed' });
      const matchPlayers = JSON.parse(match.players);
      const roles = players.reduce((acc, p) => {
        const player = matchPlayers.find((mp) => mp.name === p);
        if (player) acc[player.role] = (acc[player.role] || 0) + 1;
        return acc;
      }, {});
      const teamCounts = players.reduce((acc, p) => {
        const player = matchPlayers.find((mp) => mp.name === p);
        if (player) acc[player.team] = (acc[player.team] || 0) + 1;
        return acc;
      }, {});
      if (
        players.length !== 11 ||
        roles.Wicketkeeper < 1 ||
        roles.Batsman < 1 ||
        roles.Bowler < 1 ||
        roles.Allrounder < 1 ||
        Object.values(teamCounts).some((count) => count > 7) ||
        !players.includes(captain) ||
        !players.includes(viceCaptain) ||
        captain === viceCaptain
      ) {
        return res.status(400).json({ message: 'Invalid team composition' });
      }
      db.run(
        'UPDATE teams SET players = ?, captain = ?, viceCaptain = ? WHERE id = ?',
        [JSON.stringify(players), captain, viceCaptain, id],
        (err) => {
          if (err) return res.status(500).json({ message: 'Failed to update team' });
          res.json({ id, userId: req.user.id, matchId: team.matchId, players, captain, viceCaptain });
        }
      );
    });
  });
});

// Get User Teams
app.get('/api/teams', verifyToken, (req, res) => {
  db.all('SELECT * FROM teams WHERE userId = ?', [req.user.id], (err, teams) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch teams' });
    res.json(teams.map((t) => ({
      ...t,
      players: JSON.parse(t.players),
    })));
  });
});

// Create Contest Entry
app.post('/api/contests/:id/enter', verifyToken, (req, res) => {
  const { id } = req.params;
  const { teamId } = req.body;
  db.get('SELECT * FROM contests WHERE id = ?', [id], (err, contest) => {
    if (err || !contest) return res.status(400).json({ message: 'Contest not found' });
    db.get('SELECT * FROM teams WHERE id = ? AND userId = ? AND matchId = ?', [teamId, req.user.id, contest.matchId], (err, team) => {
      if (err || !team) return res.status(400).json({ message: 'Invalid team' });
      db.get('SELECT coins FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || user.coins < contest.entryFee) return res.status(400).json({ message: 'Insufficient coins' });
        db.get('SELECT * FROM contest_entries WHERE contestId = ? AND userId = ?', [id, req.user.id], (err, entry) => {
          if (entry) return res.status(400).json({ message: 'Already entered this contest' });
          db.all('SELECT * FROM contest_entries WHERE contestId = ?', [id], (err, entries) => {
            if (entries.length >= contest.maxEntries) return res.status(400).json({ message: 'Contest full' });
            db.run(
              'INSERT INTO contest_entries (contestId, userId, teamId) VALUES (?, ?, ?)',
              [id, req.user.id, teamId],
              function (err) {
                if (err) return res.status(500).json({ message: 'Failed to enter contest' });
                db.run('UPDATE users SET coins = coins - ? WHERE id = ?', [contest.entryFee, req.user.id]);
                if (contest.type === 'user' && entries.length === 1) {
                  db.run(
                    'INSERT INTO contests (matchId, type, entryFee, reward, maxEntries) VALUES (?, ?, ?, ?, ?)',
                    [contest.matchId, 'user', 30, 50, 2]
                  );
                }
                res.json({ contestId: id, userId: req.user.id, teamId });
              }
            );
          });
        });
      });
    });
  });
});

// Get Contests for Match
app.get('/api/matches/:id/contests', verifyToken, (req, res) => {
  const { id } = req.params;
  db.all('SELECT * FROM contests WHERE matchId = ?', [id], (err, contests) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch contests' });
    db.all('SELECT * FROM contest_entries WHERE userId = ?', [req.user.id], (err, userEntries) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch entries' });
      const userContestIds = userEntries.map((e) => e.contestId);
      res.json(contests.map((c) => ({
        ...c,
        userEntered: userContestIds.includes(c.id),
      })));
    });
  });
});

// Get Contest Details
app.get('/api/contests/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM contests WHERE id = ?', [id], (err, contest) => {
    if (err || !contest) return res.status(400).json({ message: 'Contest not found' });
    db.all('SELECT ce.*, u.email FROM contest_entries ce JOIN users u ON ce.userId = u.id WHERE contestId = ?', [id], (err, entries) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch entries' });
      db.all('SELECT * FROM teams WHERE id IN (SELECT teamId FROM contest_entries WHERE contestId = ?)', [id], (err, teams) => {
        if (err) return res.status(500).json({ message: 'Failed to fetch teams' });
        db.get('SELECT status, deadline FROM matches WHERE id = ?', [contest.matchId], (err, match) => {
          if (err) return res.status(500).json({ message: 'Failed to fetch match' });
          res.json({
            ...contest,
            entries: entries.map((e) => ({
              ...e,
              team: teams.find((t) => t.id === e.teamId) ? {
                ...teams.find((t) => t.id === e.teamId),
                players: JSON.parse(teams.find((t) => t.id === e.teamId).players),
              } : null,
            })),
            canViewTeams: match.status !== 'upcoming' || new Date(match.deadline) < new Date(),
          });
        });
      });
    });
  });
});

// Update Scores (Admin)
app.put('/api/matches/:id/scores', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
  const { id } = req.params;
  const { player, runs, wickets, catches } = req.body;
  db.run(
    'INSERT OR REPLACE INTO scores (matchId, player, runs, wickets, catches) VALUES (?, ?, ?, ?, ?)',
    [id, player, runs, wickets, catches],
    (err) => {
      if (err) return res.status(500).json({ message: 'Failed to update score' });
      db.run("UPDATE matches SET status = 'live' WHERE id = ?", [id]);
      res.json({ message: 'Score updated' });
    }
  );
});

// Calculate Winner and Contest Rewards
app.post('/api/matches/:id/calculate-winner', verifyToken, (req, res) => {
  const { id } = req.params;
  db.all('SELECT * FROM teams WHERE matchId = ?', [id], (err, teams) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch teams' });
    db.all('SELECT * FROM scores WHERE matchId = ?', [id], (err, scores) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch scores' });
      const teamPoints = teams.map((team) => {
        const players = JSON.parse(team.players);
        const points = players.reduce((total, player) => {
          const score = scores.find((s) => s.player === player);
          let multiplier = 1;
          if (player === team.captain) multiplier = 2;
          if (player === team.viceCaptain) multiplier = 1.5;
          return total + (score ? (score.runs + score.wickets * 20 + score.catches * 10) * multiplier : 0);
        }, 0);
        return { teamId: team.id, userId: team.userId, points };
      });
      const maxPoints = Math.max(...teamPoints.map((t) => t.points));
      const winner = teamPoints.find((t) => t.points === maxPoints);
      db.all('SELECT * FROM contests WHERE matchId = ?', [id], (err, contests) => {
        if (err) return res.status(500).json({ message: 'Failed to fetch contests' });
        contests.forEach((contest) => {
          db.all('SELECT * FROM contest_entries WHERE contestId = ?', [contest.id], (err, entries) => {
            if (err) return;
            const entryPoints = entries.map((e) => ({
              ...e,
              points: teamPoints.find((t) => t.teamId === e.teamId)?.points || 0,
            }));
            let winnerId = null;
            if (contest.type === 'admin') {
              const adminTeam = teamPoints.find((t) => t.userId === 1); // Assume admin userId=1
              const userEntry = entryPoints.find((e) => e.userId !== 1);
              if (userEntry && userEntry.points > (adminTeam?.points || 0)) {
                winnerId = userEntry.userId;
              }
            } else {
              const maxEntryPoints = Math.max(...entryPoints.map((e) => e.points));
              winnerId = entryPoints.find((e) => e.points === maxEntryPoints)?.userId;
            }
            if (winnerId) {
              db.run('UPDATE users SET coins = coins + ? WHERE id = ?', [contest.reward, winnerId]);
            }
          });
        });
      });
      db.get('SELECT email FROM users WHERE id = ?', [winner?.userId || 0], (err, user) => {
        if (err) return res.status(500).json({ message: 'Failed to fetch user' });
        res.json({ winner: winner ? { email: user?.email || 'None', points: winner.points } : null, teamPoints });
      });
    });
  });
});

// Get Leaderboard
app.get('/api/matches/:id/leaderboard', verifyToken, (req, res) => {
  const { id } = req.params;
  db.all('SELECT * FROM teams WHERE matchId = ?', [id], (err, teams) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch teams' });
    db.all('SELECT * FROM scores WHERE matchId = ?', [id], (err, scores) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch scores' });
      const leaderboard = teams
        .map((team) => {
          const players = JSON.parse(team.players);
          const points = players.reduce((total, player) => {
            const score = scores.find((s) => s.player === player);
            let multiplier = 1;
            if (player === team.captain) multiplier = 2;
            if (player === team.viceCaptain) multiplier = 1.5;
            return total + (score ? (score.runs + score.wickets * 20 + score.catches * 10) * multiplier : 0);
          }, 0);
          return { teamId: team.id, userId: team.userId, points };
        })
        .sort((a, b) => b.points - a.points);
      db.all('SELECT id, email FROM users', (err, users) => {
        if (err) return res.status(500).json({ message: 'Failed to fetch users' });
        const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.email }), {});
        const rankedLeaderboard = leaderboard.map((entry, index) => ({
          rank: index + 1,
          email: userMap[entry.userId] || 'Unknown',
          teamId: entry.teamId,
          points: entry.points,
        }));
        const userEntry = rankedLeaderboard.find((entry) => entry.email === req.user.email);
        res.json({ userEntry, leaderboard: rankedLeaderboard });
      });
    });
  });
});

app.listen(5000, () => console.log('Server running on port 5000'));