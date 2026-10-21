const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Incident = require('./models/Incident');
const EmergencyWorkflow = require('./models/EmergencyWorkflow');
const Inspection = require('./models/Inspection');
const ComplianceDoc = require('./models/ComplianceDoc');
const AuditLog = require('./models/AuditLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hydrogen_safety_db';

async function seedDatabase() {
  try {
    console.log('=============================================================');
    console.log('   HYDROGEN PLANT DIGITAL SAFETY — DATABASE SEEDING ENGINE');
    console.log('=============================================================');
    console.log(`[Seed] Connecting to MongoDB at: ${MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);

    await mongoose.connect(MONGO_URI);
    console.log('✓ MongoDB Connected Successfully.\n');

    // 1. Seed Users (All 6 exact roles required by specification)
    console.log('1. Seeding User Accounts (6 System Roles)...');
    const userSeeds = [
      {
        name: 'Alex Operator',
        email: 'worker@hydro.com',
        password: 'password123',
        role: 'worker',
        employeeId: 'EMP-W001',
        department: 'Electrolysis Plant Operations',
        phone: '+1-555-0101'
      },
      {
        name: 'Sarah Safety',
        email: 'safety@hydro.com',
        password: 'password123',
        role: 'safetyOfficer',
        employeeId: 'EMP-S001',
        department: 'HSE Management',
        phone: '+1-555-0102'
      },
      {
        name: 'Ian Inspector',
        email: 'inspector@hydro.com',
        password: 'password123',
        role: 'inspector',
        employeeId: 'EMP-I001',
        department: 'Quality Assurance & Integrity',
        phone: '+1-555-0103'
      },
      {
        name: 'Eric Responder',
        email: 'ert@hydro.com',
        password: 'password123',
        role: 'ert',
        employeeId: 'EMP-E001',
        department: 'Emergency Response Team',
        phone: '+1-555-0104'
      },
      {
        name: 'Claire Compliance',
        email: 'compliance@hydro.com',
        password: 'password123',
        role: 'complianceAdmin',
        employeeId: 'EMP-C001',
        department: 'Regulatory & Standards Compliance',
        phone: '+1-555-0105'
      },
      {
        name: 'Arthur Admin',
        email: 'admin@hydro.com',
        password: 'password123',
        role: 'superAdmin',
        employeeId: 'EMP-A001',
        department: 'Executive Administration',
        phone: '+1-555-0106'
      }
    ];

    const users = {};
    for (const u of userSeeds) {
      let userDoc = await User.findOne({ email: u.email });
      if (!userDoc) {
        userDoc = await User.create(u);
        console.log(`   + Created ${u.role} user: ${u.email}`);
      } else {
        console.log(`   . Exists: ${u.email} (${u.role})`);
      }
      users[u.role] = userDoc;
    }

    // 2. Seed Incidents
    console.log('\n2. Seeding Incident Records...');
    const incidentSeeds = [
      {
        title: 'Compressor Unit 3 Hydrogen Gas Micro-Leak',
        type: 'Hydrogen Leak',
        severity: 'high',
        location: 'Building B - Compressor Hall',
        description: 'Sniffer sensor H2-S-104 detected 15% LEL hydrogen micro-leak near compressor flange joint. Immediate area isolated.',
        reportedBy: users.worker._id,
        status: 'underInvestigation',
        timeline: [
          { status: 'reported', changedBy: users.worker._id, note: 'Micro-leak detected by automated sensor H2-S-104' },
          { status: 'acknowledged', changedBy: users.safetyOfficer._id, note: 'Safety Officer acknowledged alert and dispatched inspection team' },
          { status: 'underInvestigation', changedBy: users.safetyOfficer._id, note: 'Investigation underway by HSE & maintenance staff' }
        ]
      },
      {
        title: 'Electrolyzer Stack B Pressure Spike Alert',
        type: 'Pressure Spike',
        severity: 'critical',
        location: 'Zone A - Electrolysis Bay 2',
        description: 'Differential pressure transmitter DP-204 spiked to 4.2 bar (threshold 3.5 bar). Automated PRV opened.',
        reportedBy: users.worker._id,
        status: 'acknowledged',
        timeline: [
          { status: 'reported', changedBy: users.worker._id, note: 'High pressure alarm triggered in control room' },
          { status: 'acknowledged', changedBy: users.safetyOfficer._id, note: 'Emergency response triage initiated' }
        ]
      },
      {
        title: 'Valve Handwheel Lockout Pin Misalignment',
        type: 'Near Miss',
        severity: 'low',
        location: 'Storage Tank Yard 1',
        description: 'LOTO pin on manual valve V-102 was partially disengaged. No gas released. Corrected on site.',
        reportedBy: users.worker._id,
        status: 'resolved',
        timeline: [
          { status: 'reported', changedBy: users.worker._id, note: 'Found during shift walk-around inspection' },
          { status: 'resolved', changedBy: users.safetyOfficer._id, note: 'Pin re-aligned and secondary latch verified' }
        ]
      }
    ];

    const incidents = [];
    for (const incData of incidentSeeds) {
      let incDoc = await Incident.findOne({ title: incData.title });
      if (!incDoc) {
        incDoc = await Incident.create(incData);
        console.log(`   + Created incident: "${incData.title}" [Severity: ${incData.severity}]`);
      } else {
        console.log(`   . Incident exists: "${incData.title}"`);
      }
      incidents.push(incDoc);
    }

    // 3. Seed Emergency Workflows
    console.log('\n3. Seeding Emergency Response Workflows...');
    const criticalInc = incidents.find(i => i.severity === 'critical') || incidents[0];
    let workflowDoc = await EmergencyWorkflow.findOne({ incidentId: criticalInc._id });

    if (!workflowDoc) {
      const templateSteps = EmergencyWorkflow.getTemplateSteps('pressure_spike');
      // Assign ERT user to steps
      templateSteps.forEach((step) => {
        step.assignedTo = users.ert._id;
      });

      // Mark first step completed as sample progress
      templateSteps[0].status = 'completed';
      templateSteps[0].completedAt = new Date();
      templateSteps[0].completedBy = users.ert._id;
      templateSteps[0].note = 'Pressure relief valve manually verified open. Stack pressure stabilizing.';

      workflowDoc = await EmergencyWorkflow.create({
        incidentId: criticalInc._id,
        templateType: 'pressure_spike',
        title: `[EMERGENCY] ${criticalInc.title}`,
        steps: templateSteps,
        overallStatus: 'active',
        triggeredBy: users.safetyOfficer._id,
        overrideLog: []
      });

      criticalInc.linkedWorkflowId = workflowDoc._id;
      await criticalInc.save();
      console.log(`   + Created emergency workflow [${workflowDoc._id}] for incident: "${criticalInc.title}"`);
    } else {
      console.log(`   . Emergency workflow exists for incident [${criticalInc._id}]`);
    }

    // 4. Seed Inspections
    console.log('\n4. Seeding Plant Safety Inspections...');
    const now = new Date();
    const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const inspectionSeeds = [
      {
        equipment: 'Electrolyzer Cell Stack A-101',
        zone: 'Zone A - Electrolysis Bay 1',
        type: 'routine',
        scheduledDate: futureDate,
        inspector: users.inspector._id,
        status: 'scheduled',
        overallResult: 'pending',
        summaryNotes: 'Bi-weekly routine electrochemical stack integrity check.',
        checklist: [
          { item: 'Inspect hydrogen piping, flange joints and O-ring seal condition for degradation or embrittlement', result: 'pass', note: '' },
          { item: 'Verify hydrogen leak detection sensors, zero-point baseline and acoustic alarm condition', result: 'pass', note: '' },
          { item: 'Check differential pressure transmitter readings, cell stack vessel integrity and PRV seals', result: 'pass', note: '' },
          { item: 'Test safety interlocks, ESD emergency shutdown actuation readiness and isolation valves', result: 'pass', note: '' }
        ]
      },
      {
        equipment: 'Hydrogen Storage Vessel T-301',
        zone: 'Storage Tank Yard 2',
        type: 'ad-hoc',
        scheduledDate: pastDate,
        inspector: users.inspector._id,
        status: 'completed',
        overallResult: 'pass',
        completedAt: pastDate,
        checklist: [
          { item: 'Inspect H2 leak detector sensor calibration & zero-point baseline', result: 'pass', note: 'Calibrated using span gas 2.0% H2 in N2' },
          { item: 'Verify Emergency Shutdown Valve (ESV) pneumatic pressure actuation', result: 'pass', note: 'Actuation response time 0.8 seconds (within <1s spec)' },
          { item: 'Check Pressure Relief Valve (PRV) mechanical seal & vent piping', result: 'pass', note: 'No weeping or discoloration observed' }
        ],
        summaryNotes: 'All safety interlocks passed verification.'
      }
    ];

    for (const inspData of inspectionSeeds) {
      let inspDoc = await Inspection.findOne({ equipment: inspData.equipment, scheduledDate: inspData.scheduledDate });
      if (!inspDoc) {
        inspDoc = await Inspection.create(inspData);
        console.log(`   + Created inspection for: ${inspData.equipment} [Status: ${inspData.status}]`);
      } else {
        console.log(`   . Inspection exists for: ${inspData.equipment}`);
      }
    }

    // 5. Seed Compliance Documents
    console.log('\n5. Seeding Compliance Vault Documents...');
    const addDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    const complianceSeeds = [
      {
        title: 'ISO 22734:2019 Hydrogen Generators Safety Certificate',
        category: 'certificate',
        uploadedBy: users.complianceAdmin._id,
        issueDate: new Date('2024-01-15'),
        expiryDate: addDays(180),
        version: '1.0',
        notes: 'Primary international safety standard certificate for industrial water electrolysis.'
      },
      {
        title: 'NFPA 2 Hydrogen Technologies Code Operating License',
        category: 'license',
        uploadedBy: users.complianceAdmin._id,
        issueDate: new Date('2024-03-01'),
        expiryDate: addDays(25), // Expiring in 25 days (< 30 days filter)
        version: '2.1',
        notes: 'Annual state fire marshal hydrogen plant operating authorization.'
      },
      {
        title: 'Gaseous Hydrogen (H2) Safety Data Sheet (SDS-H2-001)',
        category: 'sds',
        uploadedBy: users.complianceAdmin._id,
        issueDate: new Date('2023-06-10'),
        expiryDate: addDays(50), // Expiring in 50 days (< 60 days filter)
        version: '3.0',
        notes: 'Hazard identification, exposure controls & emergency response procedures for Gaseous H2.'
      },
      {
        title: 'High Pressure Gas Vessel Air Quality & Emissions Permit',
        category: 'permit',
        uploadedBy: users.complianceAdmin._id,
        issueDate: new Date('2023-11-20'),
        expiryDate: addDays(85), // Expiring in 85 days (< 90 days filter)
        version: '1.0',
        notes: 'Environmental protection agency environmental operating permit.'
      }
    ];

    for (const compData of complianceSeeds) {
      let compDoc = await ComplianceDoc.findOne({ title: compData.title });
      if (!compDoc) {
        compDoc = await ComplianceDoc.create(compData);
        console.log(`   + Created compliance doc: "${compData.title}" [Version: ${compData.version}]`);
      } else {
        console.log(`   . Compliance doc exists: "${compData.title}"`);
      }
    }

    // 6. Seed Initial Audit Logs
    console.log('\n6. Seeding Audit Trail Records...');
    const auditCount = await AuditLog.countDocuments();
    if (auditCount === 0) {
      await AuditLog.create([
        {
          action: 'SYSTEM_SEED_INITIALIZED',
          performedBy: users.superAdmin._id,
          userId: users.superAdmin._id,
          module: 'AUTH',
          entityType: 'System',
          details: 'Demonstration database seed initialized with 6 core system roles and default plant models.',
          ipAddress: '127.0.0.1'
        },
        {
          action: 'INCIDENT_CREATED',
          performedBy: users.worker._id,
          userId: users.worker._id,
          module: 'INCIDENT',
          entityType: 'Incident',
          entityId: incidents[0]._id,
          details: `Incident reported: ${incidents[0].title}`,
          ipAddress: '127.0.0.1'
        }
      ]);
      console.log('   + Created initial audit records.');
    } else {
      console.log(`   . Audit logs exist (${auditCount} entries).`);
    }

    console.log('\n=============================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY');
    console.log('=============================================================');
    console.log('Demo Credentials for All 6 Roles (Password for all: password123):');
    console.log(' - worker@hydro.com        (Role: worker)');
    console.log(' - safety@hydro.com        (Role: safetyOfficer)');
    console.log(' - inspector@hydro.com     (Role: inspector)');
    console.log(' - ert@hydro.com           (Role: ert)');
    console.log(' - compliance@hydro.com    (Role: complianceAdmin)');
    console.log(' - admin@hydro.com         (Role: superAdmin)');
    console.log('=============================================================\n');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Database connection closed.');
  }
}

seedDatabase();
