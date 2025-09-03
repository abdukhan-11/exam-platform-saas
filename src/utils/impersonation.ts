/**
 * Utility functions for handling student impersonation in admin views
 */

export interface ImpersonationData {
  rollNo: string;
  name: string;
  class: string;
  department: string;
  year: number;
  email: string;
  isImpersonating: boolean;
  adminSession: boolean;
  studentId: string;
}

/**
 * Store impersonation data in localStorage
 */
export const setImpersonationData = (student: {
  id: string;
  rollNumber: string;
  name: string;
  department: string;
  year: number;
  email: string;
}): void => {
  const impersonationData: ImpersonationData = {
    rollNo: student.rollNumber,
    name: student.name,
    class: `${student.department} ${student.year}`,
    department: student.department,
    year: student.year,
    email: student.email,
    isImpersonating: true,
    adminSession: true,
    studentId: student.id
  };
  
  localStorage.setItem('impersonatingStudent', JSON.stringify(impersonationData));
};

/**
 * Get impersonation data from localStorage
 */
export const getImpersonationData = (): ImpersonationData | null => {
  try {
    const data = localStorage.getItem('impersonatingStudent');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to parse impersonation data:', error);
    return null;
  }
};

/**
 * Clear impersonation data from localStorage
 */
export const clearImpersonationData = (): void => {
  localStorage.removeItem('impersonatingStudent');
};

/**
 * Check if currently in impersonation mode
 */
export const isImpersonating = (): boolean => {
  const data = getImpersonationData();
  return data?.isImpersonating === true;
};

/**
 * Get the current student being impersonated
 */
export const getCurrentImpersonatedStudent = (): ImpersonationData | null => {
  const data = getImpersonationData();
  return data?.isImpersonating ? data : null;
};
