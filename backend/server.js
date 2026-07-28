const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

// Load env vars
dotenv.config();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors({
  origin: true, // Allow any origin for development
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));

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
const path = require('path');

const fs = require('fs');

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
      // Serve as application/octet-stream so IDM ignores it completely
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
  }
}));

// Error handler middleware can be added here

const PORT = process.env.PORT || 5000;

// Connect to database and start server
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/permit-system')
  .then(() => {
    console.log('MongoDB Connected');
    const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    const { initWebSocket } = require('./services/websocketService');
    initWebSocket(server);
  })
  .catch((err) => {
    console.error(`Error connecting to MongoDB: ${err.message}`);
    process.exit(1);
  });
