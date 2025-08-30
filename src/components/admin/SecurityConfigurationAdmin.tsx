/**
 * Security Configuration Administrative Interface
 *
 * Comprehensive admin dashboard for managing security configurations,
 * policies, monitoring parameters, and security settings across the platform.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
// import { ScrollArea } from '@/components/ui/scroll-area'; // Commented out as component may not exist
import {
  Shield,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Server,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  Upload,
  RefreshCw,
  Activity,
  Lock,
  Unlock,
  Bell,
  BarChart3,
  FileText,
  Zap
} from 'lucide-react';

import {
  securityConfigManager,
  SecurityConfiguration,
  SecurityPolicy,
  MonitoringConfiguration,
  SecurityDashboardData,
  SecurityEvent
} from '@/lib/security/security-config-manager';

interface SecurityConfigurationAdminProps {
  className?: string;
}

export const SecurityConfigurationAdmin: React.FC<SecurityConfigurationAdminProps> = ({
  className
}) => {
  const [dashboardData, setDashboardData] = useState<SecurityDashboardData | null>(null);
  const [configurations, setConfigurations] = useState<SecurityConfiguration[]>([]);
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [monitoringConfigs, setMonitoringConfigs] = useState<MonitoringConfiguration[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Form states
  const [newConfigDialog, setNewConfigDialog] = useState(false);
  const [newPolicyDialog, setNewPolicyDialog] = useState(false);
  const [newMonitoringDialog, setNewMonitoringDialog] = useState(false);
  const [editConfig, setEditConfig] = useState<SecurityConfiguration | null>(null);
  const [editPolicy, setEditPolicy] = useState<SecurityPolicy | null>(null);

  // Form data
  const [configForm, setConfigForm] = useState({
    name: '',
    description: '',
    version: '1.0.0'
  });

  const [policyForm, setPolicyForm] = useState({
    name: '',
    description: '',
    category: 'authentication' as SecurityPolicy['category'],
    enabled: true,
    priority: 1
  });

  const [monitoringForm, setMonitoringForm] = useState({
    name: '',
    description: '',
    type: 'performance' as MonitoringConfiguration['type'],
    enabled: true,
    interval: 300000, // 5 minutes
    threshold: 80
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [
        dashboard,
        configs,
        policyList,
        monitoringList,
        events
      ] = await Promise.all([
        securityConfigManager.getDashboardData(),
        securityConfigManager.getAllConfigurations(),
        securityConfigManager.getAllPolicies(),
        securityConfigManager.getAllMonitoringConfigs(),
        securityConfigManager.getSecurityEvents(20)
      ]);

      setDashboardData(dashboard);
      setConfigurations(configs);
      setPolicies(policyList);
      setMonitoringConfigs(monitoringList);
      setSecurityEvents(events);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load security data:', error);
      setLoading(false);
    }
  };

  const handleCreateConfiguration = async () => {
    try {
      const config = await securityConfigManager.createConfiguration({
        ...configForm,
        policies: [],
        monitoring: [],
        globalSettings: {
          maintenanceMode: false,
          emergencyMode: false,
          debugMode: false,
          auditLogging: true,
          rateLimiting: { enabled: true, maxRequests: 1000, windowMs: 900000 },
          corsSettings: { enabled: true, origins: ['*'], methods: ['GET', 'POST', 'PUT', 'DELETE'], headers: ['*'] },
          securityHeaders: {
            enabled: true,
            headers: {
              'X-Frame-Options': 'DENY',
              'X-Content-Type-Options': 'nosniff',
              'Referrer-Policy': 'strict-origin-when-cross-origin'
            }
          }
        },
        appliedTo: {
          colleges: [],
          environments: ['development', 'staging', 'production'],
          userRoles: ['super_admin', 'college_admin', 'teacher', 'student']
        },
        status: 'draft'
      });

      setConfigurations([...configurations, config]);
      setNewConfigDialog(false);
      setConfigForm({ name: '', description: '', version: '1.0.0' });
      await loadData();
    } catch (error) {
      console.error('Failed to create configuration:', error);
    }
  };

  const handleCreatePolicy = async () => {
    try {
      const policy = await securityConfigManager.createPolicy({
        ...policyForm,
        settings: {}
      });

      setPolicies([...policies, policy]);
      setNewPolicyDialog(false);
      setPolicyForm({
        name: '',
        description: '',
        category: 'authentication',
        enabled: true,
        priority: 1
      });
      await loadData();
    } catch (error) {
      console.error('Failed to create policy:', error);
    }
  };

  const handleCreateMonitoringConfig = async () => {
    try {
      const monitoringConfig = await securityConfigManager.createMonitoringConfig({
        ...monitoringForm,
        parameters: {
          enabled: monitoringForm.enabled,
          interval: monitoringForm.interval,
          thresholds: { warning: monitoringForm.threshold, critical: monitoringForm.threshold + 20 },
          alerts: {
            enabled: true,
            channels: ['email'],
            recipients: [],
            severityThreshold: 'medium'
          },
          retention: {
            enabled: true,
            period: 30,
            maxRecords: 10000
          }
        }
      });

      setMonitoringConfigs([...monitoringConfigs, monitoringConfig]);
      setNewMonitoringDialog(false);
      setMonitoringForm({
        name: '',
        description: '',
        type: 'performance',
        enabled: true,
        interval: 300000,
        threshold: 80
      });
      await loadData();
    } catch (error) {
      console.error('Failed to create monitoring configuration:', error);
    }
  };

  const handleActivateConfiguration = async (configId: string) => {
    try {
      await securityConfigManager.activateConfiguration(configId);
      await loadData();
    } catch (error) {
      console.error('Failed to activate configuration:', error);
    }
  };

  const handleDeleteConfiguration = async (configId: string) => {
    try {
      // Implementation would delete configuration
      console.log('Delete configuration:', configId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete configuration:', error);
    }
  };

  const handleExportConfiguration = async (configId: string) => {
    try {
      const configData = await securityConfigManager.exportConfiguration(configId);
      const blob = new Blob([configData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-config-${configId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export configuration:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'draft': return 'secondary';
      case 'deprecated': return 'destructive';
      case 'compliant': return 'default';
      case 'non_compliant': return 'destructive';
      case 'partial': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading security configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Security Configuration Admin
          </h1>
          <p className="text-muted-foreground">
            Manage security policies, configurations, and monitoring across the platform
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="configurations">Configurations</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          {dashboardData && (
            <>
              {/* Overview Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Configurations</CardTitle>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.overview.activeConfigurations}</div>
                    <p className="text-xs text-muted-foreground">
                      of {dashboardData.configurationStatus.draft + dashboardData.configurationStatus.active + dashboardData.configurationStatus.deprecated} total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.overview.activePolicies}</div>
                    <p className="text-xs text-muted-foreground">
                      {dashboardData.policyStatus.enabled} enabled, {dashboardData.policyStatus.disabled} disabled
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Security Events</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.overview.securityEventsToday}</div>
                    <p className="text-xs text-muted-foreground">
                      {dashboardData.overview.criticalAlerts} critical alerts
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.overview.complianceScore}%</div>
                    <Progress value={dashboardData.overview.complianceScore} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Recent Events */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Security Events</CardTitle>
                  <CardDescription>Latest security events and alerts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-64 overflow-y-auto">
                    <div className="space-y-4">
                      {dashboardData.recentEvents.map((event) => (
                        <div key={event.id} className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            {event.severity === 'critical' && <XCircle className="h-5 w-5 text-red-500" />}
                            {event.severity === 'high' && <AlertTriangle className="h-5 w-5 text-orange-500" />}
                            {event.severity === 'medium' && <Clock className="h-5 w-5 text-yellow-500" />}
                            {event.severity === 'low' && <CheckCircle className="h-5 w-5 text-green-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant={getSeverityColor(event.severity)}>
                            {event.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Status</CardTitle>
                  <CardDescription>Current compliance status across different standards</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.complianceStatus.map((compliance) => (
                      <div key={compliance.standard} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{compliance.standard}</span>
                          <Badge variant={getStatusColor(compliance.status)}>
                            {compliance.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Progress value={compliance.score} className="w-24" />
                          <span className="text-sm font-medium">{compliance.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Configurations Tab */}
        <TabsContent value="configurations" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Security Configurations</h2>
              <p className="text-muted-foreground">
                Manage security configurations and policies
              </p>
            </div>
            <Dialog open={newConfigDialog} onOpenChange={setNewConfigDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Configuration
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create Security Configuration</DialogTitle>
                  <DialogDescription>
                    Create a new security configuration with default settings.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="config-name">Name</Label>
                    <Input
                      id="config-name"
                      value={configForm.name}
                      onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                      placeholder="Production Security Config"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="config-description">Description</Label>
                    <Textarea
                      id="config-description"
                      value={configForm.description}
                      onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                      placeholder="Comprehensive security configuration for production environment"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="config-version">Version</Label>
                    <Input
                      id="config-version"
                      value={configForm.version}
                      onChange={(e) => setConfigForm({ ...configForm, version: e.target.value })}
                      placeholder="1.0.0"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateConfiguration}>Create Configuration</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configurations.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.name}</TableCell>
                      <TableCell>{config.version}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(config.status)}>
                          {config.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(config.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {config.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleActivateConfiguration(config.id)}
                            >
                              <Zap className="h-4 w-4 mr-1" />
                              Activate
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportConfiguration(config.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteConfiguration(config.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Security Policies</h2>
              <p className="text-muted-foreground">
                Manage security policies and access controls
              </p>
            </div>
            <Dialog open={newPolicyDialog} onOpenChange={setNewPolicyDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Policy
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create Security Policy</DialogTitle>
                  <DialogDescription>
                    Create a new security policy with custom settings.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="policy-name">Name</Label>
                    <Input
                      id="policy-name"
                      value={policyForm.name}
                      onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                      placeholder="Password Policy"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="policy-description">Description</Label>
                    <Textarea
                      id="policy-description"
                      value={policyForm.description}
                      onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
                      placeholder="Enforce strong password requirements"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="policy-category">Category</Label>
                    <Select
                      value={policyForm.category}
                      onValueChange={(value: string) =>
                        setPolicyForm({ ...policyForm, category: value as SecurityPolicy['category'] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="authentication">Authentication</SelectItem>
                        <SelectItem value="authorization">Authorization</SelectItem>
                        <SelectItem value="network">Network</SelectItem>
                        <SelectItem value="data">Data</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="policy-enabled"
                      checked={policyForm.enabled}
                      onCheckedChange={(checked) => setPolicyForm({ ...policyForm, enabled: checked })}
                    />
                    <Label htmlFor="policy-enabled">Enabled</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreatePolicy}>Create Policy</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{policy.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={policy.enabled ? 'default' : 'secondary'}>
                          {policy.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>{policy.priority}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Monitoring Configuration</h2>
              <p className="text-muted-foreground">
                Configure monitoring parameters and alerting
              </p>
            </div>
            <Dialog open={newMonitoringDialog} onOpenChange={setNewMonitoringDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Monitor
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create Monitoring Configuration</DialogTitle>
                  <DialogDescription>
                    Set up monitoring for security events and performance metrics.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="monitor-name">Name</Label>
                    <Input
                      id="monitor-name"
                      value={monitoringForm.name}
                      onChange={(e) => setMonitoringForm({ ...monitoringForm, name: e.target.value })}
                      placeholder="Security Event Monitor"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="monitor-description">Description</Label>
                    <Textarea
                      id="monitor-description"
                      value={monitoringForm.description}
                      onChange={(e) => setMonitoringForm({ ...monitoringForm, description: e.target.value })}
                      placeholder="Monitor for security events and alerts"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="monitor-type">Type</Label>
                    <Select
                      value={monitoringForm.type}
                      onValueChange={(value: string) =>
                        setMonitoringForm({ ...monitoringForm, type: value as MonitoringConfiguration['type'] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                        <SelectItem value="availability">Availability</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="monitor-interval">Interval (minutes)</Label>
                    <Input
                      id="monitor-interval"
                      type="number"
                      value={monitoringForm.interval / 60000}
                      onChange={(e) => setMonitoringForm({
                        ...monitoringForm,
                        interval: parseInt(e.target.value) * 60000
                      })}
                      placeholder="5"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="monitor-threshold">Threshold (%)</Label>
                    <Input
                      id="monitor-threshold"
                      type="number"
                      value={monitoringForm.threshold}
                      onChange={(e) => setMonitoringForm({
                        ...monitoringForm,
                        threshold: parseInt(e.target.value)
                      })}
                      placeholder="80"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="monitor-enabled"
                      checked={monitoringForm.enabled}
                      onCheckedChange={(checked) => setMonitoringForm({ ...monitoringForm, enabled: checked })}
                    />
                    <Label htmlFor="monitor-enabled">Enabled</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateMonitoringConfig}>Create Monitor</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Interval</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitoringConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{config.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.parameters.enabled ? 'default' : 'secondary'}>
                          {config.parameters.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>{Math.round(config.parameters.interval / 60000)} min</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Security Events</h2>
              <p className="text-muted-foreground">
                View and manage security events and alerts
              </p>
            </div>
            <Button onClick={loadData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Badge variant="outline">{event.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(event.severity)}>
                          {event.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(event.timestamp).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={event.resolved ? 'default' : 'destructive'}>
                          {event.resolved ? 'Resolved' : 'Open'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!event.resolved && (
                            <Button size="sm" variant="outline">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
