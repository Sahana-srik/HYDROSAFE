const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hydrogen_safety_db';

const request = (port, method, pathStr, body, headers = {}) => {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: pathStr,
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
};

async function testDashboardFix() {
  console.log('=============================================================');
  console.log('   DASHBOARD FIX & END-TO-END VERIFICATION');
  console.log('=============================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB');

  const express = require('express');
  const cors = require('cors');
  const path = require('path');
  const errorHandler = require('./middleware/errorHandler');

  const app = express();
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  const healthCheckHandler = (req, res) => {
    const dbStateMap = { 0: 'Disconnected', 1: 'Connected', 2: 'Connecting', 3: 'Disconnecting' };
    res.json({
      status: 'online',
      app: 'Hydrogen Safety API',
      timestamp: new Date().toISOString(),
      database: {
        configured: true,
        status: dbStateMap[mongoose.connection.readyState] || 'Unknown',
        host: mongoose.connection.host || '127.0.0.1',
        name: mongoose.connection.name || 'hydrogen_safety_db'
      }
    });
  };

  app.get('/api/health', healthCheckHandler);
  app.get('/health', healthCheckHandler);
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/incidents', require('./routes/incidentRoutes'));
  app.use('/api/inspections', require('./routes/inspectionRoutes'));
  app.use('/api/emergency-workflows', require('./routes/emergencyRoutes'));
  app.use('/api/workflows', require('./routes/emergencyRoutes'));
  app.use('/api/compliance-docs', require('./routes/complianceRoutes'));
  app.use('/api/audit-logs', require('./routes/auditRoutes'));
  app.use('/api/dashboard', require('./routes/dashboardRoutes'));
  app.use(errorHandler);

  const PORT = 5005;
  const server = app.listen(PORT);
  console.log(`✓ Test API Server running on port ${PORT}`);

  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`   [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`   [FAIL] ${msg}`);
      failed++;
    }
  }

  try {
    // 1. Health check GET /api/health
    const health1 = await request(PORT, 'GET', '/api/health');
    assert(health1.status === 200, 'GET /api/health returned 200');
    assert(health1.body.database?.status === 'Connected', `Database status in health response is 'Connected' (got: ${health1.body.database?.status})`);

    // 2. Health check GET /health
    const health2 = await request(PORT, 'GET', '/health');
    assert(health2.status === 200, 'GET /health returned 200');
    assert(health2.body.database?.status === 'Connected', 'Root /health returned Connected');

    // 3. CORS Preflight check from frontend origin http://localhost:3002
    const corsPreflight = await request(PORT, 'OPTIONS', '/api/dashboard/stats', null, {
      'Origin': 'http://localhost:3002',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Authorization, Content-Type'
    });
    assert(corsPreflight.status === 204 || corsPreflight.status === 200, 'CORS preflight OPTIONS request succeeded for http://localhost:3002');

    // 4. Authenticate & fetch Dashboard stats
    const login = await request(PORT, 'POST', '/api/auth/login', {
      email: 'safety@hydro.com',
      password: 'password123'
    });
    assert(login.status === 200 && Boolean(login.body.token), 'Login succeeded for safetyOfficer');
    const token = login.body.token;

    const stats = await request(PORT, 'GET', '/api/dashboard/stats', null, {
      'Authorization': `Bearer ${token}`,
      'Origin': 'http://localhost:3002'
    });

    assert(stats.status === 200, 'GET /api/dashboard/stats returned 200');
    assert(stats.body.incidents?.total >= 3, `Seeded Incidents count returned correctly: ${stats.body.incidents?.total}`);
    assert(stats.body.emergency?.total >= 1, `Seeded Emergency Workflows returned correctly: ${stats.body.emergency?.total}`);
    assert(stats.body.inspections?.total >= 2, `Seeded Inspections returned correctly: ${stats.body.inspections?.total}`);
    assert(stats.body.compliance?.total >= 4, `Seeded Compliance Documents returned correctly: ${stats.body.compliance?.total}`);

    console.log('\n=============================================================');
    console.log(`✅ VERIFICATION COMPLETED: ${passed} PASSED, ${failed} FAILED.`);
    console.log('=============================================================');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

testDashboardFix();
