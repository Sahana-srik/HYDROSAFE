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

async function runIncidentTestSuite() {
  process.env.JWT_SECRET = 'incident_test_secret_key';
  process.env.NODE_ENV = 'development';

  console.log('--- STARTING INCIDENT REPORTING MODULE SUITE ---');

  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  console.log('[Test DB] In-Memory MongoDB connected.');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/incidents', require('./routes/incidentRoutes'));
  app.use(errorHandler);

  const server = app.listen(5003);
  const PORT = 5003;
  console.log(`[Test Server] Test server listening on port ${PORT}\n`);

  try {
    // Setup Users: Worker 1, Worker 2, Safety Officer
    console.log('0. Setting up test accounts (Worker 1, Worker 2, Safety Officer)...');
    const w1Reg = await request(PORT, 'POST', '/api/auth/register', {
      name: 'Worker One', email: 'worker1@hydro.com', password: 'password123', role: 'worker', employeeId: 'EMP-W01'
    });
    const w2Reg = await request(PORT, 'POST', '/api/auth/register', {
      name: 'Worker Two', email: 'worker2@hydro.com', password: 'password123', role: 'worker', employeeId: 'EMP-W02'
    });
    const soReg = await request(PORT, 'POST', '/api/auth/register', {
      name: 'Officer Safety', email: 'officer@hydro.com', password: 'password123', role: 'safetyOfficer', employeeId: 'EMP-S01'
    });

    const w1Token = w1Reg.body.token;
    const w2Token = w2Reg.body.token;
    const soToken = soReg.body.token;

    // Test 1: Create Incident (Worker 1)
    console.log('1. Testing POST /api/incidents (Create Incident by Worker 1)...');
    const incRes = await request(PORT, 'POST', '/api/incidents', {
      title: 'H2 Tank Pressure Spike',
      type: 'Pressure Spike',
      severity: 'high',
      location: 'Electrolyzer Storage Tank A',
      description: 'Storage tank A registered pressure reading of 350 bar (threshold 300 bar).'
    }, { Authorization: `Bearer ${w1Token}` });

    console.log(`   HTTP Status: ${incRes.status}`);
    console.log(`   Incident ID: ${incRes.body._id}`);
    console.log(`   Initial Status: ${incRes.body.status}`);
    console.log(`   Reported By: ${incRes.body.reportedBy.name} (${incRes.body.reportedBy.role})`);
    console.log(`   Timeline Entries Count: ${incRes.body.timeline.length}`);
    const incidentId = incRes.body._id;

    if (incRes.status !== 201 || incRes.body.timeline.length !== 1) {
      throw new Error('Create incident failed');
    }

    // Test 2: Get Incidents List (Worker 1 vs Safety Officer)
    console.log('\n2. Testing GET /api/incidents (Role Scope Check)...');
    const w1Incidents = await request(PORT, 'GET', '/api/incidents', null, { Authorization: `Bearer ${w1Token}` });
    const soIncidents = await request(PORT, 'GET', '/api/incidents', null, { Authorization: `Bearer ${soToken}` });
    console.log(`   Worker 1 sees: ${w1Incidents.body.length} incident(s)`);
    console.log(`   Safety Officer sees: ${soIncidents.body.length} incident(s)`);
    if (w1Incidents.body.length !== 1 || soIncidents.body.length !== 1) {
      throw new Error('Get incidents list failed');
    }

    // Test 3: Get Incident by ID
    console.log('\n3. Testing GET /api/incidents/:id (Fetch Details)...');
    const detailRes = await request(PORT, 'GET', `/api/incidents/${incidentId}`, null, { Authorization: `Bearer ${soToken}` });
    console.log(`   HTTP Status: ${detailRes.status}`);
    console.log(`   Title: ${detailRes.body.title}`);
    console.log(`   Reporter Email: ${detailRes.body.reportedBy.email}`);
    if (detailRes.status !== 200) throw new Error('Get incident details failed');

    // Test 4: Unauthorized request (no token)
    console.log('\n4. Testing POST /api/incidents WITHOUT token (expect 401 Unauthenticated)...');
    const unauthRes = await request(PORT, 'POST', '/api/incidents', { title: 'Test' });
    console.log(`   HTTP Status: ${unauthRes.status}, Message: ${unauthRes.body.message}`);
    if (unauthRes.status !== 401) throw new Error('Unauthenticated request should return 401');

    // Test 5: Worker Permission Check (Worker 2 trying to view Worker 1 incident)
    console.log('\n5. Testing GET /api/incidents/:id with Worker 2 token (expect 403 Forbidden)...');
    const forbiddenGet = await request(PORT, 'GET', `/api/incidents/${incidentId}`, null, { Authorization: `Bearer ${w2Token}` });
    console.log(`   HTTP Status: ${forbiddenGet.status}, Message: ${forbiddenGet.body.message}`);
    if (forbiddenGet.status !== 403) throw new Error('Cross-worker view should return 403 Forbidden');

    // Test 6: Safety Officer Status Update & Timeline Append
    console.log('\n6. Testing PATCH /api/incidents/:id/status by Safety Officer (acknowledged)...');
    const statusUpdate1 = await request(PORT, 'PATCH', `/api/incidents/${incidentId}/status`, {
      status: 'acknowledged',
      note: 'Safety team dispatched to Electrolyzer Tank A.'
    }, { Authorization: `Bearer ${soToken}` });
    console.log(`   HTTP Status: ${statusUpdate1.status}`);
    console.log(`   Updated Status: ${statusUpdate1.body.status}`);
    console.log(`   Timeline Entries Count: ${statusUpdate1.body.timeline.length}`);
    console.log(`   Latest Timeline Note: "${statusUpdate1.body.timeline[1].note}"`);
    if (statusUpdate1.status !== 200 || statusUpdate1.body.timeline.length !== 2) {
      throw new Error('Status update 1 failed');
    }

    // Test 7: Worker Status Update Attempt (expect 403 Forbidden)
    console.log('\n7. Testing PATCH /api/incidents/:id/status by Worker (expect 403 Forbidden)...');
    const workerStatusUpdate = await request(PORT, 'PATCH', `/api/incidents/${incidentId}/status`, {
      status: 'closed'
    }, { Authorization: `Bearer ${w1Token}` });
    console.log(`   HTTP Status: ${workerStatusUpdate.status}, Message: ${workerStatusUpdate.body.message}`);
    if (workerStatusUpdate.status !== 403) throw new Error('Worker status update should return 403 Forbidden');

    // Test 8: Invalid Status Update (expect 400 Bad Request)
    console.log('\n8. Testing PATCH /api/incidents/:id/status with invalid status (expect 400)...');
    const invalidStatusRes = await request(PORT, 'PATCH', `/api/incidents/${incidentId}/status`, {
      status: 'invalid_status_value'
    }, { Authorization: `Bearer ${soToken}` });
    console.log(`   HTTP Status: ${invalidStatusRes.status}, Message: ${invalidStatusRes.body.message}`);
    if (invalidStatusRes.status !== 400) throw new Error('Invalid status should return 400 Bad Request');

    // Test 9: Timeline Preservation Check (Transition to underInvestigation)
    console.log('\n9. Testing Timeline Preservation (Transition to underInvestigation)...');
    const statusUpdate2 = await request(PORT, 'PATCH', `/api/incidents/${incidentId}/status`, {
      status: 'underInvestigation',
      note: 'Pressure valve sensors under investigation by technical inspectors.'
    }, { Authorization: `Bearer ${soToken}` });
    console.log(`   Timeline Entries Count: ${statusUpdate2.body.timeline.length}`);
    console.log(`   Timeline History:`);
    statusUpdate2.body.timeline.forEach((t, i) => {
      console.log(`     [${i+1}] ${t.status} | By: ${t.changedBy.name} (${t.changedBy.role}) | Note: ${t.note}`);
    });
    if (statusUpdate2.body.timeline.length !== 3) {
      throw new Error('Timeline preservation failed - history count mismatch');
    }

    // Test 10: Not-Found Incident Check
    console.log('\n10. Testing GET /api/incidents/65f000000000000000000000 (expect 404)...');
    const notFoundRes = await request(PORT, 'GET', '/api/incidents/65f000000000000000000000', null, { Authorization: `Bearer ${soToken}` });
    console.log(`    HTTP Status: ${notFoundRes.status}, Message: ${notFoundRes.body.message}`);
    if (notFoundRes.status !== 404) throw new Error('Non-existent ID should return 404');

    console.log('\n=============================================================');
    console.log('✅ ALL 10 INCIDENT MODULE TEST CASES PASSED SUCCESSFULLY!');
    console.log('=============================================================');
  } catch (err) {
    console.error('\n❌ Test Suite Error:', err.message);
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  }
}

runIncidentTestSuite();
