const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();

// Core Middlewares
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const path = require('path');

// Serve uploaded files as static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Hydrogen Plant Digital Safety & Compliance Management System API',
    status: 'online'
  });
});

// Health Check Endpoint Handler
const healthCheckHandler = (req, res) => {
  const dbStateMap = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };

  const dbState = mongoose.connection.readyState;
  const isMongoConfigured = Boolean(process.env.MONGO_URI);

  res.json({
    status: 'online',
    app: 'Hydrogen Safety API',
    timestamp: new Date().toISOString(),
    database: {
      configured: isMongoConfigured,
      status: dbStateMap[dbState] || 'Unknown',
      host: mongoose.connection.host || (isMongoConfigured ? 'Pending/Unreachable' : 'MONGO_URI missing in .env'),
      name: mongoose.connection.name || 'N/A'
    }
  });
};

// GET /api/health and GET /health
app.get('/api/health', healthCheckHandler);
app.get('/health', healthCheckHandler);

// Import and Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/incidents', require('./routes/incidentRoutes'));
app.use('/api/inspections', require('./routes/inspectionRoutes'));
app.use('/api/emergency-workflows', require('./routes/emergencyRoutes'));
app.use('/api/workflows', require('./routes/emergencyRoutes'));
app.use('/api/compliance-docs', require('./routes/complianceRoutes'));
app.use('/api/audit-logs', require('./routes/auditRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));



// 404 Route Handler for undefined endpoints


app.use((req, res, next) => {
  const error = new Error(`Resource Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[Server] Hydrogen Safety API Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

