import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity } from '../lib/activity.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 300');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Note text is required' });
  await logActivity(text, req.user);
  res.json({ ok: true });
});

export default router;
