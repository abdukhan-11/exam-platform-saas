import { db } from '@/lib/db';

// Types for analytics results
export interface PerformanceTrend {
  userId: string;
  trend: 'improving' | 'declining' | 'stable';
  recentAverage: number;
  historicalAverage: number;
  changeRate: number; // Percentage change
  confidenceScore: number; // 0-1 indicating confidence in the trend
}

export interface PerformanceForecast {
  userId: string;
  predictedPercentage: number;
  lowerBound: number;
  upperBound: number;
  confidenceScore: number;
  factors: {
    recentPerformance: number;
    subjectStrength: number;
    classAverage: number;
  };
}

export interface InterventionRecommendation {
  userId: string;
  recommendationType: 'urgent' | 'moderate' | 'monitoring';
  reason: string;
  suggestedActions: string[];
  targetAreas: string[];
}

export interface SubjectStrengthAnalysis {
  userId: string;
  strengths: Array<{ subjectId: string; subjectName: string; score: number }>;
  weaknesses: Array<{ subjectId: string; subjectName: string; score: number }>;
  improvementAreas: Array<{ subjectId: string; subjectName: string; potentialGain: number }>;
}

/**
 * Analyzes a student's performance trend over time
 * @param userId The student's user ID
 * @param timeframeMonths Number of months to analyze (default: 3)
 */
export async function analyzePerformanceTrend(userId: string, timeframeMonths = 3): Promise<PerformanceTrend> {
  // Get results from the specified timeframe
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - timeframeMonths);

  const results = await db.examResult.findMany({
    where: { 
      userId,
      endTime: { gte: cutoffDate }
    },
    orderBy: { endTime: 'asc' },
    select: {
      percentage: true,
      endTime: true,
    }
  });

  if (results.length < 2) {
    return {
      userId,
      trend: 'stable',
      recentAverage: results.length ? results[0].percentage : 0,
      historicalAverage: 0,
      changeRate: 0,
      confidenceScore: 0
    };
  }

  // Split into recent and historical for comparison
  const midpoint = Math.floor(results.length / 2);
  const historical = results.slice(0, midpoint);
  const recent = results.slice(midpoint);

  const historicalAvg = historical.reduce((sum, r) => sum + r.percentage, 0) / historical.length;
  const recentAvg = recent.reduce((sum, r) => sum + r.percentage, 0) / recent.length;
  
  // Calculate trend
  const changeRate = ((recentAvg - historicalAvg) / historicalAvg) * 100;
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  
  if (changeRate > 5) trend = 'improving';
  else if (changeRate < -5) trend = 'declining';
  
  // Calculate confidence based on number of data points and consistency
  const stdDev = calculateStandardDeviation(results.map(r => r.percentage));
  const confidenceScore = Math.min(0.95, Math.max(0.1, 
    (results.length / 10) * (1 - Math.min(stdDev / 20, 0.5))
  ));

  return {
    userId,
    trend,
    recentAverage: recentAvg,
    historicalAverage: historicalAvg,
    changeRate,
    confidenceScore
  };
}

/**
 * Forecasts a student's future performance based on historical data and context
 * @param userId The student's user ID
 * @param subjectId Optional subject to forecast performance in
 */
export async function forecastPerformance(userId: string, subjectId?: string): Promise<PerformanceForecast> {
  // Get historical results
  const whereClause: any = { userId };
  if (subjectId) {
    whereClause.exam = { subjectId };
  }

  const results = await db.examResult.findMany({
    where: whereClause,
    orderBy: { endTime: 'desc' },
    take: 10,
    select: {
      percentage: true,
      exam: { select: { subjectId: true } }
    }
  });

  if (results.length === 0) {
    return {
      userId,
      predictedPercentage: 70, // Default prediction
      lowerBound: 60,
      upperBound: 80,
      confidenceScore: 0.1,
      factors: {
        recentPerformance: 0,
        subjectStrength: 0,
        classAverage: 70
      }
    };
  }

  // Calculate recent performance (weighted toward more recent exams)
  const weightedSum = results.reduce((sum, r, i) => {
    const weight = Math.pow(0.85, i); // Exponential decay weight
    return sum + (r.percentage * weight);
  }, 0);
  
  const weightSum = results.reduce((sum, _, i) => sum + Math.pow(0.85, i), 0);
  const recentPerformance = weightedSum / weightSum;

  // Get subject strength if applicable
  let subjectStrength = 0;
  if (subjectId) {
    const subjectResults = results.filter(r => r.exam.subjectId === subjectId);
    if (subjectResults.length > 0) {
      subjectStrength = subjectResults.reduce((sum, r) => sum + r.percentage, 0) / subjectResults.length;
    }
  } else {
    // Average across all subjects
    const bySubject = new Map<string, { sum: number; count: number }>();
    for (const r of results) {
      const sid = r.exam.subjectId;
      const prev = bySubject.get(sid) || { sum: 0, count: 0 };
      prev.sum += r.percentage;
      prev.count += 1;
      bySubject.set(sid, prev);
    }
    
    const subjectAvgs = Array.from(bySubject.values()).map(v => v.sum / v.count);
    subjectStrength = subjectAvgs.reduce((sum, avg) => sum + avg, 0) / Math.max(1, subjectAvgs.length);
  }

  // Get class average for context
  let classAverage = 70; // Default
  try {
    if (subjectId) {
      const avgResult = await db.examResult.aggregate({
        where: { exam: { subjectId } },
        _avg: { percentage: true }
      });
      if (avgResult._avg.percentage) {
        classAverage = avgResult._avg.percentage;
      }
    } else {
      const avgResult = await db.examResult.aggregate({
        _avg: { percentage: true }
      });
      if (avgResult._avg.percentage) {
        classAverage = avgResult._avg.percentage;
      }
    }
  } catch (e) {
    console.error('Error getting class average:', e);
  }

  // Calculate prediction with weights
  const predictedPercentage = (
    recentPerformance * 0.6 + 
    subjectStrength * 0.25 + 
    classAverage * 0.15
  );

  // Calculate confidence based on data points and consistency
  const confidenceScore = Math.min(0.9, Math.max(0.3, results.length / 10));
  
  // Calculate bounds based on confidence
  const margin = (1 - confidenceScore) * 20;
  const lowerBound = Math.max(0, predictedPercentage - margin);
  const upperBound = Math.min(100, predictedPercentage + margin);

  return {
    userId,
    predictedPercentage,
    lowerBound,
    upperBound,
    confidenceScore,
    factors: {
      recentPerformance,
      subjectStrength,
      classAverage
    }
  };
}

