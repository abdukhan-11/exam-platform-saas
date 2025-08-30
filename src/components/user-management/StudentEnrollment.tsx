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
  Users, 
  GraduationCap, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  UserPlus,
  UserMinus
} from 'lucide-react';

interface Student {
  id: string;
  rollNumber: string;
  name: string;
  email: string;
  department: string;
  year: number;
  status: 'active' | 'inactive' | 'graduated';
  enrollmentDate: string;
  classes: string[];
}

interface Class {
  id: string;
  name: string;
  department: string;
  year: number;
  semester: string;
  teacherId: string;
  teacherName: string;
  studentCount: number;
  maxCapacity: number;
  schedule: string;
  room: string;
  description: string;
  subjects: string[];
}

interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  studentRollNumber: string;
  classId: string;
  className: string;
  enrollmentDate: string;
  status: 'active' | 'dropped' | 'completed';
}

export function StudentEnrollment() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [isBulkEnrollDialogOpen, setIsBulkEnrollDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
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
          semester: 'Fall',
          teacherId: 't1',
          teacherName: 'Dr. Alice Brown',
          studentCount: 25,
          maxCapacity: 30,
          schedule: 'Mon, Wed, Fri 9:00 AM - 10:30 AM',
          room: 'Room 201',
          description: 'Introduction to Computer Science',
          subjects: ['Programming', 'Algorithms']
        },
        {
          id: '2',
          name: 'MATH101',
          department: 'Mathematics',
          year: 2024,
          semester: 'Fall',
          teacherId: 't2',
          teacherName: 'Prof. Bob Wilson',
          studentCount: 28,
          maxCapacity: 35,
          schedule: 'Tue, Thu 10:00 AM - 11:30 AM',
          room: 'Room 301',
          description: 'Calculus I',
          subjects: ['Calculus', 'Mathematics']
        },
        {
          id: '3',
          name: 'PHY101',
          department: 'Physics',
          year: 2024,
          semester: 'Fall',
          teacherId: 't3',
          teacherName: 'Dr. Carol Davis',
          studentCount: 22,
          maxCapacity: 30,
          schedule: 'Mon, Wed 2:00 PM - 3:30 PM',
          room: 'Lab 401',
          description: 'Introduction to Physics',
          subjects: ['Physics', 'Laboratory']
        }
      ]);

      setEnrollments([
        {
          id: '1',
          studentId: '1',
          studentName: 'John Doe',
          studentRollNumber: '2024-001',
          classId: '1',
          className: 'CS101',
          enrollmentDate: '2024-09-01',
          status: 'active'
        },
        {
          id: '2',
          studentId: '2',
          studentName: 'Jane Smith',
          studentRollNumber: '2024-002',
          classId: '2',
          className: 'MATH101',
          enrollmentDate: '2024-09-01',
          status: 'active'
        },
        {
          id: '3',
          studentId: '3',
          studentName: 'Mike Johnson',
          studentRollNumber: '2023-001',
          classId: '3',
          className: 'PHY101',
          enrollmentDate: '2024-09-01',
          status: 'active'
        }
      ]);

      setIsLoading(false);
    };

    loadData();
  }, []);

  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesSearch = enrollment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.studentRollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.className.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !filterClass || enrollment.classId === filterClass;
    const matchesStatus = !filterStatus || enrollment.status === filterStatus;
    
    return matchesSearch && matchesClass && matchesStatus;
  });

  const availableClasses = classes.filter(cls => cls.studentCount < cls.maxCapacity);
  const availableStudents = students.filter(student => student.status === 'active');

  const handleEnrollStudent = (studentId: string, classId: string) => {
    const student = students.find(s => s.id === studentId);
    const cls = classes.find(c => c.id === classId);
    
    if (!student || !cls) return;

    // Check if already enrolled
    const existingEnrollment = enrollments.find(e => 
      e.studentId === studentId && e.classId === classId
    );
    
    if (existingEnrollment) {
      alert('Student is already enrolled in this class');
      return;
    }

    // Check class capacity
    if (cls.studentCount >= cls.maxCapacity) {
      alert('Class is at maximum capacity');
      return;
    }

    // Create new enrollment
    const newEnrollment: Enrollment = {
      id: Date.now().toString(),
      studentId,
      studentName: student.name,
      studentRollNumber: student.rollNumber,
      classId,
      className: cls.name,
      enrollmentDate: new Date().toISOString().split('T')[0],
      status: 'active'
    };

    setEnrollments([...enrollments, newEnrollment]);

    // Update class student count
    setClasses(classes.map(c => 
      c.id === classId ? { ...c, studentCount: c.studentCount + 1 } : c
    ));

    // Update student classes
    setStudents(students.map(s => 
      s.id === studentId ? { ...s, classes: [...s.classes, cls.name] } : s
    ));

    setIsEnrollDialogOpen(false);
  };

  const handleDropEnrollment = (enrollmentId: string) => {
    const enrollment = enrollments.find(e => e.id === enrollmentId);
    if (!enrollment) return;

    // Remove enrollment
    setEnrollments(enrollments.filter(e => e.id !== enrollmentId));

    // Update class student count
    setClasses(classes.map(c => 
      c.id === enrollment.classId ? { ...c, studentCount: c.studentCount - 1 } : c
    ));

    // Update student classes
    setStudents(students.map(s => 
      s.id === enrollment.studentId ? { 
        ...s, 
        classes: s.classes.filter(c => c !== enrollment.className) 
      } : s
    ));
  };

  const handleBulkEnroll = (studentIds: string[], classId: string) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;

    const availableSlots = cls.maxCapacity - cls.studentCount;
    const studentsToEnroll = studentIds.slice(0, availableSlots);

    studentsToEnroll.forEach(studentId => {
      handleEnrollStudent(studentId, classId);
    });

    setIsBulkEnrollDialogOpen(false);
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
          <h1 className="text-3xl font-bold tracking-tight">Student Enrollment</h1>
          <p className="text-muted-foreground">
            Manage student enrollments in classes and track enrollment status
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsBulkEnrollDialogOpen(true)} variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            Bulk Enroll
          </Button>
          <Button onClick={() => setIsEnrollDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Enroll Student
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollments.length}</div>
            <p className="text-xs text-muted-foreground">
              Active enrollments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Classes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableClasses.length}</div>
            <p className="text-xs text-muted-foreground">
              With available seats
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableStudents.length}</div>
            <p className="text-xs text-muted-foreground">
              Ready for enrollment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Class Utilization</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(classes.reduce((acc, c) => acc + (c.studentCount / c.maxCapacity), 0) / classes.length * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Capacity utilization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
          <CardDescription>
            Find enrollments by student, class, or status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Student name, roll number, class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All classes</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} - {cls.description}
                    </SelectItem>
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
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
                  setFilterClass('');
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

      {/* Enrollments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enrollments ({filteredEnrollments.length})</CardTitle>
          <CardDescription>
            View and manage student enrollments across all classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Roll Number</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Enrollment Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnrollments.map((enrollment) => {
                const student = students.find(s => s.id === enrollment.studentId);
                const cls = classes.find(c => c.id === enrollment.classId);
                
                return (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{enrollment.studentName}</div>
                        <div className="text-sm text-muted-foreground">{student?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{enrollment.studentRollNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{enrollment.className}</div>
                        <div className="text-sm text-muted-foreground">{cls?.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>{cls?.department}</TableCell>
                    <TableCell>{enrollment.enrollmentDate}</TableCell>
                    <TableCell>
                      <Badge variant={
                        enrollment.status === 'active' ? 'default' :
                        enrollment.status === 'dropped' ? 'destructive' : 'secondary'
                      }>
                        {enrollment.status}
                      </Badge>
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
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDropEnrollment(enrollment.id)}
                            className="text-red-600"
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Drop Enrollment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Enroll Student Dialog */}
      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Enroll Student in Class</DialogTitle>
            <DialogDescription>
              Select a student and class to create a new enrollment
            </DialogDescription>
          </DialogHeader>
          <EnrollStudentForm 
            students={availableStudents}
            classes={availableClasses}
            onSubmit={handleEnrollStudent}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Enroll Dialog */}
      <Dialog open={isBulkEnrollDialogOpen} onOpenChange={setIsBulkEnrollDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Bulk Enroll Students</DialogTitle>
            <DialogDescription>
              Enroll multiple students in a single class
            </DialogDescription>
          </DialogHeader>
          <BulkEnrollForm 
            students={availableStudents}
            classes={availableClasses}
            onSubmit={handleBulkEnroll}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Enroll Student Form Component
function EnrollStudentForm({ 
  students, 
  classes, 
  onSubmit 
}: { 
  students: Student[];
  classes: Class[];
  onSubmit: (studentId: string, classId: string) => void;
}) {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudent && selectedClass) {
      onSubmit(selectedStudent, selectedClass);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="student">Student</Label>
        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
          <SelectTrigger>
            <SelectValue placeholder="Select a student" />
          </SelectTrigger>
          <SelectContent>
            {students.map(student => (
              <SelectItem key={student.id} value={student.id}>
                {student.name} ({student.rollNumber}) - {student.department}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="class">Class</Label>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger>
            <SelectValue placeholder="Select a class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map(cls => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name} - {cls.description} ({cls.studentCount}/{cls.maxCapacity})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={!selectedStudent || !selectedClass}>
          Enroll Student
        </Button>
      </DialogFooter>
    </form>
  );
}

// Bulk Enroll Form Component
function BulkEnrollForm({ 
  students, 
  classes, 
  onSubmit 
}: { 
  students: Student[];
  classes: Class[];
  onSubmit: (studentIds: string[], classId: string) => void;
}) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudents.length > 0 && selectedClass) {
      onSubmit(selectedStudents, selectedClass);
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="class">Class</Label>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger>
            <SelectValue placeholder="Select a class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map(cls => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name} - {cls.description} ({cls.studentCount}/{cls.maxCapacity})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Select Students ({selectedStudents.length} selected)</Label>
        <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-2">
          {students.map(student => (
            <div key={student.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`student-${student.id}`}
                checked={selectedStudents.includes(student.id)}
                onChange={() => toggleStudent(student.id)}
                className="rounded"
              />
              <Label htmlFor={`student-${student.id}`} className="text-sm">
                {student.name} ({student.rollNumber}) - {student.department}
              </Label>
            </div>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={selectedStudents.length === 0 || !selectedClass}>
          Enroll {selectedStudents.length} Students
        </Button>
      </DialogFooter>
    </form>
  );
}
