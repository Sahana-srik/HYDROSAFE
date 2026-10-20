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

async function runInspectionTestSuite() {
  process.env.JWT_SECRET = 'inspection_test_secret_key';
  process.env.NODE_ENV = 'development';

  console.log('--- STARTING INSPECTION MANAGEMENT MODULE SUITE ---');

  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  console.log('[Test DB] In-Memory MongoDB connected.');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/inspections', require('./routes/inspectionRoutes'));
  app.use(errorHandler);

  const server = app.listen(5004);
  const PORT = 5004;
  console.log(`[Test Server] Test server listening on port ${PORT}\n`);

  try {
    // 0. Register Accounts: Safety Officer, Inspector, Plant Worker
    console.log('0. Setting up test accounts (Safety Officer, Inspector, Worker)...');
    const soReg = await request(PORT, 'POST', '/api/auth/register', {
      name: 'Officer Safety', email: 'safety@hydro.com', password: 'password123', role: 'safetyOfficer', employeeId: 'EMP-S01'
    });
    const inspReg = await request(PORT, 'POST', '/api/auth/register', {
      name: 'Inspector Gadget', email: 'inspector@hydro.com', password: 'password123', role: 'inspector', employeeId: 'EMP-I01'
    });
    const workerReg = await request(PORT, 'POST', '/api/auth/register', {
      name: 'Worker Bob', email: 'worker@hydro.com', password: 'password123', role: 'worker', employeeId: 'EMP-W01'
    });

    const soToken = soReg.body.token;
    const inspToken = inspReg.body.token;
    const workerToken = workerReg.body.token;
    const inspectorId = inspReg.body._id;

    // Test 1: Create / Schedule Inspection
    console.log('1. Testing POST /api/inspections (Schedule Inspection)...');
    const createRes = await request(PORT, 'POST', '/api/inspections', {
      equipment: 'Electrolyzer Stack Unit #1',
      zone: 'Zone A - Production',
      type: 'routine',
      scheduledDate: new Date().toISOString(),
      inspector: inspectorId,
      checklist: [
        { item: 'Inspect H2 leak sensor calibration', result: 'pass', note: '' },
        { item: 'Verify Emergency Shutdown Valve (ESV) actuation', result: 'pass', note: '' },
        { item: 'Check Pressure Relief Valve seal', result: 'fail', note: 'Seal cracked on valve PRV-12' }
      ]
    }, { Authorization: `Bearer ${soToken}` });

    console.log(`   HTTP Status: ${createRes.status}`);
    console.log(`   Inspection ID: ${createRes.body._id}`);
    console.log(`   Equipment: ${createRes.body.equipment}`);
    console.log(`   Assigned Inspector: ${createRes.body.inspector.name} (${createRes.body.inspector.role})`);
    console.log(`   Initial Status: ${createRes.body.status}`);
    console.log(`   Initial Result: ${createRes.body.overallResult}`);
    const inspectionId = createRes.body._id;

    if (createRes.status !== 201 || createRes.body.status !== 'scheduled') {
      throw new Error('Inspection creation failed');
    }

    // Test 2: Worker Unauthorized Schedule Attempt (Expect 403 Forbidden)
    console.log('\n2. Testing POST /api/inspections by Worker (expect HTTP 403 Forbidden)...');
    const workerCreateRes = await request(PORT, 'POST', '/api/inspections', {
      equipment: 'Test Equipment', zone: 'Zone B', scheduledDate: new Date(), inspector: inspectorId
    }, { Authorization: `Bearer ${workerToken}` });
    console.log(`   HTTP Status: ${workerCreateRes.status}, Message: ${workerCreateRes.body.message}`);
    if (workerCreateRes.status !== 403) throw new Error('Worker schedule attempt should return 403 Forbidden');

    // Test 3: Get List of Inspections
    console.log('\n3. Testing GET /api/inspections (Fetch Assigned Inspections)...');
    const listRes = await request(PORT, 'GET', '/api/inspections', null, { Authorization: `Bearer ${inspToken}` });
    console.log(`   HTTP Status: ${listRes.status}`);
    console.log(`   Assigned Count: ${listRes.body.length}`);
    if (listRes.status !== 200 || listRes.body.length !== 1) throw new Error('Fetch inspection list failed');

    // Test 4: Get Single Inspection Details
    console.log('\n4. Testing GET /api/inspections/:id (Fetch Details)...');
    const detailRes = await request(PORT, 'GET', `/api/inspections/${inspectionId}`, null, { Authorization: `Bearer ${inspToken}` });
    console.log(`   HTTP Status: ${detailRes.status}`);
    console.log(`   Checklist Items Count: ${detailRes.body.checklist.length}`);
    if (detailRes.status !== 200) throw new Error('Fetch single inspection failed');

    // Test 5: Submit Inspection Checklist with a FAIL Item
    console.log('\n5. Testing POST /api/inspections/:id/submit (Submit Checklist with FAIL item)...');
    const submitRes = await request(PORT, 'POST', `/api/inspections/${inspectionId}/submit`, {
      checklist: [
        { item: 'Inspect H2 leak sensor calibration', result: 'pass', note: 'Calibrated OK' },
        { item: 'Verify Emergency Shutdown Valve (ESV) actuation', result: 'pass', note: 'Actuation time 1.2s OK' },
        { item: 'Check Pressure Relief Valve seal', result: 'fail', note: 'CRITICAL: Seal degraded and leaking minor gas' }
      ],
      summaryNotes: 'Inspection completed. Valve PRV-12 requires immediate replacement.'
    }, { Authorization: `Bearer ${inspToken}` });

    console.log(`   HTTP Status: ${submitRes.status}`);
    console.log(`   New Status: ${submitRes.body.inspection.status}`);
    console.log(`   Calculated Overall Result: ${submitRes.body.inspection.overallResult}`);
    console.log(`   Summary Notes: ${submitRes.body.inspection.summaryNotes}`);
    
    if (submitRes.status !== 200 || submitRes.body.inspection.status !== 'completed' || submitRes.body.inspection.overallResult !== 'fail') {
      throw new Error('Inspection submission calculation failed');
    }

    // Test 6: Verify Failed Items Persistence in DB
    console.log('\n6. Testing Failed Item Persistence in DB...');
    const verifyRes = await request(PORT, 'GET', `/api/inspections/${inspectionId}`, null, { Authorization: `Bearer ${soToken}` });
    const failedItems = verifyRes.body.checklist.filter(item => item.result === 'fail');
    console.log(`   Identified Failed Items Count: ${failedItems.length}`);
    console.log(`   Failed Item Note: "${failedItems[0].note}"`);
    if (failedItems.length !== 1 || !failedItems[0].note.includes('CRITICAL')) {
      throw new Error('Failed item persistence verification failed');
    }

    console.log('\n=============================================================');
    console.log('✅ ALL 6 INSPECTION MODULE TEST CASES PASSED SUCCESSFULLY!');
    console.log('=============================================================');
  } catch (err) {
    console.error('\n❌ Test Suite Error:', err.message);
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  }
}

runInspectionTestSuite();
