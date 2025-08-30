import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExamOverview from '@/components/student/ExamOverview';

describe('ExamOverview', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T10:00:00Z'));
    // @ts-ignore
    global.fetch = jest.fn(async (url: string) => {
      if (url.includes('/api/exams')) {
        return {
          json: async () => ({
            items: [
              {
                id: 'e1',
                title: 'Math Midterm',
                startTime: '2025-01-01T09:00:00Z',
                endTime: '2025-01-01T11:00:00Z',
                subjectId: 's1',
                totalMarks: 100,
                duration: 120,
              },
              {
                id: 'e2',
                title: 'Physics Quiz',
                startTime: '2025-01-01T12:00:00Z',
                endTime: '2025-01-01T12:30:00Z',
                subjectId: 's2',
                totalMarks: 20,
                duration: 30,
              },
            ],
          }),
        } as any;
      }
      if (url.includes('/api/subjects')) {
        return {
          json: async () => ({ items: [ { id: 's1', name: 'Math' }, { id: 's2', name: 'Physics' } ] }),
        } as any;
      }
      return { json: async () => ({ items: [] }) } as any;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    // @ts-ignore
    global.fetch.mockRestore?.();
  });

  it('renders exams, filters, and quick actions', async () => {
    await act(async () => {
      render(<ExamOverview />);
    });

    expect(await screen.findByText('Exam Overview')).toBeInTheDocument();
    expect(screen.getByText('Math Midterm')).toBeInTheDocument();
    expect(screen.getByText('Physics Quiz')).toBeInTheDocument();

    // Filters exist
    expect(screen.getByLabelText('Filter by subject')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
  });
});


