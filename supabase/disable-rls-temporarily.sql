-- Temporarily disable Row-Level Security (RLS) on tenant-scoped tables
-- Use this only for development/testing with application-level isolation

alter table "user" disable row level security;
alter table "class" disable row level security;
alter table "subject" disable row level security;
alter table "exam" disable row level security;
alter table "question" disable row level security;
alter table "question_option" disable row level security;
alter table "student_profile" disable row level security;
alter table "enrollment" disable row level security;
alter table "teacher_class_assignment" disable row level security;
alter table "student_exam_attempt" disable row level security;
alter table "student_answer" disable row level security;
alter table "exam_result" disable row level security;
alter table "event" disable row level security;
alter table "notification" disable row level security;
alter table "event_subscription" disable row level security;
alter table "event_reminder" disable row level security;
alter table "email_log" disable row level security;

-- Note: Keep this script out of production. Re-enable RLS before launch.

