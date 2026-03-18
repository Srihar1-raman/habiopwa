-- Migration: Add is_addon column to plan_request_items
-- Run this in your Supabase project: Dashboard → SQL Editor → New Query → paste & run
--
-- This column tracks whether a plan_request_item was added as an add-on
-- by an already-active (paid/finalized) customer, vs being part of the original plan submission.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE plan_request_items
  ADD COLUMN IF NOT EXISTS is_addon boolean NOT NULL DEFAULT false;
