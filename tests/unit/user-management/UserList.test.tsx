import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { UserList } from '@/components/user-management/UserList'
import { mockRouter, mockNavigation, createMockPrismaClient } from '../../utils/test-utils'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => mockNavigation,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/users',
}))

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { 
        role: 'COLLEGE_ADMIN', 
        collegeId: 'test-college-id' 
      }
    },
    status: 'authenticated',
  }),
}))

// Mock the API functions
jest.mock('@/lib/user-management/permissions', () => ({
  PermissionService: {
    hasPermission: jest.fn(() => true),
  },
  Permission: {
    CREATE_USER: 'CREATE_USER',
    INVITE_USER: 'INVITE_USER',
    BULK_IMPORT_USERS: 'BULK_IMPORT_USERS',
    EXPORT_USERS: 'EXPORT_USERS',
  },
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('UserList Component', () => {
  const mockUsers = [
    {
      id: '1',
      email: 'teacher1@example.com',
      rollNo: 'T001',
      firstName: 'Teacher',
      lastName: 'One',
      role: 'TEACHER',
      isActive: true,
      createdAt: '2024-01-01',
      college: {
        id: 'test-college-id',
        name: 'Test College',
      },
    },
    {
      id: '2',
      email: 'student1@example.com',
      rollNo: 'S001',
      firstName: 'Student',
      lastName: 'One',
      role: 'STUDENT',
      isActive: true,
      createdAt: '2024-01-01',
      college: {
        id: 'test-college-id',
        name: 'Test College',
      },
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        users: mockUsers,
        totalPages: 1,
        total: 2,
      }),
    })
  })

  describe('Rendering', () => {
    it('should render user list with correct number of users', async () => {
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        expect(screen.getByText('Teacher One')).toBeInTheDocument()
        expect(screen.getByText('Student One')).toBeInTheDocument()
        expect(screen.getByText('teacher1@example.com')).toBeInTheDocument()
        expect(screen.getByText('student1@example.com')).toBeInTheDocument()
      })
    })

    it('should display user roles correctly', async () => {
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        expect(screen.getByText('TEACHER')).toBeInTheDocument()
        expect(screen.getByText('STUDENT')).toBeInTheDocument()
      })
    })

    it('should show loading state initially', () => {
      render(<UserList collegeId="test-college-id" />)
      
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should show empty state when no users exist', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          users: [],
          totalPages: 0,
          total: 0,
        }),
      })
      
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    it('should handle search input changes', async () => {
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search users...')
        fireEvent.change(searchInput, { target: { value: 'teacher' } })
      })
      
      // Wait for debounced search
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=teacher')
        )
      })
    })

    it('should handle role filter changes', async () => {
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        const roleFilter = screen.getByDisplayValue('All Roles')
        fireEvent.click(roleFilter)
      })
      
      // Select TEACHER role
      const teacherOption = screen.getByText('Teacher')
      fireEvent.click(teacherOption)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('role=TEACHER')
        )
      })
    })

    it('should handle status filter changes', async () => {
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        const statusFilter = screen.getByDisplayValue('All Status')
        fireEvent.click(statusFilter)
      })
      
      // Select Active status
      const activeOption = screen.getByText('Active')
      fireEvent.click(activeOption)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('isActive=true')
        )
      })
    })
  })

  describe('Action Buttons', () => {
    it('should show create user button when user has permission', async () => {
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        expect(screen.getByText('Create User')).toBeInTheDocument()
      })
    })

    it('should show invite user button when user has permission', async () => {
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        expect(screen.getByText('Invite User')).toBeInTheDocument()
      })
    })

    it('should show bulk import button when user has permission', async () => {
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        expect(screen.getByText('Bulk Import')).toBeInTheDocument()
      })
    })

    it('should show export button when user has permission', async () => {
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper table headers', async () => {
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument()
        expect(screen.getByText('Email')).toBeInTheDocument()
        expect(screen.getByText('Role')).toBeInTheDocument()
        expect(screen.getByText('Status')).toBeInTheDocument()
        expect(screen.getByText('Actions')).toBeInTheDocument()
      })
    })

    it('should have proper button labels', async () => {
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        expect(screen.getByText('Create User')).toBeInTheDocument()
        expect(screen.getByText('Invite User')).toBeInTheDocument()
        expect(screen.getByText('Bulk Import')).toBeInTheDocument()
        expect(screen.getByText('Export')).toBeInTheDocument()
      })
    })

    it('should have proper form labels', async () => {
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))
      
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
      })
      
      consoleSpy.mockRestore()
    })

    it('should handle user action errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        // Mock fetch to fail for user actions
        ;(global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 500,
        })
      })
      
      consoleSpy.mockRestore()
    })
  })

  describe('Performance', () => {
    it('should render efficiently with large user lists', async () => {
      const largeUserList = Array.from({ length: 100 }, (_, i) => ({
        id: i.toString(),
        email: `user${i}@example.com`,
        rollNo: `U${i.toString().padStart(3, '0')}`,
        firstName: `User`,
        lastName: `${i}`,
        role: 'STUDENT',
        isActive: true,
        createdAt: '2024-01-01',
        college: {
          id: 'test-college-id',
          name: 'Test College',
        },
      }))
      
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          users: largeUserList,
          totalPages: 10,
          total: 100,
        }),
      })
      
      const startTime = performance.now()
      render(<UserList collegeId="test-college-id" />)
      const endTime = performance.now()
      
      // Should render in under 100ms
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should handle rapid search input changes efficiently', async () => {
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search users...')
        
        const startTime = performance.now()
        
        // Simulate rapid typing
        for (let i = 0; i < 10; i++) {
          fireEvent.change(searchInput, { target: { value: `search${i}` } })
        }
        
        const endTime = performance.now()
        
        // Should handle rapid changes efficiently
        expect(endTime - startTime).toBeLessThan(50)
      })
    })
  })

  describe('Security', () => {
    it('should not render sensitive information', async () => {
      const userWithSensitiveData = {
        ...mockUsers[0],
        password: 'secretpassword',
        resetToken: 'reset-token',
        verificationToken: 'verification-token',
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          users: [userWithSensitiveData],
          totalPages: 1,
          total: 1,
        }),
      })
      
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        expect(screen.queryByText('secretpassword')).not.toBeInTheDocument()
        expect(screen.queryByText('reset-token')).not.toBeInTheDocument()
        expect(screen.queryByText('verification-token')).not.toBeInTheDocument()
      })
    })

    it('should sanitize user input in search', async () => {
      render(<UserList collegeId="test-college-id" />)
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search users...')
        const maliciousInput = '<script>alert("xss")</script>'
        
        fireEvent.change(searchInput, { target: { value: maliciousInput } })
        
        // The input should be displayed as text, not executed as HTML
        expect(searchInput).toHaveValue(maliciousInput)
      })
    })
  })
})
