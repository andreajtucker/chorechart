import 'dotenv/config';
import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

// Ensure the table exists before accepting requests
await pool.query(`
  CREATE TABLE IF NOT EXISTS app_state (
    key         TEXT        PRIMARY KEY,
    value       JSONB       NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(err => {
  console.error('Failed to initialise database:', err.message);
  process.exit(1);
});

// GET /api/state — return all key/value pairs as a flat object
app.get('/api/state', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM app_state');
    res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/state/:key — upsert a value
app.put('/api/state/:key', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO app_state (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
      [req.params.key, JSON.stringify(req.body.value)]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/state/:key — remove a key
app.delete('/api/state/:key', async (req, res) => {
  try {
    await pool.query('DELETE FROM app_state WHERE key = $1', [req.params.key]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const distDir = join(__dirname, '../dist');
app.use(express.static(distDir));
app.get('*', (_req, res) => res.sendFile(join(distDir, 'index.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API server listening on http://localhost:${PORT}`));
