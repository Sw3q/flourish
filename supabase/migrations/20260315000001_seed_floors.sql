-- Seed 16 floors for the Frontier Tower
INSERT INTO public.floors (id, name, floor_number)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'Default Floor', 0),
  (gen_random_uuid(), 'Flourish Floor 1', 1),
  (gen_random_uuid(), 'Flourish Floor 2', 2),
  (gen_random_uuid(), 'Flourish Floor 3', 3),
  (gen_random_uuid(), 'Flourish Floor 4', 4),
  (gen_random_uuid(), 'Flourish Floor 5', 5),
  (gen_random_uuid(), 'Flourish Floor 6', 6),
  (gen_random_uuid(), 'Flourish Floor 7', 7),
  (gen_random_uuid(), 'Flourish Floor 8', 8),
  (gen_random_uuid(), 'Flourish Floor 9', 9),
  (gen_random_uuid(), 'Flourish Floor 10', 10),
  (gen_random_uuid(), 'Flourish Floor 11', 11),
  (gen_random_uuid(), 'Flourish Floor 12', 12),
  (gen_random_uuid(), 'Flourish Floor 13', 13),
  (gen_random_uuid(), 'Flourish Floor 14', 14),
  (gen_random_uuid(), 'Flourish Floor 15', 15),
  (gen_random_uuid(), 'Flourish Floor 16', 16)
ON CONFLICT (id) DO NOTHING;

-- Also handle any existing floors that might have floor_number as null
UPDATE public.floors SET floor_number = 0 WHERE id = '00000000-0000-0000-0000-000000000000' AND floor_number IS NULL;
