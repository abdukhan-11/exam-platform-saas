import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { PrismaClient } from '@prisma/client'

// Mock Prisma Client for testing
export const createMockPrismaClient = () => ({
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  college: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $disconnect: jest.fn(),
  $transaction: jest.fn(),
})

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: any
  prisma?: any
}

const AllTheProviders = ({ 
  children, 
  session = null, 
  prisma = createMockPrismaClient() 
}: { 
  children: React.ReactNode
  session?: any
  prisma?: any
}) => {
  return React.createElement(
    SessionProvider,
    { session },
    children
  )
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { session, prisma, ...renderOptions } = options
  
  return render(ui, {
    wrapper: ({ children }) => React.createElement(
      AllTheProviders,
      { session, prisma },
      children
    ),
    ...renderOptions,
  })
}

// Mock Next.js router
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
}

// Mock Next.js navigation
export const mockNavigation = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
}

// Mock fetch responses
export const mockFetch = (response: any, status: number = 200) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(response),
    text: jest.fn().mockResolvedValue(JSON.stringify(response)),
  })
}

// Mock fetch errors
export const mockFetchError = (error: string) => {
  global.fetch = jest.fn().mockRejectedValue(new Error(error))
}

// Wait for async operations
export const waitFor = (ms: number) => 
  new Promise(resolve => setTimeout(resolve, ms))

// Mock localStorage
export const mockLocalStorage = () => {
  const store: { [key: string]: string } = {}
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
  }
}

// Mock session storage
export const mockSessionStorage = () => {
  const store: { [key: string]: string } = {}
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
  }
}

// Test data generators
export const generateRandomEmail = () => 
  `test-${Math.random().toString(36).substr(2, 9)}@example.com`

export const generateRandomString = (length: number = 10) => 
  Math.random().toString(36).substr(2, length)

export const generateRandomId = () => 
  `id-${Math.random().toString(36).substr(2, 9)}`

// Assertion helpers
export const expectToBeInTheDocument = (element: HTMLElement | null) => {
  expect(element).toBeInTheDocument()
}

export const expectNotToBeInTheDocument = (element: HTMLElement | null) => {
  expect(element).not.toBeInTheDocument()
}

export const expectToHaveTextContent = (element: HTMLElement | null, text: string) => {
  expect(element).toHaveTextContent(text)
}

export const expectToHaveClass = (element: HTMLElement | null, className: string) => {
  expect(element).toHaveClass(className)
}

export const expectToHaveAttribute = (element: HTMLElement | null, attribute: string, value?: string) => {
  if (value) {
    expect(element).toHaveAttribute(attribute, value)
  } else {
    expect(element).toHaveAttribute(attribute)
  }
}

// Performance testing helpers
export const measurePerformance = async (fn: () => Promise<any>) => {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  
  return {
    result,
    duration: end - start,
  }
}

// Security testing helpers
export const createMaliciousInput = () => ({
  xss: '<script>alert("xss")</script>',
  sqlInjection: "'; DROP TABLE users; --",
  pathTraversal: '../../../etc/passwd',
  commandInjection: '; rm -rf /',
})

// Accessibility testing helpers
export const checkA11y = async (container: HTMLElement) => {
  // This would integrate with jest-axe in a real implementation
  const violations: string[] = []
  
  // Check for missing alt attributes on images
  const images = container.querySelectorAll('img')
  images.forEach(img => {
    if (!img.getAttribute('alt')) {
      violations.push('Image missing alt attribute')
    }
  })
  
  // Check for missing labels on form inputs
  const inputs = container.querySelectorAll('input, select, textarea')
  inputs.forEach(input => {
    const id = input.getAttribute('id')
    if (id && !container.querySelector(`label[for="${id}"]`)) {
      violations.push(`Input with id "${id}" missing label`)
    }
  })
  
  return violations
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { customRender as render }
