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
  MapPin
} from 'lucide-react';

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

interface Teacher {
  id: string;
  name: string;
  email: string;
  department: string;
  specialization: string;
}

const departments = ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Engineering'];
const years = [2020, 2021, 2022, 2023, 2024];
const semesters = ['Fall', 'Spring', 'Summer'];
const subjects = ['Programming', 'Calculus', 'Physics', 'Chemistry', 'Biology', 'Literature', 'History'];

export function ClassManagement() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEnrollmentDialogOpen, setIsEnrollmentDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    const loadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTeachers([
        {
          id: 't1',
          name: 'Dr. Alice Brown',
          email: 'alice.brown@example.com',
          department: 'Computer Science',
          specialization: 'Software Engineering'
        },
        {
          id: 't2',
          name: 'Prof. Bob Wilson',
          email: 'bob.wilson@example.com',
          department: 'Mathematics',
          specialization: 'Applied Mathematics'
        },
        {
          id: 't3',
          name: 'Dr. Carol Davis',
          email: 'carol.davis@example.com',
          department: 'Physics',
          specialization: 'Quantum Physics'
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

      setIsLoading(false);
    };

    loadData();
  }, []);

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.teacherName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || cls.department === filterDepartment;
    const matchesYear = !filterYear || cls.year.toString() === filterYear;
    const matchesSemester = !filterSemester || cls.semester === filterSemester;
    
    return matchesSearch && matchesDepartment && matchesYear && matchesSemester;
  });

  const handleAddClass = (classData: Omit<Class, 'id' | 'studentCount'>) => {
    const newClass: Class = {
      ...classData,
      id: Date.now().toString(),
      studentCount: 0
    };
    setClasses([...classes, newClass]);
    setIsAddDialogOpen(false);
  };

  const handleEditClass = (cls: Class) => {
    setSelectedClass(cls);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClass = (classId: string) => {
    setClasses(classes.filter(c => c.id !== classId));
  };

  const handleViewEnrollment = (cls: Class) => {
    setSelectedClass(cls);
    setIsEnrollmentDialogOpen(true);
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
          <h1 className="text-3xl font-bold tracking-tight">Class Management</h1>
          <p className="text-muted-foreground">
            Create and manage classes, assign teachers, and track enrollments
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Class
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all departments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}</div>
            <p className="text-xs text-muted-foreground">
              Available for assignment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {classes.reduce((acc, c) => acc + c.studentCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Enrolled across all classes
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
            Find classes by name, department, or other criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Class name, description, teacher..."
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
              <Label htmlFor="semester">Semester</Label>
              <Select value={filterSemester} onValueChange={setFilterSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="All semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All semesters</SelectItem>
                  {semesters.map(sem => (
                    <SelectItem key={sem} value={sem}>{sem}</SelectItem>
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
                  setFilterSemester('');
                }}
              >
                <Filter className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Classes ({filteredClasses.length})</CardTitle>
          <CardDescription>
            Manage class information, teacher assignments, and student enrollments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Enrollment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-mono font-medium">{cls.name}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{cls.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {cls.year} - {cls.semester}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{cls.department}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{cls.teacherName}</div>
                      <div className="text-sm text-muted-foreground">
                        {teachers.find(t => t.id === cls.teacherId)?.specialization}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{cls.schedule}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{cls.room}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {cls.studentCount}/{cls.maxCapacity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(cls.studentCount / cls.maxCapacity) * 100}%` }}
                      ></div>
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
                        <DropdownMenuItem onClick={() => handleEditClass(cls)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Class
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewEnrollment(cls)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Enrollment
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClass(cls.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Class
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

      {/* Add Class Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>
              Set up a new class with teacher assignment and schedule
            </DialogDescription>
          </DialogHeader>
          <AddClassForm onSubmit={handleAddClass} teachers={teachers} />
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Update class information and teacher assignment
            </DialogDescription>
          </DialogHeader>
          {selectedClass && (
            <EditClassForm 
              cls={selectedClass} 
              teachers={teachers}
              onSubmit={(updatedClass) => {
                setClasses(classes.map(c => 
                  c.id === updatedClass.id ? updatedClass : c
                ));
                setIsEditDialogOpen(false);
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Enrollment Dialog */}
      <Dialog open={isEnrollmentDialogOpen} onOpenChange={setIsEnrollmentDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Class Enrollment</DialogTitle>
            <DialogDescription>
              View and manage student enrollments for {selectedClass?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedClass && (
            <ClassEnrollmentView class={selectedClass} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add Class Form Component
function AddClassForm({ onSubmit, teachers }: { 
  onSubmit: (data: Omit<Class, 'id' | 'studentCount'>) => void;
  teachers: Teacher[];
}) {
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    year: 2024,
    semester: 'Fall',
    teacherId: '',
    maxCapacity: 30,
    schedule: '',
    room: '',
    description: '',
    subjects: [] as string[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find(t => t.id === formData.teacherId);
    onSubmit({
      ...formData,
      teacherName: teacher?.name || ''
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Class Code</Label>
          <Input
            id="name"
            placeholder="e.g., CS101"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxCapacity">Max Capacity</Label>
          <Input
            id="maxCapacity"
            type="number"
            min="1"
            value={formData.maxCapacity}
            onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Class Name</Label>
        <Input
          id="description"
          placeholder="e.g., Introduction to Computer Science"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
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
          <Label htmlFor="year">Year</Label>
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
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="semester">Semester</Label>
          <Select value={formData.semester} onValueChange={(value) => setFormData({ ...formData, semester: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {semesters.map(sem => (
                <SelectItem key={sem} value={sem}>{sem}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacherId">Teacher</Label>
          <Select value={formData.teacherId} onValueChange={(value) => setFormData({ ...formData, teacherId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select teacher" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map(teacher => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.name} ({teacher.department})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="schedule">Schedule</Label>
          <Input
            id="schedule"
            placeholder="e.g., Mon, Wed, Fri 9:00 AM - 10:30 AM"
            value={formData.schedule}
            onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="room">Room</Label>
          <Input
            id="room"
            placeholder="e.g., Room 201"
            value={formData.room}
            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
            required
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit">Create Class</Button>
      </DialogFooter>
    </form>
  );
}

// Edit Class Form Component
function EditClassForm({ cls, teachers, onSubmit }: { 
  cls: Class; 
  teachers: Teacher[];
  onSubmit: (cls: Class) => void;
}) {
  const [formData, setFormData] = useState(cls);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find(t => t.id === formData.teacherId);
    onSubmit({
      ...formData,
      teacherName: teacher?.name || ''
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Class Code</Label>
          <Input
            id="edit-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-maxCapacity">Max Capacity</Label>
          <Input
            id="edit-maxCapacity"
            type="number"
            min="1"
            value={formData.maxCapacity}
            onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-description">Class Name</Label>
        <Input
          id="edit-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
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
          <Label htmlFor="edit-year">Year</Label>
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
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-semester">Semester</Label>
          <Select value={formData.semester} onValueChange={(value) => setFormData({ ...formData, semester: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {semesters.map(sem => (
                <SelectItem key={sem} value={sem}>{sem}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-teacherId">Teacher</Label>
          <Select value={formData.teacherId} onValueChange={(value) => setFormData({ ...formData, teacherId: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teachers.map(teacher => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.name} ({teacher.department})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-schedule">Schedule</Label>
          <Input
            id="edit-schedule"
            value={formData.schedule}
            onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-room">Room</Label>
          <Input
            id="edit-room"
            value={formData.room}
            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
            required
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit">Update Class</Button>
      </DialogFooter>
    </form>
  );
}

// Class Enrollment View Component
function ClassEnrollmentView({ class: cls }: { class: Class }) {
  // Mock student data for demonstration
  const enrolledStudents = [
    { id: '1', name: 'John Doe', email: 'john.doe@example.com', enrollmentDate: '2024-09-01' },
    { id: '2', name: 'Jane Smith', email: 'jane.smith@example.com', enrollmentDate: '2024-09-01' },
    { id: '3', name: 'Mike Johnson', email: 'mike.johnson@example.com', enrollmentDate: '2024-09-02' }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Class Information</Label>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Name:</span>
              <span className="text-sm font-medium">{cls.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Department:</span>
              <span className="text-sm font-medium">{cls.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Teacher:</span>
              <span className="text-sm font-medium">{cls.teacherName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Schedule:</span>
              <span className="text-sm font-medium">{cls.schedule}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Room:</span>
              <span className="text-sm font-medium">{cls.room}</span>
            </div>
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">Enrollment Status</Label>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Current:</span>
              <span className="text-sm font-medium">{cls.studentCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Capacity:</span>
              <span className="text-sm font-medium">{cls.maxCapacity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Available:</span>
              <span className="text-sm font-medium">{cls.maxCapacity - cls.studentCount}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${(cls.studentCount / cls.maxCapacity) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Enrolled Students ({enrolledStudents.length})</Label>
        <div className="mt-2 space-y-2">
          {enrolledStudents.map((student) => (
            <div key={student.id} className="flex items-center justify-between p-2 border rounded">
              <div>
                <div className="font-medium">{student.name}</div>
                <div className="text-sm text-muted-foreground">{student.email}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                Enrolled: {student.enrollmentDate}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
