const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const User = require('./models/User');
const Incident = require('./models/Incident');
const EmergencyWorkflow = require('./models/EmergencyWorkflow');
const ComplianceDoc = require('./models/ComplianceDoc');
const AuditLog = require('./models/AuditLog');

async function testRealMongoPersistence() {
  console.log('=============================================================');
  console.log('   STARTING REAL MONGODB PERSISTENCE VERIFICATION');
  console.log('=============================================================');

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is not set in backend/.env');
    process.exit(1);
  }

  console.log('1. Connecting to real MongoDB instance...');
  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    console.error('❌ Failed to establish connection to real MongoDB');
    process.exit(1);
  }

  console.log(`✓ Real MongoDB connected! Connection host: ${mongoose.connection.host}, DB Name: ${mongoose.connection.name}`);

  try {
    const timestamp = Date.now();

    // 1. Ensure test Safety Officer user exists in DB
    console.log('\n2. Verifying/Creating test user in real MongoDB...');
    let testUser = await User.findOne({ email: 'real_so_test@hydro.com' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Real DB Officer',
        email: `real_so_${timestamp}@hydro.com`,
        password: 'password123',
        role: 'safetyOfficer',
        employeeId: `EMP-R${timestamp.toString().slice(-4)}`,
        department: 'HSE Safety'
      });
    }
    console.log(`✓ User persisted in DB: ${testUser._id} (${testUser.name}, ${testUser.role})`);

    // 2. Create and persist an Incident in real MongoDB
    console.log('\n3. Creating & persisting Incident in real MongoDB...');
    const incident = await Incident.create({
      title: `Real DB Hydrogen Spike ${timestamp}`,
      type: 'Pressure Spike',
      severity: 'high',
      location: 'Compressor Station 2',
      description: 'Real DB test incident for Chunk 7 verification',
      reportedBy: testUser._id,
      status: 'reported',
      timeline: [{
        status: 'reported',
        changedBy: testUser._id,
        timestamp: new Date(),
        note: 'Initial report'
      }]
    });
    console.log(`✓ Incident persisted in DB: ${incident._id}`);

    // 3. Create and persist Emergency Workflow in real MongoDB
    console.log('\n4. Creating & persisting EmergencyWorkflow in real MongoDB...');
    const defaultSteps = EmergencyWorkflow.getTemplateSteps('pressure_spike');
    const workflow = await EmergencyWorkflow.create({
      incidentId: incident._id,
      templateType: 'pressure_spike',
      title: `Real DB Pressure Response ${timestamp}`,
      steps: defaultSteps,
      overallStatus: 'active',
      triggeredBy: testUser._id
    });

    incident.linkedWorkflowId = workflow._id;
    await incident.save();
    console.log(`✓ EmergencyWorkflow persisted in DB: ${workflow._id} (Linked to Incident: ${incident._id})`);

    // 4. Create and persist Compliance Document in real MongoDB
    console.log('\n5. Creating & persisting ComplianceDoc in real MongoDB...');
    const complianceDoc = await ComplianceDoc.create({
      title: `Real DB ISO 22734 Cert ${timestamp}`,
      category: 'certificate',
      fileUrl: '/uploads/compliance/test_cert.pdf',
      originalFilename: 'test_cert.pdf',
      uploadedBy: testUser._id,
      issueDate: new Date(),
      expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days (expiring soon)
      version: '1.0',
      notes: 'Real DB compliance persistence test'
    });
    console.log(`✓ ComplianceDoc persisted in DB: ${complianceDoc._id} (Title: ${complianceDoc.title})`);

    // 5. Create and persist Audit Log in real MongoDB
    console.log('\n6. Creating & persisting AuditLog in real MongoDB...');
    const auditRecord = await AuditLog.create({
      action: 'REAL_DB_VERIFICATION',
      performedBy: testUser._id,
      userId: testUser._id,
      module: 'EMERGENCY',
      entityType: 'EmergencyWorkflow',
      entityId: workflow._id,
      beforeState: null,
      afterState: workflow.toObject(),
      details: 'Real MongoDB persistence verification executed successfully',
      ipAddress: '127.0.0.1'
    });
    console.log(`✓ AuditLog persisted in DB: ${auditRecord._id}`);

    // 6. Query Back Records from Real DB to verify end-to-end read capability
    console.log('\n7. Verifying DB Retrieval (Querying persisted collections)...');
    const foundWf = await EmergencyWorkflow.findById(workflow._id).populate('incidentId');
    const foundDoc = await ComplianceDoc.findById(complianceDoc._id);
    const foundAudit = await AuditLog.findById(auditRecord._id).populate('performedBy');

    if (!foundWf || !foundDoc || !foundAudit) {
      throw new Error('Failed to retrieve persisted records from database');
    }

    console.log(`✓ EmergencyWorkflow queried: ${foundWf.title} (Incident: ${foundWf.incidentId.title})`);
    console.log(`✓ ComplianceDoc queried: ${foundDoc.title} (Expires: ${foundDoc.expiryDate})`);
    console.log(`✓ AuditLog queried: Action '${foundAudit.action}' by ${foundAudit.performedBy.name}`);

    // Clean up temporary verification test records
    await EmergencyWorkflow.deleteOne({ _id: workflow._id });
    await Incident.deleteOne({ _id: incident._id });
    await ComplianceDoc.deleteOne({ _id: complianceDoc._id });
    await AuditLog.deleteOne({ _id: auditRecord._id });
    console.log('✓ Cleaned up test records from database');

    console.log('\n=============================================================');
    console.log('✅ REAL MONGODB PERSISTENCE VERIFICATION FULLY PASSED!');
    console.log('=============================================================');
  } catch (err) {
    console.error('❌ Real MongoDB verification error:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

testRealMongoPersistence();
