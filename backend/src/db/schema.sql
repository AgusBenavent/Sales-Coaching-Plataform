CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_name VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  company VARCHAR(255),
  deal_stage VARCHAR(100),
  opportunity_value DECIMAL(12,2),
  transcript TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  overall_score INTEGER,
  scores JSONB,
  agents_output JSONB,
  coaching JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manager_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID REFERENCES evaluations(id) ON DELETE CASCADE,
  manager_name VARCHAR(255),
  approved BOOLEAN,
  corrections JSONB,
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
