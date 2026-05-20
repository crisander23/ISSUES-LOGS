import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import issuesRoutes from './routes/issues.routes';
import projectRoutes from './routes/project.routes';
import systemsRoutes from './routes/systems.routes';
import membersRoutes from './routes/members.routes';
import smtpRoutes from './routes/smtp.routes';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: ['http://localhost:3000'],
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use(
  '/api/auth',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many auth requests. Try again shortly.', code: 'RATE_LIMITED' },
  }),
  authRoutes,
);

app.use('/api/issues', issuesRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/systems', systemsRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/smtp', smtpRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', code: 'NOT_FOUND' });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`2DOC Issues Log API listening on http://localhost:${env.PORT}`);
});
