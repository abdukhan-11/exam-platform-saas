import { db } from '@/lib/db';

export interface ClassPerformanceComparison {
  classId: string;
  className: string;
  averagePercentage: number;
  medianPercentage: number;
  topPerformerPercentage: number;
  bottomPerformerPercentage: number;
  standardDeviation: number;
  examCount: number;
  studentCount: number;
  comparisonClasses: Array<{
    classId: string;
    className: string;
    averagePercentage: number;
    difference: number; // Positive means this class is better
  }>;
}

export interface SubjectPerformanceComparison {
  subjectId: string;
  subjectName: string;
  averagePercentage: number;
  medianPercentage: number;
  topPerformerPercentage: number;
  bottomPerformerPercentage: number;
  standardDeviation: number;
  examCount: number;
  studentCount: number;
  comparisonSubjects: Array<{
    subjectId: string;
    subjectName: string;
    averagePercentage: number;
    difference: number; // Positive means this subject is better
  }>;
}

export interface InstitutionalBenchmark {
  collegeId: string;
  collegeName: string;
  overallAverage: number;
  topClassId: string | null;
  topClassName: string | null;
  topClassAverage: number | null;
  topSubjectId: string | null;
  topSubjectName: string | null;
  topSubjectAverage: number | null;
  historicalTrend: 'improving' | 'declining' | 'stable';
  yearlyAverages: Array<{
    year: number;
    average: number;
  }>;
}

/**
 * Compare performance across different classes
 * @param classId The primary class ID to analyze
 * @param compareWithClassIds Optional array of class IDs to compare with
 * @param collegeId Optional college ID to scope the comparison
 */
export async function compareClassPerformance(
  classId: string, 
  compareWithClassIds?: string[],
  collegeId?: string
): Promise<ClassPerformanceComparison> {
  // Get basic class info
  const classInfo = await db.class.findUnique({
    where: { id: classId },
    select: { id: true, name: true, collegeId: true }
  });

  if (!classInfo) {
    throw new Error(`Class with ID ${classId} not found`);
  }

  // If collegeId not provided, use the class's collegeId
  collegeId = collegeId || classInfo.collegeId;

  // Get all exam results for this class
  const results = await db.examResult.findMany({
    where: {
      exam: { classId }
    },
    select: {
      percentage: true,
      userId: true,
      examId: true
    }
  });

  // Calculate basic statistics
  const percentages = results.map(r => r.percentage);
  const averagePercentage = calculateMean(percentages);
  const medianPercentage = calculateMedian(percentages);
  const standardDeviation = calculateStandardDeviation(percentages);
  
  // Get top and bottom performers
  percentages.sort((a, b) => b - a);
  const topPerformerPercentage = percentages.length > 0 ? percentages[0] : 0;
  const bottomPerformerPercentage = percentages.length > 0 ? percentages[percentages.length - 1] : 0;
  
  // Count unique exams and students
  const uniqueExams = new Set(results.map(r => r.examId));
  const uniqueStudents = new Set(results.map(r => r.userId));
  
  // If no specific classes to compare with, get other classes from same college
  let classesToCompare = compareWithClassIds || [];
  if (classesToCompare.length === 0) {
    const otherClasses = await db.class.findMany({
      where: {
        collegeId,
        id: { not: classId }
      },
      select: { id: true },
      take: 5
    });
    classesToCompare = otherClasses.map(c => c.id);
  }
  
  // Get comparison data for each class
  const comparisonClasses: Array<{
    classId: string;
    className: string;
    averagePercentage: number;
    difference: number;
  }> = [];
  
  for (const compareId of classesToCompare) {
    const compareClass = await db.class.findUnique({
      where: { id: compareId },
      select: { id: true, name: true }
    });
    
    if (!compareClass) continue;
    
    const compareResults = await db.examResult.findMany({
      where: {
        exam: { classId: compareId }
      },
      select: {
        percentage: true
      }
    });
    
    const comparePercentages = compareResults.map(r => r.percentage);
    const compareAverage = calculateMean(comparePercentages);
    
    comparisonClasses.push({
      classId: compareClass.id,
      className: compareClass.name,
      averagePercentage: compareAverage,
      difference: averagePercentage - compareAverage
    });
  }
  
  return {
    classId,
    className: classInfo.name,
    averagePercentage,
    medianPercentage,
    topPerformerPercentage,
    bottomPerformerPercentage,
    standardDeviation,
    examCount: uniqueExams.size,
    studentCount: uniqueStudents.size,
    comparisonClasses
  };
}