/**
 * Generates intervention recommendations based on performance patterns
 */
export async function generateInterventionRecommendations(userId: string): Promise<InterventionRecommendation> {
  // Get performance trend
  const trend = await analyzePerformanceTrend(userId);
  
  // Get subject strengths and weaknesses
  const strengthAnalysis = await analyzeSubjectStrengths(userId);
  
  // Determine recommendation type based on trend
  let recommendationType: 'urgent' | 'moderate' | 'monitoring' = 'monitoring';
  let reason = '';
  const suggestedActions: string[] = [];
  
  if (trend.trend === 'declining' && trend.changeRate < -10) {
    recommendationType = 'urgent';
    reason = `Performance has declined by ${Math.abs(trend.changeRate).toFixed(1)}% recently`;
    suggestedActions.push('Schedule immediate academic counseling');
    suggestedActions.push('Provide additional learning resources');
    suggestedActions.push('Consider personalized tutoring sessions');
  } else if (trend.trend === 'declining') {
    recommendationType = 'moderate';
    reason = 'Performance is showing a slight downward trend';
    suggestedActions.push('Monitor progress more frequently');
    suggestedActions.push('Offer optional additional support');
  } else if (trend.trend === 'improving') {
    recommendationType = 'monitoring';
    reason = 'Performance is improving steadily';
    suggestedActions.push('Provide positive reinforcement');
    suggestedActions.push('Consider advanced learning opportunities');
  } else {
    recommendationType = 'monitoring';
    reason = 'Performance is stable';
    suggestedActions.push('Maintain regular progress checks');
  }
  
  // Add subject-specific recommendations
  const targetAreas = strengthAnalysis.weaknesses.map(w => w.subjectName);
  
  if (strengthAnalysis.weaknesses.length > 0) {
    suggestedActions.push(`Focus improvement efforts on: ${strengthAnalysis.weaknesses.map(w => w.subjectName).join(', ')}`);
  }
  
  if (strengthAnalysis.improvementAreas.length > 0) {
    suggestedActions.push(`Potential for significant gains in: ${strengthAnalysis.improvementAreas.map(a => a.subjectName).join(', ')}`);
  }
  
  return {
    userId,
    recommendationType,
    reason,
    suggestedActions,
    targetAreas
  };
}

/**
 * Analyzes a student's strengths and weaknesses across subjects
 */
export async function analyzeSubjectStrengths(userId: string): Promise<SubjectStrengthAnalysis> {
  // Get results grouped by subject
  const results = await db.examResult.findMany({
    where: { userId },
    select: {
      percentage: true,
      exam: { select: { subjectId: true, subject: { select: { name: true } } } }
    }
  });
  
  // Group by subject
  const bySubject = new Map<string, { 
    subjectId: string;
    subjectName: string;
    percentages: number[];
  }>();
  
  for (const r of results) {
    const subjectId = r.exam.subjectId;
    const subjectName = r.exam.subject?.name || subjectId;
    
    const entry = bySubject.get(subjectId) || { 
      subjectId, 
      subjectName, 
      percentages: [] 
    };
    
    entry.percentages.push(r.percentage);
    bySubject.set(subjectId, entry);
  }
  
  // Calculate average scores by subject
  const subjectScores = Array.from(bySubject.values()).map(entry => {
    const avgScore = entry.percentages.reduce((sum, p) => sum + p, 0) / entry.percentages.length;
    return {
      subjectId: entry.subjectId,
      subjectName: entry.subjectName,
      score: avgScore
    };
  });
  
  // Sort by score
  subjectScores.sort((a, b) => b.score - a.score);
  
  // Identify strengths (top 30%), weaknesses (bottom 30%)
  const strengthCount = Math.max(1, Math.ceil(subjectScores.length * 0.3));
  const weaknessCount = Math.max(1, Math.ceil(subjectScores.length * 0.3));
  
  const strengths = subjectScores.slice(0, strengthCount);
  const weaknesses = subjectScores.slice(-weaknessCount).reverse();
  
  // Identify improvement areas (subjects with scores below average but not in bottom)
  const avgScore = subjectScores.reduce((sum, s) => sum + s.score, 0) / Math.max(1, subjectScores.length);
  
  const improvementAreas = subjectScores
    .filter(s => s.score < avgScore && !weaknesses.some(w => w.subjectId === s.subjectId))
    .map(s => ({
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      potentialGain: avgScore - s.score
    }))
    .sort((a, b) => b.potentialGain - a.potentialGain);
  
  return {
    userId,
    strengths,
    weaknesses,
    improvementAreas
  };
}

/**
 * Helper function to calculate standard deviation
 */
function calculateStandardDeviation(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / n;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  
  return Math.sqrt(variance);
}
