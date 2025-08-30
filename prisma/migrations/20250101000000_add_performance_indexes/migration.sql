-- Add performance indexes for result system optimization
-- Migration: 20250101000000_add_performance_indexes

-- Indexes for ExamResult table
-- Composite index for student results dashboard (userId + endTime for efficient sorting and pagination)
CREATE INDEX IF NOT EXISTS "exam_result_user_end_time_idx" ON "exam_result" ("userId", "endTime" DESC);

-- Index for exam rankings (examId + percentage for efficient ranking queries)
CREATE INDEX IF NOT EXISTS "exam_result_exam_percentage_idx" ON "exam_result" ("examId", "percentage" DESC, "score" DESC);

-- Index for analytics queries (examId for aggregation operations)
CREATE INDEX IF NOT EXISTS "exam_result_exam_id_idx" ON "exam_result" ("examId");

-- Index for college-wide analytics (examId + percentage for cross-exam analysis)
CREATE INDEX IF NOT EXISTS "exam_result_exam_percentage_only_idx" ON "exam_result" ("examId", "percentage");

-- Index for time-based queries (endTime for trend analysis and recent activity)
CREATE INDEX IF NOT EXISTS "exam_result_end_time_idx" ON "exam_result" ("endTime" DESC);

-- Index for user-specific analytics (userId for performance trends)
CREATE INDEX IF NOT EXISTS "exam_result_user_id_idx" ON "exam_result" ("userId");

-- Index for percentage-based filtering (percentage for distribution analysis)
CREATE INDEX IF NOT EXISTS "exam_result_percentage_idx" ON "exam_result" ("percentage");

-- Composite index for class performance analysis
CREATE INDEX IF NOT EXISTS "exam_result_exam_user_idx" ON "exam_result" ("examId", "userId");

-- Indexes for StudentAnswer table (if exists)
-- Index for answer analysis and grading
CREATE INDEX IF NOT EXISTS "student_answer_attempt_question_idx" ON "student_answer" ("attemptId", "questionId");

-- Index for answer correctness analysis
CREATE INDEX IF NOT EXISTS "student_answer_correctness_idx" ON "student_answer" ("isCorrect");

-- Index for time-based answer analysis
CREATE INDEX IF NOT EXISTS "student_answer_time_spent_idx" ON "student_answer" ("timeSpent");

-- Indexes for StudentExamAttempt table
-- Index for attempt status and completion tracking
CREATE INDEX IF NOT EXISTS "student_exam_attempt_user_exam_idx" ON "student_exam_attempt" ("userId", "examId");

-- Index for exam session management
CREATE INDEX IF NOT EXISTS "student_exam_attempt_exam_status_idx" ON "student_exam_attempt" ("examId", "status");

-- Index for time-based attempt analysis
CREATE INDEX IF NOT EXISTS "student_exam_attempt_started_at_idx" ON "student_exam_attempt" ("startedAt");

-- Index for completion analysis
CREATE INDEX IF NOT EXISTS "student_exam_attempt_completed_idx" ON "student_exam_attempt" ("isCompleted", "endedAt");

-- Indexes for Exam table
-- Index for exam listings and filtering
CREATE INDEX IF NOT EXISTS "exam_college_subject_idx" ON "exam" ("collegeId", "subjectId");

-- Index for class-specific exam queries
CREATE INDEX IF NOT EXISTS "exam_class_idx" ON "exam" ("classId");

-- Index for time-based exam queries
CREATE INDEX IF NOT EXISTS "exam_scheduled_date_idx" ON "exam" ("scheduledDate");

-- Index for active exam queries
CREATE INDEX IF NOT EXISTS "exam_status_idx" ON "exam" ("status");

-- Indexes for User table
-- Index for user search and filtering
CREATE INDEX IF NOT EXISTS "user_name_idx" ON "user" ("name");

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS "user_role_idx" ON "user" ("role");

-- Index for college-specific user queries
CREATE INDEX IF NOT EXISTS "user_college_idx" ON "user" ("collegeId");

-- Indexes for Question table
-- Index for question difficulty analysis
CREATE INDEX IF NOT EXISTS "question_difficulty_idx" ON "question" ("difficulty");

-- Index for subject-specific questions
CREATE INDEX IF NOT EXISTS "question_subject_idx" ON "question" ("subjectId");

