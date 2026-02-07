-- Add purchaser attendance tracking to orders
ALTER TABLE public.orders 
ADD COLUMN purchaser_is_attending boolean DEFAULT null;

-- Add purchaser flag to attendees
ALTER TABLE public.attendees 
ADD COLUMN is_purchaser boolean DEFAULT false;