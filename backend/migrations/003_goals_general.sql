-- Migration 003: Make goals general-purpose (not just financial)
-- Add category and status columns; make target_amount nullable for non-financial goals

ALTER TABLE goals ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'financial';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE goals ALTER COLUMN target_amount DROP NOT NULL;
ALTER TABLE goals ALTER COLUMN target_amount SET DEFAULT NULL;
