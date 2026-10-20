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

async function runChunk8TestSuite() {
  process.env.JWT_SECRET = 'chunk8_test_secret_key_2026';
  process.env.NODE_ENV = 'development';

  console.log('=============================================================');
  console.log('   STARTING CHUNK 8 INTEGRATION & AUDIT TEST SUITE');
  console.log('=============================================================');

  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  console.log('✓ 1. In-Memory MongoDB server connected successfully.');

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

  const PORT = 5008;
  const server = app.listen(PORT);
  console.log(`✓ 2. Test Express server running on port ${PORT}.\n`);

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
    // 0. Register Test Accounts for All 6 Roles
    console.log('0. Registering accounts for all 6 roles (Worker, Safety Officer, Inspector, ERT, Compliance Admin, Super Admin)...');
    const workerReg = await request(PORT, 'POST', '/api/auth/register', { name: 'Worker One', email: 'w1@hydro.com', password: 'password123', role: 'worker', employeeId: 'EMP-W1' });
    const inspectorReg = await request(PORT, 'POST', '/api/auth/register', { name: 'Inspector One', email: 'i1@hydro.com', password: 'password123', role: 'inspector', employeeId: 'EMP-I1' });
    const ertReg = await request(PORT, 'POST', '/api/auth/register', { name: 'ERT Leader', email: 'e1@hydro.com', password: 'password123', role: 'ert', employeeId: 'EMP-E1' });
    const soReg = await request(PORT, 'POST', '/api/auth/register', { name: 'Chief Safety Officer', email: 'so1@hydro.com', password: 'password123', role: 'safetyOfficer', employeeId: 'EMP-S1' });
    const caReg = await request(PORT, 'POST', '/api/auth/register', { name: 'Compliance Admin', email: 'ca1@hydro.com', password: 'password123', role: 'complianceAdmin', employeeId: 'EMP-C1' });
    const saReg = await request(PORT, 'POST', '/api/auth/register', { name: 'Super Admin', email: 'admin@hydro.com', password: 'password123', role: 'superAdmin', employeeId: 'EMP-A1' });

    const wToken = workerReg.body.token;
    const iToken = inspectorReg.body.token;
    const ertToken = ertReg.body.token;
    const soToken = soReg.body.token;
    const caToken = caReg.body.token;
    const saToken = saReg.body.token;
    const inspectorId = inspectorReg.body._id;

    assert(workerReg.status === 201 && saReg.status === 201, 'Accounts registered successfully for all 6 roles');

    // 1. INCIDENTS Module Audit Test
    console.log('\n1. Testing Incidents module audit logging & escalation...');
    const incRes = await request(PORT, 'POST', '/api/incidents', {
      title: 'Hydrogen Storage Tank Leak', type: 'Gas Leak', severity: 'high', location: 'Storage Yard 3', description: 'Leak detected on valve'
    }, { Authorization: `Bearer ${wToken}` });
    assert(incRes.status === 201, 'Incident created');

    const escRes = await request(PORT, 'POST', `/api/incidents/${incRes.body._id}/escalate`, {
      reason: 'High priority leak escalation'
    }, { Authorization: `Bearer ${soToken}` });
    assert(escRes.status === 200, 'Incident escalated & workflow created');

    // 2. INSPECTIONS Module Audit Test
    console.log('\n2. Testing Inspections module audit logging (create, update, submit checklist)...');
    const inspRes = await request(PORT, 'POST', '/api/inspections', {
      equipment: 'Compressor Unit 4', zone: 'Zone C', type: 'routine', scheduledDate: new Date().toISOString(), inspector: inspectorId
    }, { Authorization: `Bearer ${soToken}` });
    assert(inspRes.status === 201, 'Inspection scheduled');

    const updateInspRes = await request(PORT, 'PUT', `/api/inspections/${inspRes.body._id}`, {
      type: 'emergency'
    }, { Authorization: `Bearer ${soToken}` });
    assert(updateInspRes.status === 200, 'Inspection updated');

    const submitInspRes = await request(PORT, 'POST', `/api/inspections/${inspRes.body._id}/submit`, {
      checklist: [{ item: 'Check Seal', result: 'pass', note: 'All ok' }],
      summaryNotes: 'Routine seal check passed'
    }, { Authorization: `Bearer ${iToken}` });
    assert(submitInspRes.status === 200, 'Inspection checklist submitted');

    // 3. COMPLIANCE Module Audit Test
    console.log('\n3. Testing Compliance module audit logging...');
    const compDocRes = await request(PORT, 'POST', '/api/compliance-docs', {
      title: 'ISO 22734 Safety Certificate', category: 'certificate', issueDate: '2025-01-01', expiryDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(), version: '1.0'
    }, { Authorization: `Bearer ${caToken}` });
    assert(compDocRes.status === 201, 'Compliance doc created');

    const compVerRes = await request(PORT, 'POST', `/api/compliance-docs/${compDocRes.body._id}/new-version`, {
      title: 'ISO 22734 Safety Certificate v2', expiryDate: '2027-01-01', version: '2.0'
    }, { Authorization: `Bearer ${caToken}` });
    assert(compVerRes.status === 201, 'New version created with previousVersionId link');

    // 4. ADMIN USER MANAGEMENT Module Test & Audit
    console.log('\n4. Testing Admin User Management CRUD & Audit Logging...');
    const newUserRes = await request(PORT, 'POST', '/api/auth/users', {
      name: 'New Operator', email: 'op1@hydro.com', password: 'password123', role: 'worker', employeeId: 'EMP-OP1', department: 'Operations'
    }, { Authorization: `Bearer ${soToken}` });
    assert(newUserRes.status === 201, 'Admin created new user account');
    assert(!newUserRes.body.password, 'Password hash is NOT exposed in response');
    const newUserId = newUserRes.body._id;

    // Change user role to safetyOfficer
    const updateRoleRes = await request(PORT, 'PATCH', `/api/auth/users/${newUserId}`, {
      role: 'safetyOfficer', department: 'HSE Management'
    }, { Authorization: `Bearer ${soToken}` });
    assert(updateRoleRes.status === 200 && updateRoleRes.body.role === 'safetyOfficer', 'Admin updated user role to safetyOfficer');

    // Toggle user status (Deactivate / Activate)
    const toggleRes = await request(PORT, 'PATCH', `/api/auth/users/${newUserId}/status`, {
      isActive: false
    }, { Authorization: `Bearer ${soToken}` });
    assert(toggleRes.status === 200 && toggleRes.body.isActive === false, 'Admin deactivated user account');

    // 5. DASHBOARD STATS API Test
    console.log('\n5. Testing GET /api/dashboard/stats (Real DB Aggregated Statistics)...');
    const statsSO = await request(PORT, 'GET', '/api/dashboard/stats', null, { Authorization: `Bearer ${soToken}` });
    assert(statsSO.status === 200, 'Dashboard stats API returned HTTP 200');
    assert(statsSO.body.incidents.total >= 1, 'Incident counts accurately aggregated from DB');
    assert(statsSO.body.inspections.total >= 1, 'Inspection counts accurately aggregated from DB');
    assert(statsSO.body.compliance.total >= 1, 'Compliance doc counts accurately aggregated from DB');
    assert(statsSO.body.emergency.total >= 1, 'Emergency workflow counts accurately aggregated from DB');
    assert(Boolean(statsSO.body.users), 'Admin user metrics accurately aggregated from DB');

    // Role-scoped dashboard check for Worker
    const statsWorker = await request(PORT, 'GET', '/api/dashboard/stats', null, { Authorization: `Bearer ${wToken}` });
    assert(statsWorker.status === 200, 'Worker dashboard stats returned HTTP 200');
    assert(statsWorker.body.users === null, 'Non-admin user cannot view user stats');

    // 6. SYSTEM AUDIT LOGS API Test
    console.log('\n6. Testing GET /api/audit-logs and module filtering...');
    const allLogsRes = await request(PORT, 'GET', '/api/audit-logs', null, { Authorization: `Bearer ${soToken}` });
    assert(allLogsRes.status === 200, 'Audit logs retrieved successfully');
    assert(allLogsRes.body.logs.length >= 8, 'Audit events captured across all 5 modules');

    // Filter by USER_MGMT
    const userMgmtLogs = await request(PORT, 'GET', '/api/audit-logs?module=USER_MGMT', null, { Authorization: `Bearer ${soToken}` });
    assert(userMgmtLogs.body.logs.length >= 3, 'Filtered audit logs by USER_MGMT correctly');
    const roleChangeAudit = userMgmtLogs.body.logs.find(l => l.action === 'USER_ROLE_CHANGED');
    assert(Boolean(roleChangeAudit), 'Captured USER_ROLE_CHANGED audit event');
    assert(Boolean(roleChangeAudit.beforeState) && Boolean(roleChangeAudit.afterState), 'USER_ROLE_CHANGED contains beforeState and afterState diff snapshots');

    // 7. RBAC Protection Checks
    console.log('\n7. Testing RBAC Security Protection for Admin Endpoints...');
    const unauthCreateUser = await request(PORT, 'POST', '/api/auth/users', { name: 'Hack' }, { Authorization: `Bearer ${wToken}` });
    const unauthAuditLogs = await request(PORT, 'GET', '/api/audit-logs', null, { Authorization: `Bearer ${wToken}` });
    assert(unauthCreateUser.status === 403, 'Worker attempting user creation rejected with 403 Forbidden');
    assert(unauthAuditLogs.status === 403, 'Worker attempting audit log retrieval rejected with 403 Forbidden');

    console.log('\n=============================================================');
    console.log(`✅ CHUNK 8 TEST SUITE COMPLETED: ${testPassed} PASSED, ${testFailed} FAILED.`);
    console.log('=============================================================');
  } catch (err) {
    console.error('\n❌ CHUNK 8 TEST SUITE FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  }
}

runChunk8TestSuite();
