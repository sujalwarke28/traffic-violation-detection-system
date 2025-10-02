import dotenv from 'dotenv';
// Load environment variables FIRST before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';

import violationsRouter from './src/routes/violations.js';
import { verifyFirebaseToken } from './src/utils/auth.js';
import driversRouter from './src/routes/drivers.js';
import paymentsRouter from './src/routes/payments.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

const mongoUri = process.env.MONGODB_URI || '';
if (!mongoUri) {
  console.warn('MONGODB_URI not set. Set it in .env');
}

async function connectMongo() {
  try {
    await mongoose.connect(mongoUri, { dbName: process.env.MONGODB_DB || 'trafficdb' });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Protected routes
app.use('/api/violations', verifyFirebaseToken, violationsRouter);
app.use('/api/drivers', verifyFirebaseToken, driversRouter);
app.use('/api/payments', verifyFirebaseToken, paymentsRouter);

const port = process.env.PORT || 4000;

connectMongo().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
});


