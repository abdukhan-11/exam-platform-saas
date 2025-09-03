'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar, 
  Plus, 
  Clock, 
  Users, 
  BookOpen,
  CheckCircle,
  PenTool,
  Trophy,
  Edit,
  Play,
  Eye,
  BarChart3,
  Shield,
  Settings,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { toast } from 'sonner';

// Enhanced validation schema with Zod
const examFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  subject: z.string().min(1, 'Subject is required'),
  class: z.string().optional(),
  type: z.enum(['test', 'exam', 'quiz']),
  duration: z.number().min(5, 'Minimum 5 minutes').max(480, 'Maximum 8 hours'),
  totalMarks: z.number().min(1, 'Minimum 1 mark').max(1000, 'Maximum 1000 marks'),
  instructions: z.string().max(1000, 'Instructions too long').optional(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  
  // Anti-cheating settings
  enableBrowserLock: z.boolean().default(true),
  enableFullscreenMode: z.boolean().default(true),
  enableTabSwitchingPrevention: z.boolean().default(true),
  enableQuestionShuffling: z.boolean().default(true),
  enableOptionShuffling: z.boolean().default(true),
  enableTimeLimit: z.boolean().default(true),
  enableAutoSubmit: z.boolean().default(true),
  
  // Advanced settings
  maxAttempts: z.number().min(1, 'Minimum 1 attempt').max(10, 'Maximum 10 attempts').default(1),
  allowRetakes: z.boolean().default(false),
  showResultsImmediately: z.boolean().default(false),
  allowReview: z.boolean().default(true),
  
  // Question defaults
  defaultQuestionType: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY']).default('MULTIPLE_CHOICE'),
  defaultQuestionCount: z.number().min(0, 'Cannot be negative').max(200, 'Maximum 200 questions').default(0),
  
  // Timezone
  timezone: z.string().default('UTC')
});

type ExamFormData = z.infer<typeof examFormSchema>;

interface EnhancedExamCreationProps {
  onExamCreated?: (examId: string) => void;
  onCancel?: () => void;
}

