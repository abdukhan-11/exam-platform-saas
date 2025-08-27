'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Edit,
  Trash2,
  RefreshCw,
  BarChart3
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

interface Subscription {
  id: string;
  college: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  billingCycle: string;
  nextBilling: string | null;
  users: number;
  features: string[];
  createdAt: string;
  lastPayment: string | null;
}

const subscriptionPlans = [
  { name: 'TRIAL', price: 0, features: ['Basic Features', '5 Users', 'Email Support'], duration: '30 days' },
  { name: 'BASIC', price: 99, features: ['Basic Features', '50 Users', 'Email Support'], duration: 'monthly' },
  { name: 'STANDARD', price: 199, features: ['Basic Analytics', '200 Users', 'Email Support'], duration: 'monthly' },
  { name: 'PREMIUM', price: 299, features: ['Advanced Analytics', 'API Access', 'Priority Support'], duration: 'monthly' },
  { name: 'ENTERPRISE', price: 599, features: ['Custom Features', 'Unlimited Users', 'Dedicated Support'], duration: 'monthly' }
];

const mockRevenueData = [
  { month: 'Jan', revenue: 4500, subscriptions: 8, churn: 1 },
  { month: 'Feb', revenue: 5200, subscriptions: 10, churn: 0 },
  { month: 'Mar', revenue: 4800, subscriptions: 9, churn: 2 },
  { month: 'Apr', revenue: 6100, subscriptions: 12, churn: 1 },
  { month: 'May', revenue: 5500, subscriptions: 11, churn: 1 },
  { month: 'Jun', revenue: 6800, subscriptions: 14, churn: 0 }
];

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSubscription, setNewSubscription] = useState({
    collegeId: '',
    plan: '',
    amount: '',
    billingCycle: 'monthly',
    users: ''
  });

  const fetchSubscriptions = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      const response = await fetch('/api/admin/subscriptions');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSubscriptions(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    
    // Set up polling for real-time updates every 60 seconds
    const interval = setInterval(fetchSubscriptions, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const refreshData = async () => {
    await fetchSubscriptions();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'expired': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'expired': return <Badge variant="destructive">Expired</Badge>;
      case 'pending': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const calculateTotalRevenue = () => {
    return subscriptions
      .filter(s => s.status === 'active')
      .reduce((total, s) => total + s.amount, 0);
  };

  const calculateMonthlyRecurringRevenue = () => {
    return subscriptions
      .filter(s => s.status === 'active')
      .reduce((total, s) => total + s.amount, 0);
  };

  const handleAddSubscription = async () => {
    if (newSubscription.collegeId && newSubscription.plan) {
      try {
        const response = await fetch('/api/admin/subscriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            collegeId: newSubscription.collegeId,
            plan: newSubscription.plan,
            amount: parseInt(newSubscription.amount) || 0,
            billingCycle: newSubscription.billingCycle,
            users: parseInt(newSubscription.users) || 0
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create subscription');
        }

        // Refresh the data
        await fetchSubscriptions();
        setNewSubscription({ collegeId: '', plan: '', amount: '', billingCycle: 'monthly', users: '' });
        setIsAddDialogOpen(false);
      } catch (error) {
        console.error('Error creating subscription:', error);
        setError('Failed to create subscription');
      }
    }
  };

  const updateSubscriptionStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/admin/subscriptions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: id,
          status: status
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }

      // Refresh the data
      await fetchSubscriptions();
    } catch (error) {
      console.error('Error updating subscription:', error);
      setError('Failed to update subscription');
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Error Loading Subscriptions</h2>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Button onClick={fetchSubscriptions} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
          <p className="text-muted-foreground">
            Manage college subscriptions, billing cycles, and revenue tracking
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
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Subscription
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Subscription</DialogTitle>
                <DialogDescription>
                  Create a new subscription for a college
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="collegeId">College ID</Label>
                  <Input
                    id="collegeId"
                    value={newSubscription.collegeId}
                    onChange={(e) => setNewSubscription({...newSubscription, collegeId: e.target.value})}
                    placeholder="Enter college ID"
                  />
                </div>
                <div>
                  <Label htmlFor="plan">Subscription Plan</Label>
                  <Select value={newSubscription.plan} onValueChange={(value) => setNewSubscription({...newSubscription, plan: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {subscriptionPlans.map((plan) => (
                        <SelectItem key={plan.name} value={plan.name}>
                          {plan.name} - ${plan.price}/{plan.duration}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={newSubscription.amount}
                    onChange={(e) => setNewSubscription({...newSubscription, amount: e.target.value})}
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <Label htmlFor="billingCycle">Billing Cycle</Label>
                  <Select value={newSubscription.billingCycle} onValueChange={(value) => setNewSubscription({...newSubscription, billingCycle: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="users">Number of Users</Label>
                  <Input
                    id="users"
                    type="number"
                    value={newSubscription.users}
                    onChange={(e) => setNewSubscription({...newSubscription, users: e.target.value})}
                    placeholder="Enter number of users"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddSubscription}>Add Subscription</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions.length}</div>
            <p className="text-xs text-muted-foreground">
              All subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {subscriptions.filter(s => s.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${calculateMonthlyRecurringRevenue()}</div>
            <p className="text-xs text-muted-foreground">
              Monthly recurring revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions.reduce((total, s) => total + s.users, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="subscriptions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>All Subscriptions</span>
              </CardTitle>
              <CardDescription>
                View and manage all college subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscriptions.map((subscription) => (
                  <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(subscription.status)}
                      <div>
                        <h3 className="font-medium">{subscription.college}</h3>
                        <p className="text-sm text-muted-foreground">{subscription.plan} Plan</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {subscription.users} users
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {subscription.billingCycle}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${subscription.amount}/{subscription.billingCycle}</p>
                      <p className="text-sm text-muted-foreground">
                        Next billing: {subscription.nextBilling || 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(subscription.status)}
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateSubscriptionStatus(subscription.id, 'active')}
                          disabled={subscription.status === 'active'}
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateSubscriptionStatus(subscription.id, 'expired')}
                          disabled={subscription.status === 'expired'}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue and subscription growth</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} name="Revenue ($)" />
                    <Line type="monotone" dataKey="subscriptions" stroke="#82ca9d" strokeWidth={2} name="Subscriptions" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Subscription Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Subscription Distribution</CardTitle>
                <CardDescription>Distribution by plan type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={subscriptionPlans.map(plan => ({
                        name: plan.name,
                        value: subscriptions.filter(s => s.plan === plan.name).length
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {subscriptionPlans.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#ff0000'][index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Churn Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Churn Analysis</CardTitle>
              <CardDescription>Monthly subscription churn and retention</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="churn" fill="#ff6b6b" name="Churned Subscriptions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>Available subscription tiers and features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subscriptionPlans.map((plan) => (
                  <Card key={plan.name} className="relative">
                    <CardHeader>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>
                        <span className="text-2xl font-bold">${plan.price}</span>
                        <span className="text-sm text-muted-foreground">/{plan.duration}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4">
                        <Button variant="outline" className="w-full">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Plan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
