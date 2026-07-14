import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import supplierRoutes from './routes/suppliers.js';
import requestRoutes from './routes/requests.js';
import activityRoutes from './routes/activity.js';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/activity', activityRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`The Webb Sourcing API running on port ${port}`));