export default function EnhancedExamCreation({ onExamCreated, onCancel }: EnhancedExamCreationProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset
  } = useForm<ExamFormData>({
    resolver: zodResolver(examFormSchema) as any,
    defaultValues: {
      title: '',
      subject: '',
      class: '',
      type: 'test' as const,
      duration: 30,
      totalMarks: 50,
      instructions: '',
      scheduledDate: '',
      scheduledTime: '',
      enableBrowserLock: true,
      enableFullscreenMode: true,
      enableTabSwitchingPrevention: true,
      enableQuestionShuffling: true,
      enableOptionShuffling: true,
      enableTimeLimit: true,
      enableAutoSubmit: true,
      maxAttempts: 1,
      allowRetakes: false,
      showResultsImmediately: false,
      allowReview: true,
      defaultQuestionType: 'MULTIPLE_CHOICE',
      defaultQuestionCount: 0,
      timezone: 'UTC'
    },
    mode: 'onChange'
  });

  const watchedValues = watch();

  useEffect(() => {
    loadSubjectsAndClasses();
  }, []);

  const loadSubjectsAndClasses = async () => {
    try {
      // Load subjects
      const subjectsResponse = await fetch('/api/subjects');
      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json();
        setSubjects(subjectsData.items || []);
      }

      // Load classes
      const classesResponse = await fetch('/api/classes');
      if (classesResponse.ok) {
        const classesData = await classesResponse.json();
        setClasses(classesData.classes || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load subjects and classes');
    }
  };

  const onSubmit = async (data: ExamFormData) => {
    setLoading(true);
    try {
      // Find the selected subject and class IDs
      const selectedSubject = subjects.find(s => s.name === data.subject);
      const selectedClass = classes.find(c => c.name === data.class);

      if (!selectedSubject) {
        toast.error('Selected subject not found');
        return;
      }

      // Prepare exam data
      const examData: any = {
        title: data.title,
        description: data.instructions,
        duration: data.duration,
        totalMarks: data.totalMarks,
        passingMarks: Math.floor(data.totalMarks * 0.6),
        subjectId: selectedSubject.id,
        enableQuestionShuffling: data.enableQuestionShuffling,
        enableBrowserLock: data.enableBrowserLock,
        enableFullscreenMode: data.enableFullscreenMode,
        enableTabSwitchingPrevention: data.enableTabSwitchingPrevention,
        enableOptionShuffling: data.enableOptionShuffling,
        enableTimeLimit: data.enableTimeLimit,
        enableAutoSubmit: data.enableAutoSubmit,
        maxAttempts: data.maxAttempts,
        allowRetakes: data.allowRetakes,
        showResultsImmediately: data.showResultsImmediately,
        allowReview: data.allowReview,
        isPublished: false,
        isActive: false
      };

      // Set timing
      if (data.scheduledDate && data.scheduledTime) {
        const scheduledDateTime = new Date(`${data.scheduledDate}T${data.scheduledTime}`);
        examData.startTime = scheduledDateTime.toISOString();
        examData.endTime = addMinutes(scheduledDateTime, data.duration).toISOString();
      } else {
        // Default future dates
        const defaultStart = addMinutes(new Date(), 60);
        examData.startTime = defaultStart.toISOString();
        examData.endTime = addMinutes(defaultStart, data.duration).toISOString();
      }

      if (selectedClass?.id) {
        examData.classId = selectedClass.id;
      }

      const response = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create exam');
      }

      const createdExam = await response.json();
      
      toast.success('Exam created successfully!');
      setIsOpen(false);
      reset();
      
      if (onExamCreated) {
        onExamCreated(createdExam.id);
      }

      // Navigate to questions page with defaults
      const qs = new URLSearchParams();
      if (data.defaultQuestionCount > 0) qs.set('count', String(data.defaultQuestionCount));
      if (data.defaultQuestionType) qs.set('type', data.defaultQuestionType);
      const query = qs.toString();
      const questionsUrl = `/dashboard/college-admin/exams/${createdExam.id}/questions${query ? `?${query}` : ''}`;
      router.push(questionsUrl);

    } catch (error) {
      console.error('Error creating exam:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableSubjects = () => {
    if (!watchedValues.class) {
      return subjects;
    }
    return subjects.filter(subject => 
      !subject.classId || subject.classId === classes.find(c => c.name === watchedValues.class)?.id
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Enhanced Exam
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Enhanced Exam/Test</DialogTitle>
          <DialogDescription>
            Create a comprehensive exam with advanced settings and anti-cheating features.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Exam Title *</Label>
                      <Controller
                        name="title"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="e.g., Mathematics Test - Chapter 1"
                            className={errors.title ? 'border-red-500' : ''}
                          />
                        )}
                      />
                      {errors.title && (
                        <p className="text-sm text-red-500">{errors.title.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="type">Type *</Label>
                      <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select exam type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="test">Test</SelectItem>
                              <SelectItem value="exam">Exam</SelectItem>
                              <SelectItem value="quiz">Quiz</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="class">Class (Optional)</Label>
                      <Controller
                        name="class"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select class (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All Classes</SelectItem>
                              {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.name}>
                                  {cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Controller
                        name="subject"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableSubjects().map((subject) => (
                                <SelectItem key={subject.id} value={subject.name}>
                                  {subject.name} {subject.code ? `(${subject.code})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.subject && (
                        <p className="text-sm text-red-500">{errors.subject.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions">Instructions for Students</Label>
                    <Controller
                      name="instructions"
                      control={control}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          placeholder="Enter any special instructions for students..."
                          rows={3}
                        />
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Exam Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (minutes) *</Label>
                      <Controller
                        name="duration"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            min="5"
                            max="480"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                          />
                        )}
                      />
                      {errors.duration && (
                        <p className="text-sm text-red-500">{errors.duration.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="totalMarks">Total Marks *</Label>
                      <Controller
                        name="totalMarks"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            max="1000"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 50)}
                          />
                        )}
                      />
                      {errors.totalMarks && (
                        <p className="text-sm text-red-500">{errors.totalMarks.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduledDate">Schedule Date</Label>
                      <Controller
                        name="scheduledDate"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="date"
                            min={format(new Date(), 'yyyy-MM-dd')}
                          />
                        )}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="scheduledTime">Schedule Time</Label>
                      <Controller
                        name="scheduledTime"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="time"
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Question Setup (Optional)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Default Question Type</Label>
                        <Controller
                          name="defaultQuestionType"
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
                        <Label>Number of Questions</Label>
                        <Controller
                          name="defaultQuestionCount"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              max="200"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Anti-Cheating Settings
                  </CardTitle>
                  <CardDescription>
                    Configure security measures to prevent cheating during exams
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Browser Lock</Label>
                          <p className="text-sm text-muted-foreground">
                            Prevent students from switching browsers
                          </p>
                        </div>
                        <Controller
                          name="enableBrowserLock"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Fullscreen Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            Force fullscreen during exam
                          </p>
                        </div>
                        <Controller
                          name="enableFullscreenMode"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Tab Switching Prevention</Label>
                          <p className="text-sm text-muted-foreground">
                            Block switching between tabs
                          </p>
                        </div>
                        <Controller
                          name="enableTabSwitchingPrevention"
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

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Question Shuffling</Label>
                          <p className="text-sm text-muted-foreground">
                            Randomize question order
                          </p>
                        </div>
                        <Controller
                          name="enableQuestionShuffling"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Option Shuffling</Label>
                          <p className="text-sm text-muted-foreground">
                            Randomize multiple choice options
                          </p>
                        </div>
                        <Controller
                          name="enableOptionShuffling"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Auto Submit</Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically submit when time expires
                          </p>
                        </div>
                        <Controller
                          name="enableAutoSubmit"
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Advanced Settings
                  </CardTitle>
                  <CardDescription>
                    Configure advanced exam behavior and student experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxAttempts">Maximum Attempts</Label>
                      <Controller
                        name="maxAttempts"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            max="10"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        )}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Controller
                        name="timezone"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UTC">UTC</SelectItem>
                              <SelectItem value="America/New_York">Eastern Time</SelectItem>
                              <SelectItem value="America/Chicago">Central Time</SelectItem>
                              <SelectItem value="America/Denver">Mountain Time</SelectItem>
                              <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow Retakes</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow students to retake the exam
                        </p>
                      </div>
                      <Controller
                        name="allowRetakes"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Results Immediately</Label>
                        <p className="text-sm text-muted-foreground">
                          Display results right after submission
                        </p>
                      </div>
                      <Controller
                        name="showResultsImmediately"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow Review</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow students to review their answers
                        </p>
                      </div>
                      <Controller
                        name="allowReview"
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsOpen(false);
                if (onCancel) onCancel();
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid || loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Creating...' : 'Create Exam'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
