'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building2, 
  FileText, 
  CreditCard,
  Activity,
  Database,
  Server,
  Clock,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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

interface AnalyticsData {
  overview: {
    totalColleges: number;
    activeColleges: number;
    totalUsers: number;
    totalExams: number;
    monthlyGrowth: number;
    systemUptime: number;
  };
  collegesByTier: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  userGrowth: Array<{
    month: string;
    users: number;
  }>;
  examStatistics: Array<{
    month: string;
    exams: number;
  }>;
  revenueData: {
    mrr: number;
    arr: number;
    churnRate: number;
    clv: number;
    monthlyData: Array<{
    month: string;
    revenue: number;
    subscriptions: number;
    churn: number;
      mrr: number;
      arr: number;
    }>;
    subscriptionMetrics: {
      totalActive: number;
      byTier: { [key: string]: number };
    };
  };
  financialMetrics: {
    mrr: number;
    arr: number;
    churnRate: number;
    clv: number;
    growthRate: number;
    revenuePerUser: number;
    subscriptionEfficiency: number;
    keyMetrics: {
      totalRevenue: number;
      activeSubscriptions: number;
      averageSubscriptionValue: number;
      monthlyGrowth: number;
    };
  };
  systemHealth: {
    database: {
      status: string;
      responseTime: number;
      connections: number;
      uptime: number;
    };
    api: {
      status: string;
      responseTime: number;
      errorRate: number;
      uptime: number;
    };
    storage: {
      status: string;
      usage: number;
      available: number;
      uptime: number;
    };
  };
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      const response = await fetch('/api/admin/analytics');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAnalyticsData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
    
    // Set up polling for real-time updates every 30 seconds
    const interval = setInterval(fetchAnalyticsData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const refreshData = async () => {
    await fetchAnalyticsData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Error Loading Analytics</h2>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Button onClick={fetchAnalyticsData} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive platform monitoring and analytics
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

      {/* Navigation to User Analytics */}
      <div className="flex items-center space-x-4">
        <Button 
          onClick={() => window.location.href = '/dashboard/superadmin/analytics/user-analytics'} 
          variant="outline"
          className="bg-blue-50 hover:bg-blue-100 border-blue-200"
        >
          <Users className="mr-2 h-4 w-4" />
          User Analytics & Engagement
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Colleges</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.totalColleges}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.overview.activeColleges} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{analyticsData.overview.monthlyGrowth.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.totalExams.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all colleges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analyticsData.overview.systemUptime}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="colleges">Colleges</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colleges by Subscription Tier */}
            <Card>
              <CardHeader>
                <CardTitle>Colleges by Subscription Tier</CardTitle>
                <CardDescription>Distribution of colleges across subscription plans</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.collegesByTier}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.collegesByTier.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* User Growth Trend */}
            <Card>
              <CardHeader>
                <CardTitle>User Growth Trend</CardTitle>
                <CardDescription>Monthly user growth and platform adoption</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="users" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="colleges" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>College Performance Metrics</CardTitle>
              <CardDescription>Key performance indicators across all colleges</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.examStatistics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="exams" fill="#8884d8" name="Total Exams" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Engagement Analytics</CardTitle>
              <CardDescription>User activity patterns and engagement metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analyticsData.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} name="Total Users" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          {/* Financial KPIs Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analyticsData.revenueData.mrr.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +{analyticsData.financialMetrics.growthRate.toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analyticsData.revenueData.arr.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Projected annual revenue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customer Lifetime Value</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analyticsData.revenueData.clv.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Average customer value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.revenueData.churnRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Monthly churn rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Charts */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Monthly revenue trends and subscription growth</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.revenueData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue ($)" />
                  <Bar yAxisId="right" dataKey="subscriptions" fill="#82ca9d" name="Subscriptions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Distribution</CardTitle>
                <CardDescription>Active subscriptions by tier</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(analyticsData.revenueData.subscriptionMetrics.byTier || {}).map(([tier, count]) => ({
                        name: tier,
                        value: count || 0
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                                              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(analyticsData.revenueData.subscriptionMetrics.byTier || {}).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300'][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Performance</CardTitle>
                <CardDescription>Key financial indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Revenue per User</span>
                    <span className="text-lg font-semibold">${analyticsData.financialMetrics.revenuePerUser.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Subscription Efficiency</span>
                    <span className="text-lg font-semibold">{(analyticsData.financialMetrics.subscriptionEfficiency * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Average Subscription Value</span>
                    <span className="text-lg font-semibold">${analyticsData.financialMetrics.keyMetrics.averageSubscriptionValue.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Active Subscriptions</span>
                    <span className="text-lg font-semibold">{analyticsData.financialMetrics.keyMetrics.activeSubscriptions}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          {/* System Health Monitoring */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Health</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{analyticsData.systemHealth.database.uptime}%</span>
                  {getStatusBadge(analyticsData.systemHealth.database.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Response Time:</span>
                    <span className={getStatusColor(analyticsData.systemHealth.database.status)}>
                      {analyticsData.systemHealth.database.responseTime}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connections:</span>
                    <span>{analyticsData.systemHealth.database.connections}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Health</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{analyticsData.systemHealth.api.uptime}%</span>
                  {getStatusBadge(analyticsData.systemHealth.api.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Response Time:</span>
                    <span className={getStatusColor(analyticsData.systemHealth.api.status)}>
                      {analyticsData.systemHealth.api.responseTime}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Error Rate:</span>
                    <span className={getStatusColor(analyticsData.systemHealth.api.status)}>
                      {analyticsData.systemHealth.api.errorRate}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{analyticsData.systemHealth.storage.usage}%</span>
                  {getStatusBadge(analyticsData.systemHealth.storage.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Used:</span>
                    <span className={getStatusColor(analyticsData.systemHealth.storage.status)}>
                      {analyticsData.systemHealth.storage.usage}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available:</span>
                    <span>{analyticsData.systemHealth.storage.available}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-time System Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Real-time System Metrics</CardTitle>
              <CardDescription>Live monitoring of critical system parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{analyticsData.systemHealth.database.responseTime}ms</div>
                  <div className="text-sm text-muted-foreground">Avg DB Query</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{analyticsData.systemHealth.api.responseTime}ms</div>
                  <div className="text-sm text-muted-foreground">Avg API Response</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{analyticsData.systemHealth.database.connections}</div>
                  <div className="text-sm text-muted-foreground">Active Connections</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{analyticsData.systemHealth.api.errorRate}%</div>
                  <div className="text-sm text-muted-foreground">Error Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
