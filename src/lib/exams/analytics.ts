import { Exam, ExamResult, StudentExamAttempt, StudentAnswer, Question } from '@prisma/client'

export interface ExamAnalyticsSummary {
  examId: string
  participants: number
  completed: number
  completionRate: number // 0-1
  averageScore: number
  averagePercentage: number
  averageCompletionTimeSec: number
  scoreDistribution: { bucket: string; count: number }[]
  questionDifficultyBreakdown: { difficulty: string; count: number }[]
  questionAccuracy: { questionId: string; accuracy: number }[]
}

export function computeCompletionRate(attempts: Pick<StudentExamAttempt, 'isCompleted'>[]): number {
  if (attempts.length === 0) return 0
  const completed = attempts.filter(a => a.isCompleted).length
  return completed / attempts.length
}

export function computeAverage<T>(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function bucketizePercentages(percentages: number[]): { bucket: string; count: number }[] {
  const buckets = [
    { label: '0-10', min: 0, max: 10 },
    { label: '10-20', min: 10, max: 20 },
    { label: '20-30', min: 20, max: 30 },
    { label: '30-40', min: 30, max: 40 },
    { label: '40-50', min: 40, max: 50 },
    { label: '50-60', min: 50, max: 60 },
    { label: '60-70', min: 60, max: 70 },
    { label: '70-80', min: 70, max: 80 },
    { label: '80-90', min: 80, max: 90 },
    { label: '90-100', min: 90, max: 100.0001 },
  ]
  return buckets.map(b => ({
    bucket: b.label,
    count: percentages.filter(p => p >= b.min && p < b.max).length,
  }))
}

export function computeQuestionAccuracy(
  answers: Pick<StudentAnswer, 'questionId' | 'isCorrect'>[]
): { questionId: string; accuracy: number }[] {
  const byQuestion = new Map<string, { total: number; correct: number }>()
  for (const a of answers) {
    const prev = byQuestion.get(a.questionId) || { total: 0, correct: 0 }
    prev.total += 1
    if (a.isCorrect) prev.correct += 1
    byQuestion.set(a.questionId, prev)
  }
  return Array.from(byQuestion.entries()).map(([questionId, { total, correct }]) => ({
    questionId,
    accuracy: total === 0 ? 0 : correct / total,
  }))
}

export function computeDifficultyBreakdown(
  questions: Pick<Question, 'difficulty'>[]
): { difficulty: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const q of questions) {
    const key = String(q.difficulty)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return Array.from(counts.entries()).map(([difficulty, count]) => ({ difficulty, count }))
}

export function buildExamAnalyticsSummary(params: {
  exam: Exam
  results: Pick<ExamResult, 'score' | 'totalMarks' | 'percentage' | 'startTime' | 'endTime' | 'isCompleted'>[]
  attempts: Pick<StudentExamAttempt, 'isCompleted'>[]
  answers: Pick<StudentAnswer, 'questionId' | 'isCorrect'>[]
  questions: Pick<Question, 'difficulty' | 'id'>[]
}): ExamAnalyticsSummary {
  const { exam, results, attempts, answers, questions } = params
  const participants = attempts.length
  const completed = attempts.filter(a => a.isCompleted).length
  const completionRate = computeCompletionRate(attempts)

  const scores = results.map(r => r.score)
  const percentages = results.map(r => r.percentage)

  const averageScore = computeAverage(scores)
  const averagePercentage = computeAverage(percentages)

  const completionTimes = results
    .filter(r => r.endTime)
    .map(r => (new Date(r.endTime as Date).getTime() - new Date(r.startTime).getTime()) / 1000)
  const averageCompletionTimeSec = computeAverage(completionTimes)

  const scoreDistribution = bucketizePercentages(percentages)
  const questionAccuracy = computeQuestionAccuracy(answers)
  const questionDifficultyBreakdown = computeDifficultyBreakdown(questions)

  return {
    examId: exam.id,
    participants,
    completed,
    completionRate,
    averageScore,
    averagePercentage,
    averageCompletionTimeSec,
    scoreDistribution,
    questionDifficultyBreakdown,
    questionAccuracy,
  }
}