/**
 * Compare performance across different subjects
 * @param subjectId The primary subject ID to analyze
 * @param compareWithSubjectIds Optional array of subject IDs to compare with
 * @param collegeId Optional college ID to scope the comparison
 */
export async function compareSubjectPerformance(
  subjectId: string, 
  compareWithSubjectIds?: string[],
  collegeId?: string
): Promise<SubjectPerformanceComparison> {
  // Get basic subject info
  const subjectInfo = await db.subject.findUnique({
    where: { id: subjectId },
    select: { id: true, name: true, collegeId: true }
  });

  if (!subjectInfo) {
    throw new Error(`Subject with ID ${subjectId} not found`);
  }

  // If collegeId not provided, use the subject's collegeId
  collegeId = collegeId || subjectInfo.collegeId;

  // Get all exam results for this subject
  const results = await db.examResult.findMany({
    where: {
      exam: { subjectId }
    },
    select: {
      percentage: true,
      userId: true,
      examId: true
    }
  });

  // Calculate basic statistics
  const percentages = results.map(r => r.percentage);
  const averagePercentage = calculateMean(percentages);
  const medianPercentage = calculateMedian(percentages);
  const standardDeviation = calculateStandardDeviation(percentages);
  
  // Get top and bottom performers
  percentages.sort((a, b) => b - a);
  const topPerformerPercentage = percentages.length > 0 ? percentages[0] : 0;
  const bottomPerformerPercentage = percentages.length > 0 ? percentages[percentages.length - 1] : 0;
  
  // Count unique exams and students
  const uniqueExams = new Set(results.map(r => r.examId));
  const uniqueStudents = new Set(results.map(r => r.userId));
  
  // If no specific subjects to compare with, get other subjects from same college
  let subjectsToCompare = compareWithSubjectIds || [];
  if (subjectsToCompare.length === 0) {
    const otherSubjects = await db.subject.findMany({
      where: {
        collegeId,
        id: { not: subjectId }
      },
      select: { id: true },
      take: 5
    });
    subjectsToCompare = otherSubjects.map(s => s.id);
  }
  
  // Get comparison data for each subject
  const comparisonSubjects: Array<{
    subjectId: string;
    subjectName: string;
    averagePercentage: number;
    difference: number;
  }> = [];
  
  for (const compareId of subjectsToCompare) {
    const compareSubject = await db.subject.findUnique({
      where: { id: compareId },
      select: { id: true, name: true }
    });
    
    if (!compareSubject) continue;
    
    const compareResults = await db.examResult.findMany({
      where: {
        exam: { subjectId: compareId }
      },
      select: {
        percentage: true
      }
    });
    
    const comparePercentages = compareResults.map(r => r.percentage);
    const compareAverage = calculateMean(comparePercentages);
    
    comparisonSubjects.push({
      subjectId: compareSubject.id,
      subjectName: compareSubject.name,
      averagePercentage: compareAverage,
      difference: averagePercentage - compareAverage
    });
  }
  
  return {
    subjectId,
    subjectName: subjectInfo.name,
    averagePercentage,
    medianPercentage,
    topPerformerPercentage,
    bottomPerformerPercentage,
    standardDeviation,
    examCount: uniqueExams.size,
    studentCount: uniqueStudents.size,
    comparisonSubjects
  };
}

/**
 * Generate institutional benchmarks for a college
 * @param collegeId The college ID to analyze
 * @param yearsToAnalyze Number of years to include in historical trend (default: 3)
 */
