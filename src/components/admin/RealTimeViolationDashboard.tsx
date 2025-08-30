'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  Users,
  Shield,
  Activity,
  TrendingUp,
  Clock,
  Filter,
  RefreshCw,
  Download,
  Eye,
  Bell
} from 'lucide-react';

import { violationReportingService, ViolationDashboardData } from '@/lib/security/violation-reporting';
import { trendAnalysisEngine } from '@/lib/security/trend-analysis';
import { automatedReportGenerator } from '@/lib/security/automated-report-generator';

interface DashboardFilters {
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  severity: 'all' | 'low' | 'medium' | 'high' | 'critical';
  violationType: string;
  userId: string;
}

interface AlertItem {
  id: string;
  type: 'critical_violation' | 'repeat_offender' | 'coordinated_cheating' | 'system_issue';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  examId?: string;
  userId?: string;
  timestamp: number;
}

export default function RealTimeViolationDashboard() {
  const [dashboardData, setDashboardData] = useState<ViolationDashboardData | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    timeRange: '24h',
    severity: 'all',
    violationType: 'all',
    userId: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedExam, setSelectedExam] = useState<string>('');

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = violationReportingService.getDashboardData();
      setDashboardData(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set up real-time updates
  useEffect(() => {
    fetchDashboardData();

    // Update every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Handle filter changes
  const handleFilterChange = (key: keyof DashboardFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Generate report
  const handleGenerateReport = async () => {
    try {
      const report = await automatedReportGenerator.generateReport('daily_summary', {
        timeRange: getTimeRangeFromFilter(filters.timeRange)
      });
      if (report) {
        console.log('Report generated:', report.id);
        // In a real implementation, this would trigger a download or redirect
      }
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  // Get time range from filter
  const getTimeRangeFromFilter = (timeRange: string) => {
    const now = Date.now();
    const ranges = {
      '1h': now - (60 * 60 * 1000),
      '6h': now - (6 * 60 * 60 * 1000),
      '24h': now - (24 * 60 * 60 * 1000),
      '7d': now - (7 * 24 * 60 * 60 * 1000),
      '30d': now - (30 * 24 * 60 * 60 * 1000)
    };
    return { start: ranges[timeRange as keyof typeof ranges] || ranges['24h'], end: now };
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  // Get risk level color
  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Filter violations based on current filters
  const getFilteredViolations = () => {
    if (!dashboardData) return [];

    let filtered = dashboardData.recentViolations;

    if (filters.severity !== 'all') {
      filtered = filtered.filter(v => v.severity === filters.severity);
    }

    if (filters.violationType !== 'all') {
      filtered = filtered.filter(v => v.eventType === filters.violationType);
    }

    if (filters.userId) {
      filtered = filtered.filter(v => v.userId.includes(filters.userId));
    }

    return filtered;
  };

  // Get unique violation types for filter
  const getViolationTypes = () => {
    if (!dashboardData) return [];
    const types = new Set(dashboardData.recentViolations.map(v => v.eventType));
    return Array.from(types);
  };

  if (isLoading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const filteredViolations = getFilteredViolations();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-Time Violation Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor exam security violations and system health in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Time Range:</label>
              <Select value={filters.timeRange} onValueChange={(value) => handleFilterChange('timeRange', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="6h">Last 6 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Severity:</label>
              <Select value={filters.severity} onValueChange={(value) => handleFilterChange('severity', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Violation Type:</label>
              <Select value={filters.violationType} onValueChange={(value) => handleFilterChange('violationType', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {getViolationTypes().map(type => (
                    <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">User ID:</label>
              <Input
                placeholder="Filter by user ID"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                className="w-40"
              />
            </div>

            <Button onClick={handleGenerateReport} className="ml-auto">
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Health Overview */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Active Exams</p>
                  <p className="text-2xl font-bold">{dashboardData.systemHealth.totalActiveExams}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Violations</p>
                  <p className="text-2xl font-bold">{dashboardData.systemHealth.totalViolations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Critical Violations</p>
                  <p className="text-2xl font-bold">{dashboardData.systemHealth.criticalViolations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Avg Security Score</p>
                  <p className={`text-2xl font-bold ${getRiskColor(dashboardData.systemHealth.averageSecurityScore)}`}>
                    {Math.round(dashboardData.systemHealth.averageSecurityScore)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {dashboardData && dashboardData.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Active Alerts ({dashboardData.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {dashboardData.alerts.slice(0, 10).map((alert) => (
                  <Alert key={alert.id} className={
                    alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                    alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                    'border-yellow-500 bg-yellow-50'
                  }>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <span>{alert.message}</span>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                        {alert.examId && ` • Exam: ${alert.examId}`}
                        {alert.userId && ` • User: ${alert.userId}`}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="exams">Active Exams</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Violations */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Violations ({filteredViolations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filteredViolations.slice(0, 20).map((violation) => (
                      <div key={violation.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant={getSeverityColor(violation.severity)}>
                            {violation.severity}
                          </Badge>
                          <div>
                            <p className="font-medium">{violation.eventType.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-muted-foreground">
                              User: {violation.userId} • {new Date(violation.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Security Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Security Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData?.activeExams.slice(0, 10).map((exam) => (
                    <div key={exam.examId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Exam {exam.examId}</span>
                        <span className={`text-sm font-bold ${getRiskColor(exam.severityScore)}`}>
                          {exam.severityScore}/100
                        </span>
                      </div>
                      <Progress value={exam.severityScore} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {exam.violationCount} violations • {exam.status}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Violations Tab */}
        <TabsContent value="violations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Violation Log</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {filteredViolations.map((violation) => (
                    <div key={violation.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(violation.severity)}>
                            {violation.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {violation.eventType.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(violation.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Exam ID:</span> {violation.examId}
                        </div>
                        <div>
                          <span className="font-medium">User ID:</span> {violation.userId}
                        </div>
                        <div>
                          <span className="font-medium">Session ID:</span> {violation.sessionId}
                        </div>
                        <div>
                          <span className="font-medium">Action:</span> {violation.action}
                        </div>
                      </div>

                      {violation.details && Object.keys(violation.details).length > 0 && (
                        <div className="mt-3">
                          <details className="text-sm">
                            <summary className="cursor-pointer font-medium">Details</summary>
                            <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(violation.details, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Exams Tab */}
        <TabsContent value="exams" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData?.activeExams.map((exam) => (
              <Card key={exam.examId}>
                <CardHeader>
                  <CardTitle className="text-lg">Exam {exam.examId}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">User</span>
                      <span className="font-medium">{exam.userId}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Violations</span>
                      <Badge variant={exam.violationCount > 5 ? 'destructive' : 'default'}>
                        {exam.violationCount}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Security Score</span>
                      <span className={`font-bold ${getRiskColor(exam.severityScore)}`}>
                        {exam.severityScore}/100
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={exam.status === 'active' ? 'default' : 'secondary'}>
                        {exam.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Violation</span>
                      <span className="text-xs">
                        {new Date(exam.lastViolation).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Violation Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Violation Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Advanced analytics charts would be displayed here</p>
                    <p className="text-sm">Integration with charting libraries like Chart.js or Recharts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Avg Security Score</span>
                          <span className="text-sm">{Math.round(dashboardData.systemHealth.averageSecurityScore)}%</span>
                        </div>
                        <Progress value={Math.round(dashboardData.systemHealth.averageSecurityScore)} />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Critical Violations</span>
                          <span className="text-sm">{dashboardData.systemHealth.criticalViolations}</span>
                        </div>
                        <Progress value={Math.min(100, dashboardData.systemHealth.criticalViolations)} />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Total Violations</span>
                          <span className="text-sm">{dashboardData.systemHealth.totalViolations}</span>
                        </div>
                        <Progress value={Math.min(100, dashboardData.systemHealth.totalViolations)} />
                      </div>

                      <Separator />

                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>Active Exams:</span>
                          <span>{dashboardData.systemHealth.totalActiveExams}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
