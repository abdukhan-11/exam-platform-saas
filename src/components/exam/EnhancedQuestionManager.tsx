'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Copy, 
  Edit, 
  Eye, 
  Save, 
  Upload, 
  Download,
  Shuffle,
  Filter,
  Search,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  FileText,
  Type,
  Hash,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Enhanced validation schemas
const questionOptionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
  isCorrect: z.boolean().default(false)
});

const questionSchema = z.object({
  text: z.string().min(1, 'Question text is required').max(2000, 'Question text too long'),
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY']),
  marks: z.number().min(1, 'Minimum 1 mark').max(100, 'Maximum 100 marks'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  explanation: z.string().max(1000, 'Explanation too long').optional(),
  options: z.array(questionOptionSchema).optional(),
  correctAnswer: z.string().optional()
});

const questionFormSchema = z.object({
  questions: z.array(questionSchema)
});

type QuestionFormData = z.infer<typeof questionFormSchema>;

interface Question {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  marks: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  explanation?: string;
  options?: Array<{ id: string; text: string; isCorrect: boolean }>;
  correctAnswer?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface EnhancedQuestionManagerProps {
  examId: string;
  onQuestionsUpdated?: () => void;
}

function EnhancedQuestionManagerContent({ examId, onQuestionsUpdated }: EnhancedQuestionManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('order');

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid }
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionFormSchema) as any,
    defaultValues: {
      questions: []
    }
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'questions'
  });

  // Load questions on mount
  useEffect(() => {
    loadQuestions();
  }, [examId]);

  // Handle URL parameters for default question setup
  useEffect(() => {
    const count = searchParams.get('count');
    const type = searchParams.get('type');
    
    if (count && type) {
      const questionCount = parseInt(count);
      const questionType = type as Question['type'];
      
      if (questionCount > 0 && questionCount <= 50) {
        const defaultQuestions = Array.from({ length: questionCount }, (_, index) => ({
          text: `Question ${index + 1}`,
          type: questionType,
          marks: 1,
          difficulty: 'MEDIUM' as const,
          explanation: '',
          options: questionType === 'MULTIPLE_CHOICE' ? [
            { text: 'Option A', isCorrect: false },
            { text: 'Option B', isCorrect: false },
            { text: 'Option C', isCorrect: false },
            { text: 'Option D', isCorrect: false }
          ] : undefined,
          correctAnswer: questionType === 'TRUE_FALSE' ? 'true' : ''
        }));
        
        append(defaultQuestions);
        setIsAddDialogOpen(true);
      }
    }
  }, [searchParams, append]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/questions?examId=${examId}`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      } else {
        throw new Error('Failed to load questions');
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (data: QuestionFormData) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          questions: data.questions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add questions');
      }

      toast.success(`Added ${data.questions.length} question(s) successfully!`);
      setIsAddDialogOpen(false);
      reset();
      loadQuestions();
      
      if (onQuestionsUpdated) {
        onQuestionsUpdated();
      }
    } catch (error) {
      console.error('Error adding questions:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add questions');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) {
      toast.error('No questions selected');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/questions/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: selectedQuestions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete questions');
      }

      toast.success(`Deleted ${selectedQuestions.length} question(s) successfully!`);
      setSelectedQuestions([]);
      loadQuestions();
      
      if (onQuestionsUpdated) {
        onQuestionsUpdated();
      }
    } catch (error) {
      console.error('Error deleting questions:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete questions');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setQuestions(items);

    // Update order in database
    try {
      const questionIds = items.map((item, index) => ({
        id: item.id,
        order: index + 1
      }));

      await fetch(`/api/questions/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds })
      });
    } catch (error) {
      console.error('Error updating question order:', error);
      toast.error('Failed to update question order');
    }
  };

  const handleDuplicateQuestion = async (questionId: string) => {
    try {
      const question = questions.find(q => q.id === questionId);
      if (!question) return;

      const duplicatedQuestion = {
        ...question,
        text: `${question.text} (Copy)`,
        id: undefined
      };

      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          ...duplicatedQuestion
        })
      });

      if (response.ok) {
        toast.success('Question duplicated successfully!');
        loadQuestions();
      } else {
        throw new Error('Failed to duplicate question');
      }
    } catch (error) {
      console.error('Error duplicating question:', error);
      toast.error('Failed to duplicate question');
    }
  };

  const handleExportQuestions = async () => {
    try {
      const response = await fetch(`/api/questions/export?examId=${examId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exam-${examId}-questions.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Questions exported successfully!');
      } else {
        throw new Error('Failed to export questions');
      }
    } catch (error) {
      console.error('Error exporting questions:', error);
      toast.error('Failed to export questions');
    }
  };

  const handleImportQuestions = async (file: File) => {
    try {
      const text = await file.text();
      const importedQuestions = JSON.parse(text);
      
      if (!Array.isArray(importedQuestions)) {
        throw new Error('Invalid file format');
      }

      const response = await fetch('/api/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          questions: importedQuestions
        })
      });

      if (response.ok) {
        toast.success(`Imported ${importedQuestions.length} question(s) successfully!`);
        loadQuestions();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import questions');
      }
    } catch (error) {
      console.error('Error importing questions:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import questions');
    }
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || question.type === filterType;
    const matchesDifficulty = filterDifficulty === 'all' || question.difficulty === filterDifficulty;
    return matchesSearch && matchesType && matchesDifficulty;
  });

  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    switch (sortBy) {
      case 'order':
        return a.order - b.order;
      case 'type':
        return a.type.localeCompare(b.type);
      case 'difficulty':
        return (a.difficulty || 'MEDIUM').localeCompare(b.difficulty || 'MEDIUM');
      case 'marks':
        return b.marks - a.marks;
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return a.order - b.order;
    }
  });

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'MULTIPLE_CHOICE':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'TRUE_FALSE':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'SHORT_ANSWER':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'ESSAY':
        return <Type className="h-4 w-4 text-purple-500" />;
      default:
        return <Hash className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HARD':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Question Management</h2>
          <p className="text-muted-foreground">
            Manage questions for exam. Total: {questions.length} questions
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsBulkDialogOpen(true)}
            disabled={selectedQuestions.length === 0}
          >
            <MoreHorizontal className="h-4 w-4 mr-2" />
            Bulk Actions ({selectedQuestions.length})
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExportQuestions}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Questions</DialogTitle>
                <DialogDescription>
                  Upload a JSON file with questions to import
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImportQuestions(file);
                    }
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
          
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Questions
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search Questions</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Filter by Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                  <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                  <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                  <SelectItem value="ESSAY">Essay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Filter by Difficulty</Label>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">Order</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="difficulty">Difficulty</SelectItem>
                  <SelectItem value="marks">Marks</SelectItem>
                  <SelectItem value="created">Created Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>Questions ({sortedQuestions.length})</CardTitle>
          <CardDescription>
            Drag and drop to reorder questions. Select multiple questions for bulk operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : sortedQuestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No questions found. Add some questions to get started.
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="questions">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {sortedQuestions.map((question, index) => (
                      <Draggable
                        key={question.id}
                        draggableId={question.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                                </div>
                                
                                <Checkbox
                                  checked={selectedQuestions.includes(question.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedQuestions([...selectedQuestions, question.id]);
                                    } else {
                                      setSelectedQuestions(selectedQuestions.filter(id => id !== question.id));
                                    }
                                  }}
                                />
                                
                                <div className="flex items-center gap-2">
                                  {getQuestionTypeIcon(question.type)}
                                  <Badge variant="outline">{question.type.replace('_', ' ')}</Badge>
                                  <Badge className={getDifficultyColor(question.difficulty || 'MEDIUM')}>
                                    {question.difficulty || 'MEDIUM'}
                                  </Badge>
                                  <Badge variant="secondary">
                                    {question.marks} mark{question.marks !== 1 ? 's' : ''}
                                  </Badge>
                                </div>
                                
                                <div className="flex-1">
                                  <p className="font-medium">{question.text}</p>
                                  {question.explanation && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {question.explanation}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDuplicateQuestion(question.id)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/dashboard/college-admin/exams/${examId}/questions/${question.id}`)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/dashboard/college-admin/exams/${examId}/questions/${question.id}/preview`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Add Questions Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Questions</DialogTitle>
            <DialogDescription>
              Add multiple questions to your exam. You can add different types of questions.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(handleAddQuestion as any)} className="space-y-6">
            <Tabs defaultValue="single" className="w-full">
              <TabsList>
                <TabsTrigger value="single">Single Question</TabsTrigger>
                <TabsTrigger value="multiple">Multiple Questions</TabsTrigger>
                <TabsTrigger value="template">From Template</TabsTrigger>
              </TabsList>
              
              <TabsContent value="single" className="space-y-4">
                <QuestionForm
                  control={control}
                  errors={errors}
                  questionIndex={0}
                />
              </TabsContent>
              
              <TabsContent value="multiple" className="space-y-4">
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          Question {index + 1}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <QuestionForm
                          control={control}
                          errors={errors}
                          questionIndex={index}
                        />
                      </CardContent>
                    </Card>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({
                      text: '',
                      type: 'MULTIPLE_CHOICE',
                      marks: 1,
                      difficulty: 'MEDIUM',
                      explanation: '',
                      options: [
                        { text: 'Option A', isCorrect: false },
                        { text: 'Option B', isCorrect: false },
                        { text: 'Option C', isCorrect: false },
                        { text: 'Option D', isCorrect: false }
                      ]
                    })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Question
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="template" className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  Template system coming soon...
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isValid || loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Adding...' : 'Add Questions'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>
              Perform actions on {selectedQuestions.length} selected question(s)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={loading}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected Questions
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                // TODO: Implement bulk duplicate
                toast.info('Bulk duplicate coming soon...');
              }}
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate Selected Questions
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                // TODO: Implement bulk edit
                toast.info('Bulk edit coming soon...');
              }}
              className="w-full"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Selected Questions
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Question Form Component
interface QuestionFormProps {
  control: any;
  errors: any;
  questionIndex: number;
}

function QuestionForm({ control, errors, questionIndex }: QuestionFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Question Text *</Label>
        <Controller
          name={`questions.${questionIndex}.text`}
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              placeholder="Enter your question here..."
              rows={3}
              className={errors?.questions?.[questionIndex]?.text ? 'border-red-500' : ''}
            />
          )}
        />
        {errors?.questions?.[questionIndex]?.text && (
          <p className="text-sm text-red-500">{errors.questions[questionIndex].text.message}</p>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Question Type *</Label>
          <Controller
            name={`questions.${questionIndex}.type`}
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
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
            )}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Marks *</Label>
          <Controller
            name={`questions.${questionIndex}.marks`}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min="1"
                max="100"
                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
              />
            )}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Controller
            name={`questions.${questionIndex}.difficulty`}
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Explanation (Optional)</Label>
        <Controller
          name={`questions.${questionIndex}.explanation`}
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              placeholder="Provide explanation for the correct answer..."
              rows={2}
            />
          )}
        />
      </div>
    </div>
  );
}

export default function EnhancedQuestionManager({ examId, onQuestionsUpdated }: EnhancedQuestionManagerProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EnhancedQuestionManagerContent examId={examId} onQuestionsUpdated={onQuestionsUpdated} />
    </Suspense>
  );
}
