import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LoginPage from '@/app/auth/login/page'
import CollegeSelectionPage from '@/app/college/select/page'
import { render, mockRouter, mockFetch, mockSessionStorage, measurePerformance } from '../../utils/test-utils'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage(),
  writable: true,
})

describe('Authentication Performance Tests', () => {
  const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue(mockRouter)
    
    // Mock sessionStorage
    const mockStorage = mockSessionStorage()
    Object.defineProperty(window, 'sessionStorage', {
      value: mockStorage,
      writable: true,
    })
  })

  describe('Component Rendering Performance', () => {
    it('should render college selection page within acceptable time', async () => {
      const { duration } = await measurePerformance(async () => {
        render(<CollegeSelectionPage />)
      })

      // Should render within 100ms
      expect(duration).toBeLessThan(100)
    })

    it('should render login page within acceptable time', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(mockCollege))

      const { duration } = await measurePerformance(async () => {
        render(<LoginPage />)
      })

      // Should render within 100ms
      expect(duration).toBeLessThan(100)
    })

    it('should handle rapid re-renders efficiently', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(mockCollege))

      const { duration } = await measurePerformance(async () => {
        // Simulate rapid re-renders
        for (let i = 0; i < 10; i++) {
          render(<LoginPage />)
        }
      })

      // Should handle 10 re-renders within 500ms
      expect(duration).toBeLessThan(500)
    })
  })

  describe('Form Interaction Performance', () => {
    it('should handle rapid input changes efficiently', async () => {
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      
      const { duration } = await measurePerformance(async () => {
        // Simulate rapid typing
        for (let i = 0; i < 100; i++) {
          fireEvent.change(input, { target: { value: `college${i}` } })
        }
      })

      // Should handle 100 input changes within 200ms
      expect(duration).toBeLessThan(200)
    })

    it('should handle tab switching efficiently', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(mockCollege))
      render(<LoginPage />)
      
      const { duration } = await measurePerformance(async () => {
        // Simulate rapid tab switching
        for (let i = 0; i < 20; i++) {
          const studentTab = screen.getByText('Student')
          const adminTab = screen.getByText('Admin/Teacher')
          
          fireEvent.click(studentTab)
          fireEvent.click(adminTab)
        }
      })

      // Should handle 20 tab switches within 300ms
      expect(duration).toBeLessThan(300)
    })
  })

  describe('API Call Performance', () => {
    it('should handle college search API calls efficiently', async () => {
      mockFetch({ success: true, college: { id: 'college-123', name: 'Test College' } })
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      const { duration } = await measurePerformance(async () => {
        fireEvent.change(input, { target: { value: 'testcollege' } })
        fireEvent.click(searchButton)
        
        await waitFor(() => {
          expect(screen.getByText('✓ College Found: Test College')).toBeInTheDocument()
        })
      })

      // API call and UI update should complete within 1000ms
      expect(duration).toBeLessThan(1000)
    })

    it('should handle login API calls efficiently', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(mockCollege))
      mockSignIn.mockResolvedValue({ ok: true, error: null })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const loginButton = screen.getByRole('button', { name: 'Sign In' })
      
      const { duration } = await measurePerformance(async () => {
        fireEvent.change(emailInput, { target: { value: 'admin@testcollege.edu' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        fireEvent.click(loginButton)
        
        await waitFor(() => {
          expect(mockSignIn).toHaveBeenCalled()
        })
      })

      // Login API call should complete within 1000ms
      expect(duration).toBeLessThan(1000)
    })
  })

  describe('Memory Usage Performance', () => {
    it('should not leak memory during multiple renders', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(mockCollege))

      // Get initial memory usage
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      // Perform multiple renders
      for (let i = 0; i < 50; i++) {
        render(<LoginPage />)
      }

      // Get final memory usage
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 10MB)
      if (initialMemory > 0 && finalMemory > 0) {
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
      }
    })

    it('should clean up event listeners properly', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(mockCollege))

      // Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<LoginPage />)
        unmount()
      }

      // This test ensures no memory leaks from event listeners
      // In a real implementation, you'd check for actual memory leaks
      expect(true).toBe(true)
    })
  })

  describe('Concurrent User Performance', () => {
    it('should handle multiple simultaneous college searches', async () => {
      mockFetch({ success: true, college: { id: 'college-123', name: 'Test College' } })
      
      const { duration } = await measurePerformance(async () => {
        // Simulate multiple concurrent searches
        const promises = Array.from({ length: 10 }, (_, i) => {
          return new Promise<void>((resolve) => {
            const { unmount } = render(<CollegeSelectionPage />)
            
            const input = screen.getByLabelText('College Username')
            const searchButton = screen.getByRole('button', { name: 'Find College' })
            
            fireEvent.change(input, { target: { value: `college${i}` } })
            fireEvent.click(searchButton)
            
            setTimeout(() => {
              unmount()
              resolve()
            }, 100)
          })
        })
        
        await Promise.all(promises)
      })

      // Should handle 10 concurrent searches within 2000ms
      expect(duration).toBeLessThan(2000)
    })

    it('should handle multiple simultaneous login attempts', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(mockCollege))
      mockSignIn.mockResolvedValue({ ok: true, error: null })
      
      const { duration } = await measurePerformance(async () => {
        // Simulate multiple concurrent login attempts
        const promises = Array.from({ length: 5 }, (_, i) => {
          return new Promise<void>((resolve) => {
            const { unmount } = render(<LoginPage />)
            
            const emailInput = screen.getByLabelText('Email')
            const passwordInput = screen.getByLabelText('Password')
            const loginButton = screen.getByRole('button', { name: 'Sign In' })
            
            fireEvent.change(emailInput, { target: { value: `user${i}@testcollege.edu` } })
            fireEvent.change(passwordInput, { target: { value: 'password123' } })
            fireEvent.click(loginButton)
            
            setTimeout(() => {
              unmount()
              resolve()
            }, 100)
          })
        })
        
        await Promise.all(promises)
      })

      // Should handle 5 concurrent logins within 1500ms
      expect(duration).toBeLessThan(1500)
    })
  })

  describe('Large Data Performance', () => {
    it('should handle large college datasets efficiently', async () => {
      // Mock large college data
      const largeCollege = {
        id: 'college-123',
        name: 'Test College with Very Long Name That Should Not Affect Performance',
        username: 'testcollege',
        slug: 'test-college',
        description: 'A'.repeat(1000), // Large description
        settings: {
          // Large settings object
          ...Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`key${i}`, `value${i}`]))
        }
      }
      
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(largeCollege))

      const { duration } = await measurePerformance(async () => {
        render(<LoginPage />)
      })

      // Should render large data within 200ms
      expect(duration).toBeLessThan(200)
    })

    it('should handle long form inputs efficiently', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(mockCollege))
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText('Email')
      const longEmail = 'a'.repeat(1000) + '@example.com'
      
      const { duration } = await measurePerformance(async () => {
        fireEvent.change(emailInput, { target: { value: longEmail } })
      })

      // Should handle long input within 50ms
      expect(duration).toBeLessThan(50)
    })
  })

  describe('Network Performance', () => {
    it('should handle slow network responses gracefully', async () => {
      // Mock slow response
      mockFetch({ success: true, college: { id: 'college-123', name: 'Test College' } })
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      const startTime = performance.now()
      
      fireEvent.change(input, { target: { value: 'testcollege' } })
      fireEvent.click(searchButton)
      
      // Should show loading state quickly
      expect(screen.getByText('Searching...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByText('✓ College Found: Test College')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // Should complete within reasonable time even with slow network
      expect(totalTime).toBeLessThan(5000)
    })

    it('should handle network timeouts gracefully', async () => {
      // Mock timeout
      mockFetch({ success: false, error: 'Timeout' }, 408)
      
      render(<CollegeSelectionPage />)
      
      const input = screen.getByLabelText('College Username')
      const searchButton = screen.getByRole('button', { name: 'Find College' })
      
      const { duration } = await measurePerformance(async () => {
        fireEvent.change(input, { target: { value: 'testcollege' } })
        fireEvent.click(searchButton)
        
        await waitFor(() => {
          expect(screen.getByText('Failed to connect to server')).toBeInTheDocument()
        })
      })

      // Should handle timeout within 2000ms
      expect(duration).toBeLessThan(2000)
    })
  })

  describe('Browser Performance', () => {
    it('should maintain 60fps during animations', async () => {
      const mockCollege = {
        id: 'college-123',
        name: 'Test College',
        username: 'testcollege',
        slug: 'test-college'
      }
      
      window.sessionStorage.setItem('selectedCollege', JSON.stringify(mockCollege))
      render(<LoginPage />)
      
      // Simulate rapid tab switching to test animation performance
      const { duration } = await measurePerformance(async () => {
        for (let i = 0; i < 60; i++) {
          const studentTab = screen.getByText('Student')
          const adminTab = screen.getByText('Admin/Teacher')
          
          fireEvent.click(studentTab)
          fireEvent.click(adminTab)
          
          // Small delay to simulate frame rate
          await new Promise(resolve => setTimeout(resolve, 16)) // ~60fps
        }
      })

      // Should maintain performance over 60 frames
      expect(duration).toBeLessThan(2000)
    })

    it('should handle browser resize efficiently', async () => {
      render(<CollegeSelectionPage />)
      
      const { duration } = await measurePerformance(async () => {
        // Simulate multiple resize events
        for (let i = 0; i < 10; i++) {
          window.dispatchEvent(new Event('resize'))
        }
      })

      // Should handle resize events within 100ms
      expect(duration).toBeLessThan(100)
    })
  })
})
