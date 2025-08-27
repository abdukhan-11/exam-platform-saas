'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Mail, 
  BarChart3, 
  Settings, 
  Shield, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmailStats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  pending: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  type: 'transactional' | 'notification' | 'marketing';
  status: 'active' | 'inactive' | 'draft';
  lastModified: Date;
  usageCount: number;
}

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  template: string;
  status: string;
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;
  provider: string;
  collegeId?: string;
  userId?: string;
}

export default function EmailManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [emailStats, setEmailStats] = useState<EmailStats>({
    total: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    failed: 0,
    pending: 0,
  });
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchEmailData();
  }, []);

  const fetchEmailData = async () => {
    try {
      if (!loading) {
        setRefreshing(true);
      }
      setLoading(true);
      setError(null);
      
      // Fetch email statistics
      const statsResponse = await fetch('/api/admin/email-management/stats');
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setEmailStats(stats);
      } else {
        console.error('Failed to fetch email stats:', statsResponse.statusText);
        setError('Failed to fetch email statistics');
      }

      // Fetch email templates
      const templatesResponse = await fetch('/api/admin/email-management/templates');
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData);
      } else {
        console.error('Failed to fetch email templates:', templatesResponse.statusText);
        setError('Failed to fetch email templates');
      }

      // Fetch email logs
      const logsResponse = await fetch('/api/admin/email-management/logs');
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setEmailLogs(logsData);
      } else {
        console.error('Failed to fetch email logs:', logsResponse.statusText);
        setError('Failed to fetch email logs');
      }
    } catch (error) {
      console.error('Error fetching email data:', error);
      setError('An unexpected error occurred while fetching email data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateDeliveryRate = (): number => {
    if (emailStats.sent === 0) return 0;
    return Math.round((emailStats.delivered / emailStats.sent) * 1000) / 10;
  };

  const calculateOpenRate = (): number => {
    if (emailStats.delivered === 0) return 0;
    return Math.round((emailStats.opened / emailStats.delivered) * 1000) / 10;
  };

  const calculateClickRate = (): number => {
    if (emailStats.opened === 0) return 0;
    return Math.round((emailStats.clicked / emailStats.opened) * 1000) / 10;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-blue-100 text-blue-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'OPENED':
        return 'bg-purple-100 text-purple-800';
      case 'CLICKED':
        return 'bg-indigo-100 text-indigo-800';
      case 'BOUNCED':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLogs = emailLogs.filter(log => {
    const matchesSearch = log.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Management</h1>
          <p className="text-muted-foreground">
            Manage platform communications, templates, and email analytics
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchEmailData} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 font-medium">Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
          <Button 
            onClick={fetchEmailData} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Email Logs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Email Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{emailStats.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  All time emails sent
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{calculateDeliveryRate()}%</div>
                <p className="text-xs text-muted-foreground">
                  Successfully delivered
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{calculateOpenRate()}%</div>
                <p className="text-xs text-muted-foreground">
                  Emails opened
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{calculateClickRate()}%</div>
                <p className="text-xs text-muted-foreground">
                  Links clicked
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Email Status Breakdown</CardTitle>
              <CardDescription>Current email delivery status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{emailStats.sent}</div>
                  <div className="text-sm text-muted-foreground">Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{emailStats.delivered}</div>
                  <div className="text-sm text-muted-foreground">Delivered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{emailStats.bounced}</div>
                  <div className="text-sm text-muted-foreground">Bounced</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{emailStats.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Delivery Success Rate</span>
                  <span>{calculateDeliveryRate()}%</span>
                </div>
                <Progress value={calculateDeliveryRate()} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Email Activity</CardTitle>
              <CardDescription>Latest email communications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {emailLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(log.status).split(' ')[0]}`}></div>
                      <div>
                        <div className="font-medium">{log.to}</div>
                        <div className="text-sm text-muted-foreground">{log.subject}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className={getStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(log.sentAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Manage email templates and designs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      className="w-64 pl-10"
                      aria-label="Search email templates"
                    />
                  </div>
                  <Select>
                    <SelectTrigger className="w-40" aria-label="Filter by template type">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="transactional">Transactional</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>

              <div className="space-y-3">
                {templates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-muted-foreground">{template.subject}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{template.type}</Badge>
                          <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
                            {template.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Used {template.usageCount} times</div>
                        <div className="text-xs text-muted-foreground">
                          Modified {new Date(template.lastModified).toLocaleDateString()}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Logs</CardTitle>
              <CardDescription>Detailed email delivery and tracking information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search emails..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64 pl-10"
                      aria-label="Search email logs"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40" aria-label="Filter by email status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="SENT">Sent</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="OPENED">Opened</SelectItem>
                      <SelectItem value="CLICKED">Clicked</SelectItem>
                      <SelectItem value="BOUNCED">Bounced</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(log.status).split(' ')[0]}`}></div>
                      <div>
                        <div className="font-medium">{log.to}</div>
                        <div className="text-sm text-muted-foreground">{log.subject}</div>
                        <div className="text-xs text-muted-foreground">
                          Template: {log.template} • Provider: {log.provider}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className={getStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(log.sentAt).toLocaleDateString()}
                      </div>
                      {log.retryCount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Retries: {log.retryCount}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Performance Analytics</CardTitle>
              <CardDescription>Detailed insights into email campaign performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Delivery Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Sent</span>
                      <span className="font-medium">{emailStats.sent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Successfully Delivered</span>
                      <span className="font-medium">{emailStats.delivered}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bounced</span>
                      <span className="font-medium">{emailStats.bounced}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Failed</span>
                      <span className="font-medium">{emailStats.failed}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Engagement Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Open Rate</span>
                      <span className="font-medium">{calculateOpenRate()}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Click Rate</span>
                      <span className="font-medium">{calculateClickRate()}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bounce Rate</span>
                      <span className="font-medium">
                        {emailStats.sent > 0 ? ((emailStats.bounced / emailStats.sent) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Failure Rate</span>
                      <span className="font-medium">
                        {emailStats.sent > 0 ? ((emailStats.failed / emailStats.sent) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>Configure email service settings and compliance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">SMTP Configuration</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="smtp-host">SMTP Host</Label>
                      <Input id="smtp-host" placeholder="smtp.gmail.com" />
                    </div>
                    <div>
                      <Label htmlFor="smtp-port">SMTP Port</Label>
                      <Input id="smtp-port" placeholder="587" />
                    </div>
                    <div>
                      <Label htmlFor="smtp-user">SMTP Username</Label>
                      <Input id="smtp-user" placeholder="your-email@gmail.com" />
                    </div>
                    <div>
                      <Label htmlFor="smtp-pass">SMTP Password</Label>
                      <Input id="smtp-pass" type="password" placeholder="••••••••" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">SendGrid Configuration</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="sendgrid-key">SendGrid API Key</Label>
                      <Input id="sendgrid-key" placeholder="SG.xxxxxxxxxxxxx" />
                    </div>
                    <div>
                      <Label htmlFor="sendgrid-from">From Email</Label>
                      <Input id="sendgrid-from" placeholder="noreply@yourdomain.com" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Rate Limiting</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="rate-limit-hour">Per Hour Limit</Label>
                    <Input id="rate-limit-hour" placeholder="100" />
                  </div>
                  <div>
                    <Label htmlFor="rate-limit-day">Per Day Limit</Label>
                    <Input id="rate-limit-day" placeholder="1000" />
                  </div>
                  <div>
                    <Label htmlFor="max-retries">Max Retries</Label>
                    <Input id="max-retries" placeholder="3" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Compliance Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="gdpr-compliance" className="rounded" />
                    <Label htmlFor="gdpr-compliance">GDPR Compliance</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="unsubscribe-required" className="rounded" />
                    <Label htmlFor="unsubscribe-required">Require Unsubscribe Link</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="spam-prevention" className="rounded" />
                    <Label htmlFor="spam-prevention">Spam Prevention</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>Save Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
