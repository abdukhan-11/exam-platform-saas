import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/nextauth-options';
import { prisma } from '../../../../lib/db';
import * as os from 'os';
import { promises as fs } from 'fs';
import * as path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has SUPER_ADMIN role
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id }
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get comprehensive platform health metrics
    const [
      databaseMetrics,
      apiMetrics,
      storageMetrics,
      systemMetrics,
      backupMetrics,
      alerts,
      logs
    ] = await Promise.all([
      getDatabaseMetrics(),
      getApiMetrics(),
      getStorageMetrics(),
      getSystemMetrics(),
      getBackupMetrics(),
      getAlerts(),
      getLogs()
    ]);

    const platformHealthData = {
      database: databaseMetrics,
      api: apiMetrics,
      storage: storageMetrics,
      system: systemMetrics,
      backup: backupMetrics,
      alerts,
      logs
    };

    return NextResponse.json(platformHealthData);
  } catch (error) {
    console.error('Platform health API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getDatabaseMetrics() {
  try {
    // Database health check with timing
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - dbStart;

    // Get database connection info (simulated for now)
    const dbConnections = await prisma.$queryRaw`
      SELECT COUNT(*) as connections 
      FROM sqlite_master 
      WHERE type='table'
    `;

    // Get slow query count (simulated)
    const slowQueries = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table'
    `;

    // Simulate connection pool metrics
    const connectionPool = {
      active: Math.floor(Math.random() * 20) + 5,
      idle: Math.floor(Math.random() * 10) + 2,
      max: 50
    };

    return {
      status: dbResponseTime < 100 ? 'healthy' : dbResponseTime < 500 ? 'warning' : 'critical',
      responseTime: dbResponseTime,
      connections: Array.isArray(dbConnections) ? dbConnections[0]?.connections || 0 : 0,
      uptime: 99.8,
      slowQueries: Array.isArray(slowQueries) ? slowQueries[0]?.count || 0 : 0,
      connectionPool
    };
  } catch (error) {
    console.error('Database metrics error:', error);
    return {
      status: 'critical',
      responseTime: 0,
      connections: 0,
      uptime: 0,
      slowQueries: 0,
      connectionPool: { active: 0, idle: 0, max: 50 }
    };
  }
}

async function getApiMetrics() {
  try {
    // Simulate API health metrics
    const responseTime = Math.floor(Math.random() * 200) + 50;
    const errorRate = Math.random() * 2; // 0-2%
    const requestsPerMinute = Math.floor(Math.random() * 1000) + 500;

    // Simulate endpoint health
    const totalEndpoints = 25;
    const healthyEndpoints = Math.floor(Math.random() * 5) + 20;
    const degradedEndpoints = Math.floor(Math.random() * 3);
    const downEndpoints = totalEndpoints - healthyEndpoints - degradedEndpoints;

    return {
      status: responseTime < 100 ? 'healthy' : responseTime < 300 ? 'warning' : 'critical',
      responseTime,
      errorRate: parseFloat(errorRate.toFixed(2)),
      uptime: 99.9,
      requestsPerMinute,
      endpoints: {
        total: totalEndpoints,
        healthy: healthyEndpoints,
        degraded: degradedEndpoints,
        down: downEndpoints
      }
    };
  } catch (error) {
    console.error('API metrics error:', error);
    return {
      status: 'critical',
      responseTime: 0,
      errorRate: 100,
      uptime: 0,
      requestsPerMinute: 0,
      endpoints: { total: 0, healthy: 0, degraded: 0, down: 0 }
    };
  }
}

async function getStorageMetrics() {
  try {
    // Get disk usage information
    const diskUsage = await getDiskUsage();
    
    // Simulate storage performance metrics
    const iops = Math.floor(Math.random() * 1000) + 500;
    const latency = Math.floor(Math.random() * 20) + 5;

    return {
      status: diskUsage.usage < 70 ? 'healthy' : diskUsage.usage < 90 ? 'warning' : 'critical',
      usage: diskUsage.usage,
      available: diskUsage.available,
      uptime: 99.5,
      iops,
      latency
    };
  } catch (error) {
    console.error('Storage metrics error:', error);
    return {
      status: 'critical',
      usage: 0,
      available: 0,
      uptime: 0,
      iops: 0,
      latency: 0
    };
  }
}

async function getDiskUsage() {
  try {
    // This is a simplified disk usage calculation
    // In production, you'd want to use a proper system monitoring library
    const rootPath = process.cwd();
    const stats = await fs.stat(rootPath);
    
    // Simulate disk usage for development
    const usage = Math.floor(Math.random() * 30) + 60; // 60-90%
    const available = 100 - usage;
    
    return { usage, available };
  } catch (error) {
    console.error('Disk usage error:', error);
    return { usage: 75, available: 25 };
  }
}

async function getSystemMetrics() {
  try {
    // Get system information
    const cpuUsage = Math.floor(Math.random() * 40) + 20; // 20-60%
    const memoryUsage = Math.floor(Math.random() * 30) + 40; // 40-70%
    
    // Get actual system info where possible
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const actualMemoryUsage = Math.round(((totalMemory - freeMemory) / totalMemory) * 100);
    
    // Simulate network metrics
    const networkBandwidth = Math.floor(Math.random() * 100) + 50;
    const networkPackets = Math.floor(Math.random() * 1000) + 500;
    const networkErrors = Math.floor(Math.random() * 10);

    return {
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().length,
        temperature: Math.floor(Math.random() * 20) + 40 // 40-60°C
      },
      memory: {
        usage: actualMemoryUsage,
        total: totalMemory,
        available: freeMemory,
        swap: 0 // Simplified for now
      },
      network: {
        bandwidth: networkBandwidth,
        packets: networkPackets,
        errors: networkErrors
      }
    };
  } catch (error) {
    console.error('System metrics error:', error);
    return {
      cpu: { usage: 0, cores: 0, temperature: 0 },
      memory: { usage: 0, total: 0, available: 0, swap: 0 },
      network: { bandwidth: 0, packets: 0, errors: 0 }
    };
  }
}

async function getBackupMetrics() {
  try {
    // Simulate backup metrics
    const now = new Date();
    const lastBackup = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000); // Within last 24h
    const nextScheduled = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now
    
    // Check if backup files exist (simplified)
    const backupExists = true; // In production, check actual backup files
    
    return {
      status: backupExists ? 'healthy' : 'critical',
      lastBackup: lastBackup.toISOString(),
      nextScheduled: nextScheduled.toISOString(),
      retention: 30, // days
      size: Math.floor(Math.random() * 1000) + 500 // MB
    };
  } catch (error) {
    console.error('Backup metrics error:', error);
    return {
      status: 'critical',
      lastBackup: new Date().toISOString(),
      nextScheduled: new Date().toISOString(),
      retention: 0,
      size: 0
    };
  }
}

async function getAlerts() {
  try {
    // Get alerts from database or generate simulated ones
    const alerts = [
      {
        id: '1',
        severity: 'low' as const,
        message: 'High memory usage detected',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        acknowledged: false
      },
      {
        id: '2',
        severity: 'medium' as const,
        message: 'Database connection pool reaching capacity',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        acknowledged: true
      }
    ];

    return alerts;
  } catch (error) {
    console.error('Alerts error:', error);
    return [];
  }
}

async function getLogs() {
  try {
    // Get recent logs from database or generate simulated ones
    const logs = [
      {
        id: '1',
        level: 'info' as const,
        message: 'System health check completed successfully',
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
        source: 'Platform Health Monitor'
      },
      {
        id: '2',
        level: 'warn' as const,
        message: 'High CPU usage detected on server',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
        source: 'System Monitor'
      },
      {
        id: '3',
        level: 'info' as const,
        message: 'Backup process started',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        source: 'Backup Service'
      },
      {
        id: '4',
        level: 'error' as const,
        message: 'Failed to connect to external API',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
        source: 'API Gateway'
      }
    ];

    return logs;
  } catch (error) {
    console.error('Logs error:', error);
    return [];
  }
}
