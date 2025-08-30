import { StudentDashboardLayout } from '@/components/layout/student-dashboard-layout';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudentDashboardLayout>{children}</StudentDashboardLayout>;
}


