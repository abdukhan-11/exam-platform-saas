-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY');

-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('EXAM', 'ASSIGNMENT', 'ANNOUNCEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateTable
CREATE TABLE "super_admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "college" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Pakistan',
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIAL',
    "subscriptionExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "college_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "collegeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "collegeId" TEXT NOT NULL,
    "classId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "academicYear" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "passingMarks" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "subjectId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "classId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enableQuestionShuffling" BOOLEAN NOT NULL DEFAULT true,
    "enableTimeLimitPerQuestion" BOOLEAN NOT NULL DEFAULT false,
    "timeLimitPerQuestion" INTEGER,
    "enableBrowserLock" BOOLEAN NOT NULL DEFAULT true,
    "enableFullscreenMode" BOOLEAN NOT NULL DEFAULT true,
    "enableWebcamMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "enableScreenRecording" BOOLEAN NOT NULL DEFAULT false,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "allowRetakes" BOOLEAN NOT NULL DEFAULT false,
    "retakeDelayHours" INTEGER NOT NULL DEFAULT 24,

    CONSTRAINT "exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "options" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "marks" INTEGER NOT NULL,
    "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "explanation" TEXT,
    "examId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_option" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "question_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_result" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_class_assignment" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "teacher_class_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "rollNo" TEXT NOT NULL,
    "fatherName" TEXT,
    "motherName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "address" TEXT,
    "phone" TEXT,
    "profileImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_exam_attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "score" INTEGER NOT NULL DEFAULT 0,
    "totalMarks" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "browserFingerprint" TEXT,
    "suspiciousActivity" BOOLEAN NOT NULL DEFAULT false,
    "activityLog" TEXT,
    "violationCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "student_exam_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_answer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "answerText" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "marksAwarded" INTEGER NOT NULL DEFAULT 0,
    "timeSpent" INTEGER,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "EventType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "collegeId" TEXT NOT NULL,
    "classId" TEXT,
    "subjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "super_admin_email_key" ON "super_admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "college_code_key" ON "college"("code");

-- CreateIndex
CREATE INDEX "college_isActive_idx" ON "college"("isActive");

-- CreateIndex
CREATE INDEX "college_subscriptionStatus_idx" ON "college"("subscriptionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_collegeId_idx" ON "user"("collegeId");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE INDEX "user_isActive_idx" ON "user"("isActive");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subject_collegeId_code_key" ON "subject"("collegeId", "code");

-- CreateIndex
CREATE INDEX "subject_collegeId_idx" ON "subject"("collegeId");

-- CreateIndex
CREATE INDEX "subject_classId_idx" ON "subject"("classId");

-- CreateIndex
CREATE INDEX "subject_isActive_idx" ON "subject"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "class_collegeId_name_academicYear_key" ON "class"("collegeId", "name", "academicYear");

-- CreateIndex
CREATE INDEX "class_collegeId_idx" ON "class"("collegeId");

-- CreateIndex
CREATE INDEX "class_academicYear_idx" ON "class"("academicYear");

-- CreateIndex
CREATE INDEX "exam_collegeId_idx" ON "exam"("collegeId");

-- CreateIndex
CREATE INDEX "exam_subjectId_idx" ON "exam"("subjectId");

-- CreateIndex
CREATE INDEX "exam_classId_idx" ON "exam"("classId");

-- CreateIndex
CREATE INDEX "exam_startTime_idx" ON "exam"("startTime");

-- CreateIndex
CREATE INDEX "exam_endTime_idx" ON "exam"("endTime");

-- CreateIndex
CREATE INDEX "exam_isActive_idx" ON "exam"("isActive");

-- CreateIndex
CREATE INDEX "exam_isPublished_idx" ON "exam"("isPublished");

-- CreateIndex
CREATE INDEX "question_examId_idx" ON "question"("examId");

-- CreateIndex
CREATE INDEX "question_type_idx" ON "question"("type");

-- CreateIndex
CREATE INDEX "question_difficulty_idx" ON "question"("difficulty");

-- CreateIndex
CREATE INDEX "question_option_questionId_idx" ON "question_option"("questionId");

-- CreateIndex
CREATE INDEX "question_option_isCorrect_idx" ON "question_option"("isCorrect");

-- CreateIndex
CREATE UNIQUE INDEX "exam_result_userId_examId_key" ON "exam_result"("userId", "examId");

-- CreateIndex
CREATE INDEX "exam_result_userId_idx" ON "exam_result"("userId");

-- CreateIndex
CREATE INDEX "exam_result_examId_idx" ON "exam_result"("examId");

-- CreateIndex
CREATE INDEX "exam_result_score_idx" ON "exam_result"("score");

-- CreateIndex
CREATE INDEX "exam_result_percentage_idx" ON "exam_result"("percentage");

-- CreateIndex
CREATE INDEX "exam_result_isCompleted_idx" ON "exam_result"("isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_userId_classId_key" ON "enrollment"("userId", "classId");

-- CreateIndex
CREATE INDEX "enrollment_userId_idx" ON "enrollment"("userId");

-- CreateIndex
CREATE INDEX "enrollment_classId_idx" ON "enrollment"("classId");

-- CreateIndex
CREATE INDEX "enrollment_status_idx" ON "enrollment"("status");

-- CreateIndex
CREATE INDEX "enrollment_enrollmentDate_idx" ON "enrollment"("enrollmentDate");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_class_assignment_teacherId_classId_subjectId_key" ON "teacher_class_assignment"("teacherId", "classId", "subjectId");

-- CreateIndex
CREATE INDEX "teacher_class_assignment_teacherId_idx" ON "teacher_class_assignment"("teacherId");

-- CreateIndex
CREATE INDEX "teacher_class_assignment_classId_idx" ON "teacher_class_assignment"("classId");

-- CreateIndex
CREATE INDEX "teacher_class_assignment_subjectId_idx" ON "teacher_class_assignment"("subjectId");

-- CreateIndex
CREATE INDEX "teacher_class_assignment_isActive_idx" ON "teacher_class_assignment"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "student_profile_userId_key" ON "student_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "student_profile_collegeId_rollNo_key" ON "student_profile"("collegeId", "rollNo");

-- CreateIndex
CREATE INDEX "student_profile_collegeId_idx" ON "student_profile"("collegeId");

-- CreateIndex
CREATE INDEX "student_profile_rollNo_idx" ON "student_profile"("rollNo");

-- CreateIndex
CREATE INDEX "student_profile_gender_idx" ON "student_profile"("gender");

-- CreateIndex
CREATE UNIQUE INDEX "student_exam_attempt_userId_examId_key" ON "student_exam_attempt"("userId", "examId");

-- CreateIndex
CREATE INDEX "student_exam_attempt_userId_idx" ON "student_exam_attempt"("userId");

-- CreateIndex
CREATE INDEX "student_exam_attempt_examId_idx" ON "student_exam_attempt"("examId");

-- CreateIndex
CREATE INDEX "student_exam_attempt_startedAt_idx" ON "student_exam_attempt"("startedAt");

-- CreateIndex
CREATE INDEX "student_exam_attempt_endedAt_idx" ON "student_exam_attempt"("endedAt");

-- CreateIndex
CREATE INDEX "student_exam_attempt_score_idx" ON "student_exam_attempt"("score");

-- CreateIndex
CREATE INDEX "student_exam_attempt_isCompleted_idx" ON "student_exam_attempt"("isCompleted");

-- CreateIndex
CREATE INDEX "student_exam_attempt_suspiciousActivity_idx" ON "student_exam_attempt"("suspiciousActivity");

-- CreateIndex
CREATE INDEX "student_exam_attempt_violationCount_idx" ON "student_exam_attempt"("violationCount");

-- CreateIndex
CREATE UNIQUE INDEX "student_answer_attemptId_questionId_key" ON "student_answer"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "student_answer_attemptId_idx" ON "student_answer"("attemptId");

-- CreateIndex
CREATE INDEX "student_answer_questionId_idx" ON "student_answer"("questionId");

-- CreateIndex
CREATE INDEX "student_answer_isCorrect_idx" ON "student_answer"("isCorrect");

-- CreateIndex
CREATE INDEX "student_answer_marksAwarded_idx" ON "student_answer"("marksAwarded");

-- CreateIndex
CREATE INDEX "student_answer_answeredAt_idx" ON "student_answer"("answeredAt");

-- CreateIndex
CREATE INDEX "event_collegeId_idx" ON "event"("collegeId");

-- CreateIndex
CREATE INDEX "event_classId_idx" ON "event"("classId");

-- CreateIndex
CREATE INDEX "event_subjectId_idx" ON "event"("subjectId");

-- CreateIndex
CREATE INDEX "event_scheduledAt_idx" ON "event"("scheduledAt");

-- CreateIndex
CREATE INDEX "event_type_idx" ON "event"("type");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_key" ON "refresh_token"("token");

-- CreateIndex
CREATE INDEX "refresh_token_userId_idx" ON "refresh_token"("userId");

-- CreateIndex
CREATE INDEX "refresh_token_token_idx" ON "refresh_token"("token");

-- CreateIndex
CREATE INDEX "refresh_token_expiresAt_idx" ON "refresh_token"("expiresAt");

-- CreateIndex
CREATE INDEX "refresh_token_revoked_idx" ON "refresh_token"("revoked");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "college"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "college"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class" ADD CONSTRAINT "class_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "college"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam" ADD CONSTRAINT "exam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam" ADD CONSTRAINT "exam_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "college"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam" ADD CONSTRAINT "exam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_option" ADD CONSTRAINT "question_option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_result" ADD CONSTRAINT "exam_result_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_result" ADD CONSTRAINT "exam_result_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_class_assignment" ADD CONSTRAINT "teacher_class_assignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_class_assignment" ADD CONSTRAINT "teacher_class_assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_class_assignment" ADD CONSTRAINT "teacher_class_assignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profile" ADD CONSTRAINT "student_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profile" ADD CONSTRAINT "student_profile_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "college"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_exam_attempt" ADD CONSTRAINT "student_exam_attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_exam_attempt" ADD CONSTRAINT "student_exam_attempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_answer" ADD CONSTRAINT "student_answer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "student_exam_attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_answer" ADD CONSTRAINT "student_answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_answer" ADD CONSTRAINT "student_answer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "question_option"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "college"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
