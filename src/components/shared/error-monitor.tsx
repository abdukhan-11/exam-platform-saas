import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, Info, X, Trash2 } from 'lucide-react';

interface ErrorLog {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  details?: any;
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  stack?: string;
}

interface ErrorStats {
  total: number;
  errors: number;
  warnings: number;
  info: number;
}

export function ErrorMonitor() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<ErrorStats>({ total: 0, errors: 0, warnings: 0, info: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/error-logs');
      if (!response.ok) {
        throw new Error('Failed to fetch error logs');
      }
      
      const data = await response.json();
      setLogs(data.logs || []);
      setStats(data.stats || { total: 0, errors: 0, warnings: 0, info: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all error logs? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/error-logs', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to clear logs');
      }
      
      setLogs([]);
      setStats({ total: 0, errors: 0, warnings: 0, info: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear logs');
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = filter === 'all' ? logs : logs.filter(log => log.level === filter);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warn': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      case 'warn': return <AlertTriangle className="h-4 w-4" />;
      case 'info': return <Info className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Error Monitoring Dashboard
          </CardTitle>
          <CardDescription>
            Monitor system errors, warnings, and information logs in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Logs</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
              <div className="text-sm text-red-600">Errors</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
              <div className="text-sm text-yellow-600">Warnings</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.info}</div>
              <div className="text-sm text-blue-600">Info</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              onClick={fetchLogs}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              onClick={clearLogs}
              variant="outline"
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Logs
            </Button>

            <div className="flex gap-2 ml-auto">
              {(['all', 'error', 'warn', 'info'] as const).map((level) => (
                <Button
                  key={level}
                  variant={filter === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(level)}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                  {filter === level && (
                    <Badge variant="secondary" className="ml-2">
                      {filter === 'all' ? stats.total : 
                       level === 'error' ? stats.errors :
                       level === 'warn' ? stats.warnings :
                       level === 'info' ? stats.info : 0}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}

          {/* Logs Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <div className="text-sm font-medium text-gray-700">
                {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''} 
                {filter !== 'all' && ` (${filter} level)`}
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No logs found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredLogs.map((log, index) => (
                    <div key={index} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant="outline" 
                              className={`${getLevelColor(log.level)} border`}
                            >
                              {getLevelIcon(log.level)}
                              {log.level.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {formatTimestamp(log.timestamp)}
                            </span>
                            {log.requestId && (
                              <Badge variant="outline" className="text-xs">
                                {log.requestId.slice(0, 8)}...
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {log.message}
                          </div>
                          
                          {log.details && (
                            <div className="text-sm text-gray-600 mb-2">
                              <pre className="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                            {log.endpoint && (
                              <span>Endpoint: {log.endpoint}</span>
                            )}
                            {log.method && (
                              <span>Method: {log.method}</span>
                            )}
                            {log.ip && (
                              <span>IP: {log.ip}</span>
                            )}
                            {log.userId && (
                              <span>User: {log.userId}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
