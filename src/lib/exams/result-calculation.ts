import { db } from '@/lib/db'
import { resolveGradeByPercentage } from '@/lib/exams/grading'

export interface CalculateResultParams {
  userId: string
  examId: string
}

export interface CalculatedResult {
  score: number
  totalMarks: number
  percentage: number
  grade: string
}

/**
 * Computes score, total, percentage and grade for a completed attempt.
 * - Uses StudentAnswer.isCorrect / marksAwarded when present;
 * - Otherwise derives correctness by comparing selectedOption to QuestionOption.isCorrect.
 */
export async function calculateExamResult(params: CalculateResultParams): Promise<CalculatedResult> {
  const { userId, examId } = params

  // Load attempt with answers and exam questions
  const attempt = await db.studentExamAttempt.findUnique({
    where: { userId_examId: { userId, examId } },
    include: {
      answers: {
        include: {
          selectedOption: true,
          question: { select: { id: true, marks: true } },
        },
      },
      exam: {
        select: { id: true, totalMarks: true, collegeId: true },
      },
    },
  })

  if (!attempt) {
    throw new Error('Attempt not found for calculation')
  }

  // Total marks from exam definition (fallback to sum of question marks if missing)
  let totalMarks = attempt.exam.totalMarks
  if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
    const qs = await db.question.findMany({ where: { examId }, select: { marks: true } })
    totalMarks = qs.reduce((s, q) => s + (q.marks || 0), 0)
  }

  // Aggregate score
  let score = 0
  for (const a of attempt.answers) {
    if (typeof a.marksAwarded === 'number' && a.marksAwarded > 0) {
      score += a.marksAwarded
      continue
    }

    // Derive correctness for MCQ if not precomputed
    const questionMarks = a.question?.marks ?? 0
    const isCorrect = !!a.selectedOption?.isCorrect || a.isCorrect
    if (isCorrect) score += questionMarks
  }

  // Clamp score
  if (score < 0) score = 0
  if (totalMarks > 0 && score > totalMarks) score = totalMarks

  const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0

  const { grade } = await resolveGradeByPercentage(percentage, attempt.exam.collegeId)

  return { score, totalMarks, percentage, grade }
}


