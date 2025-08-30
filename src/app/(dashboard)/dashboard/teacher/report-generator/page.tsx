'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Check, AlertCircle, FileText, Calendar, Clock, Download } from 'lucide-react';

export default function ReportGeneratorPage() {
  const [activeTab, setActiveTab] = useState('generate');
  const [reportType, setReportType] = useState('student');
  const [targetId, setTargetId] = useState('');
  const [reportTemplate, setReportTemplate] = useState('performance_summary');
  const [frequency, setFrequency] = useState('weekly');
  const [recipients, setRecipients] = useState('');
  const [sections, setSections] = useState([
    { id: 'metrics', title: 'Performance Metrics', selected: true },
    { id: 'chart', title: 'Performance Charts', selected: true },
    { id: 'table', title: 'Recent Exams Table', selected: true },
    { id: 'recommendations', title: 'Recommendations', selected: true }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null);
  const [scheduledReportId, setScheduledReportId] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (!targetId || !reportTemplate) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // In a real implementation, this would call the API
      // For demo purposes, we'll simulate a response
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setGeneratedReportId(`report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
      setSuccess(true);
    } catch (err) {
      setError('Failed to generate report');
      console.error('Error generating report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleReport = async () => {
    if (!targetId || !reportTemplate || !frequency || !recipients) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // In a real implementation, this would call the API
      // For demo purposes, we'll simulate a response
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setScheduledReportId(`schedule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
      setSuccess(true);
    } catch (err) {
      setError('Failed to schedule report');
      console.error('Error scheduling report:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (id: string) => {
    setSections(sections.map(section => 
      section.id === id 
        ? { ...section, selected: !section.selected } 
        : section
    ));
  };

  const getTargetLabel = () => {
    switch (reportType) {
      case 'student': return 'Student ID';
      case 'class': return 'Class ID';
      case 'subject': return 'Subject ID';
      case 'college': return 'College ID';
      default: return 'Target ID';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Report Generator</h1>
      <p className="text-muted-foreground">
        Generate and schedule reports for students, classes, subjects, or colleges.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="schedule">Schedule Report</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Report</CardTitle>
              <CardDescription>Create a one-time report for a specific target</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student Report</SelectItem>
                      <SelectItem value="class">Class Report</SelectItem>
                      <SelectItem value="subject">Subject Report</SelectItem>
                      <SelectItem value="college">College Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-id">{getTargetLabel()}</Label>
                  <Input
                    id="target-id"
                    placeholder={`Enter ${getTargetLabel().toLowerCase()}`}
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-template">Report Template</Label>
                <Select value={reportTemplate} onValueChange={setReportTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance_summary">Performance Summary</SelectItem>
                    <SelectItem value="detailed_analysis">Detailed Analysis</SelectItem>
                    <SelectItem value="improvement_plan">Improvement Plan</SelectItem>
                    <SelectItem value="comparative_analysis">Comparative Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Report Sections</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {sections.map((section) => (
                    <div key={section.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={section.id}
                        checked={section.selected}
                        onCheckedChange={() => toggleSection(section.id)}
                      />
                      <label
                        htmlFor={section.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {section.title}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && generatedReportId && (
                <Alert className="bg-green-500/10 text-green-500 border-green-500/20">
                  <Check className="h-4 w-4" />
                  <AlertTitle>Report Generated</AlertTitle>
                  <AlertDescription>
                    Report ID: {generatedReportId}
                    <Button variant="link" className="p-0 h-auto ml-2" asChild>
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={handleGenerateReport} disabled={loading} className="w-full">
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Report</CardTitle>
              <CardDescription>Set up automatic report generation and distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule-report-type">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student Report</SelectItem>
                      <SelectItem value="class">Class Report</SelectItem>
                      <SelectItem value="subject">Subject Report</SelectItem>
                      <SelectItem value="college">College Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule-target-id">{getTargetLabel()}</Label>
                  <Input
                    id="schedule-target-id"
                    placeholder={`Enter ${getTargetLabel().toLowerCase()}`}
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-report-template">Report Template</Label>
                <Select value={reportTemplate} onValueChange={setReportTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance_summary">Performance Summary</SelectItem>
                    <SelectItem value="detailed_analysis">Detailed Analysis</SelectItem>
                    <SelectItem value="improvement_plan">Improvement Plan</SelectItem>
                    <SelectItem value="comparative_analysis">Comparative Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipients">Recipients (comma-separated emails)</Label>
                <Input
                  id="recipients"
                  placeholder="email1@example.com, email2@example.com"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Report Sections</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {sections.map((section) => (
                    <div key={`schedule-${section.id}`} className="flex items-center space-x-2">
                      <Checkbox
                        id={`schedule-${section.id}`}
                        checked={section.selected}
                        onCheckedChange={() => toggleSection(section.id)}
                      />
                      <label
                        htmlFor={`schedule-${section.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {section.title}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && scheduledReportId && (
                <Alert className="bg-green-500/10 text-green-500 border-green-500/20">
                  <Check className="h-4 w-4" />
                  <AlertTitle>Report Scheduled</AlertTitle>
                  <AlertDescription>
                    Schedule ID: {scheduledReportId}
                    <div className="mt-1 text-sm">
                      <Clock className="h-3 w-3 inline-block mr-1" />
                      Next generation: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={handleScheduleReport} disabled={loading} className="w-full">
                {loading ? 'Scheduling...' : 'Schedule Report'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>
            View and download recently generated reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-md border">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Performance Summary - Student ID: S12345</div>
                  <div className="text-sm text-muted-foreground">Generated on August 25, 2025</div>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </a>
              </Button>
            </div>
            <div className="flex justify-between items-center p-3 rounded-md border">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Detailed Analysis - Class ID: C789</div>
                  <div className="text-sm text-muted-foreground">Generated on August 20, 2025</div>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
