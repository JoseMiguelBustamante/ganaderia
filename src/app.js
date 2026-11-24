import express from 'ultimate-express';
import authRoutes from './routes/authRoutes.js';
import animalsRoutes from './routes/animalRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import protocolRoutes from './routes/protocolRoutes.js';
import { sendErrorCode } from './utils/sendError.js';

export const app = express();

app.use(express.json());

app.get('/api/health', (req, res) => {
    res.status(200).json({ data: { status: 'ok' } });
});

app.use('/api/auth', authRoutes);
app.use('/api/animals', animalsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/protocols', protocolRoutes);

app.use((req, res) => sendErrorCode(res, 'NOT_FOUND'));

export default app;
