'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, Eye, Save, X } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  marks: number;
  correctAnswer?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  explanation?: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
}

interface Exam {
  id: string;
  title: string;
  totalMarks: number;
  duration: number;
}

export default function QuestionManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = React.use(params);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState<{
    text: string;
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
    marks: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    explanation: string;
    options: Array<{ text: string; isCorrect: boolean }>;
  }>({
    text: '',
    type: 'MULTIPLE_CHOICE',
    marks: 1,
    difficulty: 'MEDIUM',
    explanation: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ]
  });

  // Bulk creation support from query params
  const initialBulkType = useMemo(() => {
    const t = (searchParams?.get('type') || '').toUpperCase();
    const allowed = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY'];
    const result = (allowed as string[]).includes(t) ? (t as Question['type']) : null;
    return result;
  }, [searchParams]);
  const initialBulkCount = useMemo(() => {
    const raw = Number(searchParams?.get('count') || 0);
    if (!isFinite(raw) || raw <= 0) return 0;
    const result = Math.min(Math.max(Math.floor(raw), 1), 200);
    return result;
  }, [searchParams]);
  const [bulkRemaining, setBulkRemaining] = useState<number>(0);
  const [bulkType, setBulkType] = useState<Question['type'] | null>(null);

  useEffect(() => {
    loadExamData();
  }, [resolvedParams.id]);

  const loadExamData = async () => {
    try {
      setLoading(true);
      
      // Load exam details
      const examResponse = await fetch(`/api/exams/${resolvedParams.id}`, { cache: 'no-store' });
      if (!examResponse.ok) {
        throw new Error('Failed to load exam');
      }
      const examData = await examResponse.json();
      setExam(examData);

      // Load questions
      const questionsResponse = await fetch(`/api/questions?examId=${resolvedParams.id}`, { cache: 'no-store' });
      if (!questionsResponse.ok) {
        throw new Error('Failed to load questions');
      }
      const questionsData = await questionsResponse.json();
      setQuestions(questionsData.items || []);

    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      // Initialize bulk creation after initial load
      if (initialBulkCount > 0) {
        setBulkRemaining(initialBulkCount);
        if (initialBulkType) {
          setBulkType(initialBulkType);
          setQuestionForm((prev) => ({
            ...prev,
            type: initialBulkType,
            options: initialBulkType === 'MULTIPLE_CHOICE' ? prev.options : []
          }));
        }
        setIsCreatingQuestion(true);
      }
    }
  };

  const publishExam = async () => {
    try {
      // First publish the exam
      const publishRes = await fetch(`/api/exams/${resolvedParams.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!publishRes.ok) {
        const data = await publishRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to publish exam');
      }
      
      // Then activate the exam
      const activateRes = await fetch(`/api/exams/${resolvedParams.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!activateRes.ok) {
        const data = await activateRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to activate exam');
      }
      
      // Show success message
      alert('Exam published and activated successfully! Students can now take the exam.');
      router.push('/dashboard/college-admin/exams');
    } catch (e: any) {
      alert(e.message || 'Failed to finish and publish exam');
    }
  };

  const handleCreateQuestion = async (continueBulk: boolean = false) => {
    try {
      if (!questionForm.text.trim()) {
        alert('Please enter question text');
        return;
      }

      if (questionForm.type === 'MULTIPLE_CHOICE' && !questionForm.options.some(opt => opt.isCorrect)) {
        alert('Please mark at least one option as correct');
        return;
      }

      // Derive correctAnswer per API contract
      const correctAnswer = questionForm.type === 'MULTIPLE_CHOICE'
        ? (questionForm.options.find(opt => opt.isCorrect)?.text || 'N/A')
        : 'N/A';

      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examId: resolvedParams.id,
          text: questionForm.text,
          type: questionForm.type,
          marks: questionForm.marks,
          difficulty: questionForm.difficulty,
          explanation: questionForm.explanation,
          correctAnswer,
          options: questionForm.type === 'MULTIPLE_CHOICE' ? questionForm.options : undefined
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create question');
      }

      const newQuestion = await response.json();
      setQuestions([...questions, newQuestion]);
      if (continueBulk && bulkRemaining > 0) {
        const nextRemaining = bulkRemaining - 1;
        setBulkRemaining(nextRemaining);
        if (nextRemaining > 0) {
          setQuestionForm((prev) => ({
            text: '',
            type: (bulkType || prev.type) as any,
            marks: prev.marks,
            difficulty: prev.difficulty,
            explanation: '',
            options: (bulkType || prev.type) === 'MULTIPLE_CHOICE'
              ? [
                  { text: '', isCorrect: false },
                  { text: '', isCorrect: false },
                  { text: '', isCorrect: false },
                  { text: '', isCorrect: false }
                ]
              : []
          }));
          setIsCreatingQuestion(true);
          return;
        }
      }

      setIsCreatingQuestion(false);
      setBulkRemaining(0);
      setBulkType(null);
      resetForm();

    } catch (err: any) {
      alert(err.message || 'Failed to create question');
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;

    try {
      const response = await fetch('/api/questions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingQuestion.id,
          text: questionForm.text,
          type: questionForm.type,
          marks: questionForm.marks,
          difficulty: questionForm.difficulty,
          explanation: questionForm.explanation,
          options: questionForm.type === 'MULTIPLE_CHOICE' ? questionForm.options : undefined
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update question');
      }

      const updatedQuestion = await response.json();
      setQuestions(questions.map(q => q.id === editingQuestion.id ? updatedQuestion : q));
      setEditingQuestion(null);
      resetForm();

    } catch (err: any) {
      alert(err.message || 'Failed to update question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete question');
      }

      setQuestions(questions.filter(q => q.id !== questionId));

    } catch (err: any) {
      alert(err.message || 'Failed to delete question');
    }
  };

  const resetForm = () => {
    setQuestionForm({
      text: '',
      type: 'MULTIPLE_CHOICE',
      marks: 1,
      difficulty: 'MEDIUM',
      explanation: '',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]
    });
  };

  const startEditing = (question: Question) => {
    setEditingQuestion(question);
    setQuestionForm({
      text: question.text,
      type: question.type as 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY',
      marks: question.marks,
      difficulty: question.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
      explanation: question.explanation || '',
      options: question.options && question.options.length > 0 ? question.options : [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HARD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'MULTIPLE_CHOICE': return 'bg-blue-100 text-blue-800';
      case 'TRUE_FALSE': return 'bg-purple-100 text-purple-800';
      case 'SHORT_ANSWER': return 'bg-orange-100 text-orange-800';
      case 'ESSAY': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-500 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Exam not found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Question Management</h1>
            <p className="text-muted-foreground">{exam.title}</p>
            {bulkRemaining > 0 && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Bulk Creation Mode:</strong> Creating {bulkRemaining} {bulkType?.toLowerCase().replace('_', ' ')} questions
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/college-admin/exams/${resolvedParams.id}`)}
            >
              Back to Exam
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={publishExam}
            >
              Finish & Done
            </Button>
            <Dialog open={isCreatingQuestion} onOpenChange={setIsCreatingQuestion}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Question</DialogTitle>
                  <DialogDescription>
                    Create a new question for this exam.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="question-text">Question Text *</Label>
                    <Textarea
                      id="question-text"
                      placeholder="Enter your question here..."
                      value={questionForm.text}
                      onChange={(e) => setQuestionForm({...questionForm, text: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="question-type">Question Type *</Label>
                      <Select value={questionForm.type} onValueChange={(value) => setQuestionForm({...questionForm, type: value as any})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                          <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                          <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                          <SelectItem value="ESSAY">Essay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="question-marks">Marks *</Label>
                      <Input
                        id="question-marks"
                        type="number"
                        min="1"
                        value={questionForm.marks}
                        onChange={(e) => setQuestionForm({...questionForm, marks: parseInt(e.target.value) || 1})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="question-difficulty">Difficulty</Label>
                    <Select value={questionForm.difficulty} onValueChange={(value) => setQuestionForm({...questionForm, difficulty: value as any})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EASY">Easy</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HARD">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {questionForm.type === 'MULTIPLE_CHOICE' && (
                    <div className="space-y-2">
                      <Label>Options *</Label>
                      {questionForm.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            placeholder={`Option ${index + 1}`}
                            value={option.text}
                            onChange={(e) => {
                              const newOptions = [...questionForm.options];
                              newOptions[index].text = e.target.value;
                              setQuestionForm({...questionForm, options: newOptions});
                            }}
                          />
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={option.isCorrect}
                              onChange={(e) => {
                                const newOptions = [...questionForm.options];
                                newOptions[index].isCorrect = e.target.checked;
                                setQuestionForm({...questionForm, options: newOptions});
                              }}
                            />
                            <span className="text-sm">Correct</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="question-explanation">Explanation (Optional)</Label>
                    <Textarea
                      id="question-explanation"
                      placeholder="Explain the correct answer..."
                      value={questionForm.explanation}
                      onChange={(e) => setQuestionForm({...questionForm, explanation: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsCreatingQuestion(false)}>
                      Cancel
                    </Button>
                    {bulkRemaining > 0 ? (
                      <>
                        <Button onClick={() => handleCreateQuestion(true)} className="bg-green-600 hover:bg-green-700">
                          {bulkRemaining > 1 ? `Save & Next (${bulkRemaining - 1} left)` : 'Save & Finish'}
                        </Button>
                        <Button onClick={() => handleCreateQuestion(false)} variant="outline">
                          Save & Finish Now
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => handleCreateQuestion(false)} className="bg-green-600 hover:bg-green-700">
                        Create Question
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Exam Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{questions.length}</div>
              <p className="text-sm text-muted-foreground">Total Questions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {questions.reduce((sum, q) => sum + q.marks, 0)}
              </div>
              <p className="text-sm text-muted-foreground">Total Marks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{exam.duration}</div>
              <p className="text-sm text-muted-foreground">Duration (minutes)</p>
            </CardContent>
          </Card>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {questions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No questions added yet. Click "Add Question" to get started.</p>
              </CardContent>
            </Card>
          ) : (
            questions.map((question, index) => (
              <Card key={question.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Q{index + 1}</Badge>
                        <Badge className={getTypeColor(question.type)}>
                          {question.type.replace('_', ' ')}
                        </Badge>
                        <Badge className={getDifficultyColor(question.difficulty)}>
                          {question.difficulty}
                        </Badge>
                        <Badge variant="outline">{question.marks} marks</Badge>
                      </div>
                      <h3 className="font-medium mb-2">{question.text}</h3>
                      
                      {question.type === 'MULTIPLE_CHOICE' && question.options && question.options.length > 0 && (
                        <div className="space-y-1">
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className={`text-sm p-2 rounded ${
                              option.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                            }`}>
                              {String.fromCharCode(65 + optIndex)}. {option.text}
                              {option.isCorrect && <span className="ml-2 text-green-600 font-medium">✓</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {question.explanation && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm text-blue-800">
                            <strong>Explanation:</strong> {question.explanation}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(question)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Question Dialog */}
        <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Question</DialogTitle>
              <DialogDescription>
                Update the question details.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-question-text">Question Text *</Label>
                <Textarea
                  id="edit-question-text"
                  placeholder="Enter your question here..."
                  value={questionForm.text}
                  onChange={(e) => setQuestionForm({...questionForm, text: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-question-type">Question Type *</Label>
                  <Select value={questionForm.type} onValueChange={(value) => setQuestionForm({...questionForm, type: value as any})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                      <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                      <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                      <SelectItem value="ESSAY">Essay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-question-marks">Marks *</Label>
                  <Input
                    id="edit-question-marks"
                    type="number"
                    min="1"
                    value={questionForm.marks}
                    onChange={(e) => setQuestionForm({...questionForm, marks: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-question-difficulty">Difficulty</Label>
                <Select value={questionForm.difficulty} onValueChange={(value) => setQuestionForm({...questionForm, difficulty: value as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {questionForm.type === 'MULTIPLE_CHOICE' && (
                <div className="space-y-2">
                  <Label>Options *</Label>
                  {questionForm.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option.text}
                        onChange={(e) => {
                          const newOptions = [...questionForm.options];
                          newOptions[index].text = e.target.value;
                          setQuestionForm({...questionForm, options: newOptions});
                        }}
                      />
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={option.isCorrect}
                          onChange={(e) => {
                            const newOptions = [...questionForm.options];
                            newOptions[index].isCorrect = e.target.checked;
                            setQuestionForm({...questionForm, options: newOptions});
                          }}
                        />
                        <span className="text-sm">Correct</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-question-explanation">Explanation (Optional)</Label>
                <Textarea
                  id="edit-question-explanation"
                  placeholder="Explain the correct answer..."
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({...questionForm, explanation: e.target.value})}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingQuestion(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateQuestion} className="bg-blue-600 hover:bg-blue-700">
                  Update Question
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
