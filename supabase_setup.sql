-- =============================================
-- PEGAR ESTO EN: Supabase > SQL Editor > New query
-- =============================================

-- 1. Tabla de calls
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salesperson_name TEXT NOT NULL,
  contact_type TEXT NOT NULL DEFAULT 'university', -- 'university' o 'student'
  contact_name TEXT,
  institution_name TEXT,
  stage TEXT,
  opportunity_value DECIMAL(12,2),
  transcript TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MIGRACION: si ya habías corrido el script viejo (customer_name/company/deal_stage),
-- ejecutá esto en vez de los CREATE TABLE de arriba para actualizar la tabla existente:
-- =============================================
-- ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS contact_type TEXT NOT NULL DEFAULT 'university';
-- ALTER TABLE public.calls RENAME COLUMN customer_name TO contact_name;
-- ALTER TABLE public.calls RENAME COLUMN company TO institution_name;
-- ALTER TABLE public.calls RENAME COLUMN deal_stage TO stage;

-- 2. Tabla de evaluaciones
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  overall_score INTEGER,
  scores JSONB,
  agents_output JSONB,
  coaching JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 3. Tabla de feedback de managers
CREATE TABLE public.manager_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  manager_name TEXT,
  approved BOOLEAN,
  corrections JSONB,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Row Level Security (cada usuario solo ve sus datos)
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own calls" ON public.calls
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own evaluations" ON public.evaluations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.calls WHERE calls.id = evaluations.call_id AND calls.user_id = auth.uid())
  );

CREATE POLICY "Users see own feedback" ON public.manager_feedback
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.evaluations e
      JOIN public.calls c ON c.id = e.call_id
      WHERE e.id = manager_feedback.evaluation_id AND c.user_id = auth.uid()
    )
  );
