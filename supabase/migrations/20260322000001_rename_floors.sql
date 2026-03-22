-- Rename floors to align with the proposed names
-- Floor 13 is set to NULL to be filtered out from navigation

UPDATE public.floors SET name = 'd/acc lounge for cross pollination' WHERE floor_number = 16;
UPDATE public.floors SET name = 'Coworking & The Library' WHERE floor_number = 15;
UPDATE public.floors SET name = 'Human Flourishing' WHERE floor_number = 14;
UPDATE public.floors SET name = 'Floor 13' WHERE floor_number = 13; -- Skip/Hide
UPDATE public.floors SET name = 'Ethereum & Decentralized Tech' WHERE floor_number = 12;
UPDATE public.floors SET name = 'Health & Longevity' WHERE floor_number = 11;
UPDATE public.floors SET name = 'Frontier @ Accelerate' WHERE floor_number = 10;
UPDATE public.floors SET name = 'AI & Autonomous Systems' WHERE floor_number = 9;
UPDATE public.floors SET name = 'Neuro & Biotech' WHERE floor_number = 8;
UPDATE public.floors SET name = 'Frontier Maker Space' WHERE floor_number = 7;
UPDATE public.floors SET name = 'Arts & Music' WHERE floor_number = 6;
UPDATE public.floors SET name = 'Movement Floor & Fitness Center' WHERE floor_number = 5;
UPDATE public.floors SET name = 'Robotics & Hard Tech' WHERE floor_number = 4;
UPDATE public.floors SET name = 'Private offices' WHERE floor_number = 3;
UPDATE public.floors SET name = 'Event and Hackathon Space' WHERE floor_number = 2;
UPDATE public.floors SET name = 'Mezzanine: Co-Living 1' WHERE floor_number = 1;
