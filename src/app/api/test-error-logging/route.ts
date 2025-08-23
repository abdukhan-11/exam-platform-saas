import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api-response';
import { errorLogger } from '@/lib/error-logger';

export async function GET(request: NextRequest) {
  try {
    // Log some test information
    errorLogger.logInfo('Test info log', { test: true, timestamp: new Date().toISOString() }, request);
    errorLogger.logWarning('Test warning log', { test: true, level: 'warning' }, request);
    
    // Get current logs and stats
    const logs = errorLogger.getLogs(undefined, 10);
    const stats = errorLogger.getErrorStats();
    
    return apiResponse.success('Error logging test completed', {
      message: 'Error logging system is working correctly',
      logs: logs.slice(0, 5), // Show first 5 logs
      stats,
      testInfo: {
        timestamp: new Date().toISOString(),
        endpoint: request.nextUrl?.pathname,
        method: request.method,
      }
    }, undefined, {
      endpoint: request.nextUrl?.pathname,
      method: request.method,
      requestId: request.headers.get('x-request-id') || undefined,
    });

  } catch (error) {
    errorLogger.logError('Error in test endpoint', error, request);
    return apiResponse.error('Test failed', 500, error instanceof Error ? error.message : 'Unknown error', request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Simulate different error scenarios
    if (body.action === 'log-error') {
      errorLogger.logError('Simulated error from test', new Error('This is a test error'), request);
    } else if (body.action === 'log-warning') {
      errorLogger.logWarning('Simulated warning from test', { action: body.action }, request);
    } else if (body.action === 'log-info') {
      errorLogger.logInfo('Simulated info from test', { action: body.action }, request);
    }
    
    return apiResponse.success('Test action completed', {
      action: body.action,
      message: 'Log entry created successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    errorLogger.logError('Error in test POST endpoint', error, request);
    return apiResponse.error('Test failed', 500, error instanceof Error ? error.message : 'Unknown error', request);
  }
}
