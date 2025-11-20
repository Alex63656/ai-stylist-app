import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import handler from './routes/generate.js';44

import { validateTelegramData } from './middleware/telegram.js';
import { creditsRoute } from './routes/credits.js';
import { historyRoute } from './routes/history.js';
import { bot } from '../bot.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Отключаем для Mini App
}));
app.use(compression());
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Раздача статических файлов из корня репозитория
app.use(express.static(path.join(__dirname, '../..')));
app.use('/assets', express.static(path.join(__dirname, '../../assets')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.post('/api/generate',, handler);
app.get('/api/credits', validateTelegramData, creditsRoute);
app.get('/api/history', validateTelegramData, historyRoute);

// Telegram Webhook для Mini App
app.post('/webhook/telegram', (req, res) => {
  // Telegram отправляет обновления на этот endpoint
    // Process Telegram webhook updates
  try {
    bot.processUpdate(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error processing webhook update:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});


// Главная страница (Mini App)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
});
