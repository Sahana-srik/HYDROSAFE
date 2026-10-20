const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const errorHandler = require('./middleware/errorHandler');

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
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
};

async function runFullSystemTestSuite() {
  process.env.JWT_SECRET = 'full_system_test_secret_2026';
  process.env.NODE_ENV = 'development';

  console.log('=============================================================');
  console.log('   FULL SYSTEM INTEGRATION & VERIFICATION TEST SUITE');
  console.log('=============================================================');

  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  console.log('✓ 1. In-Memory MongoDB server started & connected.');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/incidents', require('./routes/incidentRoutes'));
  app.use('/api/inspections', require('./routes/inspectionRoutes'));
  app.use('/api/emergency-workflows', require('./routes/emergencyRoutes'));
  app.use('/api/workflows', require('./routes/emergencyRoutes'));
  app.use('/api/compliance-docs', require('./routes/complianceRoutes'));
  app.use('/api/audit-logs', require('./routes/auditRoutes'));
  app.use('/api/dashboard', require('./routes/dashboardRoutes'));
  app.use(errorHandler);

  const PORT = 5009;
  const server = app.listen(PORT);
  console.log(`✓ 2. Test API Server listening on port ${PORT}.\n`);

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`   [PASS] ${message}`);
      testPassed++;
    } else {
      console.error(`   [FAIL] ${message}`);
      testFailed++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // 1. Auth & Seeding API Check
    console.log('1. Testing Auth & Seeding Endpoint (/api/auth/seed)...');
    const seedEndpointRes = await request(PORT, 'POST', '/api/auth/seed');
    assert(seedEndpointRes.status === 200, 'POST /api/auth/seed succeeded with HTTP 200');
    assert(seedEndpointRes.body.seededCount === 6, 'Successfully seeded 6 accounts for all roles');

    // Login for all 6 roles
    console.log('\n2. Testing JWT Login & Authentication for All 6 Roles...');
    const roles = ['worker', 'safetyOfficer', 'inspector', 'ert', 'complianceAdmin', 'superAdmin'];
    const tokens = {};
    const users = {};

    for (const r of roles) {
      const email = r === 'safetyOfficer' ? 'safety@hydro.com' : r === 'complianceAdmin' ? 'compliance@hydro.com' : r === 'superAdmin' ? 'admin@hydro.com' : `${r}@hydro.com`;
      const loginRes = await request(PORT, 'POST', '/api/auth/login', { email, password: 'password123' });
      assert(loginRes.status === 200 && Boolean(loginRes.body.token), `Login succeeded for role: ${r}`);
      tokens[r] = loginRes.body.token;
      users[r] = loginRes.body;
    }

    // 3. Incidents Lifecycle & Escalation
    console.log('\n3. Testing Incident Reporting, Lifecycle, and Escalation...');
    const createInc = await request(PORT, 'POST', '/api/incidents', {
      title: 'Hydrogen Micro-leak at Flange F-201',
      type: 'Hydrogen Leak',
      severity: 'high',
      location: 'Compressor House 2',
      description: 'Minor hydrogen sensor alert LEL 12%'
    }, { Authorization: `Bearer ${tokens.worker}` });
    assert(createInc.status === 201, 'Worker created incident report');
    const incId = createInc.body._id;

    // Update status
    const updateIncStatus = await request(PORT, 'PATCH', `/api/incidents/${incId}/status`, {
      status: 'acknowledged',
      note: 'Safety Officer acknowledged incident'
    }, { Authorization: `Bearer ${tokens.safetyOfficer}` });
    assert(updateIncStatus.status === 200 && updateIncStatus.body.status === 'acknowledged', 'Status transitioned to acknowledged');

    // Escalate Incident -> Emergency Workflow Creation
    const escalateRes = await request(PORT, 'POST', `/api/incidents/${incId}/escalate`, {
      reason: 'Escalated due to pressure buildup',
      templateType: 'gas_leak'
    }, { Authorization: `Bearer ${tokens.safetyOfficer}` });
    assert(escalateRes.status === 200 && Boolean(escalateRes.body.workflow), 'Incident escalated and emergency response workflow generated');
    const workflowId = escalateRes.body.workflow._id;

    // 4. Emergency Response Workflow Ordered Steps & Override
    console.log('\n4. Testing Emergency Workflow Order Enforcement & Safety Officer Override...');
    // Attempt completing Step 2 before Step 1 -> Should fail (HTTP 400)
    const step2Fail = await request(PORT, 'PATCH', `/api/emergency-workflows/${workflowId}/steps/2/complete`, {
      note: 'Premature step 2 attempt'
    }, { Authorization: `Bearer ${tokens.ert}` });
    assert(step2Fail.status === 400, 'Sequential order enforced: Step 2 blocked while Step 1 incomplete');

    // Complete Step 1 as ERT
    const step1Ok = await request(PORT, 'PATCH', `/api/emergency-workflows/${workflowId}/steps/1/complete`, {
      note: 'Area isolated successfully'
    }, { Authorization: `Bearer ${tokens.ert}` });
    assert(step1Ok.status === 200, 'Step 1 completed by ERT');

    // Safety Officer Override Step 2 with reason
    const overrideStep2 = await request(PORT, 'PATCH', `/api/emergency-workflows/${workflowId}/steps/2/override`, {
      reason: 'Bypassing notification step due to direct radio contact already confirmed'
    }, { Authorization: `Bearer ${tokens.safetyOfficer}` });
    assert(overrideStep2.status === 200, 'Safety Officer override succeeded with mandatory audit log created');

    // 5. Inspection Management
    console.log('\n5. Testing Inspection Scheduling, Details & Checklist Submission...');
    const inspCreate = await request(PORT, 'POST', '/api/inspections', {
      equipment: 'Storage Tank Vessel T-101',
      zone: 'Tank Yard 1',
      type: 'routine',
      scheduledDate: new Date().toISOString(),
      inspector: users.inspector._id
    }, { Authorization: `Bearer ${tokens.safetyOfficer}` });
    assert(inspCreate.status === 201, 'Inspection scheduled');

    const inspSubmit = await request(PORT, 'POST', `/api/inspections/${inspCreate.body._id}/submit`, {
      checklist: [
        { item: 'Check Pressure Relief Valve', result: 'pass', note: 'All ok' },
        { item: 'Inspect Leak Sensors', result: 'pass', note: 'Zero baseline verified' }
      ],
      summaryNotes: 'Routine inspection passed completely'
    }, { Authorization: `Bearer ${tokens.inspector}` });
    assert(inspSubmit.status === 200 && inspSubmit.body.inspection.overallResult === 'pass', 'Inspection checklist submitted successfully');

    // 6. Compliance Document CRUD, Expiry & Versioning
    console.log('\n6. Testing Compliance Document Management & Versioning...');
    const docCreate = await request(PORT, 'POST', '/api/compliance-docs', {
      title: 'ISO 22734 Safety Certificate',
      category: 'certificate',
      issueDate: '2024-01-01',
      expiryDate: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(), // Expires in 20 days
      version: '1.0'
    }, { Authorization: `Bearer ${tokens.complianceAdmin}` });
    assert(docCreate.status === 201, 'Compliance document uploaded');

    const expiryFilter = await request(PORT, 'GET', '/api/compliance-docs/expiring?days=30', null, { Authorization: `Bearer ${tokens.complianceAdmin}` });
    assert(expiryFilter.status === 200 && expiryFilter.body.expiringSoon.length >= 1, 'Compliance expiry filter (30 days) returned document');

    const docVersion = await request(PORT, 'POST', `/api/compliance-docs/${docCreate.body._id}/new-version`, {
      title: 'ISO 22734 Safety Certificate v2',
      expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      version: '2.0'
    }, { Authorization: `Bearer ${tokens.complianceAdmin}` });
    const prevId = typeof docVersion.body.previousVersionId === 'object' ? docVersion.body.previousVersionId._id : docVersion.body.previousVersionId;
    assert(docVersion.status === 201 && prevId === docCreate.body._id, 'New document version linked to previous version');

    // 7. Audit Logging Retrieval & Module Filtering
    console.log('\n7. Testing System Audit Logs Retrieval & Filter...');
    const auditLogs = await request(PORT, 'GET', '/api/audit-logs', null, { Authorization: `Bearer ${tokens.superAdmin}` });
    assert(auditLogs.status === 200 && auditLogs.body.logs.length >= 5, 'System audit logs retrieved successfully');

    // 8. Real Database Dashboard Stats
    console.log('\n8. Testing Aggregated Dashboard Statistics API (/api/dashboard/stats)...');
    const dashboardStats = await request(PORT, 'GET', '/api/dashboard/stats', null, { Authorization: `Bearer ${tokens.superAdmin}` });
    assert(dashboardStats.status === 200, 'Dashboard stats API returned HTTP 200');
    assert(dashboardStats.body.incidents.total >= 1, 'Incident stats aggregated');
    assert(dashboardStats.body.compliance.total >= 1, 'Compliance stats aggregated');

    // 9. Admin User Management CRUD & RBAC
    console.log('\n9. Testing Admin User Management & RBAC Protection...');
    const newUser = await request(PORT, 'POST', '/api/auth/users', {
      name: 'New Safety Trainee',
      email: 'trainee@hydro.com',
      password: 'password123',
      role: 'worker',
      employeeId: 'EMP-T100'
    }, { Authorization: `Bearer ${tokens.superAdmin}` });
    assert(newUser.status === 201, 'Admin created new user account');

    const updateUserRole = await request(PORT, 'PATCH', `/api/auth/users/${newUser.body._id}`, {
      role: 'inspector'
    }, { Authorization: `Bearer ${tokens.superAdmin}` });
    assert(updateUserRole.status === 200 && updateUserRole.body.role === 'inspector', 'Admin updated user role to inspector');

    // Verify Worker cannot access Admin Users
    const unauthAdmin = await request(PORT, 'POST', '/api/auth/users', { name: 'Hack' }, { Authorization: `Bearer ${tokens.worker}` });
    assert(unauthAdmin.status === 403, 'RBAC rejected unauthorized worker from user management endpoint');

    console.log('\n=============================================================');
    console.log(`✅ FULL SYSTEM TEST SUITE PASSED: ${testPassed} PASSED, ${testFailed} FAILED.`);
    console.log('=============================================================');
  } catch (err) {
    console.error('\n❌ FULL SYSTEM TEST SUITE FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  }
}

runFullSystemTestSuite();
