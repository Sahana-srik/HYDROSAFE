# Hydrogen Plant Digital Safety & Compliance Management System

A production-ready MERN stack application designed for industrial hydrogen generation plants to enforce digital safety protocols, emergency response workflows, equipment inspections, compliance document vault tracking, system audit logging, and role-based access control (RBAC).

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React (Vite), Axios, React Router v6, Recharts, Lucide Icons, Vanilla CSS (Glassmorphic dark UI design system).
- **Backend**: Node.js, Express.js RESTful API, JSON Web Tokens (JWT), Bcrypt.js, Multer (file uploads).
- **Database**: MongoDB Atlas / Local MongoDB, Mongoose ODM.
- **Testing**: Node HTTP test runner with MongoDB Memory Server for integration & RBAC security testing.

```
React UI (Port 3000) ──> Axios Interceptor (Bearer JWT) ──> Express API Server (Port 5000)
                                                                    │
                 ┌──────────────────┬─────────────────┬─────────────┴──────────┐
                 ▼                  ▼                 ▼                        ▼
           Auth & RBAC      Incident Engine   Emergency Engine         Compliance Vault
             (User)           (Incident)     (EmergencyWorkflow)       (ComplianceDoc)
                 │                  │                 │                        │
                 └──────────────────┴─────────┬───────┴────────────────────────┘
                                              ▼
                                      MongoDB Mongoose
                                              │
                                              ▼
                                      System Audit Trail
                                          (AuditLog)
```

---

## 👥 Role-Based Access Control (RBAC) Matrix

The system enforces six explicit operational roles:

| Module / Action | `worker` | `safetyOfficer` | `inspector` | `ert` | `complianceAdmin` | `superAdmin` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **View Dashboard** | ✅ (Own) | ✅ (All) | ✅ (All) | ✅ (All) | ✅ (All) | ✅ (All) |
| **Report Incident** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Triage / Update Incident** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Escalate to Emergency** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Emergency Workflows** | ✅ (Own) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Complete Workflow Step** | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Safety Officer Override** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Schedule Inspection** | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Execute Checklist** | ❌ | ✅ (Assigned) | ✅ (Assigned) | ❌ | ❌ | ✅ |
| **Compliance Vault Upload** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Compliance Expiry Filter** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Audit Logs** | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **User Administration** | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |

---

## 🚨 Core System Features & Rules

### 1. Incident Management Lifecycle
- **Lifecycle**: `Reported` → `Acknowledged` → `Under Investigation` → `Resolved` → `Closed`.
- **Escalation**: Safety Officers or authorized personnel can escalate high-severity incidents, automatically instantiating a linked `EmergencyWorkflow` pre-populated with safety response steps.

### 2. Emergency Response Workflow Engine
- **Sequential Step Enforcement**: Steps must execute in strictly ordered sequence (e.g. Step 1 must be completed or overridden before Step 2 can be finished).
- **Safety Officer Override**: Safety Officers can explicitly override blocked steps, requiring a mandatory reason (minimum 5 characters). Overrides capture `beforeState` and `afterState` in an immutable `AuditLog`.

### 3. Inspection Management
- **Types**: `routine`, `ad-hoc`, `emergency`.
- **Checklist Engine**: Item-level evaluation (`pass`, `fail`, `NA`). Overall inspection result (`pass`, `fail`, `NA`) is automatically calculated upon submission.

### 4. Compliance Document Vault
- **Categories**: `certificate`, `license`, `sds`, `permit`, `regulation`, `procedure`, `other`.
- **Expiry Range API**: `GET /api/compliance-docs/expiring?days=30` (supports 30, 60, 90 days filtering).
- **Versioning**: Creating new document versions deactivated older versions while preserving lineage via `previousVersionId`.

### 5. System Audit Trail
- Automated logging for all critical mutations (`USER_MGMT`, `INCIDENT`, `EMERGENCY`, `INSPECTION`, `COMPLIANCE`, `AUTH`). Captures IP address, timestamp, operator user ID, and object state snapshots.

---

## ⚡ Quick Start & Setup Instructions

### 1. Environment Configuration
Create a `.env` file in `backend/`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/hydrogen_safety_db
JWT_SECRET=replace_with_a_long_random_secret
NODE_ENV=development
```

### 2. Install Dependencies & Seed Database
```bash
# Backend Setup
cd backend
npm install
npm run seed

# Frontend Setup
cd ../frontend
npm install
```

### 3. Running the Application
```bash
# Start Backend API Server (Port 5000)
cd backend
npm start

# Start Frontend Vite Server (Port 3000)
cd frontend
npm run dev
```

---

## 🔑 Demo Login Accounts

All seeded demo accounts use the password: `password123`

| Role | Email | Password |
| :--- | :--- | :--- |
| **Plant Worker** | `worker@hydro.com` | `password123` |
| **Safety Officer** | `safety@hydro.com` | `password123` |
| **Inspector** | `inspector@hydro.com` | `password123` |
| **ERT Member** | `ert@hydro.com` | `password123` |
| **Compliance Admin** | `compliance@hydro.com` | `password123` |
| **Super Admin** | `admin@hydro.com` | `password123` |

---

## 🧪 Testing Suite Execution

Run integration and RBAC security test suites:

```bash
cd backend

# Execute Chunk 8 Integration Suite
node test_chunk8_memory.js

# Execute Full System End-to-End Suite
node test_full_system.js
```

---

## 📡 API Overview

- `POST /api/auth/login` — Authenticate user & issue JWT
- `POST /api/auth/seed` — Seed demo accounts
- `GET /api/dashboard/stats` — Aggregated real DB statistics
- `GET /api/incidents` — List safety incidents (role filtered)
- `POST /api/incidents/:id/escalate` — Trigger emergency workflow
- `PATCH /api/emergency-workflows/:id/steps/:stepOrder/complete` — Complete workflow step
- `PATCH /api/emergency-workflows/:id/steps/:stepOrder/override` — Safety Officer override step
- `POST /api/inspections/:id/submit` — Submit inspection checklist
- `GET /api/compliance-docs/expiring?days=30` — Filter expiring documents
- `POST /api/compliance-docs/:id/new-version` — Create new document version
- `GET /api/audit-logs` — Retrieve system audit trail (Admin/Safety Officer)
