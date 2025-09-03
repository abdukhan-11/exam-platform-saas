'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Eye, 
  Save, 
  Trash2,
  Copy,
  Settings,
  BarChart3,
  Clock,
  Users,
  Database,
  FileSpreadsheet,
  FileJson,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Play,
  Pause,
  Square as Stop,
  Info,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Validation schemas
const questionOptionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
  isCorrect: z.boolean().default(false)
});

const questionSchema = z.object({
  text: z.string().min(1, 'Question text is required'),
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY']),
  marks: z.number().min(1, 'Minimum 1 mark').max(100, 'Maximum 100 marks'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  explanation: z.string().optional(),
  options: z.array(questionOptionSchema).optional(),
  correctAnswer: z.string().optional(),
  characterLimit: z.number().optional(),
  wordLimit: z.number().optional(),
  timeLimit: z.number().optional(),
  tags: z.string().optional()
});

const bulkQuestionSchema = z.object({
  questions: z.array(questionSchema)
});

type QuestionData = z.infer<typeof questionSchema>;
type BulkQuestionData = z.infer<typeof bulkQuestionSchema>;

interface BulkQuestionEntryProps {
  examId: string;
  onQuestionsImported?: (questions: QuestionData[]) => void;
  onCancel?: () => void;
}

interface ImportResult {
  success: boolean;
  data?: QuestionData[];
  errors: Array<{
    row: number;
    field: string;
    message: string;
    data: any;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

export default function BulkQuestionEntry({ examId, onQuestionsImported, onCancel }: BulkQuestionEntryProps) {
  const [activeTab, setActiveTab] = useState('import');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<QuestionData[]>([]);
  const [importSettings, setImportSettings] = useState({
    skipDuplicates: true,
    validateOnly: false,
    batchSize: 50,
    autoAssignMarks: false,
    defaultDifficulty: 'MEDIUM' as const,
    defaultType: 'MULTIPLE_CHOICE' as const
  });

  // CSV Template structure
  const csvTemplate = useMemo(() => [
    {
      text: 'What is the capital of France?',
      type: 'MULTIPLE_CHOICE',
      marks: '2',
      difficulty: 'EASY',
      explanation: 'Paris is the capital and largest city of France.',
      options: 'Option A: London|Option B: Paris|Option C: Berlin|Option D: Madrid',
      correctAnswer: 'Option B: Paris',
      characterLimit: '',
      wordLimit: '',
      timeLimit: '',
      tags: 'geography,capital'
    },
    {
      text: 'Is the Earth round?',
      type: 'TRUE_FALSE',
      marks: '1',
      difficulty: 'EASY',
      explanation: 'The Earth is approximately spherical in shape.',
      options: '',
      correctAnswer: 'true',
      characterLimit: '',
      wordLimit: '',
      timeLimit: '',
      tags: 'science,earth'
    },
    {
      text: 'Explain the process of photosynthesis.',
      type: 'ESSAY',
      marks: '10',
      difficulty: 'HARD',
      explanation: 'Photosynthesis is the process by which plants convert light energy into chemical energy.',
      options: '',
      correctAnswer: '',
      characterLimit: '1000',
      wordLimit: '200',
      timeLimit: '15',
      tags: 'biology,photosynthesis'
    }
  ], []);

  // Download CSV template
  const downloadTemplate = useCallback(() => {
    const csv = Papa.unparse(csvTemplate);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'question_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Template downloaded successfully!');
  }, [csvTemplate]);

  // Download JSON template
  const downloadJsonTemplate = useCallback(() => {
    const jsonTemplate = {
      questions: [
        {
          text: 'What is the capital of France?',
          type: 'MULTIPLE_CHOICE',
          marks: 2,
          difficulty: 'EASY',
          explanation: 'Paris is the capital and largest city of France.',
          options: [
            { text: 'London', isCorrect: false },
            { text: 'Paris', isCorrect: true },
            { text: 'Berlin', isCorrect: false },
            { text: 'Madrid', isCorrect: false }
          ],
          correctAnswer: 'Paris',
          characterLimit: 0,
          wordLimit: 0,
          timeLimit: 0,
          tags: ['geography', 'capital']
        }
      ]
    };

    const blob = new Blob([JSON.stringify(jsonTemplate, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'question_template.json');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('JSON template downloaded successfully!');
  }, []);

  // Parse CSV data
  const parseCSVData = useCallback((csvText: string): ImportResult => {
    const result: ImportResult = {
      success: false,
      data: [],
      errors: [],
      warnings: []
    };

    try {
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transform: (value) => value.trim()
      });

      if (parsed.errors.length > 0) {
        result.errors.push(...parsed.errors.map(error => ({
          row: (error.row || 0) + 1,
          field: 'CSV',
          message: error.message,
          data: null
        })));
        return result;
      }

      const questions: QuestionData[] = [];
      
      parsed.data.forEach((row: any, index: number) => {
        try {
          // Parse options for multiple choice questions
          let options = undefined;
          if (row.type === 'MULTIPLE_CHOICE' && row.options) {
            const optionTexts = row.options.split('|');
            options = optionTexts.map((opt: string, optIndex: number) => ({
              text: opt.trim(),
              isCorrect: row.correctAnswer && opt.trim() === row.correctAnswer.trim()
            }));
          }

          // Parse tags
          const tags = row.tags ? row.tags.split(',').map((tag: string) => tag.trim()) : [];

          const questionData: QuestionData = {
            text: row.text || '',
            type: row.type || importSettings.defaultType,
            marks: parseInt(row.marks) || 1,
            difficulty: row.difficulty || importSettings.defaultDifficulty,
            explanation: row.explanation || '',
            options,
            correctAnswer: row.correctAnswer || '',
            characterLimit: parseInt(row.characterLimit) || 0,
            wordLimit: parseInt(row.wordLimit) || 0,
            timeLimit: parseInt(row.timeLimit) || 0,
            tags: tags.join(',')
          };

          // Validate question
          const validation = questionSchema.safeParse(questionData);
          if (validation.success) {
            questions.push(validation.data);
          } else {
            validation.error.issues.forEach((error: any) => {
              result.errors.push({
                row: index + 1,
                field: error.path.join('.'),
                message: error.message,
                data: questionData
              });
            });
          }
        } catch (error) {
          result.errors.push({
            row: index + 1,
            field: 'parsing',
            message: `Failed to parse row: ${error}`,
            data: row
          });
        }
      });

      result.data = questions;
      result.success = result.errors.length === 0;
      
      return result;
    } catch (error) {
      result.errors.push({
        row: 0,
        field: 'CSV',
        message: `Failed to parse CSV: ${error}`,
        data: null
      });
      return result;
    }
  }, [importSettings]);

  // Parse JSON data
  const parseJSONData = useCallback((jsonText: string): ImportResult => {
    const result: ImportResult = {
      success: false,
      data: [],
      errors: [],
      warnings: []
    };

    try {
      const parsed = JSON.parse(jsonText);
      const validation = bulkQuestionSchema.safeParse(parsed);
      
      if (validation.success) {
        result.data = validation.data.questions;
        result.success = true;
      } else {
        validation.error.issues.forEach((error: any) => {
          result.errors.push({
            row: 0,
            field: error.path.join('.'),
            message: error.message,
            data: parsed
          });
        });
      }
    } catch (error) {
      result.errors.push({
        row: 0,
        field: 'JSON',
        message: `Failed to parse JSON: ${error}`,
        data: null
      });
    }

    return result;
  }, []);

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setImportResult(null);

    try {
      const file = acceptedFiles[0];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      let result: ImportResult;

      if (fileExtension === 'csv') {
        const text = await file.text();
        result = parseCSVData(text);
      } else if (fileExtension === 'json') {
        const text = await file.text();
        result = parseJSONData(text);
      } else {
        toast.error('Unsupported file format. Please use CSV or JSON files.');
        setIsProcessing(false);
        return;
      }

      setImportResult(result);
      setProgress(100);

      if (result.success && result.data) {
        setPreviewData(result.data);
        toast.success(`Successfully parsed ${result.data.length} questions!`);
      } else {
        toast.error(`Import failed with ${result.errors.length} errors.`);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [parseCSVData, parseJSONData]);

  // File dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json']
    },
    multiple: false
  });

  // Import questions to database
  const importQuestions = useCallback(async () => {
    if (!importResult?.data || importResult.data.length === 0) {
      toast.error('No valid questions to import');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const batchSize = importSettings.batchSize;
      const totalBatches = Math.ceil(importResult.data.length / batchSize);
      let importedCount = 0;

      for (let i = 0; i < totalBatches; i++) {
        const batch = importResult.data.slice(i * batchSize, (i + 1) * batchSize);
        
        const response = await fetch('/api/questions/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId,
            questions: batch
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to import questions');
        }

        importedCount += batch.length;
        setProgress((importedCount / importResult.data.length) * 100);
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast.success(`Successfully imported ${importedCount} questions!`);
      
      if (onQuestionsImported) {
        onQuestionsImported(importResult.data);
      }
    } catch (error) {
      console.error('Error importing questions:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import questions');
    } finally {
      setIsProcessing(false);
    }
  }, [importResult, importSettings, examId, onQuestionsImported]);

  // Export questions to CSV
  const exportToCSV = useCallback(async () => {
    try {
      const response = await fetch(`/api/questions/export?examId=${examId}&format=csv`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exam-${examId}-questions.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Questions exported to CSV successfully!');
      } else {
        throw new Error('Failed to export questions');
      }
    } catch (error) {
      console.error('Error exporting questions:', error);
      toast.error('Failed to export questions');
    }
  }, [examId]);

  // Export questions to JSON
  const exportToJSON = useCallback(async () => {
    try {
      const response = await fetch(`/api/questions/export?examId=${examId}&format=json`);
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
        toast.success('Questions exported to JSON successfully!');
      } else {
        throw new Error('Failed to export questions');
      }
    } catch (error) {
      console.error('Error exporting questions:', error);
      toast.error('Failed to export questions');
    }
  }, [examId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Question Management</h2>
          <p className="text-muted-foreground">
            Import and export questions in bulk using CSV or JSON formats
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            disabled={!previewData.length}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview ({previewData.length})
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import">Import Questions</TabsTrigger>
          <TabsTrigger value="export">Export Questions</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          {/* Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download Templates
              </CardTitle>
              <CardDescription>
                Download templates to understand the required format for importing questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="h-6 w-6" />
                  <span>CSV Template</span>
                  <span className="text-xs text-muted-foreground">For spreadsheet editing</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={downloadJsonTemplate}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                >
                  <FileJson className="h-6 w-6" />
                  <span>JSON Template</span>
                  <span className="text-xs text-muted-foreground">For programmatic use</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Import Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Import Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Batch Size</Label>
                  <Select
                    value={String(importSettings.batchSize)}
                    onValueChange={(value) => setImportSettings(prev => ({
                      ...prev,
                      batchSize: parseInt(value)
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 questions</SelectItem>
                      <SelectItem value="50">50 questions</SelectItem>
                      <SelectItem value="100">100 questions</SelectItem>
                      <SelectItem value="200">200 questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Default Difficulty</Label>
                  <Select
                    value={importSettings.defaultDifficulty}
                    onValueChange={(value: any) => setImportSettings(prev => ({
                      ...prev,
                      defaultDifficulty: value
                    }))}
                  >
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
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={importSettings.skipDuplicates}
                    onCheckedChange={(checked) => setImportSettings(prev => ({
                      ...prev,
                      skipDuplicates: checked
                    }))}
                  />
                  <Label>Skip duplicate questions</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={importSettings.validateOnly}
                    onCheckedChange={(checked) => setImportSettings(prev => ({
                      ...prev,
                      validateOnly: checked
                    }))}
                  />
                  <Label>Validate only (don't import)</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload File
              </CardTitle>
              <CardDescription>
                Drag and drop a CSV or JSON file, or click to browse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                {isDragActive ? (
                  <p className="text-lg font-medium text-blue-600">Drop the file here...</p>
                ) : (
                  <div>
                    <p className="text-lg font-medium">Drag & drop a file here, or click to select</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Supports CSV and JSON files up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Processing Progress */}
          {isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Processing File
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    {progress < 100 ? 'Processing...' : 'Processing complete!'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  )}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {importResult.data?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Valid Questions</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {importResult.errors.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {importResult.warnings.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Warnings</div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Errors:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                          Row {error.row}: {error.field} - {error.message}
                        </div>
                      ))}
                      {importResult.errors.length > 10 && (
                        <div className="text-sm text-muted-foreground">
                          ... and {importResult.errors.length - 10} more errors
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {importResult.success && importResult.data && (
                  <div className="flex gap-2">
                    <Button
                      onClick={importQuestions}
                      disabled={isProcessing || importSettings.validateOnly}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Import {importResult.data.length} Questions
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => setPreviewData(importResult.data || [])}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Questions
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Questions
              </CardTitle>
              <CardDescription>
                Export all questions from this exam in various formats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={exportToCSV}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="h-6 w-6" />
                  <span>Export to CSV</span>
                  <span className="text-xs text-muted-foreground">For spreadsheet editing</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={exportToJSON}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                >
                  <FileJson className="h-6 w-6" />
                  <span>Export to JSON</span>
                  <span className="text-xs text-muted-foreground">For programmatic use</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
            <DialogDescription>
              Preview of {previewData.length} questions to be imported
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {previewData.map((question, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{question.type.replace('_', ' ')}</Badge>
                      <Badge variant="secondary">{question.marks} marks</Badge>
                      <Badge>{question.difficulty}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="font-medium">Question:</Label>
                    <p className="mt-1">{question.text}</p>
                  </div>
                  
                  {question.explanation && (
                    <div>
                      <Label className="font-medium">Explanation:</Label>
                      <p className="mt-1 text-sm text-muted-foreground">{question.explanation}</p>
                    </div>
                  )}
                  
                  {question.type === 'MULTIPLE_CHOICE' && question.options && (
                    <div>
                      <Label className="font-medium">Options:</Label>
                      <div className="mt-1 space-y-1">
                        {question.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <input type="radio" disabled />
                            <span className={option.isCorrect ? 'font-semibold text-green-600' : ''}>
                              {option.text}
                            </span>
                            {option.isCorrect && <CheckCircle className="h-4 w-4 text-green-500" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {question.type === 'TRUE_FALSE' && (
                    <div>
                      <Label className="font-medium">Correct Answer:</Label>
                      <p className="mt-1 font-semibold">{question.correctAnswer}</p>
                    </div>
                  )}
                  
                  {(question.characterLimit || question.wordLimit || question.timeLimit) && (
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {question.characterLimit && <span>Char limit: {question.characterLimit}</span>}
                      {question.wordLimit && <span>Word limit: {question.wordLimit}</span>}
                      {question.timeLimit && <span>Time limit: {question.timeLimit} min</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
