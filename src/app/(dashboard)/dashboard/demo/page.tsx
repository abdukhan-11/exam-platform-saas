'use client';

import { CollegeDashboardLayout } from '@/components/layout/college-dashboard-layout';
import { AppRole } from '@/types/auth';

export default function DashboardDemoPage() {
  return (
    <CollegeDashboardLayout
      userRole={AppRole.COLLEGE_ADMIN}
      collegeName="Demo University"
      userName="John Doe"
      userEmail="john.doe@demo.edu"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Demo Content</h2>
          <p className="text-muted-foreground">
            This is a demo page to showcase the new dashboard layout component.
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Feature 1</h3>
            <p className="text-sm text-muted-foreground">
              This demonstrates how the dashboard layout wraps content and provides
              consistent navigation and metrics display.
            </p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Feature 2</h3>
            <p className="text-sm text-muted-foreground">
              The layout automatically adapts to different user roles and provides
              role-specific navigation and quick actions.
            </p>
          </div>
        </div>
      </div>
    </CollegeDashboardLayout>
  );
}
