import { pool } from '../db.js';

export async function logActivity(text, user) {
  await pool.query(
    'INSERT INTO activity_log (text, author_name, user_id) VALUES ($1, $2, $3)',
    [text, user?.name || 'Someone', user?.id || null]
  );
}
