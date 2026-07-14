import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity } from '../lib/activity.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM sourcing_requests ORDER BY created_at DESC');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { title, supplierId, stoneType, status, priority, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const result = await pool.query(
    `INSERT INTO sourcing_requests (title, supplier_id, stone_type, status, priority, notes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [title, supplierId || null, stoneType, status || 'Requested', priority || 'Normal', notes]
  );
  await logActivity(`Created sourcing request "${title}"`, req.user);
  res.json(result.rows[0]);
});

router.put('/:id', async (req, res) => {
  const { title, supplierId, stoneType, status, priority, notes } = req.body;
  const existing = await pool.query('SELECT status, title FROM sourcing_requests WHERE id=$1', [req.params.id]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Request not found' });

  const result = await pool.query(
    `UPDATE sourcing_requests SET title=$1, supplier_id=$2, stone_type=$3, status=$4, priority=$5,
     notes=$6, updated_at=now() WHERE id=$7 RETURNING *`,
    [title, supplierId || null, stoneType, status, priority, notes, req.params.id]
  );

  if (existing.rows[0].status !== status) {
    await logActivity(`Moved "${title}" from ${existing.rows[0].status} to ${status}`, req.user);
  } else {
    await logActivity(`Updated sourcing request "${title}"`, req.user);
  }
  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM sourcing_requests WHERE id=$1 RETURNING title', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Request not found' });
  await logActivity(`Deleted sourcing request "${result.rows[0].title}"`, req.user);
  res.json({ ok: true });
});

export default router;
