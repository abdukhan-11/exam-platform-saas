import { db } from '@/lib/db';

// Optimized query builders for result operations
export class ResultQueryOptimizer {
  /**
   * Get exam results with optimized query for student dashboard
   * Uses composite index on (userId, endTime) for efficient sorting
   */
  static async getStudentResultsOptimized(
    userId: string,
    limit = 50,
    offset = 0
  ) {
    return db.examResult.findMany({
      where: { userId },
      select: {
        id: true,
        examId: true,
        score: true,
        totalMarks: true,
        percentage: true,
        endTime: true,
        exam: {
          select: {
            title: true,
            subjectId: true,
            subject: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { endTime: 'desc' },
      take: limit,
      skip: offset,
      // Enable query optimization hints
      // Note: Actual hints depend on database type
    });
  }

  /**
   * Get exam rankings with optimized query
   * Uses index on examId and percentage for efficient ranking calculation
   */
  static async getExamRankingsOptimized(examId: string, limit = 100) {
    return db.examResult.findMany({
      where: { examId },
      select: {
        userId: true,
        score: true,
        percentage: true,
        user: {
          select: {
            id: true,
            name: true,
            studentProfile: {
              select: { rollNo: true }
            }
          }
        }
      },
      orderBy: [
        { percentage: 'desc' },
        { score: 'desc' },
        { user: { studentProfile: { rollNo: 'asc' } } }
      ],
      take: limit
    });
  }

  /**
   * Get analytics data with optimized aggregation queries
   * Uses database-specific aggregation functions for performance
   */
  static async getAnalyticsSummaryOptimized(examId?: string, collegeId?: string) {
    const whereClause: any = {};
    if (examId) whereClause.examId = examId;
    if (collegeId) {
      whereClause.exam = { collegeId };
    }

    // Use raw SQL for complex aggregations to leverage database optimizations
    const result = await db.$queryRaw`
      SELECT
        COUNT(*) as totalResults,
        AVG(percentage) as avgPercentage,
        MIN(percentage) as minPercentage,
        MAX(percentage) as maxPercentage,
        COUNT(CASE WHEN percentage >= 90 THEN 1 END) as excellentCount,
        COUNT(CASE WHEN percentage >= 75 AND percentage < 90 THEN 1 END) as goodCount,
        COUNT(CASE WHEN percentage >= 50 AND percentage < 75 THEN 1 END) as averageCount,
        COUNT(CASE WHEN percentage < 50 THEN 1 END) as belowAverageCount
      FROM exam_result
      WHERE ${examId ? db.$queryRaw`exam_id = ${examId}` : db.$queryRaw`1=1`}
        ${collegeId ? db.$queryRaw`AND exam_id IN (SELECT id FROM exam WHERE college_id = ${collegeId})` : db.$queryRaw``}
    `;

    return (result as any)[0];
  }

  /**
   * Get trending performance data with optimized time-series queries
   * Uses index on endTime for efficient date range queries
   */
  static async getPerformanceTrendsOptimized(
    userId: string,
    timeframeDays = 90
  ) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    return db.examResult.findMany({
      where: {
        userId,
        endTime: { gte: cutoffDate }
      },
      select: {
        percentage: true,
        endTime: true,
        exam: {
          select: {
            subjectId: true,
            subject: { select: { name: true } }
          }
        }
      },
      orderBy: { endTime: 'asc' }
    });
  }

  /**
   * Batch insert exam results with optimized transaction
   * Uses database-specific bulk insert optimizations
   */
  static async batchInsertResults(results: Array<{
    userId: string;
    examId: string;
    score: number;
    totalMarks: number;
    percentage: number;
    startTime: Date;
    endTime: Date;
    isCompleted: boolean;
  }>) {
    // Use transaction for consistency
    return db.$transaction(async (tx) => {
      const createdResults = [];

      // Process in batches to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);

        const batchResults = await tx.examResult.createMany({
          data: batch
        });

        createdResults.push((batchResults as any).count || batch.length);
      }

      return createdResults;
    });
  }

  /**
   * Optimized query for class performance comparison
   * Uses composite indexes for efficient aggregation
   */
  static async getClassPerformanceComparisonOptimized(classIds: string[]) {
    return db.examResult.groupBy({
      by: ['examId'],
      where: {
        exam: {
          classId: { in: classIds }
        }
      },
      _avg: {
        percentage: true,
        score: true
      },
      _count: {
        _all: true
      },
      _min: {
        percentage: true
      },
      _max: {
        percentage: true
      }
    });
  }

  /**
   * Get subject-wise performance with optimized joins
   * Uses proper indexes on foreign key relationships
   */
  static async getSubjectPerformanceOptimized(subjectId: string, classId?: string) {
    const whereClause: any = {
      exam: { subjectId }
    };

    if (classId) {
      whereClause.exam.classId = classId;
    }

    return db.examResult.findMany({
      where: whereClause,
      select: {
        userId: true,
        percentage: true,
        score: true,
        user: {
          select: {
            name: true,
            studentProfile: {
              select: { rollNo: true }
            }
          }
        },
        exam: {
          select: {
            title: true,
            classId: true,
            class: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { percentage: 'desc' }
    });
  }

  /**
   * Optimized query for leaderboard calculations
   * Uses window functions if supported by the database
   */
  static async getLeaderboardOptimized(examId: string, limit = 50) {
    // For databases that support window functions (PostgreSQL, SQL Server)
    try {
      const results = await db.$queryRaw`
        SELECT
          er.user_id,
          er.percentage,
          er.score,
          u.name,
          sp.roll_no,
          ROW_NUMBER() OVER (ORDER BY er.percentage DESC, er.score DESC, sp.roll_no ASC) as rank
        FROM exam_result er
        JOIN user u ON er.user_id = u.id
        LEFT JOIN student_profile sp ON u.id = sp.user_id
        WHERE er.exam_id = ${examId}
        ORDER BY er.percentage DESC, er.score DESC, sp.roll_no ASC
        LIMIT ${limit}
      `;

      return results;
    } catch (error) {
      // Fallback to standard Prisma query if raw SQL fails
      console.warn('Raw SQL leaderboard query failed, using Prisma fallback:', error);

      const results = await db.examResult.findMany({
        where: { examId },
        select: {
          userId: true,
          percentage: true,
          score: true,
          user: {
            select: {
              name: true,
              studentProfile: {
                select: { rollNo: true }
              }
            }
          }
        },
        orderBy: [
          { percentage: 'desc' },
          { score: 'desc' },
          { user: { studentProfile: { rollNo: 'asc' } } }
        ],
        take: limit
      });

      // Add rank manually
      return results.map((result, index) => ({
        user_id: result.userId,
        percentage: result.percentage,
        score: result.score,
        name: result.user.name,
        roll_no: result.user.studentProfile?.rollNo || null,
        rank: index + 1
      }));
    }
  }

  /**
   * Get performance distribution with optimized histogram calculation
   */
  static async getPerformanceDistributionOptimized(examId: string, buckets = 10) {
    const results = await db.$queryRaw`
      WITH histogram AS (
        SELECT
          FLOOR(percentage / (100.0 / ${buckets})) * (100.0 / ${buckets}) as bucket_start,
          COUNT(*) as count
        FROM exam_result
        WHERE exam_id = ${examId}
        GROUP BY FLOOR(percentage / (100.0 / ${buckets}))
        ORDER BY bucket_start
      )
      SELECT
        bucket_start,
        bucket_start + (100.0 / ${buckets}) as bucket_end,
        count
      FROM histogram
    `;

    return results;
  }

  /**
   * Optimized query for finding students needing intervention
   * Uses composite indexes for efficient filtering
   */
  static async getStudentsNeedingInterventionOptimized(
    collegeId: string,
    threshold = 50,
    timeframeDays = 30
  ) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    return db.examResult.findMany({
      where: {
        percentage: { lt: threshold },
        endTime: { gte: cutoffDate },
        exam: { collegeId }
      },
      select: {
        userId: true,
        percentage: true,
        examId: true,
        user: {
          select: {
            name: true,
            studentProfile: {
              select: { rollNo: true }
            }
          }
        },
        exam: {
          select: {
            title: true,
            subjectId: true,
            subject: { select: { name: true } }
          }
        }
      },
      orderBy: { percentage: 'asc' }
    });
  }

  /**
   * Batch update results with optimized transaction
   * Minimizes database round trips for bulk operations
   */
  static async batchUpdateResults(updates: Array<{
    id: string;
    score?: number;
    percentage?: number;
    grade?: string;
  }>) {
    return db.$transaction(async (tx) => {
      const updatedResults = [];

      for (const update of updates) {
        const result = await tx.examResult.update({
          where: { id: update.id },
          data: {
            ...(update.score !== undefined && { score: update.score }),
            ...(update.percentage !== undefined && { percentage: update.percentage }),
            ...(update.grade !== undefined && { grade: update.grade })
          }
        });

        updatedResults.push(result);
      }

      return updatedResults;
    });
  }

  /**
   * Get cached query results with fallback to database
   * Implements read-through caching pattern
   */
  static async getCachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttlSeconds = 300
  ): Promise<T> {
    try {
      // Import cache manager dynamically to avoid circular dependencies
      const { getRedisCache } = await import('@/lib/cache/redis-cache');

      const cache = getRedisCache();
      const cachedResult = await cache.getCachedAnalyticsData(cacheKey);

      if (cachedResult) {
        return cachedResult as T;
      }

      // Cache miss - execute query
      const result = await queryFn();

      // Cache the result
      await cache.cacheAnalyticsData(cacheKey, result);

      return result;
    } catch (error) {
      console.warn('Cache operation failed, falling back to direct query:', error);
      // Fallback to direct query if caching fails
      return queryFn();
    }
  }

  /**
   * Optimized count query for pagination
   */
  static async getResultCountOptimized(userId: string): Promise<number> {
    return db.examResult.count({
      where: { userId }
    });
  }

  /**
   * Get recent activity with optimized query
   * Uses index on endTime for efficient recent data retrieval
   */
  static async getRecentActivityOptimized(limit = 20) {
    return db.examResult.findMany({
      select: {
        userId: true,
        examId: true,
        percentage: true,
        endTime: true,
        user: {
          select: { name: true }
        },
        exam: {
          select: {
            title: true,
            subject: { select: { name: true } }
          }
        }
      },
      orderBy: { endTime: 'desc' },
      take: limit
    });
  }
}
