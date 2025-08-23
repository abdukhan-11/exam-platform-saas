'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

interface TestResult {
  success: boolean;
  data: any;
  error: string | null;
}

interface TestResults {
  create: TestResult;
  read: TestResult;
  update: TestResult;
  delete: TestResult;
  validation: {
    success: boolean;
    tests: Array<{
      test: string;
      success: boolean;
      error: string | null;
    }>;
  };
}

interface TestResponse {
  message: string;
  overallSuccess: boolean;
  results: TestResults;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
  };
}

export default function TestCollegeCrudPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/test-college-crud');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to run tests');
      }
      
      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while running tests');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌';
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Test College CRUD Operations</h1>
        <Button variant="outline" asChild>
          <Link href="/dashboard/superadmin/colleges">Back to Colleges</Link>
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>College CRUD Test Suite</CardTitle>
          <CardDescription>
            Comprehensive testing of Create, Read, Update, Delete operations for colleges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runTests} disabled={isLoading} className="w-full">
            {isLoading ? 'Running Tests...' : 'Run Comprehensive Tests'}
          </Button>
        </CardContent>
      </Card>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {results && (
        <div className="space-y-6">
          {/* Overall Results Summary */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${
                results.overallSuccess ? 'text-green-600' : 'text-red-600'
              }`}>
                {getStatusIcon(results.overallSuccess)} Test Results Summary
              </CardTitle>
              <CardDescription>
                {results.message}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{results.summary.totalTests}</div>
                  <div className="text-sm text-muted-foreground">Total Tests</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{results.summary.passedTests}</div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{results.summary.failedTests}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Test Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Test */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${getStatusColor(results.results.create.success)}`}>
                  {getStatusIcon(results.results.create.success)} Create Test
                </CardTitle>
                <CardDescription>Testing college creation functionality</CardDescription>
              </CardHeader>
              <CardContent>
                {results.results.create.success ? (
                  <div className="space-y-2">
                    <p className="text-sm text-green-600">✅ College created successfully</p>
                    <div className="text-xs bg-muted p-2 rounded">
                      <strong>ID:</strong> {results.results.create.data?.id}<br/>
                      <strong>Name:</strong> {results.results.create.data?.name}<br/>
                      <strong>Email:</strong> {results.results.create.data?.email || 'N/A'}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-red-600">
                    ❌ {results.results.create.error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Read Test */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${getStatusColor(results.results.read.success)}`}>
                  {getStatusIcon(results.results.read.success)} Read Test
                </CardTitle>
                <CardDescription>Testing college retrieval functionality</CardDescription>
              </CardHeader>
              <CardContent>
                {results.results.read.success ? (
                  <div className="space-y-2">
                    <p className="text-sm text-green-600">✅ College retrieved successfully</p>
                    <div className="text-xs bg-muted p-2 rounded">
                      <strong>ID:</strong> {results.results.read.data?.id}<br/>
                      <strong>Name:</strong> {results.results.read.data?.name}<br/>
                      <strong>Address:</strong> {results.results.read.data?.address || 'N/A'}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-red-600">
                    ❌ {results.results.read.error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Update Test */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${getStatusColor(results.results.update.success)}`}>
                  {getStatusIcon(results.results.update.success)} Update Test
                </CardTitle>
                <CardDescription>Testing college update functionality</CardDescription>
              </CardHeader>
              <CardContent>
                {results.results.update.success ? (
                  <div className="space-y-2">
                    <p className="text-sm text-green-600">✅ College updated successfully</p>
                    <div className="text-xs bg-muted p-2 rounded">
                      <strong>ID:</strong> {results.results.update.data?.id}<br/>
                      <strong>Name:</strong> {results.results.update.data?.name}<br/>
                      <strong>Address:</strong> {results.results.update.data?.address || 'N/A'}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-red-600">
                    ❌ {results.results.update.error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delete Test */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${getStatusColor(results.results.delete.success)}`}>
                  {getStatusIcon(results.results.delete.success)} Delete Test
                </CardTitle>
                <CardDescription>Testing college deletion functionality</CardDescription>
              </CardHeader>
              <CardContent>
                {results.results.delete.success ? (
                  <div className="space-y-2">
                    <p className="text-sm text-green-600">✅ College deleted successfully</p>
                    <div className="text-xs bg-muted p-2 rounded">
                      <strong>ID:</strong> {results.results.delete.data?.id}<br/>
                      <strong>Name:</strong> {results.results.delete.data?.name}<br/>
                      <strong>Status:</strong> Deleted
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-red-600">
                    ❌ {results.results.delete.error}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Validation Tests */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${getStatusColor(results.results.validation.success)}`}>
                {getStatusIcon(results.results.validation.success)} Validation Tests
              </CardTitle>
              <CardDescription>Testing data validation and error handling</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.results.validation.tests.map((test, index) => (
                  <div key={index} className={`flex items-center gap-2 p-2 rounded ${
                    test.success ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <span className={test.success ? 'text-green-600' : 'text-red-600'}>
                      {getStatusIcon(test.success)}
                    </span>
                    <span className="font-medium">{test.test}</span>
                    {!test.success && test.error && (
                      <span className="text-sm text-red-600 ml-2">({test.error})</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Raw Data (for debugging) */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Test Data</CardTitle>
              <CardDescription>Complete test response for debugging purposes</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                {JSON.stringify(results, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
