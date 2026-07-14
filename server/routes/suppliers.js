import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity } from '../lib/activity.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM suppliers ORDER BY created_at DESC');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { name, company, category, country, email, phone, lastContact, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = await pool.query(
    `INSERT INTO suppliers (name, company, category, country, email, phone, last_contact, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [name, company, category, country, email, phone, lastContact || null, notes]
  );
  await logActivity(`Added supplier ${name}`, req.user);
  res.json(result.rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, company, category, country, email, phone, lastContact, notes } = req.body;
  const result = await pool.query(
    `UPDATE suppliers SET name=$1, company=$2, category=$3, country=$4, email=$5, phone=$6,
     last_contact=$7, notes=$8, updated_at=now() WHERE id=$9 RETURNING *`,
    [name, company, category, country, email, phone, lastContact || null, notes, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Supplier not found' });
  await logActivity(`Updated supplier ${name}`, req.user);
  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM suppliers WHERE id=$1 RETURNING name', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Supplier not found' });
  await logActivity(`Deleted supplier ${result.rows[0].name}`, req.user);
  res.json({ ok: true });
});

export default router;
