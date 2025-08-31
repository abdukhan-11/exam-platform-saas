-- RLS policies for multi-tenant isolation (Supabase/Postgres)
-- Requirements:
-- - SUPER_ADMIN: full access to all rows
-- - COLLEGE_ADMIN/STUDENT: only rows where "collegeId" = user's college_id claim
-- - Do NOT change table structures

-- Helper schema and functions to read JWT claims
create schema if not exists app;

create or replace function app.current_role()
returns text
stable
language sql
as $$
  select coalesce(auth.jwt() ->> 'app_role', '')::text;
$$;

create or replace function app.current_college_id()
returns text
stable
language sql
as $$
  select coalesce(auth.jwt() ->> 'college_id', '')::text;
$$;

-- Utility macro: condition for tenant access
-- SUPER_ADMIN bypass OR row.collegeId = current_college_id()

-- Enable RLS and policies per table

-- 1) "user" table (special case: restrict non-super_admin rows by college; super admin sees all)
alter table "user" enable row level security;

drop policy if exists user_select on "user";
create policy user_select on "user"
for select
using (
  app.current_role() = 'SUPER_ADMIN'
  or (role <> 'SUPER_ADMIN' and "collegeId" = app.current_college_id())
);

drop policy if exists user_insert on "user";
create policy user_insert on "user"
for insert
with check (
  app.current_role() = 'SUPER_ADMIN'
  or (role <> 'SUPER_ADMIN' and "collegeId" = app.current_college_id())
);

drop policy if exists user_update on "user";
create policy user_update on "user"
for update
using (
  app.current_role() = 'SUPER_ADMIN'
  or (role <> 'SUPER_ADMIN' and "collegeId" = app.current_college_id())
)
with check (
  app.current_role() = 'SUPER_ADMIN'
  or (role <> 'SUPER_ADMIN' and "collegeId" = app.current_college_id())
);

drop policy if exists user_delete on "user";
create policy user_delete on "user"
for delete
using (
  app.current_role() = 'SUPER_ADMIN'
  or (role <> 'SUPER_ADMIN' and "collegeId" = app.current_college_id())
);

-- 2) "class"
alter table "class" enable row level security;
drop policy if exists class_select on "class";
create policy class_select on "class" for select using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists class_insert on "class";
create policy class_insert on "class" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists class_update on "class";
create policy class_update on "class" for update using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
) with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists class_delete on "class";
create policy class_delete on "class" for delete using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);

-- 3) "subject"
alter table "subject" enable row level security;
drop policy if exists subject_select on "subject";
create policy subject_select on "subject" for select using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists subject_insert on "subject";
create policy subject_insert on "subject" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists subject_update on "subject";
create policy subject_update on "subject" for update using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
) with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists subject_delete on "subject";
create policy subject_delete on "subject" for delete using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);

-- 4) "exam"
alter table "exam" enable row level security;
drop policy if exists exam_select on "exam";
create policy exam_select on "exam" for select using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists exam_insert on "exam";
create policy exam_insert on "exam" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists exam_update on "exam";
create policy exam_update on "exam" for update using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
) with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists exam_delete on "exam";
create policy exam_delete on "exam" for delete using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);

-- 5) "question" (via exam.collegeId)
alter table "question" enable row level security;
drop policy if exists question_select on "question";
create policy question_select on "question" for select using (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "exam" e where e.id = "question"."examId" and e."collegeId" = app.current_college_id()
  )
);
drop policy if exists question_insert on "question";
create policy question_insert on "question" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "exam" e where e.id = "question"."examId" and e."collegeId" = app.current_college_id()
  )
);
drop policy if exists question_update on "question";
create policy question_update on "question" for update using (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "exam" e where e.id = "question"."examId" and e."collegeId" = app.current_college_id()
  )
) with check (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "exam" e where e.id = "question"."examId" and e."collegeId" = app.current_college_id()
  )
);
drop policy if exists question_delete on "question";
create policy question_delete on "question" for delete using (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "exam" e where e.id = "question"."examId" and e."collegeId" = app.current_college_id()
  )
);

