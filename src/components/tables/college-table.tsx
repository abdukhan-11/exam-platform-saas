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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal, 
  Ban, 
  CheckCircle,
  Building2,
  Users,
  CreditCard
} from 'lucide-react';
import Link from 'next/link';

interface College {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  isActive: boolean;
  subscriptionStatus: string;
  userCount: number;
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

const subscriptionStatusColors: Record<string, string> = {
  TRIAL: 'bg-gray-100 text-gray-800',
  BASIC: 'bg-blue-100 text-blue-800',
  STANDARD: 'bg-indigo-100 text-indigo-800',
  PREMIUM: 'bg-purple-100 text-purple-800',
  ENTERPRISE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-red-100 text-red-800',
};

const subscriptionStatusLabels: Record<string, string> = {
  TRIAL: 'Trial',
  BASIC: 'Basic',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
  ENTERPRISE: 'Enterprise',
  EXPIRED: 'Expired',
};

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
  const [selectedColleges, setSelectedColleges] = useState<Set<string>>(new Set());
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    college: { id: string; name: string } | null;
    isLoading: boolean;
  }>({
    open: false,
    college: null,
    isLoading: false,
  });
  const [bulkActionDialog, setBulkActionDialog] = useState<{
    open: boolean;
    action: string;
    isLoading: boolean;
  }>({
    open: false,
    action: '',
    isLoading: false,
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch colleges with pagination, search, and filters
  const fetchColleges = async (page: number = 1, search: string = '', filters: any = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search: search,
        sortBy: sortField,
        sortOrder: sortDirection,
        ...filters
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
    const filters: any = {};
    if (filterTier !== 'all') filters.tier = filterTier; // maps to subscriptionStatus on API
    if (filterStatus !== 'all') filters.status = filterStatus; // maps to isActive on API
    
    fetchColleges(1, searchTerm, filters);
  }, [sortField, sortDirection, filterTier, filterStatus]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      const filters: any = {};
      if (filterTier !== 'all') filters.tier = filterTier;
      if (filterStatus !== 'all') filters.status = filterStatus;
      
      fetchColleges(1, searchTerm, filters);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      const filters: any = {};
      if (filterTier !== 'all') filters.tier = filterTier;
      if (filterStatus !== 'all') filters.status = filterStatus;
      
      fetchColleges(newPage, searchTerm, filters);
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

  // Handle bulk selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedColleges(new Set(colleges.map(c => c.id)));
    } else {
      setSelectedColleges(new Set());
    }
  };

  const handleSelectCollege = (collegeId: string, checked: boolean) => {
    const newSelected = new Set(selectedColleges);
    if (checked) {
      newSelected.add(collegeId);
    } else {
      newSelected.delete(collegeId);
    }
    setSelectedColleges(newSelected);
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedColleges.size === 0) return;

    setBulkActionDialog({ open: true, action, isLoading: true });
    setError(null);

    try {
      const response = await fetch('/api/colleges/bulk-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          collegeIds: Array.from(selectedColleges)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to perform bulk ${action}`);
      }

      setSuccessMessage(`Bulk ${action} completed successfully for ${selectedColleges.size} colleges.`);
      setSelectedColleges(new Set());
      
      // Refresh the current page
      const filters: any = {};
      if (filterTier !== 'all') filters.tier = filterTier;
      if (filterStatus !== 'all') filters.status = filterStatus;
      
      fetchColleges(pagination.page, searchTerm, filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to perform bulk ${action}`);
    } finally {
      setBulkActionDialog({ open: false, action: '', isLoading: false });
    }
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const filters: any = {};
      if (filterTier !== 'all') filters.tier = filterTier;
      if (filterStatus !== 'all') filters.status = filterStatus;
      
      const params = new URLSearchParams({
        format,
        search: searchTerm,
        ...filters
      });

      const response = await fetch(`/api/colleges/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export colleges');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `colleges-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMessage(`Colleges exported successfully in ${format.toUpperCase()} format.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export colleges');
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
      const filters: any = {};
      if (filterTier !== 'all') filters.tier = filterTier;
      if (filterStatus !== 'all') filters.status = filterStatus;
      
      fetchColleges(pagination.page, searchTerm, filters);
    } catch (err) {
      setDeleteDialog(prev => ({ ...prev, isLoading: false }));
      setError(err instanceof Error ? err.message : 'Failed to delete college');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, college: null, isLoading: false });
  };

  // Handle status toggle
  const handleStatusToggle = async (collegeId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/colleges/${collegeId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update college status');
      }

      setSuccessMessage(`College status updated successfully.`);
      
      // Refresh the current page
      const filters: any = {};
      if (filterTier !== 'all') filters.tier = filterTier;
      if (filterStatus !== 'all') filters.status = filterStatus;
      
      fetchColleges(pagination.page, searchTerm, filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update college status');
    }
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
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/dashboard/superadmin/colleges/new">
              <Button>Add New College</Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <SuccessDisplay
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
        
        <ErrorDisplay
          error={error}
          onRetry={() => {
            const filters: any = {};
            if (filterTier !== 'all') filters.tier = filterTier;
            if (filterStatus !== 'all') filters.status = filterStatus;
            
            fetchColleges(pagination.page, searchTerm, filters);
          }}
          onDismiss={() => setError(null)}
          showRetry={true}
        />

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">Search colleges</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search colleges by name, address, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Tiers</option>
                <option value="TRIAL">Trial</option>
                <option value="BASIC">Basic</option>
                <option value="STANDARD">Standard</option>
                <option value="PREMIUM">Premium</option>
                <option value="ENTERPRISE">Enterprise</option>
                <option value="EXPIRED">Expired</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedColleges.size > 0 && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">
                {selectedColleges.size} college(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('activate')}
                  disabled={bulkActionDialog.isLoading}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={bulkActionDialog.isLoading}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Deactivate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                  disabled={bulkActionDialog.isLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Colleges Table */}
        {colleges.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || filterTier !== 'all' || filterStatus !== 'all' 
              ? 'No colleges found matching your search and filters.' 
              : 'No colleges found.'
            }
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">
                    <Checkbox
                      checked={selectedColleges.size === colleges.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th 
                    className="text-left p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Name {getSortIndicator('name')}
                    </div>
                  </th>
                  <th className="text-left p-3">Subscription</th>
                  <th className="text-left p-3">Users</th>
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
                      <Checkbox
                        checked={selectedColleges.has(college.id)}
                        onCheckedChange={(checked) => handleSelectCollege(college.id, checked as boolean)}
                      />
                    </td>
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
                      <Badge className={subscriptionStatusColors[college.subscriptionStatus] || 'bg-gray-100 text-gray-800'}>
                        {subscriptionStatusLabels[college.subscriptionStatus] || college.subscriptionStatus || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{college.userCount}</span>
                      </div>
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
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/dashboard/superadmin/colleges/${college.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                        <Link href={`/dashboard/college-admin?as=superadmin&collegeId=${college.id}`}>
                          <Button variant="outline" size="sm">
                            Admin Panel
                          </Button>
                        </Link>
                        <Link href={`/dashboard/student?as=superadmin&collegeId=${college.id}`}>
                          <Button variant="outline" size="sm">
                            Student Panel
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleStatusToggle(college.id, college.isActive)}
                          className={college.isActive 
                            ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
                            : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                          }
                        >
                          {college.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDeleteClick(college.id, college.name)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* Bulk Action Confirmation Dialog */}
      <ConfirmDialog
        open={bulkActionDialog.open}
        onOpenChange={(open) => !open && setBulkActionDialog({ open: false, action: '', isLoading: false })}
        title={`Bulk ${bulkActionDialog.action.charAt(0).toUpperCase() + bulkActionDialog.action.slice(1)}`}
        description={
          `Are you sure you want to ${bulkActionDialog.action} ${selectedColleges.size} selected college(s)? This action will affect all selected colleges.`
        }
        confirmText={`Confirm ${bulkActionDialog.action}`}
        cancelText="Cancel"
        onConfirm={() => handleBulkAction(bulkActionDialog.action)}
        onCancel={() => setBulkActionDialog({ open: false, action: '', isLoading: false })}
        variant={bulkActionDialog.action === 'delete' ? 'destructive' : 'default'}
        isLoading={bulkActionDialog.isLoading}
      />
    </Card>
  );
}
