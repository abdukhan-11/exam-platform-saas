import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudentDashboardLayout } from '@/components/layout/student-dashboard-layout';

describe('StudentDashboardLayout', () => {
  it('renders navigation and wraps children', () => {
    render(
      <StudentDashboardLayout>
        <div data-testid="child">Child Content</div>
      </StudentDashboardLayout>
    );

    expect(screen.getByText('Exam SaaS')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Exams')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Awards')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();

    expect(screen.getByTestId('child')).toHaveTextContent('Child Content');
  });
});


