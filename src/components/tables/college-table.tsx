'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorDisplay, SuccessDisplay } from '@/components/shared/error-display';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/dialog';
import Link from 'next/link';

interface College {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface CollegeTableProps {
  showSearch?: boolean;
  showPagination?: boolean;
  itemsPerPage?: number;
}

export default function CollegeTable({ 
  showSearch = true, 
  showPagination = true, 
  itemsPerPage = 10 
}: CollegeTableProps) {
  const router = useRouter();
  const [colleges, setColleges] = useState<College[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: itemsPerPage,
    pages: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof College>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    college: { id: string; name: string } | null;
    isLoading: boolean;
  }>({
    open: false,
    college: null,
    isLoading: false,
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch colleges with pagination and search
  const fetchColleges = async (page: number = 1, search: string = '') => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search: search,
        sortBy: sortField,
        sortOrder: sortDirection
      });

      const response = await fetch(`/api/colleges?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch colleges');
      }

      const data = await response.json();
      setColleges(data.colleges || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching colleges');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchColleges(1, searchTerm);
  }, [sortField, sortDirection]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        fetchColleges(1, searchTerm);
      } else {
        fetchColleges(1, '');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      fetchColleges(newPage, searchTerm);
    }
  };

  // Handle sorting
  const handleSort = (field: keyof College) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle delete
  const handleDeleteClick = (id: string, name: string) => {
    setDeleteDialog({
      open: true,
      college: { id, name },
      isLoading: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.college) return;

    setDeleteDialog(prev => ({ ...prev, isLoading: true }));
    setError(null);

    try {
      const response = await fetch(`/api/colleges/${deleteDialog.college.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete college');
      }

      // Close dialog and refresh
      setDeleteDialog({ open: false, college: null, isLoading: false });
      setSuccessMessage(`College "${deleteDialog.college.name}" was successfully deleted.`);
      
      // Refresh the current page
      fetchColleges(pagination.page, searchTerm);
    } catch (err) {
      setDeleteDialog(prev => ({ ...prev, isLoading: false }));
      setError(err instanceof Error ? err.message : 'Failed to delete college');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, college: null, isLoading: false });
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get sort indicator
  const getSortIndicator = (field: keyof College) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Loading state
  if (isLoading && colleges.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading colleges...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Colleges</CardTitle>
            <CardDescription>
              Manage college records ({pagination.total} total)
            </CardDescription>
          </div>
          <Link href="/dashboard/superadmin/colleges/new">
            <Button>Add New College</Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent>
        <SuccessDisplay
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
        
        <ErrorDisplay
          error={error}
          onRetry={() => fetchColleges(pagination.page, searchTerm)}
          onDismiss={() => setError(null)}
          showRetry={true}
        />

        {/* Search Bar */}
        {showSearch && (
          <div className="mb-6">
            <Label htmlFor="search" className="sr-only">Search colleges</Label>
            <Input
              id="search"
              type="text"
              placeholder="Search colleges by name, address, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        )}

        {/* Colleges Table */}
        {colleges.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No colleges found matching your search.' : 'No colleges found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th 
                    className="text-left p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Name {getSortIndicator('name')}
                    </div>
                  </th>
                  <th className="text-left p-3">Address</th>
                  <th className="text-left p-3">Contact</th>
                  <th 
                    className="text-left p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-2">
                      Created {getSortIndicator('createdAt')}
                    </div>
                  </th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {colleges.map((college) => (
                  <tr key={college.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{college.name}</div>
                      {college.website && (
                        <a 
                          href={college.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {college.website}
                        </a>
                      )}
                    </td>
                    <td className="p-3">
                      {college.address || 'No address'}
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        {college.email && (
                          <div className="text-sm">
                            <span className="font-medium">Email:</span> {college.email}
                          </div>
                        )}
                        {college.phone && (
                          <div className="text-sm">
                            <span className="font-medium">Phone:</span> {college.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {formatDate(college.createdAt)}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        college.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {college.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Link href={`/dashboard/superadmin/colleges/${college.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteClick(college.id, college.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {showPagination && pagination.pages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} colleges
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={pageNum === pagination.page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
                 )}
       </CardContent>

       {/* Delete Confirmation Dialog */}
       <ConfirmDialog
         open={deleteDialog.open}
         onOpenChange={(open) => !open && handleDeleteCancel()}
         title="Delete College"
         description={
           deleteDialog.college
             ? `Are you sure you want to delete "${deleteDialog.college.name}"? This action cannot be undone and will permanently remove the college from the system.`
             : ''
         }
         confirmText="Delete College"
         cancelText="Cancel"
         onConfirm={handleDeleteConfirm}
         onCancel={handleDeleteCancel}
         variant="destructive"
         isLoading={deleteDialog.isLoading}
       />
     </Card>
   );
 }
