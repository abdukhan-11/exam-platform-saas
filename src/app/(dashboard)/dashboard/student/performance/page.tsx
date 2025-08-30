'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PerformanceForecast, PerformanceTrend, SubjectStrengthAnalysis } from '@/lib/exams/advanced-analytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';

export default function StudentPerformanceDashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<PerformanceForecast | null>(null);
  const [trend, setTrend] = useState<PerformanceTrend | null>(null);
  const [strengths, setStrengths] = useState<SubjectStrengthAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('forecast');

  // Fetch user ID from session
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const session = await res.json();
        if (session?.user?.id) {
          setUserId(session.user.id);
        } else {
          setError('User not authenticated');
        }
      } catch (err) {
        setError('Failed to fetch user session');
      }
    };
    fetchUserId();
  }, []);

  // Fetch analytics data when userId is available
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // In a real implementation, these would be API calls to endpoints that use the analytics engine
        // For now, we'll simulate the data
        
        // Simulated forecast data
        setForecast({
          userId,
          predictedPercentage: 78.5,
          lowerBound: 72.3,
          upperBound: 84.7,
          confidenceScore: 0.75,
          factors: {
            recentPerformance: 76.2,
            subjectStrength: 80.1,
            classAverage: 72.5
          }
        });
        
        // Simulated trend data
        setTrend({
          userId,
          trend: 'improving',
          recentAverage: 78.2,
          historicalAverage: 72.5,
          changeRate: 7.86,
          confidenceScore: 0.82
        });
        
        // Simulated strengths data
        setStrengths({
          userId,
          strengths: [
            { subjectId: '1', subjectName: 'Mathematics', score: 85.3 },
            { subjectId: '2', subjectName: 'Physics', score: 82.1 }
          ],
          weaknesses: [
            { subjectId: '3', subjectName: 'Chemistry', score: 65.7 },
            { subjectId: '4', subjectName: 'Biology', score: 68.2 }
          ],
          improvementAreas: [
            { subjectId: '5', subjectName: 'English', potentialGain: 5.6 }
          ]
        });
        
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch analytics data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userId]);

  // Prepare chart data
  const forecastChartData = [
    { name: 'Lower Bound', value: forecast?.lowerBound || 0 },
    { name: 'Predicted', value: forecast?.predictedPercentage || 0 },
    { name: 'Upper Bound', value: forecast?.upperBound || 0 }
  ];

  const factorsChartData = forecast ? [
    { name: 'Recent Performance', value: forecast.factors.recentPerformance },
    { name: 'Subject Strength', value: forecast.factors.subjectStrength },
    { name: 'Class Average', value: forecast.factors.classAverage }
  ] : [];

  const strengthsChartData = strengths?.strengths.map(s => ({
    name: s.subjectName,
    score: s.score
  })) || [];

  const weaknessesChartData = strengths?.weaknesses.map(w => ({
    name: w.subjectName,
    score: w.score
  })) || [];

  const trendChartData = [
    { name: 'Historical', value: trend?.historicalAverage || 0 },
    { name: 'Recent', value: trend?.recentAverage || 0 }
  ];

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Performance Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="forecast">Performance Forecast</TabsTrigger>
          <TabsTrigger value="strengths">Subject Analysis</TabsTrigger>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading forecast data...</div>
              ) : error ? (
                <div className="text-sm text-destructive">{error}</div>
              ) : forecast ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Predicted Score</div>
                      <div className="text-2xl font-semibold">{forecast.predictedPercentage.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">
                        Range: {forecast.lowerBound.toFixed(1)}% - {forecast.upperBound.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Confidence</div>
                      <div className="text-2xl font-semibold">{(forecast.confidenceScore * 100).toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">
                        Based on your past performance
                      </div>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Recent Performance</div>
                      <div className="text-2xl font-semibold">{forecast.factors.recentPerformance.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">
                        Your recent exam average
                      </div>
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={factorsChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(v: any) => `${v.toFixed(1)}%`} />
                        <Bar dataKey="value" fill="#3b82f6">
                          {factorsChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No forecast data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strengths" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subject Strengths & Weaknesses</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading subject analysis...</div>
              ) : error ? (
                <div className="text-sm text-destructive">{error}</div>
              ) : strengths ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Strengths</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={strengthsChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip formatter={(v: any) => `${v.toFixed(1)}%`} />
                            <Bar dataKey="score" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-4">Areas for Improvement</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={weaknessesChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip formatter={(v: any) => `${v.toFixed(1)}%`} />
                            <Bar dataKey="score" fill="#f59e0b" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {strengths.improvementAreas.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Recommended Focus Areas</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {strengths.improvementAreas.map(area => (
                          <li key={area.subjectId} className="text-sm">
                            {area.subjectName} <span className="text-muted-foreground">(potential gain: {area.potentialGain.toFixed(1)}%)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No subject analysis available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading trend data...</div>
              ) : error ? (
                <div className="text-sm text-destructive">{error}</div>
              ) : trend ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Trend</div>
                      <div className="text-2xl font-semibold capitalize">{trend.trend}</div>
                      <div className="text-xs text-muted-foreground">
                        {trend.changeRate > 0 ? '+' : ''}{trend.changeRate.toFixed(1)}% change
                      </div>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Recent Average</div>
                      <div className="text-2xl font-semibold">{trend.recentAverage.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">
                        Last few exams
                      </div>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Historical Average</div>
                      <div className="text-2xl font-semibold">{trend.historicalAverage.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">
                        Previous performance
                      </div>
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(v: any) => `${v.toFixed(1)}%`} />
                        <Bar dataKey="value" fill="#3b82f6">
                          {trendChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h3 className="text-sm font-medium mb-2">Insight</h3>
                    <p className="text-sm">
                      {trend.trend === 'improving' 
                        ? `Your performance is improving! You've shown a ${trend.changeRate.toFixed(1)}% increase compared to your historical average.` 
                        : trend.trend === 'declining'
                        ? `Your performance has declined by ${Math.abs(trend.changeRate).toFixed(1)}% compared to your historical average. Consider reviewing your study approach.`
                        : `Your performance has been stable, with only minor variations from your historical average.`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No trend data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
