/**
 * dashboard.js
 * Optional lightweight web dashboard to view applications.
 * Run separately: node dashboard.js
 */

require('dotenv').config();
const express = require('express');
const { initDB, getAllApplications, getStats } = require('./db');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;
const DASHBOARD_SECRET = process.env.DASHBOARD_SECRET || null;

// Simple token auth middleware
function authMiddleware(req, res, next) {
  if (!DASHBOARD_SECRET) return next();
  const token = req.headers['x-dashboard-token'] || req.query.token;
  if (token !== DASHBOARD_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.use(express.json());

// ─── HTML Dashboard ───────────────────────────────────────────────────────────
app.get('/', authMiddleware, async (req, res) => {
  try {
    const [apps, stats] = await Promise.all([getAllApplications(200), getStats()]);

    const rows = apps
      .map(
        a => `
      <tr class="${a.accepted ? 'accepted' : 'rejected'}">
        <td>${a.id}</td>
        <td><span class="username">${escHtml(a.username)}</span></td>
        <td><code>${a.user_id}</code></td>
        <td>${a.score} / ${a.total}</td>
        <td>${a.percentage}%</td>
        <td><span class="badge ${a.accepted ? 'badge-accept' : 'badge-reject'}">${a.accepted ? 'Accepted' : 'Rejected'}</span></td>
        <td>${a.applied_at}</td>
      </tr>`
      )
      .join('');

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Application Dashboard</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap');
  :root {
    --bg: #0e0f17;
    --surface: #171825;
    --border: #2a2d3e;
    --accent: #5865f2;
    --green: #57f287;
    --red: #ed4245;
    --yellow: #fee75c;
    --text: #e3e5e8;
    --muted: #7b7f8b;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; min-height: 100vh; }
  header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 1.5rem 2.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  header h1 { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em; }
  header h1 span { color: var(--accent); }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
    padding: 2rem 2.5rem 1rem;
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.2rem 1.5rem;
  }
  .stat-card .label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.4rem; }
  .stat-card .value { font-size: 2rem; font-weight: 800; }
  .stat-card.green .value { color: var(--green); }
  .stat-card.red .value { color: var(--red); }
  .stat-card.accent .value { color: var(--accent); }
  .stat-card.yellow .value { color: var(--yellow); }
  .table-wrap { padding: 1rem 2.5rem 2.5rem; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 0.75rem 1rem;
    text-align: left;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
  }
  td {
    border: 1px solid var(--border);
    padding: 0.75rem 1rem;
    vertical-align: middle;
  }
  tr.accepted td { background: rgba(87, 242, 135, 0.03); }
  tr.rejected td { background: rgba(237, 66, 69, 0.03); }
  tr:hover td { background: rgba(88, 101, 242, 0.06); }
  code { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--muted); }
  .username { font-weight: 700; }
  .badge {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    border-radius: 99px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .badge-accept { background: rgba(87,242,135,0.15); color: var(--green); }
  .badge-reject { background: rgba(237,66,69,0.15); color: var(--red); }
  .empty { text-align: center; color: var(--muted); padding: 3rem; font-size: 0.95rem; }
</style>
</head>
<body>
<header>
  <div>
    <h1>⚡ Application <span>Dashboard</span></h1>
    <p style="color:var(--muted);font-size:0.8rem;margin-top:0.2rem">Discord Bot — Staff View</p>
  </div>
</header>

<div class="stats">
  <div class="stat-card accent">
    <div class="label">Total Applications</div>
    <div class="value">${stats?.total ?? 0}</div>
  </div>
  <div class="stat-card green">
    <div class="label">Accepted</div>
    <div class="value">${stats?.accepted ?? 0}</div>
  </div>
  <div class="stat-card red">
    <div class="label">Rejected</div>
    <div class="value">${stats?.rejected ?? 0}</div>
  </div>
  <div class="stat-card yellow">
    <div class="label">Avg Score</div>
    <div class="value">${stats?.avg_pct ?? 0}%</div>
  </div>
</div>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>#</th><th>Username</th><th>User ID</th><th>Score</th><th>%</th><th>Result</th><th>Applied At</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="7" class="empty">No applications yet.</td></tr>`}
    </tbody>
  </table>
</div>
</body>
</html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// ─── JSON API ─────────────────────────────────────────────────────────────────
app.get('/api/applications', authMiddleware, async (req, res) => {
  try {
    const apps = await getAllApplications(200);
    res.json(apps);
  } catch {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Database error' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`📊 Dashboard running at http://localhost:${PORT}`);
    if (DASHBOARD_SECRET) console.log(`🔒 Protected — use ?token=${DASHBOARD_SECRET}`);
  });
});

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}