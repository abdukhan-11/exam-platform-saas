import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import CollegeTable from '@/components/tables/college-table';

export default function CollegeManagementPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">College Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/test-college-crud">Test CRUD</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/superadmin/colleges/new">Add New College</Link>
          </Button>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Colleges</CardTitle>
          <CardDescription>Manage all colleges in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <CollegeTable />
        </CardContent>
      </Card>
    </div>
  );
}
