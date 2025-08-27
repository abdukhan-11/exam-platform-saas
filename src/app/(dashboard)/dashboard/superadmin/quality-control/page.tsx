'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  RefreshCw,
  FileText,
  Users,
  Database,
  Server,
  Lock,
  Eye,
  BarChart3,
  Activity,
  Bell,
  Settings,
  Download,
  Upload
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface QualityMetrics {
  serviceQuality: {
    overallScore: number;
    responseTime: number;
    uptime: number;
    errorRate: number;
    userSatisfaction: number;
  };
  compliance: {
    gdpr: {
      status: 'compliant' | 'warning' | 'non-compliant';
      score: number;
      lastAudit: string;
      issues: string[];
    };
    ferpa: {
      status: 'compliant' | 'warning' | 'non-compliant';
      score: number;
      lastAudit: string;
      issues: string[];
    };
    security: {
      status: 'compliant' | 'warning' | 'non-compliant';
      score: number;
      lastAudit: string;
      issues: string[];
    };
  };
  examIntegrity: {
    antiCheatingScore: number;
    suspiciousActivities: number;
    examSecurityScore: number;
    lastIncident: string;
  };
  contentModeration: {
    flaggedContent: number;
    moderationQueue: number;
    autoModerationScore: number;
    lastReview: string;
  };
  qualityAlerts: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    message: string;
    timestamp: string;
    acknowledged: boolean;
    actionRequired: boolean;
  }>;
  complianceReports: Array<{
    id: string;
    type: string;
    status: string;
    generatedAt: string;
    downloadUrl: string;
  }>;
}

