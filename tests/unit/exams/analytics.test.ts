import { computeCompletionRate, computeAverage, bucketizePercentages, computeQuestionAccuracy, computeDifficultyBreakdown, buildExamAnalyticsSummary } from '@/lib/exams/analytics'

describe('exam analytics utilities', () => {
  test('computeCompletionRate handles empty and mixed', () => {
    expect(computeCompletionRate([])).toBe(0)
    expect(computeCompletionRate([{ isCompleted: false } as any])).toBe(0)
    expect(computeCompletionRate([{ isCompleted: true } as any])).toBe(1)
    expect(computeCompletionRate([{ isCompleted: true } as any, { isCompleted: false } as any])).toBe(0.5)
  })

  test('computeAverage works', () => {
    expect(computeAverage([])).toBe(0)
    expect(computeAverage([10])).toBe(10)
    expect(computeAverage([10, 20, 30])).toBe(20)
  })

  test('bucketizePercentages groups correctly', () => {
    const dist = bucketizePercentages([5, 15, 25, 95])
    const zeroTen = dist.find(d => d.bucket === '0-10')
    const tenTwenty = dist.find(d => d.bucket === '10-20')
    const twentyThirty = dist.find(d => d.bucket === '20-30')
    const ninetyHundred = dist.find(d => d.bucket === '90-100')
    expect(zeroTen?.count).toBe(1)
    expect(tenTwenty?.count).toBe(1)
    expect(twentyThirty?.count).toBe(1)
    expect(ninetyHundred?.count).toBe(1)
  })

  test('computeQuestionAccuracy aggregates by question', () => {
    const acc = computeQuestionAccuracy([
      { questionId: 'q1', isCorrect: true } as any,
      { questionId: 'q1', isCorrect: false } as any,
      { questionId: 'q2', isCorrect: true } as any,
    ])
    const q1 = acc.find(a => a.questionId === 'q1')
    const q2 = acc.find(a => a.questionId === 'q2')
    expect(q1?.accuracy).toBe(0.5)
    expect(q2?.accuracy).toBe(1)
  })

  test('computeDifficultyBreakdown counts by difficulty', () => {
    const breakdown = computeDifficultyBreakdown([
      { difficulty: 'EASY' } as any,
      { difficulty: 'MEDIUM' } as any,
      { difficulty: 'MEDIUM' } as any,
    ])
    expect(breakdown.find(b => b.difficulty === 'EASY')?.count).toBe(1)
    expect(breakdown.find(b => b.difficulty === 'MEDIUM')?.count).toBe(2)
  })

  test('buildExamAnalyticsSummary computes key fields', () => {
    const summary = buildExamAnalyticsSummary({
      exam: { id: 'e1' } as any,
      results: [
        { score: 80, totalMarks: 100, percentage: 80, startTime: new Date(), endTime: new Date(), isCompleted: true },
        { score: 60, totalMarks: 100, percentage: 60, startTime: new Date(), endTime: new Date(), isCompleted: true },
      ] as any,
      attempts: [{ isCompleted: true }, { isCompleted: false }] as any,
      answers: [
        { questionId: 'q1', isCorrect: true },
        { questionId: 'q1', isCorrect: false },
      ] as any,
      questions: [
        { id: 'q1', difficulty: 'EASY' },
        { id: 'q2', difficulty: 'MEDIUM' },
      ] as any,
    })
    expect(summary.examId).toBe('e1')
    expect(summary.participants).toBe(2)
    expect(summary.completed).toBe(1)
    expect(summary.completionRate).toBe(0.5)
    expect(summary.averageScore).toBe(70)
    expect(summary.averagePercentage).toBe(70)
    expect(Array.isArray(summary.scoreDistribution)).toBe(true)
    expect(Array.isArray(summary.questionAccuracy)).toBe(true)
  })
})


