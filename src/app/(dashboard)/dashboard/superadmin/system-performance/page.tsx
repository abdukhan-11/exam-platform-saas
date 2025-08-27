"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, Activity, Database, Server, Zap } from "lucide-react";

interface PerformanceMetrics {
  responseTime: {
    average: number;
    p95: number;
    p99: number;
    trend: "up" | "down" | "stable";
  };
  throughput: {
    requestsPerSecond: number;
    concurrentUsers: number;
    trend: "up" | "down" | "stable";
  };
  resourceUtilization: {
    cpu: number;
    memory: number;
    storage: number;
    database: number;
  };
  scalability: {
    horizontalScaling: boolean;
    loadBalancer: boolean;
    autoScaling: boolean;
    capacity: number;
  };
  performanceAlerts: Array<{
    id: string;
    type: "warning" | "critical" | "info";
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
}

export default function SystemPerformancePage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPerformanceMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/system-performance');
      if (!response.ok) {
        throw new Error('Failed to fetch performance metrics');
      }
      const data = await response.json();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch performance metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceMetrics();
    const interval = setInterval(fetchPerformanceMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getAlertColor = (type: "warning" | "critical" | "info") => {
    switch (type) {
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "info":
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Performance & Scalability</h1>
          <p className="text-muted-foreground">
            Monitor system performance, throughput, and scalability metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={fetchPerformanceMetrics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="scalability">Scalability</TabsTrigger>
          <TabsTrigger value="alerts">Performance Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                {getTrendIcon(metrics?.responseTime.trend || "stable")}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.responseTime.average}ms</div>
                <p className={`text-xs ${getTrendColor(metrics?.responseTime.trend || "stable")}`}>
                  {metrics?.responseTime.trend === "up" ? "+" : metrics?.responseTime.trend === "down" ? "-" : ""} 
                  {metrics?.responseTime.trend === "stable" ? "Stable" : "5% from last hour"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Throughput</CardTitle>
                {getTrendIcon(metrics?.throughput.trend || "stable")}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.throughput.requestsPerSecond}/s</div>
                <p className={`text-xs ${getTrendColor(metrics?.throughput.trend || "stable")}`}>
                  {metrics?.throughput.trend === "up" ? "+" : metrics?.throughput.trend === "down" ? "-" : ""} 
                  {metrics?.throughput.trend === "stable" ? "Stable" : "8% from last hour"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Concurrent Users</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.throughput.concurrentUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Active users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Capacity</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.scalability.capacity}%</div>
                <p className="text-xs text-muted-foreground">
                  Current utilization
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
                <CardDescription>Current system resource usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">CPU</span>
                    <span className="text-sm text-muted-foreground">{metrics?.resourceUtilization.cpu}%</span>
                  </div>
                  <Progress value={metrics?.resourceUtilization.cpu} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Memory</span>
                    <span className="text-sm text-muted-foreground">{metrics?.resourceUtilization.memory}%</span>
                  </div>
                  <Progress value={metrics?.resourceUtilization.memory} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Storage</span>
                    <span className="text-sm text-muted-foreground">{metrics?.resourceUtilization.storage}%</span>
                  </div>
                  <Progress value={metrics?.resourceUtilization.storage} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database</span>
                    <span className="text-sm text-muted-foreground">{metrics?.resourceUtilization.database}%</span>
                  </div>
                  <Progress value={metrics?.resourceUtilization.database} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scalability Status</CardTitle>
                <CardDescription>Current scaling configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Horizontal Scaling</span>
                  <Badge variant={metrics?.scalability.horizontalScaling ? "default" : "secondary"}>
                    {metrics?.scalability.horizontalScaling ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Load Balancer</span>
                  <Badge variant={metrics?.scalability.loadBalancer ? "default" : "secondary"}>
                    {metrics?.scalability.loadBalancer ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Auto Scaling</span>
                  <Badge variant={metrics?.scalability.autoScaling ? "default" : "secondary"}>
                    {metrics?.scalability.autoScaling ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Response Time Analysis</CardTitle>
              <CardDescription>Detailed response time metrics and trends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{metrics?.responseTime.average}ms</div>
                  <p className="text-sm text-muted-foreground">Average Response Time</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{metrics?.responseTime.p95}ms</div>
                  <p className="text-sm text-muted-foreground">95th Percentile</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{metrics?.responseTime.p99}ms</div>
                  <p className="text-sm text-muted-foreground">99th Percentile</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Performance Benchmarks</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Database className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Database Queries</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Average query time: 45ms | Slow queries: 2%
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Server className="h-4 w-4 text-green-500" />
                      <span className="font-medium">API Endpoints</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Average response: 120ms | Error rate: 0.1%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scalability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Capacity Planning</CardTitle>
              <CardDescription>Current usage trends and future capacity requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Current Capacity</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Web Servers</span>
                      <span className="text-sm text-muted-foreground">3/5 instances</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Database Connections</span>
                      <span className="text-sm text-muted-foreground">45/100 connections</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Scaling Recommendations</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Consider adding 2 more web server instances</span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
                    <Activity className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Database connection pool approaching limit</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Alerts</CardTitle>
              <CardDescription>Active and resolved performance alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics?.performanceAlerts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No active performance alerts
                </p>
              ) : (
                <div className="space-y-3">
                  {metrics?.performanceAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${getAlertColor(alert.type)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={alert.type === "critical" ? "destructive" : "secondary"}>
                            {alert.type.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">{alert.message}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                          {alert.resolved && (
                            <Badge variant="outline" className="mt-1">Resolved</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
