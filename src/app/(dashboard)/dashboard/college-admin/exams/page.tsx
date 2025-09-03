'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  BarChart3
} from 'lucide-react';

interface Exam {
  id: string;
  title: string;
  subject: string;
  class: string;
  type: 'test' | 'exam' | 'quiz';
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  duration: number; // in minutes
  totalMarks: number;
  scheduledDate?: string;
  questionsCount: number;
  participantsCount?: number;
}

interface ExamFormData {
  title: string;
  subject: string;
  class: string;
  type: 'test' | 'exam' | 'quiz';
  duration: number;
  totalMarks: number;
  instructions: string;
  scheduledDate: string;
}

export default function ExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  // Default question setup for post-creation flow
  const [defaultQuestionType, setDefaultQuestionType] = useState<'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY'>('MULTIPLE_CHOICE');
  const [defaultQuestionCount, setDefaultQuestionCount] = useState<number>(0);
  const [examForm, setExamForm] = useState<ExamFormData>({
    title: '',
    subject: '',
    class: '',
    type: 'test',
    duration: 30,
    totalMarks: 50,
    instructions: '',
    scheduledDate: ''
  });

  useEffect(() => {
    loadExams();
    loadSubjectsAndClasses();
  }, []);



  const loadSubjectsAndClasses = async () => {
    try {
      setLoadingData(true);
      
      // Load subjects
      const subjectsResponse = await fetch('/api/subjects');
      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json();
        setSubjects(subjectsData.items || []);
      } else {
        console.error('Failed to load subjects:', subjectsResponse.status);
        // Fallback subjects if API fails
        setSubjects([
          { id: '1', name: 'Mathematics', code: 'MATH' },
          { id: '2', name: 'Physics', code: 'PHY' },
          { id: '3', name: 'Chemistry', code: 'CHEM' },
          { id: '4', name: 'Biology', code: 'BIO' },
          { id: '5', name: 'English', code: 'ENG' },
          { id: '6', name: 'Computer Science', code: 'CS' }
        ]);
      }

      // Load classes
      const classesResponse = await fetch('/api/classes');
      if (classesResponse.ok) {
        const classesData = await classesResponse.json();
        setClasses(classesData.classes || []);
      } else {
        console.error('Failed to load classes:', classesResponse.status);
        // Fallback classes if API fails
        setClasses([
          { id: '1', name: 'Class 1st' },
          { id: '2', name: 'Class 2nd' },
          { id: '3', name: 'Class 3rd' },
          { id: '4', name: 'Class 4th' },
          { id: '5', name: 'Class 5th' }
        ]);
      }
    } catch (error) {
      console.error('Error loading subjects and classes:', error);
      // Set fallback data on complete failure
      setSubjects([
        { id: '1', name: 'Mathematics', code: 'MATH' },
        { id: '2', name: 'Physics', code: 'PHY' },
        { id: '3', name: 'Chemistry', code: 'CHEM' },
        { id: '4', name: 'Biology', code: 'BIO' },
        { id: '5', name: 'English', code: 'ENG' },
        { id: '6', name: 'Computer Science', code: 'CS' }
      ]);
      setClasses([
        { id: '1', name: 'Class 1st' },
        { id: '2', name: 'Class 2nd' },
        { id: '3', name: 'Class 3rd' },
        { id: '4', name: 'Class 4th' },
        { id: '5', name: 'Class 5th' }
      ]);
    } finally {
      setLoadingData(false);
    }
  };

  const loadExams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/exams', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load exams');
      }

      const data = await response.json();
      const formattedExams: Exam[] = data.items.map((exam: any) => ({
        id: exam.id,
        title: exam.title,
        subject: exam.subject?.name || 'Unknown Subject',
        class: exam.class?.name || 'All Classes',
        type: exam.duration <= 30 ? 'quiz' : exam.duration <= 60 ? 'test' : 'exam',
        status: exam.isPublished && exam.isActive ? (new Date(exam.endTime) < new Date() ? 'completed' : 'scheduled') : 'draft',
        duration: exam.duration,
        totalMarks: exam.totalMarks,
        scheduledDate: exam.startTime,
        questionsCount: exam.questions?.length || 0,
        participantsCount: exam.examResults?.length || 0
      }));
      
      setExams(formattedExams);
    } catch (error) {
      console.error('Error loading exams:', error);
      // Fallback to empty array on error
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'test': return <PenTool className="h-4 w-4" />;
      case 'exam': return <BookOpen className="h-4 w-4" />;
      case 'quiz': return <CheckCircle className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  // Handle form submission - Connect to real API
  const handleCreateExam = async (isDraft: boolean = false) => {
    if (!examForm.title || !examForm.subject) {
      alert('Please fill in all required fields (Title and Subject are required)');
      return;
    }

    if (subjects.length === 0) {
      alert('No subjects available. Please refresh the page or contact your administrator.');
      return;
    }

    try {
      // Find the selected subject and class IDs
      const selectedSubject = subjects.find(s => s.name === examForm.subject);
      const selectedClass = classes.find(c => c.name === examForm.class);

      if (!selectedSubject) {
        alert(`Selected subject "${examForm.subject}" not found in available subjects. Please refresh the page and try again.`);
        return;
      }

      // Create exam via API
      const examData: any = {
        title: examForm.title,
        description: examForm.instructions,
        duration: examForm.duration,
        totalMarks: examForm.totalMarks,
        passingMarks: Math.floor(examForm.totalMarks * 0.6), // 60% passing
        subjectId: selectedSubject.id,
        enableQuestionShuffling: true,
        enableBrowserLock: true,
        enableFullscreenMode: true,
        maxAttempts: 1,
        allowRetakes: false,
        isPublished: !isDraft, // Publish immediately if not draft
        isActive: true, // Always active when created
      };

      // Set timing based on draft status and scheduled date
      if (isDraft) {
        // For drafts, set future dates or leave empty
        if (examForm.scheduledDate) {
          examData.startTime = new Date(examForm.scheduledDate).toISOString();
          examData.endTime = new Date(new Date(examForm.scheduledDate).getTime() + examForm.duration * 60 * 1000).toISOString();
        } else {
          // Set default future dates for draft
          examData.startTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          examData.endTime = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
        }
      } else {
        // For live creation, schedule date is optional - set default if not provided
        if (examForm.scheduledDate) {
          examData.startTime = new Date(examForm.scheduledDate).toISOString();
          examData.endTime = new Date(new Date(examForm.scheduledDate).getTime() + examForm.duration * 60 * 1000).toISOString();
        } else {
          // Set default future dates for live creation without schedule
          examData.startTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          examData.endTime = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
        }
      }

      // Only add classId if a class is selected
      if (selectedClass?.id) {
        examData.classId = selectedClass.id;
      }

      const response = await fetch('/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(examData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create exam (Status: ${response.status})`);
      }

      const createdExam = await response.json();
      
      // Reload exams to get the updated list
      await loadExams();
      setIsCreatingExam(false);
      
      // Reset form
      setExamForm({
        title: '',
        subject: '',
        class: '',
        type: 'test',
        duration: 30,
        totalMarks: 50,
        instructions: '',
        scheduledDate: ''
      });

      // Handle navigation based on action type
      if (isDraft) {
        // For drafts, show confirmation and offer to add questions
        const actionText = 'saved as draft';
        const shouldAddQuestions = confirm(`✅ Exam "${examForm.title}" ${actionText} successfully!\n\n📝 Next Step: Add questions to complete your exam.\n\nWould you like to add questions now?`);
      
        if (shouldAddQuestions) {
          // Navigate to the questions page
          const qs = new URLSearchParams();
          if (defaultQuestionCount && defaultQuestionCount > 0) qs.set('count', String(defaultQuestionCount));
          if (defaultQuestionType) qs.set('type', defaultQuestionType);
          const query = qs.toString();
          const questionsUrl = `/dashboard/college-admin/exams/${createdExam.id}/questions${query ? `?${query}` : ''}`;
          router.push(questionsUrl);
        }
      } else {
        // For live creation, directly open the add question page
        const actionText = 'created successfully';
        
        // Navigate to the questions page for live exam creation
        const qs = new URLSearchParams();
        if (defaultQuestionCount && defaultQuestionCount > 0) qs.set('count', String(defaultQuestionCount));
        if (defaultQuestionType) qs.set('type', defaultQuestionType);
        const query = qs.toString();
        const questionsUrl = `/dashboard/college-admin/exams/${createdExam.id}/questions${query ? `?${query}` : ''}`;
        router.push(questionsUrl);
      }
      
    } catch (error) {
      console.error('Error creating exam:', error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`Failed to create exam: ${errorMessage}`);
    }
  };

  const startExam = async (examId: string) => {
    try {
      console.log('Starting exam with ID:', examId);
      
      // First, ensure the exam is published
      const publishResponse = await fetch(`/api/exams/${examId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // If already published, that's fine (409 status)
      if (!publishResponse.ok && publishResponse.status !== 409) {
        const errorData = await publishResponse.json();
        console.error('Publish exam error response:', errorData);
        throw new Error(errorData.error || `Failed to publish exam (Status: ${publishResponse.status})`);
      }

      // Then activate the exam
      const activateResponse = await fetch(`/api/exams/${examId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Activate exam response status:', activateResponse.status);
      console.log('Activate exam response ok:', activateResponse.ok);

      if (!activateResponse.ok) {
        let errorData: { error?: string } = {};
        try {
          errorData = await activateResponse.json();
        } catch (parseError) {
          console.error('Failed to parse activate response:', parseError);
          errorData = { error: `HTTP ${activateResponse.status}: ${activateResponse.statusText}` };
        }
        console.error('Activate exam error response:', errorData);
        console.error('Activate exam response status:', activateResponse.status);
        console.error('Activate exam response headers:', Object.fromEntries(activateResponse.headers.entries()));
        throw new Error(errorData.error || `Failed to activate exam (Status: ${activateResponse.status})`);
      }

      // Reload exams to update the list
      await loadExams();
      
      alert('Exam started successfully! Students can now access this exam.');
      
    } catch (error) {
      console.error('Error starting exam:', error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`Failed to start exam: ${errorMessage}`);
    }
  };

  // Get available subjects for the selected class
  const getAvailableSubjects = () => {
    if (!examForm.class) {
      return subjects; // Show all subjects if no class selected
    }
    return subjects.filter(subject => 
      !subject.classId || subject.classId === classes.find(c => c.name === examForm.class)?.id
    );
  };

  const upcomingExams = exams.filter(exam => exam.status === 'scheduled');
  const draftExams = exams.filter(exam => exam.status === 'draft');
  const completedExams = exams.filter(exam => exam.status === 'completed');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Exam/Test Creation</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Exam & Test Management</h1>
          <p className="text-muted-foreground">Create and manage MCQ tests and exams for all classes</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreatingExam} onOpenChange={setIsCreatingExam}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Create New Exam/Test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Exam/Test</DialogTitle>
              <DialogDescription>
                Fill in the details below to create a new exam or test for your students.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">
                      {subjects.length} subjects, {classes.length} classes
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={loadSubjectsAndClasses}
                      disabled={loadingData}
                    >
                      {loadingData ? "Loading..." : "Refresh Data"}
                    </Button>

                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Exam Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Mathematics Test - Chapter 1"
                      value={examForm.title}
                      onChange={(e) => setExamForm({...examForm, title: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select 
                      value={examForm.type} 
                      onValueChange={(value) => {
                        setExamForm(prev => ({...prev, type: value as 'test' | 'exam' | 'quiz'}));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select exam type">
                          {examForm.type === 'test' && 'Test'}
                          {examForm.type === 'exam' && 'Exam'}
                          {examForm.type === 'quiz' && 'Quiz'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="exam">Exam</SelectItem>
                        <SelectItem value="quiz">Quiz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="class">Class (Optional)</Label>
                    <Select 
                      value={examForm.class} 
                      onValueChange={(value) => {
                        setExamForm(prev => ({...prev, class: value, subject: ''}));
                      }}
                      disabled={loadingData}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingData ? "Loading classes..." : "Select class (optional)"}>
                          {examForm.class === '' ? 'All Classes' : examForm.class}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Classes</SelectItem>
                        {classes.length > 0 ? (
                          classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.name}>
                              {cls.name}
                            </SelectItem>
                          ))
                        ) : (
                          !loadingData && <div className="px-2 py-1.5 text-sm text-muted-foreground">No classes available</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Select 
                      value={examForm.subject} 
                      onValueChange={(value) => {
                        setExamForm(prev => ({...prev, subject: value}));
                      }}
                      disabled={loadingData}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingData ? "Loading subjects..." : "Select subject"}>
                          {examForm.subject}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableSubjects().length > 0 ? (
                          getAvailableSubjects().map((subject) => (
                            <SelectItem key={subject.id} value={subject.name}>
                              {subject.name} {subject.code ? `(${subject.code})` : ''}
                            </SelectItem>
                          ))
                        ) : (
                          !loadingData && <div className="px-2 py-1.5 text-sm text-muted-foreground">No subjects available</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Exam Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Exam Settings</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="5"
                      max="180"
                      value={examForm.duration}
                      onChange={(e) => setExamForm({...examForm, duration: parseInt(e.target.value) || 30})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="totalMarks">Total Marks *</Label>
                    <Input
                      id="totalMarks"
                      type="number"
                      min="1"
                      max="1000"
                      value={examForm.totalMarks}
                      onChange={(e) => setExamForm({...examForm, totalMarks: parseInt(e.target.value) || 50})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Schedule Date & Time (Optional)</Label>
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    value={examForm.scheduledDate}
                    onChange={(e) => setExamForm({...examForm, scheduledDate: e.target.value})}
                  />
                  <p className="text-sm text-muted-foreground">
                    Optional: Set a specific date and time. Leave empty to use default scheduling.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions for Students</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Enter any special instructions for students..."
                    value={examForm.instructions}
                    onChange={(e) => setExamForm({...examForm, instructions: e.target.value})}
                    rows={3}
                  />
                </div>
              </div>

              {/* Question Setup (Optional fast start on questions page) */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Question Setup (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Default Question Type</Label>
                    <Select value={defaultQuestionType} onValueChange={(v) => setDefaultQuestionType(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select question type" />
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
                    <Label htmlFor="questionCount">Number of Questions (optional)</Label>
                    <Input
                      id="questionCount"
                      type="number"
                      min="0"
                      max="200"
                      value={defaultQuestionCount}
                      onChange={(e) => setDefaultQuestionCount(parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">We'll preconfigure the questions page with these defaults.</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsCreatingExam(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleCreateExam(true)} 
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  Save as Draft
                </Button>
                <Button 
                  onClick={() => handleCreateExam(false)} 
                  className="bg-green-600 hover:bg-green-700"
                >
                  Create Exam/Test
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
          <Button 
            variant="outline" 
            onClick={() => window.open('/dashboard/exam-management', '_blank')}
          >
            <Eye className="h-4 w-4 mr-2" />
            Manage All Exams
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exams.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingExams.length}</div>
            <p className="text-xs text-muted-foreground">Scheduled exams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftExams.length}</div>
            <p className="text-xs text-muted-foreground">Being prepared</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedExams.length}</div>
            <p className="text-xs text-muted-foreground">Finished exams</p>
          </CardContent>
        </Card>
      </div>

      {/* Exams Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming Exams</TabsTrigger>
          <TabsTrigger value="drafts">Draft Exams</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Exams & Tests</CardTitle>
              <CardDescription>Exams that are scheduled and ready for students</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming exams scheduled</p>
                </div>
              ) : (
                upcomingExams.map((exam) => (
                  <Card key={exam.id} className="p-4 border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getTypeIcon(exam.type)}
                          <h3 className="font-semibold">{exam.title}</h3>
                          <Badge className={getStatusColor(exam.status)}>
                            {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                          </Badge>
                          <Badge variant="outline">
                            {exam.class}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Subject:</span> {exam.subject}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span> {exam.duration} mins
                          </div>
                          <div>
                            <span className="font-medium">Questions:</span> {exam.questionsCount}
                          </div>
                          <div>
                            <span className="font-medium">Total Marks:</span> {exam.totalMarks}
                          </div>
                          {exam.scheduledDate && (
                            <div className="col-span-2">
                              <span className="font-medium">Scheduled:</span> {new Date(exam.scheduledDate).toLocaleString()}
                            </div>
                          )}
                          {exam.participantsCount && (
                            <div>
                              <span className="font-medium">Students:</span> {exam.participantsCount}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/dashboard/exam-management/${exam.id}/preview`, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/dashboard/college-admin/exams/${exam.id}/questions`, '_blank')}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Add Questions
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => window.open(`/dashboard/college-admin/exams/${exam.id}/monitor`, '_blank')}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Monitor Live
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`/dashboard/college-admin/exams/${exam.id}/analytics`, '_blank')}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Analytics
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => startExam(exam.id)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Exam
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Draft Exams</CardTitle>
              <CardDescription>Exams being prepared - add questions and schedule them</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {draftExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Edit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No draft exams</p>
                </div>
              ) : (
                draftExams.map((exam) => (
                  <Card key={exam.id} className="p-4 border-l-4 border-l-gray-500">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getTypeIcon(exam.type)}
                          <h3 className="font-semibold">{exam.title}</h3>
                          <Badge className={getStatusColor(exam.status)}>
                            {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                          </Badge>
                          <Badge variant="outline">
                            {exam.class}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Subject:</span> {exam.subject}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span> {exam.duration} mins
                          </div>
                          <div>
                            <span className="font-medium">Questions:</span> {exam.questionsCount}
                          </div>
                          <div>
                            <span className="font-medium">Total Marks:</span> {exam.totalMarks}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/dashboard/exam-management/${exam.id}/preview`, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/dashboard/college-admin/exams/${exam.id}/questions`, '_blank')}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Add Questions
                        </Button>
                        <Button size="sm" variant="outline">
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Exams</CardTitle>
              <CardDescription>View results and performance analytics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {completedExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed exams yet</p>
                </div>
              ) : (
                completedExams.map((exam) => (
                  <Card key={exam.id} className="p-4 border-l-4 border-l-purple-500">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getTypeIcon(exam.type)}
                          <h3 className="font-semibold">{exam.title}</h3>
                          <Badge className={getStatusColor(exam.status)}>
                            {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                          </Badge>
                          <Badge variant="outline">
                            {exam.class}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Subject:</span> {exam.subject}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span> {exam.duration} mins
                          </div>
                          <div>
                            <span className="font-medium">Participants:</span> {exam.participantsCount}
                          </div>
                          <div>
                            <span className="font-medium">Total Marks:</span> {exam.totalMarks}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/dashboard/college-admin/reports?examId=${exam.id}`, '_blank')}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Analytics
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/dashboard/exam-management/${exam.id}/preview`, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button variant="outline" size="sm">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Export Report
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
