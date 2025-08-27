'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Server, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  HardDrive, 
  Cpu, 
  MemoryStick, 
  Network,
  RefreshCw,
  Bell,
  FileText,
  Shield,
  Zap
} from 'lucide-react';

interface SystemMetrics {
  database: {
    status: 'healthy' | 'warning' | 'critical';
    responseTime: number;
    connections: number;
    uptime: number;
    slowQueries: number;
    connectionPool: {
      active: number;
      idle: number;
      max: number;
    };
  };
  api: {
    status: 'healthy' | 'warning' | 'critical';
    responseTime: number;
    errorRate: number;
    uptime: number;
    requestsPerMinute: number;
    endpoints: {
      total: number;
      healthy: number;
      degraded: number;
      down: number;
    };
  };
  storage: {
    status: 'healthy' | 'warning' | 'critical';
    usage: number;
    available: number;
    uptime: number;
    iops: number;
    latency: number;
  };
  system: {
    cpu: {
      usage: number;
      cores: number;
      temperature: number;
    };
    memory: {
      usage: number;
      total: number;
      available: number;
      swap: number;
    };
    network: {
      bandwidth: number;
      packets: number;
      errors: number;
    };
  };
  backup: {
    status: 'healthy' | 'warning' | 'critical';
    lastBackup: string;
    nextScheduled: string;
    retention: number;
    size: number;
  };
  alerts: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }>;
  logs: Array<{
    id: string;
    level: 'info' | 'warn' | 'error' | 'critical';
    message: string;
    timestamp: string;
    source: string;
  }>;
}

