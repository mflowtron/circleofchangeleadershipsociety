-- Drop remaining foreign key constraints that reference auth.users
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

-- Insert user roles (all students) - profiles already inserted from previous migration
INSERT INTO public.user_roles (user_id, role) VALUES
('a1b2c3d4-1111-4000-8000-000000000001', 'student'),
('a1b2c3d4-2222-4000-8000-000000000002', 'student'),
('a1b2c3d4-3333-4000-8000-000000000003', 'student'),
('a1b2c3d4-4444-4000-8000-000000000004', 'student'),
('a1b2c3d4-5555-4000-8000-000000000005', 'student'),
('a1b2c3d4-6666-4000-8000-000000000006', 'student'),
('a1b2c3d4-7777-4000-8000-000000000007', 'student'),
('a1b2c3d4-8888-4000-8000-000000000008', 'student'),
('a1b2c3d4-9999-4000-8000-000000000009', 'student'),
('a1b2c3d4-aaaa-4000-8000-00000000000a', 'student');

-- Insert 50 posts (5 per user) with varied content and timestamps
INSERT INTO public.posts (user_id, content, is_global, chapter_id, image_url, link_url, created_at) VALUES
-- Sarah Chen (user 1)
('a1b2c3d4-1111-4000-8000-000000000001', 'Just finished our chapter meeting and I''m inspired by everyone''s commitment to positive change! The energy in the room was incredible. 🌟', true, NULL, NULL, NULL, now() - interval '2 days'),
('a1b2c3d4-1111-4000-8000-000000000001', 'Leadership isn''t about being in charge - it''s about taking care of those in your charge. Something I learned from our advisor today.', true, NULL, NULL, NULL, now() - interval '5 days'),
('a1b2c3d4-1111-4000-8000-000000000001', 'Working on our community service project this weekend. Can''t wait to make a difference!', false, '96fc9ef1-8194-415c-904b-b360972db165', NULL, NULL, now() - interval '8 days'),
('a1b2c3d4-1111-4000-8000-000000000001', 'Teamwork makes the dream work! Here''s our group from the leadership workshop.', true, NULL, 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800', NULL, now() - interval '12 days'),
('a1b2c3d4-1111-4000-8000-000000000001', 'Great article on developing emotional intelligence as a leader. Highly recommend!', true, NULL, NULL, 'https://hbr.org/2017/02/emotional-intelligence-has-12-elements-which-do-you-need-to-work-on', now() - interval '15 days'),

-- Marcus Johnson (user 2)
('a1b2c3d4-2222-4000-8000-000000000002', 'Grateful for the mentorship I''ve received. Paying it forward to the next generation. 🙏', true, NULL, NULL, NULL, now() - interval '1 day'),
('a1b2c3d4-2222-4000-8000-000000000002', 'Today''s workshop on public speaking was transformative. Nervous but ready to grow!', false, '96fc9ef1-8194-415c-904b-b360972db165', NULL, NULL, now() - interval '4 days'),
('a1b2c3d4-2222-4000-8000-000000000002', 'The best leaders are those most interested in surrounding themselves with assistants and associates smarter than they are.', true, NULL, NULL, NULL, now() - interval '7 days'),
('a1b2c3d4-2222-4000-8000-000000000002', 'Our chapter retreat was amazing! Building bonds that will last a lifetime.', true, NULL, 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800', NULL, now() - interval '10 days'),
('a1b2c3d4-2222-4000-8000-000000000002', 'Check out this TED talk on servant leadership - changed my perspective completely.', true, NULL, NULL, 'https://www.ted.com/talks/simon_sinek_how_great_leaders_inspire_action', now() - interval '14 days'),

-- Emily Rodriguez (user 3)
('a1b2c3d4-3333-4000-8000-000000000003', 'Excited to announce I''ve been selected as our chapter''s community liaison! Ready to serve. 💪', true, NULL, NULL, NULL, now() - interval '3 days'),
('a1b2c3d4-3333-4000-8000-000000000003', 'Reflecting on how much I''ve grown since joining. This community has shaped who I am.', true, NULL, NULL, NULL, now() - interval '6 days'),
('a1b2c3d4-3333-4000-8000-000000000003', 'Planning our next fundraiser. Any ideas? Drop them in the comments!', false, '96fc9ef1-8194-415c-904b-b360972db165', NULL, NULL, now() - interval '9 days'),
('a1b2c3d4-3333-4000-8000-000000000003', 'Volunteering at the local food bank today. Service is the heart of leadership.', true, NULL, 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800', NULL, now() - interval '13 days'),
('a1b2c3d4-3333-4000-8000-000000000003', 'Great resource on project management for student leaders!', true, NULL, NULL, 'https://www.mindtools.com/pages/article/newPPM_00.htm', now() - interval '16 days'),

-- David Kim (user 4)
('a1b2c3d4-4444-4000-8000-000000000004', 'Just led my first meeting today. Nervous but it went well! Learning every day.', true, NULL, NULL, NULL, now() - interval '2 days'),
('a1b2c3d4-4444-4000-8000-000000000004', 'True leadership stems from individuality that is honestly and sometimes imperfectly expressed.', true, NULL, NULL, NULL, now() - interval '5 days'),
('a1b2c3d4-4444-4000-8000-000000000004', 'Working on our chapter presentation for the regional conference!', false, '96fc9ef1-8194-415c-904b-b360972db165', NULL, NULL, now() - interval '8 days'),
('a1b2c3d4-4444-4000-8000-000000000004', 'Proud of our team for organizing this successful workshop!', true, NULL, 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800', NULL, now() - interval '11 days'),
('a1b2c3d4-4444-4000-8000-000000000004', 'This book on leadership fundamentals is a must-read for everyone here.', true, NULL, NULL, 'https://www.goodreads.com/book/show/81948.The_21_Irrefutable_Laws_of_Leadership', now() - interval '18 days'),

-- Aisha Patel (user 5)
('a1b2c3d4-5555-4000-8000-000000000005', 'Innovation distinguishes between a leader and a follower. Always keep learning! 📚', true, NULL, NULL, NULL, now() - interval '1 day'),
('a1b2c3d4-5555-4000-8000-000000000005', 'Had an amazing conversation with our mentor today about career paths. So grateful!', true, NULL, NULL, NULL, now() - interval '4 days'),
('a1b2c3d4-5555-4000-8000-000000000005', 'Chapter study session tonight! Who''s joining? 📖', false, '96fc9ef1-8194-415c-904b-b360972db165', NULL, NULL, now() - interval '7 days'),
('a1b2c3d4-5555-4000-8000-000000000005', 'Our community clean-up event was a huge success! Together we make a difference.', true, NULL, 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800', NULL, now() - interval '10 days'),
('a1b2c3d4-5555-4000-8000-000000000005', 'Excellent podcast episode on building confidence as a young leader.', true, NULL, NULL, 'https://www.forbes.com/sites/forbescoachescouncil/2021/08/17/15-ways-to-build-confidence-as-a-leader/', now() - interval '17 days'),

-- James Wilson (user 6)
('a1b2c3d4-6666-4000-8000-000000000006', 'The growth I''ve experienced this semester is beyond what I imagined. Blessed to be here!', true, NULL, NULL, NULL, now() - interval '3 days'),
('a1b2c3d4-6666-4000-8000-000000000006', 'Leadership and learning are indispensable to each other. - JFK', true, NULL, NULL, NULL, now() - interval '6 days'),
('a1b2c3d4-6666-4000-8000-000000000006', 'Prepping for our chapter''s annual dinner. It''s going to be special!', false, '96fc9ef1-8194-415c-904b-b360972db165', NULL, NULL, now() - interval '9 days'),
('a1b2c3d4-6666-4000-8000-000000000006', 'Networking event was a blast! Made some great connections.', true, NULL, 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800', NULL, now() - interval '12 days'),
('a1b2c3d4-6666-4000-8000-000000000006', 'This guide on effective communication is gold for aspiring leaders.', true, NULL, NULL, 'https://www.skillsyouneed.com/ips/communication-skills.html', now() - interval '19 days'),

-- Olivia Thompson (user 7)
('a1b2c3d4-7777-4000-8000-000000000007', 'Small progress is still progress. Keep pushing forward! 🚀', true, NULL, NULL, NULL, now() - interval '2 days'),
('a1b2c3d4-7777-4000-8000-000000000007', 'Today I learned that being vulnerable is actually a strength in leadership.', true, NULL, NULL, NULL, now() - interval '5 days'),
('a1b2c3d4-7777-4000-8000-000000000007', 'Who else is excited for our chapter trip next month?! 🎉', false, '96fc9ef1-8194-415c-904b-b360972db165', NULL, NULL, now() - interval '8 days'),
('a1b2c3d4-7777-4000-8000-000000000007', 'Building community one event at a time. Love our team!', true, NULL, 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800', NULL, now() - interval '11 days'),
('a1b2c3d4-7777-4000-8000-000000000007', 'Great article on time management for busy student leaders.', true, NULL, NULL, 'https://www.verywellmind.com/time-management-tips-for-students-3145048', now() - interval '20 days'),

-- Carlos Martinez (user 8)
('a1b2c3d4-8888-4000-8000-000000000008', 'Success is not final, failure is not fatal: it is the courage to continue that counts.', true, NULL, NULL, NULL, now() - interval '1 day'),
('a1b2c3d4-8888-4000-8000-000000000008', 'Had an incredible mentorship session today. Feeling motivated and focused!', true, NULL, NULL, NULL, now() - interval '4 days'),
('a1b2c3d4-8888-4000-8000-000000000008', 'Reminder: Chapter meeting tomorrow at 6pm! Don''t miss it.', false, '96fc9ef1-8194-415c-904b-b360972db165', NULL, NULL, now() - interval '7 days'),
('a1b2c3d4-8888-4000-8000-000000000008', 'Our team representing at the state leadership conference!', true, NULL, 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', NULL, now() - interval '14 days'),
('a1b2c3d4-8888-4000-8000-000000000008', 'This video on goal setting changed how I approach my leadership journey.', true, NULL, NULL, 'https://www.youtube.com/watch?v=L4N1q4RNi9I', now() - interval '21 days'),

-- Mia Williams (user 9)
('a1b2c3d4-9999-4000-8000-000000000009', 'Be the change you wish to see in the world. Starting with myself today. ✨', true, NULL, NULL, NULL, now() - interval '3 days'),
('a1b2c3d4-9999-4000-8000-000000000009', 'Learning to balance leadership responsibilities with self-care. It''s a journey!', true, NULL, NULL, NULL, now() - interval '6 days'),
('a1b2c3d4-9999-4000-8000-000000000009', 'Brainstorming ideas for our chapter''s spring initiative. So many possibilities!', false, '96fc9ef1-8194-415c-904b-b360972db165', NULL, NULL, now() - interval '9 days'),
('a1b2c3d4-9999-4000-8000-000000000009', 'Grateful for this amazing group of leaders. We grow together!', true, NULL, 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=800', NULL, now() - interval '15 days'),
('a1b2c3d4-9999-4000-8000-000000000009', 'Helpful resource on conflict resolution for team leaders.', true, NULL, NULL, 'https://www.pon.harvard.edu/daily/conflict-resolution/conflict-resolution-strategies/', now() - interval '22 days'),

-- Alex Nguyen (user 10)
('a1b2c3d4-aaaa-4000-8000-00000000000a', 'Every accomplishment starts with the decision to try. Let''s go! 💯', true, NULL, NULL, NULL, now() - interval '2 days'),
('a1b2c3d4-aaaa-4000-8000-00000000000a', 'Attended the leadership summit this weekend. Mind = blown. So much to implement!', true, NULL, NULL, NULL, now() - interval '5 days'),
('a1b2c3d4-aaaa-4000-8000-00000000000a', 'Chapter elections coming up! Thinking about running for secretary. Thoughts?', false, '96fc9ef1-8194-415c-904b-b360972db165', NULL, NULL, now() - interval '8 days'),
('a1b2c3d4-aaaa-4000-8000-00000000000a', 'Workshop on diversity and inclusion was eye-opening. We all have work to do.', true, NULL, 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800', NULL, now() - interval '16 days'),
('a1b2c3d4-aaaa-4000-8000-00000000000a', 'Bookmarking this guide on developing a growth mindset.', true, NULL, NULL, 'https://www.mindsetworks.com/science/', now() - interval '25 days');