-- Indexes for Subject table
-- Index for subject search
CREATE INDEX IF NOT EXISTS "subject_name_idx" ON "subject" ("name");

-- Index for college-specific subjects
CREATE INDEX IF NOT EXISTS "subject_college_idx" ON "subject" ("collegeId");

-- Indexes for Class table
-- Index for class search
CREATE INDEX IF NOT EXISTS "class_name_idx" ON "class" ("name");

-- Index for college-specific classes
CREATE INDEX IF NOT EXISTS "class_college_idx" ON "class" ("collegeId");

-- Indexes for College table
-- Index for college search
CREATE INDEX IF NOT EXISTS "college_name_idx" ON "college" ("name");

-- Index for active colleges
CREATE INDEX IF NOT EXISTS "college_active_idx" ON "college" ("isActive");

-- Indexes for GradeBoundary table (if exists)
CREATE INDEX IF NOT EXISTS "grade_boundary_college_min_percentage_idx" ON "grade_boundary" ("collegeId", "minPercentage");

CREATE INDEX IF NOT EXISTS "grade_boundary_default_idx" ON "grade_boundary" ("isDefault", "minPercentage");

-- Indexes for ActivityLog table (if exists)
CREATE INDEX IF NOT EXISTS "activity_log_user_timestamp_idx" ON "activity_log" ("userId", "timestamp" DESC);

CREATE INDEX IF NOT EXISTS "activity_log_action_idx" ON "activity_log" ("action");

-- Partial indexes for performance optimization
-- Index only completed results for analytics
CREATE INDEX IF NOT EXISTS "exam_result_completed_only_idx" ON "exam_result" ("examId", "percentage")
WHERE "isCompleted" = true;

-- Index only recent results (last 6 months) for trend analysis
CREATE INDEX IF NOT EXISTS "exam_result_recent_only_idx" ON "exam_result" ("userId", "endTime" DESC)
WHERE "endTime" > NOW() - INTERVAL '6 months';

-- Index only high-performing students for leaderboard queries
CREATE INDEX IF NOT EXISTS "exam_result_high_performers_idx" ON "exam_result" ("examId", "percentage" DESC, "score" DESC)
WHERE "percentage" >= 75;

-- Compound indexes for complex queries
-- Index for comprehensive analytics queries
CREATE INDEX IF NOT EXISTS "exam_result_analytics_idx" ON "exam_result" ("examId", "userId", "percentage", "endTime" DESC);

-- Index for intervention detection queries
CREATE INDEX IF NOT EXISTS "exam_result_intervention_idx" ON "exam_result" ("userId", "percentage", "endTime" DESC)
WHERE "percentage" < 50;

-- Index for performance comparison queries
CREATE INDEX IF NOT EXISTS "exam_result_comparison_idx" ON "exam_result" ("examId", "percentage" DESC, "score" DESC, "userId");

-- Add comments for documentation
COMMENT ON INDEX "exam_result_user_end_time_idx" IS 'Optimizes student results dashboard queries with pagination';
COMMENT ON INDEX "exam_result_exam_percentage_idx" IS 'Optimizes exam ranking and leaderboard queries';
COMMENT ON INDEX "exam_result_exam_id_idx" IS 'Optimizes analytics aggregation queries by exam';
COMMENT ON INDEX "exam_result_end_time_idx" IS 'Optimizes time-based trend analysis queries';
COMMENT ON INDEX "exam_result_user_id_idx" IS 'Optimizes user-specific performance trend queries';
COMMENT ON INDEX "exam_result_percentage_idx" IS 'Optimizes performance distribution analysis';
COMMENT ON INDEX "exam_result_exam_user_idx" IS 'Optimizes individual student performance queries';
COMMENT ON INDEX "student_exam_attempt_user_exam_idx" IS 'Optimizes exam attempt queries for students';
COMMENT ON INDEX "exam_college_subject_idx" IS 'Optimizes exam filtering by college and subject';
COMMENT ON INDEX "user_role_idx" IS 'Optimizes role-based user queries';
COMMENT ON INDEX "exam_result_completed_only_idx" IS 'Partial index for completed results analytics';
COMMENT ON INDEX "exam_result_recent_only_idx" IS 'Partial index for recent performance trend analysis';
COMMENT ON INDEX "exam_result_high_performers_idx" IS 'Partial index for leaderboard queries';
