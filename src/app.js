import express from 'ultimate-express';
import authRoutes from './routes/authRoutes.js';
import { sendErrorCode } from './utils/sendError.js';

export const app = express();

app.use(express.json());

app.get('/api/health', (req, res) => {
    res.status(200).json({ data: { status: 'ok' } });
});

app.use('/api/auth', authRoutes);

app.use((req, res) => sendErrorCode(res, 'NOT_FOUND'));

export default app;