-- 6) "question_option" (via question -> exam)
alter table "question_option" enable row level security;
drop policy if exists question_option_select on "question_option";
create policy question_option_select on "question_option" for select using (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1
    from "question" q
    join "exam" e on e.id = q."examId"
    where q.id = "question_option"."questionId"
      and e."collegeId" = app.current_college_id()
  )
);
drop policy if exists question_option_insert on "question_option";
create policy question_option_insert on "question_option" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1
    from "question" q
    join "exam" e on e.id = q."examId"
    where q.id = "question_option"."questionId"
      and e."collegeId" = app.current_college_id()
  )
);
drop policy if exists question_option_update on "question_option";
create policy question_option_update on "question_option" for update using (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1
    from "question" q
    join "exam" e on e.id = q."examId"
    where q.id = "question_option"."questionId"
      and e."collegeId" = app.current_college_id()
  )
) with check (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1
    from "question" q
    join "exam" e on e.id = q."examId"
    where q.id = "question_option"."questionId"
      and e."collegeId" = app.current_college_id()
  )
);
drop policy if exists question_option_delete on "question_option";
create policy question_option_delete on "question_option" for delete using (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1
    from "question" q
    join "exam" e on e.id = q."examId"
    where q.id = "question_option"."questionId"
      and e."collegeId" = app.current_college_id()
  )
);

-- 7) "student_profile"
alter table "student_profile" enable row level security;
drop policy if exists student_profile_select on "student_profile";
create policy student_profile_select on "student_profile" for select using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists student_profile_insert on "student_profile";
create policy student_profile_insert on "student_profile" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists student_profile_update on "student_profile";
create policy student_profile_update on "student_profile" for update using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
) with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists student_profile_delete on "student_profile";
create policy student_profile_delete on "student_profile" for delete using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);

-- 8) "enrollment" (via class.collegeId)
alter table "enrollment" enable row level security;
drop policy if exists enrollment_select on "enrollment";
create policy enrollment_select on "enrollment" for select using (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "class" c where c.id = "enrollment"."classId" and c."collegeId" = app.current_college_id()
  )
);
drop policy if exists enrollment_insert on "enrollment";
create policy enrollment_insert on "enrollment" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "class" c where c.id = "enrollment"."classId" and c."collegeId" = app.current_college_id()
  )
);
drop policy if exists enrollment_update on "enrollment";
create policy enrollment_update on "enrollment" for update using (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "class" c where c.id = "enrollment"."classId" and c."collegeId" = app.current_college_id()
  )
) with check (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "class" c where c.id = "enrollment"."classId" and c."collegeId" = app.current_college_id()
  )
);
drop policy if exists enrollment_delete on "enrollment";
create policy enrollment_delete on "enrollment" for delete using (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "class" c where c.id = "enrollment"."classId" and c."collegeId" = app.current_college_id()
  )
);

-- 9) "teacher_class_assignment" (via class.collegeId)
alter table "teacher_class_assignment" enable row level security;
drop policy if exists tca_select on "teacher_class_assignment";
create policy tca_select on "teacher_class_assignment" for select using (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "class" c where c.id = "teacher_class_assignment"."classId" and c."collegeId" = app.current_college_id()
  )
);
drop policy if exists tca_insert on "teacher_class_assignment";
create policy tca_insert on "teacher_class_assignment" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "class" c where c.id = "teacher_class_assignment"."classId" and c."collegeId" = app.current_college_id()
  )
);
drop policy if exists tca_update on "teacher_class_assignment";
create policy tca_update on "teacher_class_assignment" for update using (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "class" c where c.id = "teacher_class_assignment"."classId" and c."collegeId" = app.current_college_id()
  )
) with check (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "class" c where c.id = "teacher_class_assignment"."classId" and c."collegeId" = app.current_college_id()
  )
);
drop policy if exists tca_delete on "teacher_class_assignment";
create policy tca_delete on "teacher_class_assignment" for delete using (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "class" c where c.id = "teacher_class_assignment"."classId" and c."collegeId" = app.current_college_id()
  )
);

-- 10) "student_exam_attempt"
alter table "student_exam_attempt" enable row level security;
drop policy if exists sea_select on "student_exam_attempt";
create policy sea_select on "student_exam_attempt" for select using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists sea_insert on "student_exam_attempt";
create policy sea_insert on "student_exam_attempt" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists sea_update on "student_exam_attempt";
create policy sea_update on "student_exam_attempt" for update using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
) with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists sea_delete on "student_exam_attempt";
create policy sea_delete on "student_exam_attempt" for delete using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);

-- 11) "student_answer"
alter table "student_answer" enable row level security;
drop policy if exists sa_select on "student_answer";
create policy sa_select on "student_answer" for select using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists sa_insert on "student_answer";
create policy sa_insert on "student_answer" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists sa_update on "student_answer";
create policy sa_update on "student_answer" for update using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
) with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists sa_delete on "student_answer";
create policy sa_delete on "student_answer" for delete using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);