export default function PlatformHealthPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/platform-health');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch platform health metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800'
    };
    return <Badge className={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      healthy: 'text-green-600',
      warning: 'text-yellow-600',
      critical: 'text-red-600'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600';
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'text-blue-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600'
    };
    return colors[severity as keyof typeof colors] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load platform health metrics. Please check the system status.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Health & Infrastructure</h1>
          <p className="text-muted-foreground">
            Comprehensive monitoring of platform services, infrastructure, and system performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Clock className="h-4 w-4 mr-2" />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Logs</TabsTrigger>
          <TabsTrigger value="backup">Backup & Recovery</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">98.5%</div>
                <p className="text-xs text-muted-foreground">Platform Uptime</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <Bell className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {metrics.alerts.filter(a => !a.acknowledged).length}
                </div>
                <p className="text-xs text-muted-foreground">Unacknowledged</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Endpoints</CardTitle>
                <Server className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.api.endpoints.healthy}/{metrics.api.endpoints.total}
                </div>
                <p className="text-xs text-muted-foreground">Healthy</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
                <Database className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.database.uptime}%
                </div>
                <p className="text-xs text-muted-foreground">Uptime</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Status Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
              <CardDescription>Real-time status of all platform services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center">
                    <Database className="h-4 w-4 mr-2" />
                    Database
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      {getStatusBadge(metrics.database.status)}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Response Time:</span>
                      <span className={getStatusColor(metrics.database.status)}>
                        {metrics.database.responseTime}ms
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Connections:</span>
                      <span>{metrics.database.connections}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium flex items-center">
                    <Server className="h-4 w-4 mr-2" />
                    API Services
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      {getStatusBadge(metrics.api.status)}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Response Time:</span>
                      <span className={getStatusColor(metrics.api.status)}>
                        {metrics.api.responseTime}ms
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Error Rate:</span>
                      <span className={getStatusColor(metrics.api.status)}>
                        {metrics.api.errorRate}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium flex items-center">
                    <HardDrive className="h-4 w-4 mr-2" />
                    Storage
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      {getStatusBadge(metrics.storage.status)}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Usage:</span>
                      <span className={getStatusColor(metrics.storage.status)}>
                        {metrics.storage.usage}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Available:</span>
                      <span>{metrics.storage.available}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-6">
          {/* System Resources */}
          <Card>
            <CardHeader>
              <CardTitle>System Resources</CardTitle>
              <CardDescription>Real-time monitoring of hardware resources</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center">
                      <Cpu className="h-4 w-4 mr-2" />
                      CPU Usage
                    </h4>
                    <span className="text-sm font-medium">{metrics.system.cpu.usage}%</span>
                  </div>
                  <Progress value={metrics.system.cpu.usage} className="h-2" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Cores: {metrics.system.cpu.cores}</div>
                    <div>Temperature: {metrics.system.cpu.temperature}°C</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                                       <h4 className="font-medium flex items-center">
                     <MemoryStick className="h-4 w-4 mr-2" />
                     Memory Usage
                   </h4>
                    <span className="text-sm font-medium">{metrics.system.memory.usage}%</span>
                  </div>
                  <Progress value={metrics.system.memory.usage} className="h-2" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Total: {Math.round(metrics.system.memory.total / 1024)} GB</div>
                    <div>Available: {Math.round(metrics.system.memory.available / 1024)} GB</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center">
                      <Network className="h-4 w-4 mr-2" />
                      Network
                    </h4>
                    <span className="text-sm font-medium">{metrics.system.network.bandwidth} Mbps</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Packets: {metrics.system.network.packets}/s</div>
                    <div>Errors: {metrics.system.network.errors}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Connection Pool */}
          <Card>
            <CardHeader>
              <CardTitle>Database Connection Pool</CardTitle>
              <CardDescription>Connection pool status and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {metrics.database.connectionPool.active}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Connections</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.database.connectionPool.idle}
                  </div>
                  <div className="text-sm text-muted-foreground">Idle Connections</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {metrics.database.connectionPool.max}
                  </div>
                  <div className="text-sm text-muted-foreground">Max Connections</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Connection Pool Utilization</span>
                  <span>
                    {Math.round((metrics.database.connectionPool.active / metrics.database.connectionPool.max) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(metrics.database.connectionPool.active / metrics.database.connectionPool.max) * 100} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Detailed performance analysis and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Database Performance</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Average Query Time:</span>
                      <span className="font-medium">{metrics.database.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Slow Queries:</span>
                      <span className="font-medium">{metrics.database.slowQueries}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Connection Pool Efficiency:</span>
                      <span className="font-medium">
                        {Math.round((metrics.database.connectionPool.active / metrics.database.connectionPool.max) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">API Performance</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Average Response Time:</span>
                      <span className="font-medium">{metrics.api.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Requests per Minute:</span>
                      <span className="font-medium">{metrics.api.requestsPerMinute}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Error Rate:</span>
                      <span className="font-medium">{metrics.api.errorRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Storage Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Performance</CardTitle>
              <CardDescription>Storage I/O and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {metrics.storage.iops}
                  </div>
                  <div className="text-sm text-muted-foreground">IOPS</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.storage.latency}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Latency</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {metrics.storage.usage}%
                  </div>
                  <div className="text-sm text-muted-foreground">Usage</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          {/* Active Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>Critical system alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p>No active alerts</p>
                  <p className="text-sm">All systems are operating normally</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.alerts.map((alert) => (
                    <Alert key={alert.id} className={alert.acknowledged ? 'opacity-60' : ''}>
                      <AlertTriangle className={`h-4 w-4 ${getSeverityColor(alert.severity)}`} />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className={`font-medium ${getSeverityColor(alert.severity)}`}>
                              {alert.severity.toUpperCase()}
                            </span>
                            <span className="ml-2">{alert.message}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent System Logs</CardTitle>
              <CardDescription>Latest system events and error logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {metrics.logs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      log.level === 'error' || log.level === 'critical' ? 'bg-red-500' :
                      log.level === 'warn' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{log.source}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          {/* Backup Status */}
          <Card>
            <CardHeader>
              <CardTitle>Backup & Recovery</CardTitle>
              <CardDescription>Backup system status and disaster recovery readiness</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Backup Status</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      {getStatusBadge(metrics.backup.status)}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Last Backup:</span>
                      <span className="font-medium">{metrics.backup.lastBackup}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Next Scheduled:</span>
                      <span className="font-medium">{metrics.backup.nextScheduled}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Recovery Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Retention:</span>
                      <span className="font-medium">{metrics.backup.retention} days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Backup Size:</span>
                      <span className="font-medium">{Math.round(metrics.backup.size / 1024)} GB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Recovery Time:</span>
                      <span className="font-medium">~15 minutes</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disaster Recovery */}
          <Card>
            <CardHeader>
              <CardTitle>Disaster Recovery Readiness</CardTitle>
              <CardDescription>System recovery capabilities and procedures</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    <Shield className="h-8 w-8 mx-auto" />
                  </div>
                  <div className="text-sm font-medium mt-2">Backup System</div>
                  <div className="text-xs text-muted-foreground">Operational</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    <Zap className="h-8 w-8 mx-auto" />
                  </div>
                  <div className="text-sm font-medium mt-2">Failover</div>
                  <div className="text-xs text-muted-foreground">Ready</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    <FileText className="h-8 w-8 mx-auto" />
                  </div>
                  <div className="text-sm font-medium mt-2">Documentation</div>
                  <div className="text-xs text-muted-foreground">Complete</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
