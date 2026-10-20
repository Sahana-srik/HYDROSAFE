const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { MongoMemoryServer } = require('mongodb-memory-server');
const errorHandler = require('./middleware/errorHandler');

const request = (port, method, path, body, headers = {}) => {
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
        path,
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
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
};

async function runMemoryTestSuite() {
  process.env.JWT_SECRET = 'test_secret_key_12345';
  process.env.NODE_ENV = 'development';

  console.log('--- STARTING IN-MEMORY MONGODB AUTHENTICATION & AUTHORIZATION SUITE ---');

  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  console.log('[Test DB] In-Memory MongoDB process started and connected.');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use(errorHandler);

  const server = app.listen(5002);
  const PORT = 5002;
  console.log(`[Test Server] Temporary test server listening on port ${PORT}\n`);

  try {
    // Test 1: Register Worker User
    console.log('1. Testing POST /api/auth/register (Role: worker)...');
    const regRes = await request(PORT, 'POST', '/api/auth/register', {
      name: 'John Worker',
      email: 'john.worker@hydro.com',
      password: 'password123',
      role: 'worker',
      employeeId: 'EMP-W01',
      department: 'Electrolysis'
    });
    console.log(`   HTTP Status: ${regRes.status}`);
    console.log(`   User ID: ${regRes.body._id}`);
    console.log(`   User Role: ${regRes.body.role}`);
    console.log(`   Has Token: ${Boolean(regRes.body.token)}`);
    console.log(`   Password hash returned in body? ${Boolean(regRes.body.password)}`);
    if (regRes.status !== 201 || regRes.body.password) {
      throw new Error('Registration test failed');
    }

    // Test 2: Duplicate Email Registration
    console.log('\n2. Testing Duplicate Email Registration (expect HTTP 400)...');
    const dupRes = await request(PORT, 'POST', '/api/auth/register', {
      name: 'Duplicate John',
      email: 'john.worker@hydro.com',
      password: 'anotherpassword',
      role: 'worker'
    });
    console.log(`   HTTP Status: ${dupRes.status}, Message: ${dupRes.body.message}`);
    if (dupRes.status !== 400) throw new Error('Duplicate registration should return 400');

    // Test 3: Register Safety Officer
    console.log('\n3. Testing POST /api/auth/register (Role: safetyOfficer)...');
    const officerRegRes = await request(PORT, 'POST', '/api/auth/register', {
      name: 'Sarah Safety',
      email: 'sarah.safety@hydro.com',
      password: 'password123',
      role: 'safetyOfficer',
      employeeId: 'EMP-S01',
      department: 'HSE Management'
    });
    console.log(`   HTTP Status: ${officerRegRes.status}, Role: ${officerRegRes.body.role}`);
    const officerToken = officerRegRes.body.token;

    // Test 4: Login Worker User
    console.log('\n4. Testing POST /api/auth/login (Worker)...');
    const loginRes = await request(PORT, 'POST', '/api/auth/login', {
      email: 'john.worker@hydro.com',
      password: 'password123'
    });
    console.log(`   HTTP Status: ${loginRes.status}`);
    console.log(`   Token Issued: ${Boolean(loginRes.body.token)}`);
    console.log(`   Password in login response? ${Boolean(loginRes.body.password)}`);
    const workerToken = loginRes.body.token;

    // Verify JWT payload contents
    const payload = JSON.parse(Buffer.from(workerToken.split('.')[1], 'base64').toString());
    console.log(`   Decoded JWT Payload: { id: "${payload.id}", role: "${payload.role}" }`);
    if (!payload.id || payload.role !== 'worker') {
      throw new Error('JWT payload validation failed');
    }

    // Test 5: Access Protected Route WITH Token
    console.log('\n5. Testing GET /api/auth/me WITH valid Bearer token...');
    const meRes = await request(PORT, 'GET', '/api/auth/me', null, {
      Authorization: `Bearer ${workerToken}`
    });
    console.log(`   HTTP Status: ${meRes.status}`);
    console.log(`   Returned User: ${meRes.body.name} (${meRes.body.email})`);
    if (meRes.status !== 200) throw new Error('Protected profile fetch failed');

    // Test 6: Access Protected Route WITHOUT Token (401 Unauthenticated)
    console.log('\n6. Testing GET /api/auth/me WITHOUT token (expect HTTP 401 Unauthenticated)...');
    const noTokenRes = await request(PORT, 'GET', '/api/auth/me');
    console.log(`   HTTP Status: ${noTokenRes.status}, Message: ${noTokenRes.body.message}`);
    if (noTokenRes.status !== 401) throw new Error('Unauthenticated access should return 401');

    // Test 7: Access Admin Route with Worker Role (403 Forbidden)
    console.log('\n7. Testing GET /api/auth/admin-only with Worker Role (expect HTTP 403 Forbidden)...');
    const forbiddenRes = await request(PORT, 'GET', '/api/auth/admin-only', null, {
      Authorization: `Bearer ${workerToken}`
    });
    console.log(`   HTTP Status: ${forbiddenRes.status}, Message: ${forbiddenRes.body.message}`);
    if (forbiddenRes.status !== 403) throw new Error('Role mismatch should return 403 Forbidden');

    // Test 8: Access Admin Route with Safety Officer Role (200 OK)
    console.log('\n8. Testing GET /api/auth/admin-only with Safety Officer Role (expect HTTP 200 OK)...');
    const allowedRes = await request(PORT, 'GET', '/api/auth/admin-only', null, {
      Authorization: `Bearer ${officerToken}`
    });
    console.log(`   HTTP Status: ${allowedRes.status}, Message: ${allowedRes.body.message}`);
    if (allowedRes.status !== 200) throw new Error('Authorized role access failed');

    console.log('\n=============================================================');
    console.log('✅ VERIFICATION COMPLETED SUCCESSFULLY: ALL 8 TEST CASES PASSED!');
    console.log('=============================================================');
  } catch (err) {
    console.error('\n❌ Test Suite Error:', err.message);
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  }
}

runMemoryTestSuite();
