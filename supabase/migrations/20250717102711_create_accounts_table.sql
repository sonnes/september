-- Create accounts table
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Information
  name TEXT,
  city TEXT,
  country TEXT,
  
  -- Medical Information
  primary_diagnosis TEXT,
  year_of_diagnosis INTEGER,
  medical_document_path TEXT,
  
  -- Flags
  terms_accepted BOOLEAN DEFAULT FALSE,
  privacy_policy_accepted BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own account" ON public.accounts
  FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert their own account" ON public.accounts
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update their own account" ON public.accounts
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_updated_at 
  BEFORE UPDATE ON public.accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();