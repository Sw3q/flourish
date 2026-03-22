-- Add floor_number to floors table for ordering and mapping in Building View
ALTER TABLE public.floors ADD COLUMN IF NOT EXISTS floor_number integer;
COMMENT ON COLUMN public.floors.floor_number IS 'Physical floor number in the building (0 for ground/general)';
