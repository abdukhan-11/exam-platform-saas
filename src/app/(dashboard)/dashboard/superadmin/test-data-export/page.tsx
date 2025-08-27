'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function TestDataExportPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Test Data Export Service
  const testDataExport = async () => {
    try {
      setIsLoading(true);
      addResult('Testing Data Export Service...');
      
      const response = await fetch('/api/admin/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'analytics',
          format: 'csv'
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'analytics-export.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        addResult('✅ Analytics export successful - file downloaded');
      } else {
        addResult(`❌ Analytics export failed: ${response.status}`);
      }
    } catch (error) {
      addResult(`❌ Error testing data export: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test Custom Report Builder
  const testCustomReportBuilder = async () => {
    try {
      setIsLoading(true);
      addResult('Testing Custom Report Builder...');
      
      // Test creating a custom query
      const queryResponse = await fetch('/api/admin/reports/custom-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Custom Query',
          description: 'A test custom report query',
          query: 'SELECT * FROM users WHERE role = "STUDENT"',
          filters: { role: 'STUDENT' },
          grouping: ['collegeId'],
          visualization: 'table'
        })
      });
      
      if (queryResponse.ok) {
        const queryData = await queryResponse.json();
        addResult(`✅ Created custom query: ${queryData.name}`);
        
        // Test executing the query
        const executeResponse = await fetch(`/api/admin/reports/custom-queries/${queryData.id}/execute`);
        if (executeResponse.ok) {
          const executeData = await executeResponse.json();
          addResult(`✅ Executed custom query: ${executeData.recordCount} records returned`);
        }
      } else {
        addResult(`❌ Failed to create custom query: ${queryResponse.status}`);
      }
    } catch (error) {
      addResult(`❌ Error testing custom report builder: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test AutomatedReportService
  const testAutomatedReportService = async () => {
    try {
      setIsLoading(true);
      addResult('Testing AutomatedReportService...');
      
      // Test creating a report schedule
      const schedule = await fetch('/api/admin/reports/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Daily Report',
          type: 'daily',
          format: 'csv',
          recipients: ['test@example.com'],
          time: '09:00',
          isActive: true
        })
      });
      
      if (schedule.ok) {
        const scheduleData = await schedule.json();
        addResult(`✅ Created report schedule: ${scheduleData.name}`);
        
        // Test getting all schedules
        const schedules = await fetch('/api/admin/reports/schedules');
        if (schedules.ok) {
          const schedulesData = await schedules.json();
          addResult(`✅ Retrieved ${schedulesData.length} report schedules`);
        }
      } else {
        addResult(`❌ Failed to create report schedule: ${schedule.status}`);
      }
      
      // Test report templates
      const templates = await fetch('/api/admin/reports/templates');
      if (templates.ok) {
        const templatesData = await templates.json();
        addResult(`✅ Retrieved ${templatesData.length} report templates`);
      } else {
        addResult(`❌ Failed to retrieve templates: ${templates.status}`);
      }
      
    } catch (error) {
      addResult(`❌ Error testing AutomatedReportService: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test all features
  const testAllFeatures = async () => {
    await testDataExport();
    await testCustomReportBuilder();
    await testAutomatedReportService();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Export & Reporting Test</h1>
          <p className="text-muted-foreground">
            Test the comprehensive data export and reporting system
          </p>
        </div>
        <Badge variant="secondary">Subtask 5.5</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Data Export Service Test */}
        <Card>
          <CardHeader>
            <CardTitle>Data Export Service</CardTitle>
            <CardDescription>
              Test CSV, Excel, and PDF export functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testDataExport} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Testing...' : 'Test Data Export'}
            </Button>
            <div className="text-sm text-muted-foreground">
              Tests analytics, colleges, users, and activity logs export
            </div>
          </CardContent>
        </Card>

        {/* Custom Report Builder Test */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Report Builder</CardTitle>
            <CardDescription>
              Test dynamic query creation and execution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testCustomReportBuilder} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Testing...' : 'Test Custom Reports'}
            </Button>
            <div className="text-sm text-muted-foreground">
              Tests custom query creation, execution, and export
            </div>
          </CardContent>
        </Card>

        {/* Automated Report Service Test */}
        <Card>
          <CardHeader>
            <CardTitle>Automated Reports</CardTitle>
            <CardDescription>
              Test scheduled reports and templates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testAutomatedReportService} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Testing...' : 'Test Automated Reports'}
            </Button>
            <div className="text-sm text-muted-foreground">
              Tests report scheduling, templates, and execution
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Test */}
      <Card>
        <CardHeader>
          <CardTitle>Comprehensive Test</CardTitle>
          <CardDescription>
            Test all features in sequence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={testAllFeatures} 
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? 'Running All Tests...' : 'Test All Features'}
            </Button>
            <Button 
              onClick={clearResults} 
              variant="outline"
              size="lg"
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            Real-time results from test execution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-muted-foreground">No test results yet. Run a test to see results here.</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono">
                  {result}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Features Implemented</CardTitle>
          <CardDescription>
            Overview of the Data Export and Reporting System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Data Export Service</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• CSV, Excel, and PDF export formats</li>
                <li>• Analytics data export</li>
                <li>• College and user data export</li>
                <li>• Activity logs export</li>
                <li>• Comprehensive platform reports</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Custom Report Builder</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Dynamic query creation</li>
                <li>• Custom filtering and grouping</li>
                <li>• Visualization options</li>
                <li>• Query execution and export</li>
                <li>• Template-based reports</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Automated Report Service</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Scheduled report generation</li>
                <li>• Report templates management</li>
                <li>• Execution history tracking</li>
                <li>• Multiple schedule types (daily, weekly, monthly)</li>
                <li>• In-memory storage for development</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">API Endpoints</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• /api/admin/reports/export</li>
                <li>• /api/admin/reports/schedules</li>
                <li>• /api/admin/reports/templates</li>
                <li>• /api/admin/reports/custom-queries</li>
                <li>• /api/admin/reports/execute-due</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
