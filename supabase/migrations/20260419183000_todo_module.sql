-- Migration: 20260419183000_todo_module.sql
-- Description: Task management tables and RLS

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    is_all_day BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    category TEXT, -- meeting, personal, work, etc.
    color TEXT, -- hex code
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policy can use auth.uid() and company_id
CREATE POLICY "Users can view tasks of their company"
    ON public.tasks FOR SELECT
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "Users can insert tasks for their company"
    ON public.tasks FOR INSERT
    WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their company tasks"
    ON public.tasks FOR UPDATE
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their company tasks"
    ON public.tasks FOR DELETE
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Index
CREATE INDEX idx_tasks_company_date ON public.tasks(company_id, start_date);
CREATE INDEX idx_tasks_user ON public.tasks(user_id);
