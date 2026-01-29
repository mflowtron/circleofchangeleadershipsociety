-- Seed speakers for First Gen 2026 event
INSERT INTO public.speakers (event_id, name, title, company, bio, sort_order) VALUES
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Dr. Sarah Chen', 'Director of Student Success', 'State University', 'Dr. Chen has dedicated 15 years to supporting first-generation students in their academic journey.', 0),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Marcus Johnson', 'Career Development Coach', 'TechCorp', 'Marcus helps students transition from academia to successful careers in technology.', 1),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Dr. Emily Rodriguez', 'Professor of Education', 'Community College', 'Dr. Rodriguez researches educational equity and first-generation student success.', 2),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'James Williams', 'Alumni Relations Manager', 'First Gen Foundation', 'James connects first-gen alumni with current students for mentorship opportunities.', 3),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Lisa Thompson', 'Wellness Coordinator', 'Student Services', 'Lisa focuses on mental health and wellness programs for first-generation students.', 4);

-- Day 1 (Today) agenda items
INSERT INTO public.agenda_items (event_id, title, description, item_type, starts_at, ends_at, location, track, is_highlighted, sort_order) VALUES
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Registration & Welcome Coffee', 'Check in, grab your badge, and enjoy some coffee while meeting fellow attendees.', 'networking', (date_trunc('day', now()) + interval '9 hours'), (date_trunc('day', now()) + interval '9 hours 30 minutes'), 'Main Lobby', NULL, false, 0),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Opening Keynote: Breaking Barriers', 'Dr. Sarah Chen shares inspiring stories of first-generation students who overcame obstacles to achieve success.', 'session', (date_trunc('day', now()) + interval '9 hours 30 minutes'), (date_trunc('day', now()) + interval '10 hours 30 minutes'), 'Main Stage', 'Main Stage', true, 1),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Morning Break', 'Refreshments and networking in the lobby.', 'break', (date_trunc('day', now()) + interval '10 hours 30 minutes'), (date_trunc('day', now()) + interval '10 hours 45 minutes'), 'Main Lobby', NULL, false, 2),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Workshop: Resume Building', 'Learn how to craft a compelling resume that highlights your unique experiences.', 'session', (date_trunc('day', now()) + interval '10 hours 45 minutes'), (date_trunc('day', now()) + interval '11 hours 45 minutes'), 'Workshop Room A', 'Workshop Room A', false, 3),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Workshop: Financial Literacy', 'Understanding student loans, budgeting, and financial planning for students.', 'session', (date_trunc('day', now()) + interval '10 hours 45 minutes'), (date_trunc('day', now()) + interval '11 hours 45 minutes'), 'Workshop Room B', 'Workshop Room B', false, 4),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Lunch', 'Enjoy a catered lunch and connect with speakers and attendees.', 'meal', (date_trunc('day', now()) + interval '12 hours'), (date_trunc('day', now()) + interval '13 hours'), 'Dining Hall', NULL, false, 5),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Panel: Career Pathways', 'Industry professionals share their career journeys and advice for first-gen students.', 'session', (date_trunc('day', now()) + interval '13 hours'), (date_trunc('day', now()) + interval '14 hours 30 minutes'), 'Main Stage', 'Main Stage', false, 6),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Afternoon Break', 'Quick refreshment break.', 'break', (date_trunc('day', now()) + interval '14 hours 30 minutes'), (date_trunc('day', now()) + interval '14 hours 45 minutes'), 'Main Lobby', NULL, false, 7),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Networking Session', 'Speed networking to connect with peers and professionals.', 'networking', (date_trunc('day', now()) + interval '14 hours 45 minutes'), (date_trunc('day', now()) + interval '15 hours 45 minutes'), 'Networking Lounge', NULL, false, 8),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Closing Remarks Day 1', 'Recap of the day and preview of tomorrow.', 'session', (date_trunc('day', now()) + interval '15 hours 45 minutes'), (date_trunc('day', now()) + interval '16 hours'), 'Main Stage', 'Main Stage', false, 9),

