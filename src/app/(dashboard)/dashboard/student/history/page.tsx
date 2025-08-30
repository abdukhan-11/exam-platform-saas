'use client'

import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
const VirtualizedList = dynamic(() => import('@/components/shared/VirtualizedList'), { ssr: false })
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const PerformanceCharts = dynamic(() => import('@/components/student/PerformanceCharts'), { ssr: false })

type ResultItem = {
  id: string
  examId: string
  examTitle: string
  subjectId: string
  subjectName: string
  subjectCode: string | null
  date: string | Date
  score: number
  totalMarks: number
  percentage: number
  timeTakenSec: number | null
  isCompleted: boolean
  classAveragePercentage: number | null
}

type SubjectAnalytics = { subjectId: string; subjectName: string; correct: number; incorrect: number; accuracy: number }

type SortKey = 'date' | 'percentage' | 'score' | 'subject'

export default function StudentExamHistoryPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ResultItem[]>([])
  const [subjectAnalytics, setSubjectAnalytics] = useState<SubjectAnalytics[]>([])
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [query, setQuery] = useState('')
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null)
  const [expandedLoading, setExpandedLoading] = useState(false)
  const [expandedError, setExpandedError] = useState<string | null>(null)
  const [expandedDetails, setExpandedDetails] = useState<Array<{
    questionId: string
    questionText: string
    difficulty: string
    marks: number
    isCorrect: boolean
    marksAwarded: number
    timeSpentSec: number | null
  }> | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/results/personal', { cache: 'no-store' })
        const json = await res.json()
        setItems(json.items || [])
        setSubjectAnalytics(json.subjectAnalytics || [])
      } catch (e: any) {
        setError(e?.message || 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const subjects = useMemo(() => {
    const m = new Map<string, string>()
    items.forEach(i => m.set(i.subjectId, i.subjectName))
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }))
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list0 = subjectFilter === 'all' ? items : items.filter(i => i.subjectId === subjectFilter)
    const list = q ? list0.filter(i => `${i.examTitle} ${i.subjectName}`.toLowerCase().includes(q)) : list0
    const sorted = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'date': {
          const ad = new Date(a.date).getTime(); const bd = new Date(b.date).getTime()
          return sortDir === 'asc' ? ad - bd : bd - ad
        }
        case 'percentage':
          return sortDir === 'asc' ? a.percentage - b.percentage : b.percentage - a.percentage
        case 'score':
          return sortDir === 'asc' ? a.score - b.score : b.score - a.score
        case 'subject':
          return sortDir === 'asc' ? a.subjectName.localeCompare(b.subjectName) : b.subjectName.localeCompare(a.subjectName)
        default:
          return 0
      }
    })
    return sorted
  }, [items, subjectFilter, sortKey, sortDir, query])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const onToggleExpand = async (examId: string) => {
    if (expandedExamId === examId) {
      setExpandedExamId(null)
      setExpandedDetails(null)
      setExpandedError(null)
      return
    }
    setExpandedExamId(examId)
    setExpandedLoading(true)
    setExpandedError(null)
    setExpandedDetails(null)
    try {
      const res = await fetch(`/api/results/personal/${examId}/details`, { cache: 'no-store' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to load details')
      }
      const j = await res.json()
      setExpandedDetails(j.details || [])
    } catch (e: any) {
      setExpandedError(e?.message || 'Unknown error')
    } finally {
      setExpandedLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Exam History</h1>
        <div className="flex gap-2 items-end">
          <Input placeholder="Search results…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-[220px]" />
          <select
            aria-label="Filter by subject"
            className="border rounded px-3 py-2 bg-background"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="all">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground hidden md:inline">Tip: Use the / button for global search or ? for help.</span>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading history…</div>
      ) : error ? (
        <div className="text-sm text-red-600" role="alert">{error}</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceCharts results={items} subjectAnalytics={subjectAnalytics} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="py-2 px-2">
                        <Button variant="ghost" size="sm" onClick={() => toggleSort('date')}>Date</Button>
                      </th>
                      <th className="py-2 px-2">
                        <Button variant="ghost" size="sm" onClick={() => toggleSort('subject')}>Subject</Button>
                      </th>
                      <th className="py-2 px-2">Exam</th>
                      <th className="py-2 px-2">
                        <Button variant="ghost" size="sm" onClick={() => toggleSort('score')}>Score</Button>
                      </th>
                      <th className="py-2 px-2">
                        <Button variant="ghost" size="sm" onClick={() => toggleSort('percentage')}>Percentage</Button>
                      </th>
                      <th className="py-2 px-2">Time Taken</th>
                      <th className="py-2 px-2">Class Avg %</th>
                      <th className="py-2 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filtered.length > 200) ? (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <VirtualizedList
                            items={filtered}
                            itemHeight={72}
                            height={480}
                            renderItem={(item: ResultItem) => (
                              <div key={item.id} className="border-t">
                                <table className="w-full text-sm"><tbody>
                                  <tr>
                                    <td className="py-2 px-2 whitespace-nowrap">{new Date(item.date).toLocaleString()}</td>
                                    <td className="py-2 px-2 whitespace-nowrap">{item.subjectName}{item.subjectCode ? ` (${item.subjectCode})` : ''}</td>
                                    <td className="py-2 px-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <span>{item.examTitle}</span>
                                        <Button size="sm" variant="outline" onClick={() => onToggleExpand(item.examId)} aria-expanded={expandedExamId === item.examId}>
                                          {expandedExamId === item.examId ? 'Hide' : 'Details'}
                                        </Button>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">{item.score} / {item.totalMarks}</td>
                                    <td className="py-2 px-2">{item.percentage.toFixed(2)}%</td>
                                    <td className="py-2 px-2">{item.timeTakenSec != null ? `${Math.floor(item.timeTakenSec/60)}m ${Math.floor(item.timeTakenSec%60)}s` : '—'}</td>
                                    <td className="py-2 px-2">{item.classAveragePercentage != null ? `${item.classAveragePercentage.toFixed(2)}%` : '—'}</td>
                                    <td className="py-2 px-2">
                                      <Badge variant={item.isCompleted ? 'default' : 'secondary'}>
                                        {item.isCompleted ? 'Completed' : 'In Progress'}
                                      </Badge>
                                    </td>
                                  </tr>
                                  {(expandedExamId === item.examId) && (
                                    <tr>
                                      <td colSpan={8} className="bg-muted/20">
                                        <div className="p-3 text-xs text-muted-foreground">Details collapsed in virtual mode. Click "Hide" to collapse.</div>
                                      </td>
                                    </tr>
                                  )}
                                </tbody></table>
                              </div>
                            )}
                          />
                        </td>
                      </tr>
                    ) : filtered.map(item => (
                      <React.Fragment key={item.id}>
                        <tr className="border-t">
                          <td className="py-2 px-2 whitespace-nowrap">{new Date(item.date).toLocaleString()}</td>
                          <td className="py-2 px-2 whitespace-nowrap">{item.subjectName}{item.subjectCode ? ` (${item.subjectCode})` : ''}</td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-between gap-2">
                              <span>{item.examTitle}</span>
                              <Button size="sm" variant="outline" onClick={() => onToggleExpand(item.examId)} aria-expanded={expandedExamId === item.examId}>
                                {expandedExamId === item.examId ? 'Hide' : 'Details'}
                              </Button>
                            </div>
                          </td>
                          <td className="py-2 px-2">{item.score} / {item.totalMarks}</td>
                          <td className="py-2 px-2">{item.percentage.toFixed(2)}%</td>
                          <td className="py-2 px-2">{item.timeTakenSec != null ? `${Math.floor(item.timeTakenSec/60)}m ${Math.floor(item.timeTakenSec%60)}s` : '—'}</td>
                          <td className="py-2 px-2">{item.classAveragePercentage != null ? `${item.classAveragePercentage.toFixed(2)}%` : '—'}</td>
                          <td className="py-2 px-2">
                            <Badge variant={item.isCompleted ? 'default' : 'secondary'}>
                              {item.isCompleted ? 'Completed' : 'In Progress'}
                            </Badge>
                          </td>
                        </tr>
                        {expandedExamId === item.examId && (
                          <tr>
                            <td colSpan={8} className="bg-muted/20">
                              <div className="p-3 space-y-2">
                                {expandedLoading ? (
                                  <div className="text-xs text-muted-foreground">Loading details…</div>
                                ) : expandedError ? (
                                  <div className="text-xs text-red-600" role="alert">{expandedError}</div>
                                ) : expandedDetails && expandedDetails.length ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-left">
                                          <th className="py-1 px-2">Question</th>
                                          <th className="py-1 px-2">Difficulty</th>
                                          <th className="py-1 px-2">Marks</th>
                                          <th className="py-1 px-2">Result</th>
                                          <th className="py-1 px-2">Marks Awarded</th>
                                          <th className="py-1 px-2">Time Spent</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {expandedDetails.map((d) => (
                                          <tr key={d.questionId} className="border-t">
                                            <td className="py-1 px-2 max-w-[600px]">
                                              <span title={d.questionText}>{d.questionText}</span>
                                            </td>
                                            <td className="py-1 px-2">{d.difficulty}</td>
                                            <td className="py-1 px-2">{d.marks}</td>
                                            <td className="py-1 px-2">{d.isCorrect ? 'Correct' : 'Incorrect'}</td>
                                            <td className="py-1 px-2">{d.marksAwarded}</td>
                                            <td className="py-1 px-2">{d.timeSpentSec != null ? `${Math.floor(d.timeSpentSec/60)}m ${Math.floor(d.timeSpentSec%60)}s` : '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">No question details</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {!filtered.length && (
                      <tr>
                        <td className="py-3 px-2 text-muted-foreground" colSpan={8}>No results</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subject-wise Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="py-2 px-2">Subject</th>
                      <th className="py-2 px-2">Correct</th>
                      <th className="py-2 px-2">Incorrect</th>
                      <th className="py-2 px-2">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectAnalytics.map(s => (
                      <tr key={s.subjectId} className="border-t">
                        <td className="py-2 px-2">{s.subjectName}</td>
                        <td className="py-2 px-2">{s.correct}</td>
                        <td className="py-2 px-2">{s.incorrect}</td>
                        <td className="py-2 px-2">{(s.accuracy * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                    {!subjectAnalytics.length && (
                      <tr>
                        <td className="py-3 px-2 text-muted-foreground" colSpan={4}>No analytics data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}


