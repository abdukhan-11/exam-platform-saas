'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Lock, 
  Monitor,
  Settings,
  Activity,
  BarChart3
} from 'lucide-react';

interface SecurityConfig {
  enableBrowserLock: boolean;
  enableFullscreenMode: boolean;
  enableWebcamMonitoring: boolean;
  enableScreenRecording: boolean;
  enableQuestionShuffling: boolean;
  enableTimeLimitPerQuestion: boolean;
  timeLimitPerQuestion: number;
  maxAttempts: number;
  allowRetakes: boolean;
  retakeDelayHours: number;
  violationThresholds: {
    tabSwitches: number;
    copyPasteAttempts: number;
    windowFocusLoss: number;
  };
}

interface SecurityStats {
  totalViolations: number;
  violationsByType: Record<string, number>;
  recentAlerts: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
    studentId: string;
    description: string;
  }>;
  examSecurityStatus: Array<{
    examId: string;
    title: string;
    activeStudents: number;
    violations: number;
    status: 'secure' | 'warning' | 'critical';
  }>;
}

export default function SecurityPage() {
  const [config, setConfig] = useState<SecurityConfig>({
    enableBrowserLock: true,
    enableFullscreenMode: true,
    enableWebcamMonitoring: false,
    enableScreenRecording: false,
    enableQuestionShuffling: true,
    enableTimeLimitPerQuestion: false,
    timeLimitPerQuestion: 60,
    maxAttempts: 1,
    allowRetakes: false,
    retakeDelayHours: 24,
    violationThresholds: {
      tabSwitches: 3,
      copyPasteAttempts: 2,
      windowFocusLoss: 5
    }
  });

  const [stats, setStats] = useState<SecurityStats>({
    totalViolations: 0,
    violationsByType: {},
    recentAlerts: [],
    examSecurityStatus: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      // Load security configuration
      const configResponse = await fetch('/api/admin/security');
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData);
      }

      // Load security statistics
      const statsResponse = await fetch('/api/admin/security/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<SecurityConfig>) => {
    try {
      const response = await fetch('/api/admin/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });

      if (response.ok) {
        setConfig(prev => ({ ...prev, ...newConfig }));
        alert('Security configuration updated successfully!');
      } else {
        throw new Error('Failed to update configuration');
      }
    } catch (error) {
      console.error('Error updating security config:', error);
      alert('Failed to update security configuration. Please try again.');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'secure': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Security Configuration</h1>
          <p className="text-muted-foreground">Loading security settings...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Configuration</h1>
        <p className="text-muted-foreground">
          Configure exam security settings and monitor cheating prevention
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="monitoring">Live Monitoring</TabsTrigger>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Basic Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="browser-lock">Browser Lock</Label>
                  <Switch
                    id="browser-lock"
                    checked={config.enableBrowserLock}
                    onCheckedChange={(checked) => updateConfig({ enableBrowserLock: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="fullscreen">Fullscreen Mode</Label>
                  <Switch
                    id="fullscreen"
                    checked={config.enableFullscreenMode}
                    onCheckedChange={(checked) => updateConfig({ enableFullscreenMode: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="question-shuffle">Question Shuffling</Label>
                  <Switch
                    id="question-shuffle"
                    checked={config.enableQuestionShuffling}
                    onCheckedChange={(checked) => updateConfig({ enableQuestionShuffling: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="time-limit">Time Limit Per Question</Label>
                  <Switch
                    id="time-limit"
                    checked={config.enableTimeLimitPerQuestion}
                    onCheckedChange={(checked) => updateConfig({ enableTimeLimitPerQuestion: checked })}
                  />
                </div>
                {config.enableTimeLimitPerQuestion && (
                  <div className="space-y-2">
                    <Label htmlFor="time-limit-value">Time Limit (seconds)</Label>
                    <Input
                      id="time-limit-value"
                      type="number"
                      value={config.timeLimitPerQuestion}
                      onChange={(e) => updateConfig({ timeLimitPerQuestion: parseInt(e.target.value) })}
                      min="10"
                      max="300"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Advanced Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Advanced Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="webcam">Webcam Monitoring</Label>
                  <Switch
                    id="webcam"
                    checked={config.enableWebcamMonitoring}
                    onCheckedChange={(checked) => updateConfig({ enableWebcamMonitoring: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="screen-recording">Screen Recording Detection</Label>
                  <Switch
                    id="screen-recording"
                    checked={config.enableScreenRecording}
                    onCheckedChange={(checked) => updateConfig({ enableScreenRecording: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-attempts">Maximum Attempts</Label>
                  <Input
                    id="max-attempts"
                    type="number"
                    value={config.maxAttempts}
                    onChange={(e) => updateConfig({ maxAttempts: parseInt(e.target.value) })}
                    min="1"
                    max="5"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-retakes">Allow Retakes</Label>
                  <Switch
                    id="allow-retakes"
                    checked={config.allowRetakes}
                    onCheckedChange={(checked) => updateConfig({ allowRetakes: checked })}
                  />
                </div>
                {config.allowRetakes && (
                  <div className="space-y-2">
                    <Label htmlFor="retake-delay">Retake Delay (hours)</Label>
                    <Input
                      id="retake-delay"
                      type="number"
                      value={config.retakeDelayHours}
                      onChange={(e) => updateConfig({ retakeDelayHours: parseInt(e.target.value) })}
                      min="1"
                      max="168"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Violation Thresholds */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Violation Thresholds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="tab-switches">Tab Switches</Label>
                    <Input
                      id="tab-switches"
                      type="number"
                      value={config.violationThresholds.tabSwitches}
                      onChange={(e) => updateConfig({
                        violationThresholds: {
                          ...config.violationThresholds,
                          tabSwitches: parseInt(e.target.value)
                        }
                      })}
                      min="1"
                      max="10"
                    />
                    <p className="text-xs text-muted-foreground">Max allowed tab switches</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="copy-paste">Copy/Paste Attempts</Label>
                    <Input
                      id="copy-paste"
                      type="number"
                      value={config.violationThresholds.copyPasteAttempts}
                      onChange={(e) => updateConfig({
                        violationThresholds: {
                          ...config.violationThresholds,
                          copyPasteAttempts: parseInt(e.target.value)
                        }
                      })}
                      min="0"
                      max="5"
                    />
                    <p className="text-xs text-muted-foreground">Max copy/paste attempts</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="focus-loss">Window Focus Loss</Label>
                    <Input
                      id="focus-loss"
                      type="number"
                      value={config.violationThresholds.windowFocusLoss}
                      onChange={(e) => updateConfig({
                        violationThresholds: {
                          ...config.violationThresholds,
                          windowFocusLoss: parseInt(e.target.value)
                        }
                      })}
                      min="1"
                      max="20"
                    />
                    <p className="text-xs text-muted-foreground">Max window focus losses</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Active Exam Security Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.examSecurityStatus.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Exams</h3>
                    <p className="text-muted-foreground">
                      No exams are currently active for security monitoring.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.examSecurityStatus.map((exam) => (
                      <div key={exam.examId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{exam.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {exam.activeStudents} active students • {exam.violations} violations
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(exam.status)}>
                            {exam.status.toUpperCase()}
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`/dashboard/college-admin/exams/${exam.examId}/monitor`, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Monitor
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Security Alerts ({stats.recentAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-green-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Recent Alerts</h3>
                  <p className="text-muted-foreground">
                    No security violations have been detected recently.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <div>
                          <div className="font-medium">{alert.type}</div>
                          <div className="text-sm text-muted-foreground">
                            Student: {alert.studentId} • {new Date(alert.timestamp).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">{alert.description}</div>
                        </div>
                      </div>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Violation Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{stats.totalViolations}</div>
                    <div className="text-sm text-muted-foreground">Total Violations</div>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(stats.violationsByType).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="text-sm capitalize">{type.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Security Configuration Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Browser Lock:</span>
                    <Badge variant={config.enableBrowserLock ? 'default' : 'secondary'}>
                      {config.enableBrowserLock ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Fullscreen Mode:</span>
                    <Badge variant={config.enableFullscreenMode ? 'default' : 'secondary'}>
                      {config.enableFullscreenMode ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Webcam Monitoring:</span>
                    <Badge variant={config.enableWebcamMonitoring ? 'default' : 'secondary'}>
                      {config.enableWebcamMonitoring ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Question Shuffling:</span>
                    <Badge variant={config.enableQuestionShuffling ? 'default' : 'secondary'}>
                      {config.enableQuestionShuffling ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Max Attempts:</span>
                    <span className="font-medium">{config.maxAttempts}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
