const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Load env vars
dotenv.config();

const app = express();

// Behind Render/Railway proxies
app.set('trust proxy', 1);

// Body parser
app.use(express.json({ limit: '10mb' }));

// Enable CORS (open for mobile APK clients worldwide)
app.use(cors({
  origin: true,
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
}));

// Health check for cloud platforms
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Banaadir BuildPermit API',
    env: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const permitRoutes = require('./routes/permitRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const districtRoutes = require('./routes/districtRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const buildingTypeRoutes = require('./routes/buildingTypeRoutes');
const districtBranchRoutes = require('./routes/districtBranchRoutes');
const renovationTypeRoutes = require('./routes/renovationTypeRoutes');

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/districts', districtRoutes);
app.use('/api/permits', permitRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/building-types', buildingTypeRoutes);
app.use('/api/district-branches', districtBranchRoutes);
app.use('/api/renovation-types', renovationTypeRoutes);
app.use('/api/renew-types', require('./routes/renewTypeRoutes'));
app.use('/api/discounts', require('./routes/discountRoutes'));
app.use('/api/scans', require('./routes/scanRoutes'));

// App proxy for PDF blob bypass (Evades IDM entirely)
app.get('/api/stream-pdf', (req, res) => {
  try {
    const filePath = req.query.file;
    if (!filePath) return res.status(400).json({ error: 'No file specified' });

    const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    const absolutePath = path.join(__dirname, cleanPath);

    if (!absolutePath.startsWith(path.join(__dirname, 'uploads'))) {
      return res.status(403).json({ error: 'Invalid path' });
    }

    if (fs.existsSync(absolutePath)) {
      res.setHeader('Content-Type', 'application/octet-stream');
      const fileStream = fs.createReadStream(absolutePath);
      fileStream.pipe(res);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Static serving for uploaded documents
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    if (filePath.toLowerCase().endsWith('.pdf')) {
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', 'inline');
    }
  },
}));

const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGODB_URL ||
  'mongodb://localhost:27017/permit-system';

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Set it in your environment before production use.');
}

// Connect to database and start server
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB Connected');
    try {
      const District = require('./models/District');
      await District.collection.dropIndex('supervisor_1');
    } catch (_) {
      /* index may already be gone */
    }
    const server = http.createServer(app);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
    const { initWebSocket } = require('./services/websocketService');
    initWebSocket(server);
  })
  .catch((err) => {
    console.error(`Error connecting to MongoDB: ${err.message}`);
    process.exit(1);
  });
