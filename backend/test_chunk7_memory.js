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

async function runChunk7TestSuite() {
  process.env.JWT_SECRET = 'chunk7_test_secret_key_2026';
  process.env.NODE_ENV = 'development';

  console.log('=============================================================');
  console.log('   STARTING CHUNK 7 INTEGRATION & AUDIT TEST SUITE');
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
  app.use(errorHandler);

  const PORT = 5007;
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
    // 0. Setup Users
    console.log('0. Registering role test users (Worker, ERT 1, ERT 2, Safety Officer, Compliance Admin)...');
    const workerReg = await request(PORT, 'POST', '/api/auth/register', {
      name: 'Field Worker', email: 'worker@hydro.com', password: 'password123', role: 'worker', employeeId: 'EMP-W01'
    });
    const ert1Reg = await request(PORT, 'POST', '/api/auth/register', {
      name: 'ERT Alpha', email: 'ert1@hydro.com', password: 'password123', role: 'ert', employeeId: 'EMP-E01'
    });
    const ert2Reg = await request(PORT, 'POST', '/api/auth/register', {
      name: 'ERT Bravo', email: 'ert2@hydro.com', password: 'password123', role: 'ert', employeeId: 'EMP-E02'
    });
    const soReg = await request(PORT, 'POST', '/api/auth/register', {
      name: 'Safety Chief', email: 'safety@hydro.com', password: 'password123', role: 'safetyOfficer', employeeId: 'EMP-S01'
    });
    const caReg = await request(PORT, 'POST', '/api/auth/register', {
      name: 'Compliance Officer', email: 'compliance@hydro.com', password: 'password123', role: 'complianceAdmin', employeeId: 'EMP-C01'
    });

    const wToken = workerReg.body.token;
    const ert1Token = ert1Reg.body.token;
    const ert2Token = ert2Reg.body.token;
    const soToken = soReg.body.token;
    const caToken = caReg.body.token;
    const ert1Id = ert1Reg.body._id;
    const ert2Id = ert2Reg.body._id;


    assert(workerReg.status === 201 && soReg.status === 201 && caReg.status === 201, 'User registration completed for all roles');

    // 1. Create Incident
    console.log('\n1. Creating safety incident by Worker...');
    const incRes = await request(PORT, 'POST', '/api/incidents', {
      title: 'Hydrogen Gas Vent Leak - Plant Sector B',
      type: 'Gas Leak',
      severity: 'high',
      location: 'Electrolyzer Vent Stack B',
      description: 'Sensor detected gas leak concentration exceeding threshold levels.'
    }, { Authorization: `Bearer ${wToken}` });
    assert(incRes.status === 201, 'Incident created successfully');
    const incidentId = incRes.body._id;

    // 2. Emergency Workflow Creation
    console.log('\n2. Triggering Emergency Workflow via /api/workflows by Safety Officer...');
    const wfRes = await request(PORT, 'POST', '/api/workflows', {
      incidentId,
      templateType: 'gas_leak',
      title: 'Gas Leak Response Protocol B'
    }, { Authorization: `Bearer ${soToken}` });

    assert(wfRes.status === 201, 'Emergency workflow created via /api/workflows endpoint');
    assert(wfRes.body.steps.length === 6, 'Workflow loaded default gas_leak template steps');
    assert(wfRes.body.overallStatus === 'active', 'Workflow overall status is active');
    const workflowId = wfRes.body._id;

    // Set step 2 assignment to ERT 2 explicitly to test assignment check
    const EmergencyWorkflowModel = mongoose.model('EmergencyWorkflow');
    await EmergencyWorkflowModel.updateOne(
      { _id: workflowId, 'steps.order': 2 },
      { $set: { 'steps.$.assignedTo': ert2Id } }
    );

    // 3. Sequential Step Enforcement Test (Out of Order Attempt)
    console.log('\n3. Testing sequential step order enforcement (Attempting Step 3 while Step 1 is pending)...');
    const outOfOrderRes = await request(PORT, 'PATCH', `/api/workflows/${workflowId}/steps/3/complete`, {
      note: 'Skipping step 1 & 2'
    }, { Authorization: `Bearer ${ert1Token}` });
    assert(outOfOrderRes.status === 400, 'Backend rejected out-of-order step completion with 400 Bad Request');
    assert(outOfOrderRes.body.message.includes('not yet completed'), 'Appropriate sequential order error message returned');

    // 4. Authorized Step 1 Completion
    console.log('\n4. Completing Step 1 sequentially by ERT 1...');
    const step1Res = await request(PORT, 'PATCH', `/api/workflows/${workflowId}/steps/1/complete`, {
      note: 'Area isolated and gas valve shut down'
    }, { Authorization: `Bearer ${ert1Token}` });
    assert(step1Res.status === 200, 'Step 1 completed successfully');
    assert(step1Res.body.steps[0].status === 'completed', 'Step 1 status is completed');
    assert(Boolean(step1Res.body.steps[0].completedAt), 'Step 1 records completedAt timestamp');

    // 5. ERT Step Assignment Check
    console.log('\n5. Testing ERT step assignment check (ERT 1 trying to complete Step 2 assigned to ERT 2)...');
    const assignedCheckRes = await request(PORT, 'PATCH', `/api/workflows/${workflowId}/steps/2/complete`, {
      note: 'ERT 1 trying to take ERT 2 step'
    }, { Authorization: `Bearer ${ert1Token}` });
    assert(assignedCheckRes.status === 403, 'Backend rejected unassigned ERT member action with 403 Forbidden');

    // 6. Safety Officer Step Override
    console.log('\n6. Safety Officer overriding Step 2 with mandatory reason...');
    const overrideRes = await request(PORT, 'PATCH', `/api/workflows/${workflowId}/steps/2/override`, {
      reason: 'Safety Officer manually verified ERT dispatch via radio'
    }, { Authorization: `Bearer ${soToken}` });
    assert(overrideRes.status === 200, 'Safety Officer step override succeeded');
    assert(overrideRes.body.steps[1].status === 'overridden', 'Step 2 status updated to overridden');
    assert(overrideRes.body.overrideLog.length === 1, 'Override log entry recorded in workflow document');

    // 7. Complete Remaining Steps & Auto Status Transition
    console.log('\n7. Completing remaining steps to verify auto-completion of workflow...');
    await request(PORT, 'PATCH', `/api/workflows/${workflowId}/steps/3/complete`, { note: 'Done' }, { Authorization: `Bearer ${soToken}` });
    await request(PORT, 'PATCH', `/api/workflows/${workflowId}/steps/4/complete`, { note: 'Done' }, { Authorization: `Bearer ${soToken}` });
    await request(PORT, 'PATCH', `/api/workflows/${workflowId}/steps/5/complete`, { note: 'Done' }, { Authorization: `Bearer ${soToken}` });
    const finalStepRes = await request(PORT, 'PATCH', `/api/workflows/${workflowId}/steps/6/complete`, { note: 'Debrief completed' }, { Authorization: `Bearer ${soToken}` });
    assert(finalStepRes.status === 200 && finalStepRes.body.overallStatus === 'completed', 'Workflow overall status auto-transitioned to completed');

    // 8. Incident Escalation -> Auto Emergency Workflow Creation
    console.log('\n8. Testing Incident Escalation auto-creating an Emergency Workflow...');
    const newInc = await request(PORT, 'POST', '/api/incidents', {
      title: 'Electrolyzer Pressure Spike Incident',
      type: 'Pressure Spike',
      severity: 'medium',
      location: 'Reactor Room 1',
      description: 'Sudden pressure spike detected in cell array.'
    }, { Authorization: `Bearer ${wToken}` });
    const escalateRes = await request(PORT, 'POST', `/api/incidents/${newInc.body._id}/escalate`, {
      reason: 'Automated emergency escalation due to high pressure reading'
    }, { Authorization: `Bearer ${soToken}` });
    assert(escalateRes.status === 200, 'Incident escalated successfully');
    assert(Boolean(escalateRes.body.workflow), 'Escalation automatically created linked EmergencyWorkflow');
    assert(escalateRes.body.incident.linkedWorkflowId, 'Incident linkedWorkflowId is populated');

    // 9. Compliance Document CRUD
    console.log('\n9. Testing Compliance Document Creation (POST /api/compliance-docs)...');
    const now = new Date();
    const exp30 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
    const exp60 = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString();
    const exp90 = new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000).toISOString();

    const doc1 = await request(PORT, 'POST', '/api/compliance-docs', {
      title: 'ISO 22734 Hydrogen Generator Safety Certificate',
      category: 'certificate',
      issueDate: '2025-01-01',
      expiryDate: exp30,
      version: '1.0',
      notes: 'Primary plant safety certification'
    }, { Authorization: `Bearer ${caToken}` });
    assert(doc1.status === 201, 'Compliance document 1 created');
    const doc1Id = doc1.body._id;

    const doc2 = await request(PORT, 'POST', '/api/compliance-docs', {
      title: 'NFPA 2 Hydrogen Technologies Code Permit',
      category: 'permit',
      issueDate: '2025-01-01',
      expiryDate: exp60,
      version: '1.0'
    }, { Authorization: `Bearer ${caToken}` });
    assert(doc2.status === 201, 'Compliance document 2 created');

    const doc3 = await request(PORT, 'POST', '/api/compliance-docs', {
      title: 'Hydrogen Safety Data Sheet (SDS)',
      category: 'sds',
      issueDate: '2025-01-01',
      expiryDate: exp90,
      version: '1.0'
    }, { Authorization: `Bearer ${caToken}` });
    assert(doc3.status === 201, 'Compliance document 3 created');

    // 10. Compliance Document Expiry Filtering
    console.log('\n10. Testing GET /api/compliance-docs/expiring?days=30, 60, 90...');
    const exp30Res = await request(PORT, 'GET', '/api/compliance-docs/expiring?days=30', null, { Authorization: `Bearer ${caToken}` });
    const exp60Res = await request(PORT, 'GET', '/api/compliance-docs/expiring?days=60', null, { Authorization: `Bearer ${caToken}` });
    const exp90Res = await request(PORT, 'GET', '/api/compliance-docs/expiring?days=90', null, { Authorization: `Bearer ${caToken}` });

    assert(exp30Res.body.expiringSoon.length === 1, '30-day filter correctly identified 1 document');
    assert(exp60Res.body.expiringSoon.length === 2, '60-day filter correctly identified 2 documents');
    assert(exp90Res.body.expiringSoon.length === 3, '90-day filter correctly identified 3 documents');

    // 11. Compliance Document Versioning
    console.log('\n11. Testing Compliance Document Versioning (POST /api/compliance-docs/:id/new-version)...');
    const versionRes = await request(PORT, 'POST', `/api/compliance-docs/${doc1Id}/new-version`, {
      title: 'ISO 22734 Hydrogen Generator Safety Certificate 2026',
      expiryDate: '2027-01-01',
      version: '2.0',
      notes: 'Renewal version'
    }, { Authorization: `Bearer ${caToken}` });

    assert(versionRes.status === 201, 'New version created');
    assert(versionRes.body.version === '2.0', 'Version string updated to 2.0');
    assert(versionRes.body.previousVersionId._id === doc1Id, 'previousVersionId correctly points to old version');

    // 12. Compliance Document Update & Soft Delete
    console.log('\n12. Testing Compliance Document Update & Soft-Delete...');
    const updateDocRes = await request(PORT, 'PATCH', `/api/compliance-docs/${doc2.body._id}`, {
      notes: 'Updated permit clause'
    }, { Authorization: `Bearer ${caToken}` });
    assert(updateDocRes.status === 200, 'Compliance document updated');

    const deleteDocRes = await request(PORT, 'DELETE', `/api/compliance-docs/${doc3.body._id}`, null, { Authorization: `Bearer ${caToken}` });
    assert(deleteDocRes.status === 200, 'Compliance document soft-deleted (archived)');

    // 13. System Audit Logs Endpoint
    console.log('\n13. Testing GET /api/audit-logs by Safety Officer...');
    const auditRes = await request(PORT, 'GET', '/api/audit-logs', null, { Authorization: `Bearer ${soToken}` });
    assert(auditRes.status === 200, 'Audit logs retrieved');
    assert(auditRes.body.logs.length > 5, 'Audit log entries recorded across emergency and compliance actions');
    
    // Check that state diffs (beforeState / afterState) exist for step override or document update
    const overrideLogEntry = auditRes.body.logs.find(l => l.action === 'WORKFLOW_STEP_OVERRIDDEN');
    assert(Boolean(overrideLogEntry), 'Audit log contains WORKFLOW_STEP_OVERRIDDEN entry');
    assert(Boolean(overrideLogEntry.beforeState) && Boolean(overrideLogEntry.afterState), 'Audit log contains beforeState and afterState diff snapshots');

    // 14. Unauthorized Role Check (Worker attempting administrative actions)
    console.log('\n14. Testing Unauthorized Access (Worker attempting to view audit logs & create compliance doc)...');
    const unauthAudit = await request(PORT, 'GET', '/api/audit-logs', null, { Authorization: `Bearer ${wToken}` });
    const unauthDoc = await request(PORT, 'POST', '/api/compliance-docs', { title: 'Illegal' }, { Authorization: `Bearer ${wToken}` });
    assert(unauthAudit.status === 403, 'Worker viewing audit logs rejected with 403 Forbidden');
    assert(unauthDoc.status === 403, 'Worker creating compliance doc rejected with 403 Forbidden');

    console.log('\n=============================================================');
    console.log(`✅ CHUNK 7 TEST SUITE COMPLETED: ${testPassed} PASSED, ${testFailed} FAILED.`);
    console.log('=============================================================');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  }
}

runChunk7TestSuite();
