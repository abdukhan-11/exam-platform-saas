'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  GraduationCap,
  Users,
  Calendar
} from 'lucide-react';
import { AppRole } from '@/types/auth';

interface Student {
  id: string;
  rollNumber: string;
  name: string;
  email: string;
  department: string;
  year: number;
  status: 'active' | 'inactive' | 'graduated' | 'suspended';
  enrollmentDate: string;
  classes: string[];
}

interface Class {
  id: string;
  name: string;
  department: string;
  year: number;
  teacherId: string;
  teacherName: string;
  studentCount: number;
  maxCapacity: number;
}

const generateRollNumber = (year: number, sequence: number): string => {
  return `${year}-${sequence.toString().padStart(3, '0')}`;
};

const generateDefaultPassword = (rollNumber: string): string => {
  return `Student${rollNumber}`;
};

export function StudentManagement() {
  // Constants for form options
  const departments = ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Engineering'];
  const years = [2020, 2021, 2022, 2023, 2024, 2025];
  const statuses = ['active', 'inactive', 'graduated', 'suspended'];

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    const loadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStudents([
        {
          id: '1',
          rollNumber: '2024-001',
          name: 'John Doe',
          email: 'john.doe@example.com',
          department: 'Computer Science',
          year: 2024,
          status: 'active',
          enrollmentDate: '2024-09-01',
          classes: ['CS101', 'CS102']
        },
        {
          id: '2',
          rollNumber: '2024-002',
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          department: 'Mathematics',
          year: 2024,
          status: 'active',
          enrollmentDate: '2024-09-01',
          classes: ['MATH101', 'MATH102']
        },
        {
          id: '3',
          rollNumber: '2023-001',
          name: 'Mike Johnson',
          email: 'mike.johnson@example.com',
          department: 'Physics',
          year: 2023,
          status: 'active',
          enrollmentDate: '2023-09-01',
          classes: ['PHY101', 'PHY102']
        }
      ]);

      setClasses([
        {
          id: '1',
          name: 'CS101',
          department: 'Computer Science',
          year: 2024,
          teacherId: 't1',
          teacherName: 'Dr. Alice Brown',
          studentCount: 25,
          maxCapacity: 30
        },
        {
          id: '2',
          name: 'MATH101',
          department: 'Mathematics',
          year: 2024,
          teacherId: 't2',
          teacherName: 'Prof. Bob Wilson',
          studentCount: 28,
          maxCapacity: 35
        }
      ]);

      setIsLoading(false);
    };

    loadData();
  }, []);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || student.department === filterDepartment;
    const matchesYear = !filterYear || student.year.toString() === filterYear;
    const matchesStatus = !filterStatus || student.status === filterStatus;
    
    return matchesSearch && matchesDepartment && matchesYear && matchesStatus;
  });

  const handleAddStudent = (studentData: Omit<Student, 'id' | 'rollNumber' | 'enrollmentDate'>) => {
    const newStudent: Student = {
      ...studentData,
      id: Date.now().toString(),
      rollNumber: generateRollNumber(studentData.year, students.filter(s => s.year === studentData.year).length + 1),
      enrollmentDate: new Date().toISOString().split('T')[0]
    };
    setStudents([...students, newStudent]);
    setIsAddDialogOpen(false);
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsEditDialogOpen(true);
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents(students.filter(s => s.id !== studentId));
  };

  const handleBulkImport = (file: File) => {
    // TODO: Implement CSV parsing and bulk import
    console.log('Bulk import file:', file);
    setIsBulkImportDialogOpen(false);
  };

  const handleBulkExport = () => {
    const csvContent = [
      ['Roll Number', 'Name', 'Email', 'Department', 'Year', 'Status', 'Enrollment Date'],
      ...filteredStudents.map(student => [
        student.rollNumber,
        student.name,
        student.email,
        student.department,
        student.year.toString(),
        student.status,
        student.enrollmentDate
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Management</h1>
          <p className="text-muted-foreground">
            Manage student accounts, enrollments, and class assignments
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsBulkImportDialogOpen(true)} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
          <Button onClick={handleBulkExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all departments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter(s => s.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently enrolled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
            <p className="text-xs text-muted-foreground">
              Available for enrollment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Class Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(classes.reduce((acc, c) => acc + c.studentCount, 0) / classes.length)}
            </div>
            <p className="text-xs text-muted-foreground">
              Students per class
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
          <CardDescription>
            Find students by name, roll number, or other criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Name, roll number, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger>
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All years</SelectItem>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setSearchTerm('');
                  setFilterDepartment('');
                  setFilterYear('');
                  setFilterStatus('');
                }}
              >
                <Filter className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students ({filteredStudents.length})</CardTitle>
          <CardDescription>
            Manage student accounts and view enrollment information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono">{student.rollNumber}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.department}</TableCell>
                  <TableCell>{student.year}</TableCell>
                  <TableCell>
                    <Badge variant={
                      student.status === 'active' ? 'default' :
                      student.status === 'inactive' ? 'secondary' : 'outline'
                    }>
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {student.classes.map((className, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {className}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditStudent(student)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Create a new student account with auto-generated roll number and password
            </DialogDescription>
          </DialogHeader>
                     <AddStudentForm 
             onSubmit={handleAddStudent} 
             departments={departments}
             years={years}
             statuses={statuses}
           />
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information and enrollment details
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
                         <EditStudentForm 
               student={selectedStudent} 
               onSubmit={(updatedStudent) => {
                 setStudents(students.map(s => 
                   s.id === updatedStudent.id ? updatedStudent : s
                 ));
                 setIsEditDialogOpen(false);
               }}
               departments={departments}
               years={years}
               statuses={statuses}
             />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={isBulkImportDialogOpen} onOpenChange={setIsBulkImportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Bulk Import Students</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import multiple students at once
            </DialogDescription>
          </DialogHeader>
          <BulkImportForm onSubmit={handleBulkImport} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add Student Form Component
function AddStudentForm({ 
  onSubmit, 
  departments, 
  years, 
  statuses 
}: { 
  onSubmit: (data: Omit<Student, 'id' | 'rollNumber' | 'enrollmentDate'>) => void;
  departments: string[];
  years: number[];
  statuses: string[];
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    year: 2024,
    status: 'active' as 'active' | 'inactive' | 'graduated' | 'suspended',
    classes: [] as string[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData); // formData already includes classes property
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="year">Enrollment Year</Label>
        <Select value={formData.year.toString()} onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' | 'graduated' | 'suspended' })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="submit">Add Student</Button>
      </DialogFooter>
    </form>
  );
}

// Edit Student Form Component
function EditStudentForm({ 
  student, 
  onSubmit, 
  departments, 
  years, 
  statuses 
}: { 
  student: Student; 
  onSubmit: (student: Student) => void;
  departments: string[];
  years: number[];
  statuses: string[];
}) {
  const [formData, setFormData] = useState(student);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">Full Name</Label>
        <Input
          id="edit-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-email">Email</Label>
        <Input
          id="edit-email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-department">Department</Label>
        <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-year">Enrollment Year</Label>
        <Select value={formData.year.toString()} onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' | 'graduated' | 'suspended' })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="submit">Update Student</Button>
      </DialogFooter>
    </form>
  );
}

// Bulk Import Form Component
function BulkImportForm({ onSubmit }: { onSubmit: (file: File) => void }) {
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onSubmit(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="csv-file">CSV File</Label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
        <p className="text-xs text-muted-foreground">
          File should contain columns: Name, Email, Department, Year, Status
        </p>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={!file}>Import Students</Button>
      </DialogFooter>
    </form>
  );
}
