-- Drop the profiles FK constraint to allow test users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Insert the 10 test profiles
INSERT INTO public.profiles (user_id, full_name, chapter_id) VALUES
('a1b2c3d4-1111-4000-8000-000000000001', 'Sarah Chen', '96fc9ef1-8194-415c-904b-b360972db165'),
('a1b2c3d4-2222-4000-8000-000000000002', 'Marcus Johnson', '96fc9ef1-8194-415c-904b-b360972db165'),
('a1b2c3d4-3333-4000-8000-000000000003', 'Emily Rodriguez', '96fc9ef1-8194-415c-904b-b360972db165'),
('a1b2c3d4-4444-4000-8000-000000000004', 'David Kim', '96fc9ef1-8194-415c-904b-b360972db165'),
('a1b2c3d4-5555-4000-8000-000000000005', 'Aisha Patel', '96fc9ef1-8194-415c-904b-b360972db165'),
('a1b2c3d4-6666-4000-8000-000000000006', 'James Wilson', '96fc9ef1-8194-415c-904b-b360972db165'),
('a1b2c3d4-7777-4000-8000-000000000007', 'Olivia Thompson', '96fc9ef1-8194-415c-904b-b360972db165'),
('a1b2c3d4-8888-4000-8000-000000000008', 'Carlos Martinez', '96fc9ef1-8194-415c-904b-b360972db165'),
('a1b2c3d4-9999-4000-8000-000000000009', 'Mia Williams', '96fc9ef1-8194-415c-904b-b360972db165'),
('a1b2c3d4-aaaa-4000-8000-00000000000a', 'Alex Nguyen', '96fc9ef1-8194-415c-904b-b360972db165');