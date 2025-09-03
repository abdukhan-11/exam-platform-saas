# Student Impersonation Feature

## Overview

The student impersonation feature allows college administrators and teachers to view the student dashboard from a specific student's perspective. This is useful for:

- Troubleshooting student issues
- Understanding the student experience
- Providing technical support
- Reviewing student progress from their perspective

## How It Works

### 1. Accessing the Feature

1. Navigate to the **Student Management** section in the college admin panel
2. Find the student you want to view as
3. Click the **Actions** dropdown (three dots) next to the student
4. Select **"View as Student"**

### 2. What Happens

When you click "View as Student":

1. The system stores impersonation data in localStorage
2. You are redirected to the student dashboard (`/dashboard/student`)
3. The dashboard displays as if you are that specific student
4. A "Return to Admin" button appears in the header
5. The profile dropdown shows "Admin View" instead of "Student"

### 3. Student Dashboard Experience

While impersonating a student:

- **Header**: Shows a blue "Return to Admin" button
- **Profile Dropdown**: 
  - Label changes to "Admin View"
  - Shows "Viewing as: [Student Name]"
  - "Return to Admin" option replaces "Logout"
- **Dashboard Content**: Displays the student's actual data and progress
- **Navigation**: Full access to all student dashboard sections

### 4. Returning to Admin Panel

You can return to the admin panel by:

1. Clicking the **"Return to Admin"** button in the header
2. Using the **"Return to Admin"** option in the profile dropdown
3. Both methods clear the impersonation data and redirect to the student management page

## Technical Implementation

### Data Storage

Impersonation data is stored in localStorage with the key `impersonatingStudent`:

```typescript
interface ImpersonationData {
  rollNo: string;
  name: string;
  class: string;
  department: string;
  year: number;
  email: string;
  isImpersonating: boolean;
  adminSession: boolean;
  studentId: string;
}
```

### Utility Functions

The feature uses utility functions in `src/utils/impersonation.ts`:

- `setImpersonationData(student)`: Store impersonation data
- `getImpersonationData()`: Retrieve impersonation data
- `clearImpersonationData()`: Remove impersonation data
- `isImpersonating()`: Check if currently impersonating
- `getCurrentImpersonatedStudent()`: Get current student data

### Components Modified

1. **StudentManagement Component** (`src/components/user-management/StudentManagement.tsx`)
   - Added "View as Student" action to dropdown menu
   - Implemented `handleViewAsStudent` function

2. **Student Dashboard Layout** (`src/components/layout/student-dashboard-layout.tsx`)
   - Added impersonation detection
   - Added "Return to Admin" button
   - Modified profile dropdown for admin view

3. **Student Dashboard Page** (`src/app/(dashboard)/dashboard/student/page.tsx`)
   - Already had impersonation support built-in
   - Shows impersonation info in header and dashboard

## Security Considerations

- **Admin Only**: Only college administrators and teachers can access this feature
- **Temporary Session**: Impersonation data is stored in localStorage (client-side only)
- **Clear on Return**: Impersonation data is automatically cleared when returning to admin
- **Visual Indicators**: Clear visual indicators show when in impersonation mode
- **Easy Exit**: Multiple ways to return to admin panel

## Usage Guidelines

1. **Use Responsibly**: Only impersonate students when necessary for legitimate administrative purposes
2. **Respect Privacy**: Be mindful that you're viewing student's personal academic data
3. **Document Usage**: Consider logging when and why impersonation is used
4. **Quick Return**: Return to admin panel promptly after completing your task

## Future Enhancements

Potential improvements for the impersonation feature:

1. **Audit Logging**: Track when impersonation is used and by whom
2. **Time Limits**: Automatic timeout after a certain period
3. **Permission Levels**: Different impersonation permissions for different admin roles
4. **Session Management**: Server-side session management for better security
5. **Notification System**: Notify students when their account has been accessed by admin
