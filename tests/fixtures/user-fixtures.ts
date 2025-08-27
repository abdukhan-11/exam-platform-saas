import { User, UserRole, College } from '@prisma/client'

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashed-password',
  role: UserRole.STUDENT,
  collegeId: 'college-123',
  image: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

export const createMockCollege = (overrides: Partial<College> = {}): College => ({
  id: 'college-123',
  name: 'Test College',
  description: 'A test college for testing purposes',
  logo: null,
  website: 'https://testcollege.edu',
  email: 'admin@testcollege.edu',
  phone: '+1234567890',
  address: '123 Test Street, Test City, TC 12345',
  settings: {},
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

export const createMockUsers = (count: number, role: UserRole = UserRole.STUDENT): User[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockUser({
      id: `user-${index + 1}`,
      email: `user${index + 1}@example.com`,
      name: `User ${index + 1}`,
      role,
    })
  )
}

export const createMockColleges = (count: number): College[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockCollege({
      id: `college-${index + 1}`,
      name: `College ${index + 1}`,
      email: `admin@college${index + 1}.edu`,
    })
  )
}

// Test data for different user roles
export const SUPER_ADMIN_USER = createMockUser({
  id: 'super-admin-1',
  email: 'superadmin@example.com',
  name: 'Super Admin',
  role: UserRole.SUPER_ADMIN,
  collegeId: null,
})

export const COLLEGE_ADMIN_USER = createMockUser({
  id: 'college-admin-1',
  email: 'admin@testcollege.edu',
  name: 'College Admin',
  role: UserRole.COLLEGE_ADMIN,
  collegeId: 'college-123',
})

export const TEACHER_USER = createMockUser({
  id: 'teacher-1',
  email: 'teacher@testcollege.edu',
  name: 'Test Teacher',
  role: UserRole.TEACHER,
  collegeId: 'college-123',
})

export const STUDENT_USER = createMockUser({
  id: 'student-1',
  email: 'student@testcollege.edu',
  name: 'Test Student',
  role: UserRole.STUDENT,
  collegeId: 'college-123',
})

// Test data for authentication scenarios
export const VALID_LOGIN_CREDENTIALS = {
  email: 'test@example.com',
  password: 'validpassword123',
}

export const INVALID_LOGIN_CREDENTIALS = {
  email: 'invalid@example.com',
  password: 'wrongpassword',
}

export const WEAK_PASSWORD = '123'
export const STRONG_PASSWORD = 'StrongPassword123!'

export const VALID_EMAIL = 'valid@example.com'
export const INVALID_EMAIL = 'invalid-email'

// Session data for testing
export const MOCK_SESSION = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.STUDENT,
    collegeId: 'college-123',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

export const EXPIRED_SESSION = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.STUDENT,
    collegeId: 'college-123',
  },
  expires: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
}