-- Day 2 (Tomorrow) agenda items
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Morning Coffee', 'Start your day with coffee and conversation.', 'networking', (date_trunc('day', now()) + interval '1 day 9 hours'), (date_trunc('day', now()) + interval '1 day 9 hours 30 minutes'), 'Main Lobby', NULL, false, 10),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Keynote: Navigating Academia', 'Dr. Emily Rodriguez discusses strategies for academic success as a first-gen student.', 'session', (date_trunc('day', now()) + interval '1 day 9 hours 30 minutes'), (date_trunc('day', now()) + interval '1 day 10 hours 30 minutes'), 'Main Stage', 'Main Stage', true, 11),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Break', 'Short refreshment break.', 'break', (date_trunc('day', now()) + interval '1 day 10 hours 30 minutes'), (date_trunc('day', now()) + interval '1 day 10 hours 45 minutes'), 'Main Lobby', NULL, false, 12),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Workshop: Study Skills', 'Effective study techniques and time management strategies.', 'session', (date_trunc('day', now()) + interval '1 day 10 hours 45 minutes'), (date_trunc('day', now()) + interval '1 day 11 hours 45 minutes'), 'Workshop Room A', 'Workshop Room A', false, 13),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Workshop: Mental Health & Wellness', 'Lisa Thompson leads a session on maintaining mental health during your academic journey.', 'session', (date_trunc('day', now()) + interval '1 day 10 hours 45 minutes'), (date_trunc('day', now()) + interval '1 day 11 hours 45 minutes'), 'Workshop Room B', 'Workshop Room B', false, 14),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Lunch', 'Enjoy lunch and continue networking.', 'meal', (date_trunc('day', now()) + interval '1 day 12 hours'), (date_trunc('day', now()) + interval '1 day 13 hours'), 'Dining Hall', NULL, false, 15),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Alumni Mentorship Circles', 'Small group sessions with successful first-gen alumni.', 'networking', (date_trunc('day', now()) + interval '1 day 13 hours'), (date_trunc('day', now()) + interval '1 day 14 hours 30 minutes'), 'Networking Lounge', NULL, false, 16),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Break', 'Afternoon refreshment break.', 'break', (date_trunc('day', now()) + interval '1 day 14 hours 30 minutes'), (date_trunc('day', now()) + interval '1 day 14 hours 45 minutes'), 'Main Lobby', NULL, false, 17),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Workshop: Grad School Prep', 'Everything you need to know about applying to graduate school.', 'session', (date_trunc('day', now()) + interval '1 day 14 hours 45 minutes'), (date_trunc('day', now()) + interval '1 day 15 hours 45 minutes'), 'Workshop Room A', 'Workshop Room A', false, 18),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Day 2 Wrap-up', 'Summary and preparation for the final day.', 'session', (date_trunc('day', now()) + interval '1 day 16 hours'), (date_trunc('day', now()) + interval '1 day 16 hours 30 minutes'), 'Main Stage', 'Main Stage', false, 19),

-- Day 3 (Day after tomorrow) agenda items
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Breakfast Mixer', 'Start the final day with breakfast and casual conversations.', 'meal', (date_trunc('day', now()) + interval '2 days 9 hours'), (date_trunc('day', now()) + interval '2 days 10 hours'), 'Dining Hall', NULL, false, 20),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Keynote: Your First Gen Story', 'James Williams inspires attendees to embrace and share their unique stories.', 'session', (date_trunc('day', now()) + interval '2 days 10 hours'), (date_trunc('day', now()) + interval '2 days 11 hours'), 'Main Stage', 'Main Stage', true, 21),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Break', 'Short break before lightning talks.', 'break', (date_trunc('day', now()) + interval '2 days 11 hours'), (date_trunc('day', now()) + interval '2 days 11 hours 15 minutes'), 'Main Lobby', NULL, false, 22),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Lightning Talks', 'Quick 5-minute presentations from student leaders sharing their experiences.', 'session', (date_trunc('day', now()) + interval '2 days 11 hours 15 minutes'), (date_trunc('day', now()) + interval '2 days 12 hours'), 'Main Stage', 'Main Stage', false, 23),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Farewell Lunch', 'Final meal together with certificate presentations.', 'meal', (date_trunc('day', now()) + interval '2 days 12 hours'), (date_trunc('day', now()) + interval '2 days 13 hours 30 minutes'), 'Dining Hall', NULL, false, 24),
  ('8b666936-1622-4d84-9787-3e95e54059b8', 'Closing Ceremony', 'Celebrate achievements and look forward to staying connected.', 'session', (date_trunc('day', now()) + interval '2 days 13 hours 30 minutes'), (date_trunc('day', now()) + interval '2 days 14 hours'), 'Main Stage', 'Main Stage', true, 25);