-- 12) "exam_result" (via exam.collegeId)
alter table "exam_result" enable row level security;
drop policy if exists exam_result_select on "exam_result";
create policy exam_result_select on "exam_result" for select using (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "exam" e where e.id = "exam_result"."examId" and e."collegeId" = app.current_college_id()
  )
);
drop policy if exists exam_result_insert on "exam_result";
create policy exam_result_insert on "exam_result" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "exam" e where e.id = "exam_result"."examId" and e."collegeId" = app.current_college_id()
  )
);
drop policy if exists exam_result_update on "exam_result";
create policy exam_result_update on "exam_result" for update using (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "exam" e where e.id = "exam_result"."examId" and e."collegeId" = app.current_college_id()
  )
) with check (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "exam" e where e.id = "exam_result"."examId" and e."collegeId" = app.current_college_id()
  )
);
drop policy if exists exam_result_delete on "exam_result";
create policy exam_result_delete on "exam_result" for delete using (
  app.current_role() = 'SUPER_ADMIN' or exists (
    select 1 from "exam" e where e.id = "exam_result"."examId" and e."collegeId" = app.current_college_id()
  )
);

-- 13) "event"
alter table "event" enable row level security;
drop policy if exists event_select on "event";
create policy event_select on "event" for select using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists event_insert on "event";
create policy event_insert on "event" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists event_update on "event";
create policy event_update on "event" for update using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
) with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists event_delete on "event";
create policy event_delete on "event" for delete using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);

-- 14) "notification"
alter table "notification" enable row level security;
drop policy if exists notification_select on "notification";
create policy notification_select on "notification" for select using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists notification_insert on "notification";
create policy notification_insert on "notification" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists notification_update on "notification";
create policy notification_update on "notification" for update using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
) with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists notification_delete on "notification";
create policy notification_delete on "notification" for delete using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);

-- 15) "event_subscription"
alter table "event_subscription" enable row level security;
drop policy if exists event_subscription_select on "event_subscription";
create policy event_subscription_select on "event_subscription" for select using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists event_subscription_insert on "event_subscription";
create policy event_subscription_insert on "event_subscription" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists event_subscription_update on "event_subscription";
create policy event_subscription_update on "event_subscription" for update using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
) with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists event_subscription_delete on "event_subscription";
create policy event_subscription_delete on "event_subscription" for delete using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);

-- 16) "event_reminder"
alter table "event_reminder" enable row level security;
drop policy if exists event_reminder_select on "event_reminder";
create policy event_reminder_select on "event_reminder" for select using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists event_reminder_insert on "event_reminder";
create policy event_reminder_insert on "event_reminder" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists event_reminder_update on "event_reminder";
create policy event_reminder_update on "event_reminder" for update using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
) with check (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);
drop policy if exists event_reminder_delete on "event_reminder";
create policy event_reminder_delete on "event_reminder" for delete using (
  app.current_role() = 'SUPER_ADMIN' or "collegeId" = app.current_college_id()
);

-- 17) "email_log" (nullable collegeId => visible only to SUPER_ADMIN if null)
alter table "email_log" enable row level security;
drop policy if exists email_log_select on "email_log";
create policy email_log_select on "email_log" for select using (
  app.current_role() = 'SUPER_ADMIN' or ("collegeId" is not null and "collegeId" = app.current_college_id())
);
drop policy if exists email_log_insert on "email_log";
create policy email_log_insert on "email_log" for insert with check (
  app.current_role() = 'SUPER_ADMIN' or ("collegeId" is not null and "collegeId" = app.current_college_id())
);
drop policy if exists email_log_update on "email_log";
create policy email_log_update on "email_log" for update using (
  app.current_role() = 'SUPER_ADMIN' or ("collegeId" is not null and "collegeId" = app.current_college_id())
) with check (
  app.current_role() = 'SUPER_ADMIN' or ("collegeId" is not null and "collegeId" = app.current_college_id())
);
drop policy if exists email_log_delete on "email_log";
create policy email_log_delete on "email_log" for delete using (
  app.current_role() = 'SUPER_ADMIN' or ("collegeId" is not null and "collegeId" = app.current_college_id())
);

-- Note: Other tables (e.g., refresh_token, recovery_request, user_invitation, activity_log, grade_boundary)
-- were not requested. Add similar policies if tenant isolation is required for them as well.


