'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  User, 
  Users, 
  BookOpen, 
  GraduationCap, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Eye,
  Lock
} from 'lucide-react';

interface RBACTestResult {
  userRole: string;
  timestamp: string;
  tests: {
    superAdminAccess: boolean;
    collegeAdminAccess: boolean;
    teacherAccess: boolean;
    studentAccess: boolean;
  };
  permissions: {
    description: string;
    actions: string[];
    restrictions: string;
    dataAccess: string[];
    apiEndpoints: string[];
    uiComponents: string[];
  };
  message: string;
}

interface RoleTest {
  role: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const roleTests: RoleTest[] = [
  {
    role: 'SUPER_ADMIN',
    description: 'Full system access and control',
    icon: <Shield className="h-5 w-5" />,
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  {
    role: 'COLLEGE_ADMIN',
    description: 'College-level management access',
    icon: <Users className="h-5 w-5" />,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    role: 'TEACHER',
    description: 'Subject and exam management access',
    icon: <BookOpen className="h-5 w-5" />,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    role: 'STUDENT',
    description: 'Personal exam and result access',
    icon: <GraduationCap className="h-5 w-5" />,
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  }
];

export default function RBACTester() {
  const [testResult, setTestResult] = useState<RBACTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const runRBACTest = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/test-rbac');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setTestResult(data.data);
      } else {
        throw new Error(data.message || 'Test failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runRBACTest();
  }, []);

  const getAccessIcon = (hasAccess: boolean) => {
    return hasAccess ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getAccessBadge = (hasAccess: boolean) => {
    return hasAccess ? (
      <Badge variant="success" className="text-xs">
        <CheckCircle className="h-3 w-3 mr-1" />
        Access Granted
      </Badge>
    ) : (
      <Badge variant="destructive" className="text-xs">
        <Lock className="h-3 w-3 mr-1" />
        Access Denied
      </Badge>
    );
  };

  if (error) {
    return (
      <Alert className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error running RBAC test: {error}
          <Button 
            onClick={runRBACTest} 
            variant="outline" 
            size="sm" 
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">RBAC Testing Dashboard</h2>
          <p className="text-muted-foreground">
            Test and verify Role-Based Access Control implementation
          </p>
        </div>
        <Button onClick={runRBACTest} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Testing...' : 'Run Test'}
        </Button>
      </div>

      {testResult && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="access">Access Control</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Current User Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Badge className={`text-lg px-4 py-2 ${roleTests.find(r => r.role === testResult.userRole)?.color}`}>
                    {roleTests.find(r => r.role === testResult.userRole)?.icon}
                    {testResult.userRole}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {testResult.permissions.description}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Test executed at: {new Date(testResult.timestamp).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              {roleTests.map((roleTest) => {
                const hasAccess = testResult.tests[`${roleTest.role.toLowerCase()}Access` as keyof typeof testResult.tests] as boolean;
                return (
                  <Card key={roleTest.role}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {roleTest.icon}
                        {roleTest.role}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-2">
                        {roleTest.description}
                      </p>
                      {getAccessBadge(hasAccess)}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>
                  Detailed breakdown of what this role can and cannot do
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Actions</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {testResult.permissions.actions.map((action, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {action}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Data Access</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {testResult.permissions.dataAccess.map((data, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Eye className="h-4 w-4 text-blue-600" />
                        {data}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Restrictions</h4>
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    {testResult.permissions.restrictions}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Access Control Matrix</CardTitle>
                <CardDescription>
                  Test results for different role access levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(testResult.tests).map(([test, hasAccess]) => (
                    <div key={test} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getAccessIcon(hasAccess)}
                        <div>
                          <p className="font-medium capitalize">
                            {test.replace('Access', ' Access')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {hasAccess ? 'User has access to this level' : 'User does not have access to this level'}
                          </p>
                        </div>
                      </div>
                      {getAccessBadge(hasAccess)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Technical Details</CardTitle>
                <CardDescription>
                  API endpoints and UI components accessible to this role
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">API Endpoints</h4>
                  <div className="grid grid-cols-1 gap-1">
                    {testResult.permissions.apiEndpoints.map((endpoint, index) => (
                      <code key={index} className="text-xs bg-muted px-2 py-1 rounded">
                        {endpoint}
                      </code>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">UI Components</h4>
                  <div className="grid grid-cols-1 gap-1">
                    {testResult.permissions.uiComponents.map((component, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {component}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!testResult && !isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No test results available. Click "Run Test" to start testing.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
