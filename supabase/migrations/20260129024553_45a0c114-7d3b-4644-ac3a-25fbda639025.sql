-- Create a function to atomically reserve tickets with row-level locking
-- This prevents race conditions during concurrent purchases
CREATE OR REPLACE FUNCTION public.reserve_tickets(
  _ticket_type_id UUID,
  _quantity INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  _available INTEGER;
  _sold INTEGER;
BEGIN
  -- Lock the row for update to prevent concurrent modifications
  SELECT quantity_available, quantity_sold INTO _available, _sold
  FROM public.ticket_types
  WHERE id = _ticket_type_id
  FOR UPDATE;
  
  -- If ticket type not found, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if enough tickets available (NULL means unlimited)
  IF _available IS NOT NULL AND _sold + _quantity > _available THEN
    RETURN FALSE;
  END IF;
  
  -- Update quantity sold atomically
  UPDATE public.ticket_types
  SET quantity_sold = quantity_sold + _quantity
  WHERE id = _ticket_type_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;