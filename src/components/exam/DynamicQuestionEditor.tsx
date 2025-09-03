'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Eye, 
  Save, 
  GripVertical,
  CheckCircle,
  AlertTriangle,
  FileText,
  Type,
  Hash,
  Star,
  Settings,
  Eye as Preview,
  Edit,
  Undo,
  Redo,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link,
  Image,
  Code,
  Quote,
  Minus,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// Dynamically import rich text editor to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded"></div>
});

// Import Quill CSS
import 'react-quill/dist/quill.snow.css';

// Enhanced validation schemas
const questionOptionSchema = z.object({
  text: z.string().min(1, 'Option text is required').max(500, 'Option text too long'),
  isCorrect: z.boolean().default(false)
});

const questionSchema = z.object({
  text: z.string().min(1, 'Question text is required').max(2000, 'Question text too long'),
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY']),
  marks: z.number().min(1, 'Minimum 1 mark').max(100, 'Maximum 100 marks'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  explanation: z.string().max(1000, 'Explanation too long').optional(),
  options: z.array(questionOptionSchema).optional(),
  correctAnswer: z.string().optional(),
  characterLimit: z.number().optional(),
  wordLimit: z.number().optional(),
  allowPartialCredit: z.boolean().default(false),
  timeLimit: z.number().optional(),
  tags: z.array(z.string()).optional()
});

type QuestionFormData = z.infer<typeof questionSchema>;

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface DynamicQuestionEditorProps {
  question?: Partial<QuestionFormData>;
  onSave?: (question: QuestionFormData) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'preview';
  examId?: string;
}

export default function DynamicQuestionEditor({ 
  question, 
  onSave, 
  onCancel, 
  mode = 'create',
  examId 
}: DynamicQuestionEditorProps) {
  const [activeTab, setActiveTab] = useState('editor');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRichTextToolbar, setShowRichTextToolbar] = useState(true);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema) as any,
    defaultValues: {
      text: question?.text || '',
      type: question?.type || 'MULTIPLE_CHOICE',
      marks: question?.marks || 1,
      difficulty: question?.difficulty || 'MEDIUM',
      explanation: question?.explanation || '',
      options: question?.options || [
        { text: 'Option A', isCorrect: false },
        { text: 'Option B', isCorrect: false },
        { text: 'Option C', isCorrect: false },
        { text: 'Option D', isCorrect: false }
      ],
      correctAnswer: question?.correctAnswer || '',
      characterLimit: question?.characterLimit || 0,
      wordLimit: question?.wordLimit || 0,
      allowPartialCredit: question?.allowPartialCredit || false,
      timeLimit: question?.timeLimit || 0,
      tags: question?.tags || []
    },
    mode: 'onChange'
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'options'
  });

  const watchedValues = watch();
  const questionType = watchedValues.type;

  // Quill editor configuration
  const quillModules = {
    toolbar: showRichTextToolbar ? [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image', 'code-block', 'blockquote'],
      ['clean']
    ] : false
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'color', 'background', 'align',
    'link', 'image', 'code-block', 'blockquote'
  ];

  // Handle form submission
  const onSubmit = async (data: QuestionFormData) => {
    try {
      // Validate question type specific requirements
      if (data.type === 'MULTIPLE_CHOICE' && (!data.options || data.options.length < 2)) {
        toast.error('Multiple choice questions must have at least 2 options');
        return;
      }

      if (data.type === 'MULTIPLE_CHOICE' && !data.options?.some(opt => opt.isCorrect)) {
        toast.error('Multiple choice questions must have at least one correct answer');
        return;
      }

      if (data.type === 'TRUE_FALSE' && !data.correctAnswer) {
        toast.error('True/False questions must have a correct answer');
        return;
      }

      if (onSave) {
        onSave(data);
        toast.success('Question saved successfully!');
      }
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('Failed to save question');
    }
  };

  // Handle drag and drop for options
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    move(result.source.index, result.destination.index);
  };

  // Add new option
  const addOption = () => {
    append({ text: `Option ${fields.length + 1}`, isCorrect: false });
  };

  // Remove option
  const removeOption = (index: number) => {
    if (fields.length > 2) {
      remove(index);
    } else {
      toast.error('Multiple choice questions must have at least 2 options');
    }
  };

  // Duplicate option
  const duplicateOption = (index: number) => {
    const option = fields[index];
    append({ text: `${option.text} (Copy)`, isCorrect: false });
  };

  // Get question type icon
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

  // Get difficulty color
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

  // Question preview component
  const QuestionPreview = () => (
    <div className="space-y-6 p-6 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getQuestionTypeIcon(watchedValues.type)}
          <Badge variant="outline">{watchedValues.type.replace('_', ' ')}</Badge>
          <Badge className={getDifficultyColor(watchedValues.difficulty)}>
            {watchedValues.difficulty}
          </Badge>
          <Badge variant="secondary">
            {watchedValues.marks} mark{watchedValues.marks !== 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {watchedValues.timeLimit ? `${watchedValues.timeLimit} min` : 'No time limit'}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-2">Question:</h3>
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: watchedValues.text }}
          />
        </div>

        {watchedValues.explanation && (
          <div>
            <h4 className="font-medium mb-2">Explanation:</h4>
            <p className="text-sm text-muted-foreground">{watchedValues.explanation}</p>
          </div>
        )}

        {watchedValues.type === 'MULTIPLE_CHOICE' && watchedValues.options && (
          <div>
            <h4 className="font-medium mb-2">Options:</h4>
            <div className="space-y-2">
              {watchedValues.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  <input type="radio" name="preview" disabled />
                  <span className={option.isCorrect ? 'font-semibold text-green-600' : ''}>
                    {option.text}
                  </span>
                  {option.isCorrect && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {watchedValues.type === 'TRUE_FALSE' && (
          <div>
            <h4 className="font-medium mb-2">Answer:</h4>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input type="radio" name="preview-tf" disabled />
                <span>True</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="radio" name="preview-tf" disabled />
                <span>False</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Correct answer: <span className="font-semibold">{watchedValues.correctAnswer}</span>
            </p>
          </div>
        )}

        {(watchedValues.type === 'SHORT_ANSWER' || watchedValues.type === 'ESSAY') && (
          <div>
            <h4 className="font-medium mb-2">Answer:</h4>
            <Textarea 
              placeholder="Student answer will appear here..."
              disabled 
              className="min-h-[100px]"
            />
            {(watchedValues.characterLimit || watchedValues.wordLimit) && (
              <div className="text-sm text-muted-foreground mt-2">
                {watchedValues.characterLimit && `Character limit: ${watchedValues.characterLimit}`}
                {watchedValues.wordLimit && `Word limit: ${watchedValues.wordLimit}`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-4 overflow-auto' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {mode === 'create' ? 'Create Question' : mode === 'edit' ? 'Edit Question' : 'Question Preview'}
          </h2>
          <p className="text-muted-foreground">
            {mode === 'create' ? 'Create a new question for your exam' : 
             mode === 'edit' ? 'Edit the existing question' : 'Preview how students will see this question'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? <Edit className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {isPreviewMode ? 'Edit' : 'Preview'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isPreviewMode ? (
        <QuestionPreview />
      ) : (
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="editor">Question Editor</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="preview">Live Preview</TabsTrigger>
            </TabsList>

            {/* Question Editor Tab */}
            <TabsContent value="editor" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Question Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Question Type Selection */}
                  <div className="space-y-2">
                    <Label>Question Type *</Label>
                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MULTIPLE_CHOICE">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Multiple Choice
                              </div>
                            </SelectItem>
                            <SelectItem value="TRUE_FALSE">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                True/False
                              </div>
                            </SelectItem>
                            <SelectItem value="SHORT_ANSWER">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Short Answer
                              </div>
                            </SelectItem>
                            <SelectItem value="ESSAY">
                              <div className="flex items-center gap-2">
                                <Type className="h-4 w-4" />
                                Essay
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {/* Question Text */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Question Text *</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowRichTextToolbar(!showRichTextToolbar)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {questionType === 'ESSAY' ? (
                      <Controller
                        name="text"
                        control={control}
                        render={({ field }) => (
                          <div className="border rounded-lg">
                            <ReactQuill
                              theme="snow"
                              value={field.value}
                              onChange={field.onChange}
                              modules={quillModules}
                              formats={quillFormats}
                              placeholder="Enter your question here..."
                              className="min-h-[200px]"
                            />
                          </div>
                        )}
                      />
                    ) : (
                      <Controller
                        name="text"
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder="Enter your question here..."
                            rows={4}
                            className={errors.text ? 'border-red-500' : ''}
                          />
                        )}
                      />
                    )}
                    
                    {errors.text && (
                      <p className="text-sm text-red-500">{errors.text.message}</p>
                    )}
                  </div>

                  {/* Question Type Specific Fields */}
                  {questionType === 'MULTIPLE_CHOICE' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Options</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addOption}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                      
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="options">
                          {(provided) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className="space-y-2"
                            >
                              {fields.map((field, index) => (
                                <Draggable
                                  key={field.id}
                                  draggableId={field.id}
                                  index={index}
                                >
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className="flex items-center gap-2 p-3 border rounded-lg bg-white"
                                    >
                                      <div {...provided.dragHandleProps}>
                                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                                      </div>
                                      
                                      <Controller
                                        name={`options.${index}.isCorrect`}
                                        control={control}
                                        render={({ field }) => (
                                          <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                          />
                                        )}
                                      />
                                      
                                      <Controller
                                        name={`options.${index}.text`}
                                        control={control}
                                        render={({ field }) => (
                                          <Input
                                            {...field}
                                            placeholder={`Option ${index + 1}`}
                                            className="flex-1"
                                          />
                                        )}
                                      />
                                      
                                      <div className="flex items-center gap-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => duplicateOption(index)}
                                        >
                                          <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeOption(index)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
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
                    </div>
                  )}

                  {questionType === 'TRUE_FALSE' && (
                    <div className="space-y-2">
                      <Label>Correct Answer *</Label>
                      <Controller
                        name="correctAnswer"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select correct answer" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">True</SelectItem>
                              <SelectItem value="false">False</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.correctAnswer && (
                        <p className="text-sm text-red-500">{errors.correctAnswer.message}</p>
                      )}
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="space-y-2">
                    <Label>Explanation (Optional)</Label>
                    <Controller
                      name="explanation"
                      control={control}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          placeholder="Provide explanation for the correct answer..."
                          rows={3}
                        />
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Question Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Marks *</Label>
                      <Controller
                        name="marks"
                        control={control}
                        render={({ field }) => (
                          <div className="space-y-2">
                            <Input
                              {...field}
                              type="number"
                              min="1"
                              max="100"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                            <Slider
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              max={100}
                              min={1}
                              step={1}
                              className="w-full"
                            />
                          </div>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Controller
                        name="difficulty"
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

                  <Separator />

                  {/* Advanced Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Advanced Settings</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Time Limit (minutes)</Label>
                        <Controller
                          name="timeLimit"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              max="120"
                              placeholder="No limit"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          )}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Allow Partial Credit</Label>
                        <Controller
                          name="allowPartialCredit"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                      </div>
                    </div>

                    {(questionType === 'SHORT_ANSWER' || questionType === 'ESSAY') && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Character Limit</Label>
                          <Controller
                            name="characterLimit"
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                max="10000"
                                placeholder="No limit"
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            )}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Word Limit</Label>
                          <Controller
                            name="wordLimit"
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                max="2000"
                                placeholder="No limit"
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Live Preview Tab */}
            <TabsContent value="preview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Preview className="h-5 w-5" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    See how students will view this question
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QuestionPreview />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              disabled={!isDirty}
            >
              Reset
            </Button>
            
            <Button
              type="submit"
              disabled={!isValid}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {mode === 'create' ? 'Create Question' : 'Save Changes'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
