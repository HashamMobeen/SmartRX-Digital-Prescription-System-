# SmartRx — Digital Prescription System

> A full-stack clinic management system built for **CS 236 Advanced Database Management Systems (ADMS)**.  
> Demonstrates advanced PostgreSQL features, Redis caching, Neo4j graph database, MongoDB audit logging, and full ACID transaction management.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Advanced Database Features](#advanced-database-features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [Database Design](#database-design)
- [Troubleshooting](#troubleshooting)

---

## Overview

SmartRx is a digital prescription management system designed for clinic use. Doctors can register patients, write multi-medicine prescriptions, track visit history, manage disease templates, and view analytics on a live dashboard.

The system is built around a **PostgreSQL** relational database with deliberately applied advanced features — triggers, stored procedures, recursive CTEs, domain types, covering indexes, and a two-level trigger chain for allergy detection. It integrates **Redis** for caching, **Neo4j** for graph-based medicine relationships, and **MongoDB** for flexible audit logging, demonstrating the polyglot persistence pattern.

---

## Tech Stack

| Layer            | Technology                                         |
|------------------|----------------------------------------------------|
| Frontend         | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend          | Node.js + Express.js REST API                      |
| Primary Database | PostgreSQL 15+                                     |
| Cache            | Redis (ioredis)                                    |
| Graph Database   | Neo4j (neo4j-driver)                               |
| Audit Log        | MongoDB (mongoose)                                 |
| Authentication   | JWT (jsonwebtoken) + bcrypt                        |
| PDF Generation   | jsPDF + jspdf-autotable                            |

---

## Features

### Core Clinic Features
- **Doctor Authentication** — Register and login with JWT-secured sessions
- **Patient Management** — Add, edit, delete patients with allergy tracking
- **Prescriptions** — Multi-medicine prescriptions with strength, dosage, days, and notes
- **Edit Prescriptions** — Modify existing prescriptions or save as a new copy
- **Disease Templates** — Pre-built medicine sets for common diagnoses
- **Medicine Catalogue** — Searchable database of 200+ medicines with auto-suggestions
- **Dashboard Analytics** — Today's stats, weekly/monthly prescription counts, top medicines
- **PDF Export** — Download any prescription as a formatted PDF
- **Patient Portal** — Separate login for patients to view their own prescriptions
- **Doctor Chat** — Messaging system between clinic staff

### Advanced Database Features Page
An interactive demo page at `/advanced` that demonstrates all ADMS concepts with live API calls, real-time graphs, and animated visualizations.

---

## Advanced Database Features

### 1. Redis Caching
Medicine catalogue and search results are cached in Redis. The live timing race chart shows the response time difference between a cache **MISS** (PostgreSQL hit) and cache **HIT** (Redis). Cache is automatically invalidated when new medicines are added.

### 2. Recursive CTE — Medicine Co-Prescription Graph
A `WITH RECURSIVE` common table expression traverses the co-prescription graph starting from any medicine, finding related medicines up to 3 hops deep. A `visited_ids UUID[]` array prevents infinite cycles. Results are rendered as an interactive force-directed graph where nodes can be clicked to re-seed the traversal.

### 3. Transaction Management — ACID
Four live demonstrations:
- **State Machine** — Animated walkthrough of all 5 PostgreSQL transaction states (IDLE → ACTIVE → INTRANS → INERROR → IDLE) using real `BEGIN / SAVEPOINT / ROLLBACK / COMMIT` sequences
- **ACID Demo** — Two scenarios using real patient data: Scenario A commits successfully, Scenario B intentionally triggers a FK violation to demonstrate that Atomicity rolls back the entire transaction
- **Isolation Levels** — READ COMMITTED, REPEATABLE READ, and SERIALIZABLE all run live
- **Row Locking** — `SELECT FOR UPDATE` demonstration

### 4. Neo4j — Graph Database
Medicine nodes and `CO_PRESCRIBED_WITH` relationships are stored natively in Neo4j. A sync endpoint imports co-prescription pairs from PostgreSQL. Graph traversal uses Cypher path syntax — no recursive SQL needed. Results render as an interactive force-directed graph.

### 5. MongoDB — Audit Log (Polyglot Persistence)
Every doctor action (login, create prescription, edit patient, etc.) is logged as a flexible schema-less document in MongoDB. The audit log page shows a live event feed, aggregation pipeline stats (`$match → $group → $sort`), and an activity breakdown chart. A TTL index auto-expires events after 90 days.

### 6. Two-Level Trigger Chain — Allergy Alerts
A chain of two triggers fires automatically on every prescription item insert:
- **Level 1** (`trg_check_allergy`) — checks medicine name against patient allergies, inserts into `allergy_alerts` if matched
- **Level 2** (`trg_flag_allergy_conflict`) — fires because Level 1 inserted a row, sets `prescriptions.has_allergy_conflict = true`

### 7. Covering Index
`CREATE INDEX idx_rx_covering ON prescriptions(doctor_id, date DESC) INCLUDE (patient_id, status, diagnosis)` — the dashboard query performs an **Index Only Scan** with zero heap access.

### 8. DOMAIN Types + CHECK Constraints
- `phone_number` DOMAIN enforces regex format
- `patient_age` DOMAIN enforces 0–150 range
- `prescription_items.days` constrained to 1–365
- `prescription_items.times_per_day` constrained to 1–10

---

## Project Structure

```
smartrx-converted/
│
├── schema.sql                        ← Run this in PostgreSQL FIRST
├── schema-patient-portal.sql         ← Run this second (patient portal tables)
├── package.json                      ← Frontend dependencies
├── vite.config.ts                    ← Vite dev server + /api proxy
├── index.html
│
├── server/                           ← Express.js backend
│   ├── index.js                      ← Entry point — registers all routes
│   ├── db.js                         ← PostgreSQL connection pool
│   ├── redis.js                      ← Redis client with graceful fallback
│   ├── package.json                  ← Backend dependencies
│   ├── .env.example                  ← Copy to .env and fill in values
│   │
│   ├── middleware/
│   │   └── auth.js                   ← JWT token verification
│   │
│   └── routes/
│       ├── auth.js                   ← Register, login, profile
│       ├── patients.js               ← Patient CRUD
│       ├── prescriptions.js          ← Prescription CRUD + edit + status
│       ├── medicines.js              ← Catalogue, search, suggestions, CTE graph
│       ├── diseases.js               ← Disease catalogue
│       ├── templates.js              ← Disease templates
│       ├── dashboard.js              ← Stats and analytics
│       ├── alerts.js                 ← Allergy alerts (trigger chain results)
│       ├── transactions.js           ← ACID demo, state machine, isolation levels
│       ├── neo4j.js                  ← Graph database sync and traversal
│       ├── mongodb.js                ← Audit log read/write
│       ├── chat.js                   ← Doctor messaging
│       ├── patient-auth.js           ← Patient portal login
│       └── patient-portal.js        ← Patient-facing endpoints
│
└── src/                              ← React frontend
    ├── App.tsx                       ← Routes
    ├── components/
    │   ├── AppSidebar.tsx            ← Navigation
    │   └── DashboardLayout.tsx       ← Auth-guarded layout wrapper
    ├── hooks/
    │   └── useAuth.tsx               ← JWT auth context
    ├── lib/
    │   ├── api.ts                    ← Base fetch helper
    │   ├── store.ts                  ← All API call functions
    │   ├── types.ts                  ← TypeScript interfaces
    │   └── pdf.ts                    ← PDF generation
    └── pages/
        ├── DashboardPage.tsx
        ├── PatientsPage.tsx
        ├── PatientDetailPage.tsx     ← Edit/delete patient, edit prescription
        ├── PrescriptionsListPage.tsx
        ├── NewPrescriptionPage.tsx
        ├── MedicinesPage.tsx
        ├── TemplatesPage.tsx
        ├── ProfilePage.tsx
        ├── DoctorChatPage.tsx
        ├── AdvancedFeaturesPage.tsx  ← Live ADMS demos
        └── [Patient portal pages]
```

---

## Prerequisites

Install the following before starting:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 15+ | https://www.postgresql.org/download/windows |
| pgAdmin 4 | any | bundled with PostgreSQL installer |
| Redis | any | https://github.com/tporadowski/redis/releases (Windows) |
| Neo4j Desktop | 4.x+ | https://neo4j.com/download (optional) |
| MongoDB | 7+ | https://www.mongodb.com/try/download/community (optional) |

Verify Node and npm installed:
```bash
node -v
npm -v
```

---

## Installation & Setup

### Step 1 — Create the PostgreSQL Database

**Option A — pgAdmin 4 (recommended for beginners)**
1. Open pgAdmin 4 and connect to your local server
2. Right-click **Databases → Create → Database**, name it `smartrx`
3. Select `smartrx` → open **Query Tool**
4. Open `schema.sql` → click Execute ▶
5. Repeat with `schema-patient-portal.sql`

**Option B — Command Line**
```bash
psql -U postgres -c "CREATE DATABASE smartrx;"
psql -U postgres -d smartrx -f schema.sql
psql -U postgres -d smartrx -f schema-patient-portal.sql
```

### Step 2 — Configure the Backend

```bash
cd server
copy .env.example .env
notepad .env
```

Edit `.env`:
```
PORT=3001
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/smartrx
JWT_SECRET=any_long_random_string_here
JWT_EXPIRES_IN=7d

# Redis (optional — app works without it, caching just won't be active)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Neo4j (optional)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password

# MongoDB (optional)
MONGO_URI=mongodb://localhost:27017/smartrx_logs
```

### Step 3 — Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend (from project root)
cd ..
npm install
```

### Step 4 — (Optional) Start Redis, Neo4j, MongoDB

**Redis** — open a terminal and run:
```bash
redis-server
```

**Neo4j** — open Neo4j Desktop → Start your database

**MongoDB** — open a terminal and run:
```bash
mongod
```

---

## Running the Application

You need **two terminals** open simultaneously.

**Terminal 1 — Backend**
```bash
cd server
node index.js
```
Expected output:
```
✅  SmartRx API running on http://localhost:3001
✅  Redis connected — caching active
✅  MongoDB connected
```

**Terminal 2 — Frontend**
```bash
npm run dev
```
Expected output:
```
VITE ready
➜  Local: http://localhost:8080/
```

Open **http://localhost:8080** in your browser.

### First Time Setup
1. Click **Sign Up**
2. Fill in your name, clinic name, specialization, email, and password
3. Click **Create Account** then **Sign In**

---

## API Reference

All routes except `/api/auth/register` and `/api/auth/login` require:
```
Authorization: Bearer <token>
```

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create doctor account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current doctor profile |
| GET | `/api/patients` | List patients (`?q=search`) |
| GET | `/api/patients/:id` | Single patient |
| POST | `/api/patients` | Add patient |
| PUT | `/api/patients/:id` | Update patient |
| DELETE | `/api/patients/:id` | Delete patient + all prescriptions |
| GET | `/api/prescriptions` | All prescriptions (`?patientId=&from=&to=`) |
| POST | `/api/prescriptions` | Create prescription (stored procedure) |
| PUT | `/api/prescriptions/:id` | Edit prescription in place |
| PATCH | `/api/prescriptions/:id/status` | Change status (draft/issued) |
| GET | `/api/medicines` | Catalogue (`?q=search`) |
| POST | `/api/medicines` | Add medicine |
| POST | `/api/medicines/suggestions` | Co-prescription suggestions |
| GET | `/api/medicines/:id/graph` | Recursive CTE graph (`?depth=3`) |
| GET | `/api/alerts/prescription/:id` | Allergy alerts for prescription |
| GET | `/api/alerts/patient/:id` | Full allergy history for patient |
| GET | `/api/transactions/states` | Transaction state machine demo |
| POST | `/api/transactions/acid-demo` | ACID live demonstration |
| GET | `/api/transactions/isolation-demo` | Isolation levels demo |
| GET | `/api/transactions/lock-demo` | Row locking demo |
| GET | `/api/neo4j/status` | Neo4j connection check |
| POST | `/api/neo4j/sync` | Import co-prescription data into Neo4j |
| GET | `/api/neo4j/graph/:id` | Cypher graph traversal |
| GET | `/api/logs/status` | MongoDB connection check |
| GET | `/api/logs` | Recent audit events (`?limit=50&type=`) |
| POST | `/api/logs/event` | Write audit event |
| GET | `/api/logs/stats` | Aggregation pipeline statistics |
| GET | `/api/health` | Server health + all service status |

---

## Database Design

### Tables (10)
| Table | Description |
|-------|-------------|
| `doctors` | User accounts with bcrypt-hashed passwords |
| `patients` | Doctor-scoped patient records with allergy tracking |
| `medicines` | Shared drug catalogue (200 seeds) |
| `diseases` | Disease/condition catalogue |
| `disease_templates` | Named treatment templates per disease |
| `template_medicines` | Junction: templates ↔ medicines |
| `prescriptions` | Prescription header with ACID-guaranteed inserts |
| `prescription_items` | Junction: prescriptions ↔ medicines |
| `allergy_alerts` | Derived table populated by trigger chain |
| `patient_accounts` | Patient portal login accounts |

### Custom Types
```sql
CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE prescription_status AS ENUM ('draft', 'issued');
CREATE DOMAIN phone_number AS TEXT CHECK (VALUE ~ '^\+?[0-9][0-9\s\-]{5,13}[0-9]$');
CREATE DOMAIN patient_age AS INTEGER CHECK (VALUE BETWEEN 0 AND 150);
```

### Triggers (8)
| Trigger | Table | Action |
|---------|-------|--------|
| `trg_doctors_updated` | doctors | Auto-updates `updated_at` |
| `trg_patients_updated` | patients | Auto-updates `updated_at` |
| `trg_medicines_updated` | medicines | Auto-updates `updated_at` |
| `trg_increment_usage` | prescription_items | Increments `medicines.usage_count` |
| `trg_patient_display_id` | patients | Generates P-1001, P-1002… IDs |
| `trg_patient_visit_stats` | prescriptions | Updates `visit_count` + `last_visit_date` |
| `trg_check_allergy` | prescription_items | Level 1 of allergy alert chain |
| `trg_flag_allergy_conflict` | allergy_alerts | Level 2 — sets `has_allergy_conflict` |

### Stored Procedures & Functions
| Name | Type | Purpose |
|------|------|---------|
| `create_prescription_with_items` | PROCEDURE | Atomic prescription + items insert |
| `get_smart_suggestions` | FUNCTION (STABLE) | Co-prescription frequency analysis |
| `get_top_medicines` | FUNCTION (STABLE, SQL) | Top medicines by usage count |

### Indexes
| Index | Type | Purpose |
|-------|------|---------|
| `idx_patients_name_trgm` | GIN trigram | ILIKE patient search |
| `idx_medicines_name_trgm` | GIN trigram | ILIKE medicine search |
| `idx_rx_covering` | B-Tree + INCLUDE | Index Only Scan on dashboard query |
| `idx_prescriptions_doctor_date` | B-Tree composite | Filter + sort prescriptions |
| 10 others | B-Tree | FK columns and common filters |

---

## Troubleshooting

**Cannot connect to database — ECONNREFUSED**
PostgreSQL service is not running. Open Services (`Win+R → services.msc`) and start `postgresql-x64-15`.

**Password authentication failed**
The password in `server/.env` doesn't match your PostgreSQL installation password. Re-check `DATABASE_URL`.

**relation "patients" does not exist**
`schema.sql` hasn't been run yet, or was run on the wrong database. Make sure you selected the `smartrx` database before running it.

**Frontend shows blank page or 401 errors**
The backend server is not running. Open a terminal, `cd server`, and run `node index.js` first.

**Redis always shows MISS**
Redis is not running. Open a terminal and run `redis-server`. Once running, restart the Node.js server (`node index.js`) to establish the connection.

**Neo4j encryption error**
Make sure `NEO4J_URI` in `.env` uses `bolt://` not `neo4j+s://`. The driver is configured with `ENCRYPTION_OFF` for local connections.

**Neo4j sync returns 0 pairs**
You need prescriptions that each contain at least 2 medicines. Add some prescriptions with multiple medicines first, then sync.

**MongoDB not logging**
`mongod` service is not running. Start it with `mongod` in a terminal, or through MongoDB Compass.

**Port 3001 already in use**
Change `PORT=3002` in `server/.env`. The frontend proxy in `vite.config.ts` points to `http://localhost:3001` by default — update it to match.

---

## Authors

**Hasham** — NUST, CS 236 Advanced Database Management Systems  
Clinic: Nust Clinic  
Role: General Physician (demo account)

---

## License

This project is for academic purposes only.
