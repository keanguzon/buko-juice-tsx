-- Migration: Add savings and networth columns to accounts table
-- Run this if you have an existing database that needs to be updated

-- Add new columns to accounts table
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS is_savings BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS include_in_networth BOOLEAN DEFAULT TRUE;

-- Update existing accounts to have default values
UPDATE public.accounts 
SET 
  is_savings = FALSE,
  interest_rate = 0,
  include_in_networth = TRUE
WHERE is_savings IS NULL 
   OR interest_rate IS NULL 
   OR include_in_networth IS NULL;
