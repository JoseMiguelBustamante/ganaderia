import express from 'ultimate-express';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import animalsRoutes from './routes/animalRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import semenLotRoutes from './routes/semenLotRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import protocolRoutes from './routes/protocolRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { sendErrorCode } from './utils/sendError.js';
import { corsMiddleware } from './middlewares/corsMiddleware.js';

export const app = express();

app.use(express.json());
app.use(corsMiddleware);

app.get('/api/health', (req, res) => {
    res.status(200).json({ data: { status: 'ok' } });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/animals', animalsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/semen-lots', semenLotRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/protocols', protocolRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/reports', reportRoutes);

app.use((req, res) => sendErrorCode(res, 'NOT_FOUND'));

export default app;
