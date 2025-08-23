import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import CollegeForm from '@/components/forms/college-form';

export default function NewCollegePage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Add New College</h1>
        <Button variant="outline" asChild>
          <Link href="/dashboard/superadmin/colleges">Back to Colleges</Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>College Information</CardTitle>
          <CardDescription>Enter the details for the new college</CardDescription>
        </CardHeader>
        <CardContent>
          <CollegeForm />
        </CardContent>
      </Card>
    </div>
  );
}