-- Assign speakers to sessions
INSERT INTO public.agenda_item_speakers (agenda_item_id, speaker_id, role, sort_order)
SELECT ai.id, s.id, 'speaker', 0
FROM public.agenda_items ai
CROSS JOIN public.speakers s
WHERE ai.event_id = '8b666936-1622-4d84-9787-3e95e54059b8'
  AND ai.title = 'Opening Keynote: Breaking Barriers'
  AND s.name = 'Dr. Sarah Chen'
  AND s.event_id = '8b666936-1622-4d84-9787-3e95e54059b8';

INSERT INTO public.agenda_item_speakers (agenda_item_id, speaker_id, role, sort_order)
SELECT ai.id, s.id, 'speaker', 0
FROM public.agenda_items ai
CROSS JOIN public.speakers s
WHERE ai.event_id = '8b666936-1622-4d84-9787-3e95e54059b8'
  AND ai.title = 'Workshop: Resume Building'
  AND s.name = 'Marcus Johnson'
  AND s.event_id = '8b666936-1622-4d84-9787-3e95e54059b8';

INSERT INTO public.agenda_item_speakers (agenda_item_id, speaker_id, role, sort_order)
SELECT ai.id, s.id, 'speaker', 0
FROM public.agenda_items ai
CROSS JOIN public.speakers s
WHERE ai.event_id = '8b666936-1622-4d84-9787-3e95e54059b8'
  AND ai.title = 'Panel: Career Pathways'
  AND s.name = 'Marcus Johnson'
  AND s.event_id = '8b666936-1622-4d84-9787-3e95e54059b8';

INSERT INTO public.agenda_item_speakers (agenda_item_id, speaker_id, role, sort_order)
SELECT ai.id, s.id, 'panelist', 1
FROM public.agenda_items ai
CROSS JOIN public.speakers s
WHERE ai.event_id = '8b666936-1622-4d84-9787-3e95e54059b8'
  AND ai.title = 'Panel: Career Pathways'
  AND s.name = 'James Williams'
  AND s.event_id = '8b666936-1622-4d84-9787-3e95e54059b8';

INSERT INTO public.agenda_item_speakers (agenda_item_id, speaker_id, role, sort_order)
SELECT ai.id, s.id, 'speaker', 0
FROM public.agenda_items ai
CROSS JOIN public.speakers s
WHERE ai.event_id = '8b666936-1622-4d84-9787-3e95e54059b8'
  AND ai.title = 'Keynote: Navigating Academia'
  AND s.name = 'Dr. Emily Rodriguez'
  AND s.event_id = '8b666936-1622-4d84-9787-3e95e54059b8';

INSERT INTO public.agenda_item_speakers (agenda_item_id, speaker_id, role, sort_order)
SELECT ai.id, s.id, 'speaker', 0
FROM public.agenda_items ai
CROSS JOIN public.speakers s
WHERE ai.event_id = '8b666936-1622-4d84-9787-3e95e54059b8'
  AND ai.title = 'Workshop: Mental Health & Wellness'
  AND s.name = 'Lisa Thompson'
  AND s.event_id = '8b666936-1622-4d84-9787-3e95e54059b8';

INSERT INTO public.agenda_item_speakers (agenda_item_id, speaker_id, role, sort_order)
SELECT ai.id, s.id, 'speaker', 0
FROM public.agenda_items ai
CROSS JOIN public.speakers s
WHERE ai.event_id = '8b666936-1622-4d84-9787-3e95e54059b8'
  AND ai.title = 'Alumni Mentorship Circles'
  AND s.name = 'James Williams'
  AND s.event_id = '8b666936-1622-4d84-9787-3e95e54059b8';

INSERT INTO public.agenda_item_speakers (agenda_item_id, speaker_id, role, sort_order)
SELECT ai.id, s.id, 'speaker', 0
FROM public.agenda_items ai
CROSS JOIN public.speakers s
WHERE ai.event_id = '8b666936-1622-4d84-9787-3e95e54059b8'
  AND ai.title = 'Keynote: Your First Gen Story'
  AND s.name = 'James Williams'
  AND s.event_id = '8b666936-1622-4d84-9787-3e95e54059b8';

INSERT INTO public.agenda_item_speakers (agenda_item_id, speaker_id, role, sort_order)
SELECT ai.id, s.id, 'speaker', 0
FROM public.agenda_items ai
CROSS JOIN public.speakers s
WHERE ai.event_id = '8b666936-1622-4d84-9787-3e95e54059b8'
  AND ai.title = 'Closing Ceremony'
  AND s.name = 'Dr. Sarah Chen'
  AND s.event_id = '8b666936-1622-4d84-9787-3e95e54059b8';