export default function QualityControlPage() {
  const [qualityData, setQualityData] = useState<QualityMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchQualityData = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      // For now, generate mock data - replace with actual API call
      const mockData: QualityMetrics = {
        serviceQuality: {
          overallScore: 94.5,
          responseTime: 120,
          uptime: 99.8,
          errorRate: 0.2,
          userSatisfaction: 4.6
        },
        compliance: {
          gdpr: {
            status: 'compliant',
            score: 98,
            lastAudit: '2025-01-15',
            issues: []
          },
          ferpa: {
            status: 'compliant',
            score: 95,
            lastAudit: '2025-01-10',
            issues: ['Data retention policy needs review']
          },
          security: {
            status: 'compliant',
            score: 96,
            lastAudit: '2025-01-20',
            issues: []
          }
        },
        examIntegrity: {
          antiCheatingScore: 92,
          suspiciousActivities: 3,
          examSecurityScore: 94,
          lastIncident: '2025-01-18'
        },
        contentModeration: {
          flaggedContent: 5,
          moderationQueue: 2,
          autoModerationScore: 89,
          lastReview: '2025-01-19'
        },
        qualityAlerts: [
          {
            id: '1',
            severity: 'medium',
            category: 'FERPA Compliance',
            message: 'Data retention policy review overdue',
            timestamp: '2025-01-20T10:30:00Z',
            acknowledged: false,
            actionRequired: true
          },
          {
            id: '2',
            severity: 'low',
            category: 'Content Moderation',
            message: '5 items in moderation queue',
            timestamp: '2025-01-20T09:15:00Z',
            acknowledged: true,
            actionRequired: false
          }
        ],
        complianceReports: [
          {
            id: '1',
            type: 'GDPR Compliance Report',
            status: 'Generated',
            generatedAt: '2025-01-15T14:00:00Z',
            downloadUrl: '/api/admin/quality-control/reports/gdpr'
          },
          {
            id: '2',
            type: 'FERPA Compliance Report',
            status: 'Generated',
            generatedAt: '2025-01-10T10:00:00Z',
            downloadUrl: '/api/admin/quality-control/reports/ferpa'
          }
        ]
      };

      setQualityData(mockData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch quality data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQualityData();
    
    // Set up polling for real-time updates every 60 seconds
    const interval = setInterval(fetchQualityData, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const refreshData = async () => {
    await fetchQualityData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'non-compliant': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant': return <Badge variant="default" className="bg-green-100 text-green-800">Compliant</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'non-compliant': return <Badge variant="destructive">Non-Compliant</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low': return <Badge variant="outline" className="text-blue-600 border-blue-600">Low</Badge>;
      case 'medium': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'high': return <Badge variant="secondary" className="bg-orange-100 text-orange-800">High</Badge>;
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Error Loading Quality Control Data</h2>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Button onClick={fetchQualityData} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!qualityData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading quality control data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quality Control & Compliance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor platform quality, compliance standards, and regulatory requirements
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button onClick={refreshData} disabled={isRefreshing} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quality Alerts */}
      {qualityData.qualityAlerts.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <strong>{qualityData.qualityAlerts.filter(alert => !alert.acknowledged).length} unacknowledged alerts</strong> require attention.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Issues</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overall Quality Score */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Quality Score</CardTitle>
              <CardDescription>Platform quality and compliance overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-6xl font-bold text-green-600 mb-4">
                  {qualityData.serviceQuality.overallScore}%
                </div>
                <Progress value={qualityData.serviceQuality.overallScore} className="w-full max-w-md mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">
                  Excellent platform quality and compliance status
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Service Uptime</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{qualityData.serviceQuality.uptime}%</div>
                <p className="text-xs text-muted-foreground">
                  System availability
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{qualityData.serviceQuality.responseTime}ms</div>
                <p className="text-xs text-muted-foreground">
                  Average API response
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{qualityData.serviceQuality.errorRate}%</div>
                <p className="text-xs text-muted-foreground">
                  System error rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Satisfaction</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{qualityData.serviceQuality.userSatisfaction}/5.0</div>
                <p className="text-xs text-muted-foreground">
                  Average rating
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          {/* Compliance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>GDPR Compliance</span>
                </CardTitle>
                <CardDescription>Data protection and privacy standards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-bold">{qualityData.compliance.gdpr.score}%</span>
                  {getStatusBadge(qualityData.compliance.gdpr.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Last Audit:</span>
                    <span>{new Date(qualityData.compliance.gdpr.lastAudit).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Issues:</span>
                    <span className={getStatusColor(qualityData.compliance.gdpr.status)}>
                      {qualityData.compliance.gdpr.issues.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>FERPA Compliance</span>
                </CardTitle>
                <CardDescription>Educational privacy standards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-bold">{qualityData.compliance.ferpa.score}%</span>
                  {getStatusBadge(qualityData.compliance.ferpa.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Last Audit:</span>
                    <span>{new Date(qualityData.compliance.ferpa.lastAudit).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Issues:</span>
                    <span className={getStatusColor(qualityData.compliance.ferpa.status)}>
                      {qualityData.compliance.ferpa.issues.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Security Compliance</span>
                </CardTitle>
                <CardDescription>Security and access control standards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-bold">{qualityData.compliance.security.score}%</span>
                  {getStatusBadge(qualityData.compliance.security.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Last Audit:</span>
                    <span>{new Date(qualityData.compliance.security.lastAudit).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Issues:</span>
                    <span className={getStatusColor(qualityData.compliance.security.status)}>
                      {qualityData.compliance.security.issues.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          {/* Quality Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Exam Integrity Metrics</CardTitle>
                <CardDescription>Anti-cheating and security measures</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Anti-Cheating Score</span>
                    <span className="text-lg font-semibold">{qualityData.examIntegrity.antiCheatingScore}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Suspicious Activities</span>
                    <span className="text-lg font-semibold">{qualityData.examIntegrity.suspiciousActivities}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Security Score</span>
                    <span className="text-lg font-semibold">{qualityData.examIntegrity.examSecurityScore}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Last Incident</span>
                    <span className="text-lg font-semibold">{new Date(qualityData.examIntegrity.lastIncident).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Moderation</CardTitle>
                <CardDescription>Content quality and moderation status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Flagged Content</span>
                    <span className="text-lg font-semibold">{qualityData.contentModeration.flaggedContent}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Moderation Queue</span>
                    <span className="text-lg font-semibold">{qualityData.contentModeration.moderationQueue}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Auto-Moderation Score</span>
                    <span className="text-lg font-semibold">{qualityData.contentModeration.autoModerationScore}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Last Review</span>
                    <span className="text-lg font-semibold">{new Date(qualityData.contentModeration.lastReview).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          {/* Quality Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Quality Alerts & Issues</CardTitle>
              <CardDescription>Active alerts requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qualityData.qualityAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getSeverityBadge(alert.severity)}
                        <span className="text-sm font-medium">{alert.category}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                      {alert.actionRequired && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Action Required
                        </Badge>
                      )}
                      <Button variant="outline" size="sm">
                        {alert.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Compliance Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Reports</CardTitle>
              <CardDescription>Generated compliance and audit reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qualityData.complianceReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">{report.type}</h4>
                        <p className="text-sm text-muted-foreground">
                          Generated: {new Date(report.generatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        {report.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