export async function generateInstitutionalBenchmarks(
  collegeId: string,
  yearsToAnalyze = 3
): Promise<InstitutionalBenchmark> {
  // Get college info
  const college = await db.college.findUnique({
    where: { id: collegeId },
    select: { id: true, name: true }
  });

  if (!college) {
    throw new Error(`College with ID ${collegeId} not found`);
  }

  // Get all exam results for this college
  const results = await db.examResult.findMany({
    where: {
      exam: { collegeId }
    },
    select: {
      percentage: true,
      endTime: true,
      exam: {
        select: {
          classId: true,
          subjectId: true,
          class: { select: { name: true } },
          subject: { select: { name: true } }
        }
      }
    }
  });

  // Calculate overall average
  const percentages = results.map(r => r.percentage);
  const overallAverage = calculateMean(percentages);
  
  // Group by class
  const byClass = new Map<string, { 
    classId: string; 
    className: string; 
    percentages: number[];
  }>();
  
  // Group by subject
  const bySubject = new Map<string, { 
    subjectId: string; 
    subjectName: string; 
    percentages: number[];
  }>();
  
  // Group by year
  const byYear = new Map<number, number[]>();
  
  for (const r of results) {
    // Class grouping
    if (r.exam.classId) {
      const classId = r.exam.classId;
      const className = r.exam.class?.name || classId;
      
      const classEntry = byClass.get(classId) || { 
        classId, 
        className, 
        percentages: [] 
      };
      
      classEntry.percentages.push(r.percentage);
      byClass.set(classId, classEntry);
    }
    
    // Subject grouping
    const subjectId = r.exam.subjectId;
    const subjectName = r.exam.subject?.name || subjectId;
    
    const subjectEntry = bySubject.get(subjectId) || { 
      subjectId, 
      subjectName, 
      percentages: [] 
    };
    
    subjectEntry.percentages.push(r.percentage);
    bySubject.set(subjectId, subjectEntry);
    
    // Year grouping
    if (r.endTime) {
      const year = new Date(r.endTime).getFullYear();
      const yearPercentages = byYear.get(year) || [];
      yearPercentages.push(r.percentage);
      byYear.set(year, yearPercentages);
    }
  }
  
  // Find top class
  let topClassId: string | null = null;
  let topClassName: string | null = null;
  let topClassAverage: number | null = null;
  
  for (const [classId, data] of byClass.entries()) {
    const avg = calculateMean(data.percentages);
    if (topClassAverage === null || avg > topClassAverage) {
      topClassId = classId;
      topClassName = data.className;
      topClassAverage = avg;
    }
  }
  
  // Find top subject
  let topSubjectId: string | null = null;
  let topSubjectName: string | null = null;
  let topSubjectAverage: number | null = null;
  
  for (const [subjectId, data] of bySubject.entries()) {
    const avg = calculateMean(data.percentages);
    if (topSubjectAverage === null || avg > topSubjectAverage) {
      topSubjectId = subjectId;
      topSubjectName = data.subjectName;
      topSubjectAverage = avg;
    }
  }
  
  // Calculate yearly averages
  const yearlyAverages: Array<{ year: number; average: number }> = [];
  const years = Array.from(byYear.keys()).sort();
  
  for (const year of years) {
    const yearPercentages = byYear.get(year) || [];
    const average = calculateMean(yearPercentages);
    yearlyAverages.push({ year, average });
  }
  
  // Determine historical trend
  let historicalTrend: 'improving' | 'declining' | 'stable' = 'stable';
  
  if (yearlyAverages.length >= 2) {
    const recentYears = yearlyAverages.slice(-Math.min(yearsToAnalyze, yearlyAverages.length));
    
    if (recentYears.length >= 2) {
      const firstAvg = recentYears[0].average;
      const lastAvg = recentYears[recentYears.length - 1].average;
      const percentChange = ((lastAvg - firstAvg) / firstAvg) * 100;
      
      if (percentChange > 5) {
        historicalTrend = 'improving';
      } else if (percentChange < -5) {
        historicalTrend = 'declining';
      }
    }
  }
  
  return {
    collegeId,
    collegeName: college.name,
    overallAverage,
    topClassId,
    topClassName,
    topClassAverage,
    topSubjectId,
    topSubjectName,
    topSubjectAverage,
    historicalTrend,
    yearlyAverages
  };
}

// Helper functions for statistical calculations

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

function calculateStandardDeviation(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  
  const mean = calculateMean(values);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  
  return Math.sqrt(variance);
}
