import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import CollegeForm from '@/components/forms/college-form';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';

interface EditCollegePageProps {
  params: {
    id: string;
  };
}

async function getCollege(id: string) {
  const college = await prisma.college.findUnique({
    where: { id },
  });
  
  if (!college) {
    notFound();
  }
  
  return college;
}

export default async function EditCollegePage({ params }: EditCollegePageProps) {
  const college = await getCollege(params.id);
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Edit College</h1>
        <Button variant="outline" asChild>
          <Link href="/dashboard/superadmin/colleges">Back to Colleges</Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>College Information</CardTitle>
          <CardDescription>Edit the details for {college.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <CollegeForm 
            initialData={{
              id: college.id,
              name: college.name,
              address: college.address || '',
              phone: college.phone || '',
              email: college.email || '',
              website: college.website || '',
            }}
            isEditing={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
