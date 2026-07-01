# SalesCoach AI — Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL running locally
- Anthropic API key

## 1. Database Setup

```sql
-- In psql or pgAdmin:
CREATE DATABASE sales_coaching;
\c sales_coaching
-- Then run the schema:
\i backend/src/db/schema.sql
```

## 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY and DB credentials
npm run dev
# Runs on http://localhost:3001
```

## 3. Frontend

```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

## Usage

1. Open http://localhost:5173
2. Click "New Call"
3. Fill in rep/customer info and paste a transcript
4. The 10 AI agents run in parallel (~30-60s)
5. View scores, coaching, and agent breakdowns
6. Managers can approve/correct evaluations

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/calls | Upload transcript + start evaluation |
| GET | /api/calls | List all calls |
| GET | /api/calls/:id | Get call + evaluation detail |
| GET | /api/dashboard | Aggregated metrics |
| POST | /api/feedback | Submit manager feedback |
