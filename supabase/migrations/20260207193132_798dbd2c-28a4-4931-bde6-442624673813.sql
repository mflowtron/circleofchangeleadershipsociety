-- Phase 1: Database Schema Changes for Multi-Role System

-- 1. Add new enum values to app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lms_student';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lms_advisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lms_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'em_advisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'em_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'em_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'attendee_student';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'attendee_advisor';