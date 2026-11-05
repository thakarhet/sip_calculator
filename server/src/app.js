import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import planRoutes from './routes/planRoutes.js';

const app = express();
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim());
const isDevelopment = process.env.NODE_ENV !== 'production';

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin(origin, callback) {
  if (!origin || origins.includes(origin)) return callback(null, true);
  if (isDevelopment) {
    try {
      const parsed = new URL(origin);
      if (parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) return callback(null, true);
    } catch { /* Reject malformed origins below. */ }
  }
  return callback(new Error('Origin is not allowed by CORS'));
}, methods: ['GET', 'POST', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'], maxAge: 600 }));
app.use(express.json({ limit: '20kb', strict: true }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many sign-in attempts. Please try again later.' } }), authRoutes);
app.use('/api/plans', planRoutes);
app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((err, _req, res, _next) => {
  if (err.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body must be valid JSON.' });
  if (err.message === 'Origin is not allowed by CORS') return res.status(403).json({ message: 'Origin is not allowed.' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

export default app;
