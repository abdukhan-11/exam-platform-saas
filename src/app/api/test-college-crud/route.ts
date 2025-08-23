import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface TestResults {
  create: TestResult;
  read: TestResult;
  update: TestResult;
  delete: TestResult;
  pagination: TestResult;
  search: TestResult;
  sorting: TestResult;
  validation: TestResult;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Starting comprehensive college CRUD tests...');

    const results: TestResults = {
      create: { success: false, message: '' },
      read: { success: false, message: '' },
      update: { success: false, message: '' },
      delete: { success: false, message: '' },
      pagination: { success: false, message: '' },
      search: { success: false, message: '' },
      sorting: { success: false, message: '' },
      validation: { success: false, message: '' },
    };

    let testCollegeId: string | null = null;

    // Test 1: Create a new college
    console.log('Test 1: Creating a new college...');
    try {
      const testCollege = await prisma.college.create({
        data: {
          name: `Test College ${Date.now()}`,
          address: '123 Test Street, Test City',
          phone: '123-456-7890',
          email: `test${Date.now()}@example.com`,
          website: 'https://testcollege.example.com',
          isActive: true,
        },
      });

      testCollegeId = testCollege.id;
      results.create = {
        success: true,
        message: 'College created successfully',
        data: testCollege,
      };
      console.log('✅ College created successfully:', testCollege);
    } catch (error) {
      results.create = {
        success: false,
        message: 'Failed to create college',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      console.log('❌ Failed to create college:', error);
    }

    // Test 2: Read the created college
    if (testCollegeId) {
      console.log('Test 2: Fetching the created college...');
      try {
        const fetchedCollege = await prisma.college.findUnique({
          where: { id: testCollegeId },
        });

        if (fetchedCollege) {
          results.read = {
            success: true,
            message: 'College fetched successfully',
            data: fetchedCollege,
          };
          console.log('✅ College fetched successfully:', fetchedCollege);
        } else {
          results.read = {
            success: false,
            message: 'College not found after creation',
          };
          console.log('❌ College not found after creation');
        }
      } catch (error) {
        results.read = {
          success: false,
          message: 'Failed to fetch college',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        console.log('❌ Failed to fetch college:', error);
      }
    }

    // Test 3: Update the college
    if (testCollegeId) {
      console.log('Test 3: Updating the college...');
      try {
        const updatedCollege = await prisma.college.update({
          where: { id: testCollegeId },
          data: {
            name: `Test College ${Date.now()} (Updated)`,
            address: '123 Test Street, Test City (Updated)',
          },
        });

        results.update = {
          success: true,
          message: 'College updated successfully',
          data: updatedCollege,
        };
        console.log('✅ College updated successfully:', updatedCollege);
      } catch (error) {
        results.update = {
          success: false,
          message: 'Failed to update college',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        console.log('❌ Failed to update college:', error);
      }
    }

    // Test 4: Test pagination
    console.log('Test 4: Testing pagination...');
    try {
      const paginationResult = await prisma.college.findMany({
        take: 5,
        skip: 0,
        orderBy: { name: 'asc' },
      });

      results.pagination = {
        success: true,
        message: `Pagination test successful - found ${paginationResult.length} colleges`,
        data: { count: paginationResult.length, sample: paginationResult.slice(0, 2) },
      };
      console.log('✅ Pagination test successful');
    } catch (error) {
      results.pagination = {
        success: false,
        message: 'Failed to test pagination',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      console.log('❌ Failed to test pagination:', error);
    }

    // Test 5: Test search functionality
    console.log('Test 5: Testing search functionality...');
    try {
      const searchResult = await prisma.college.findMany({
        where: {
          OR: [
            { name: { contains: 'Test' } },
            { address: { contains: 'Test' } },
          ],
        },
        take: 10,
      });

      results.search = {
        success: true,
        message: `Search test successful - found ${searchResult.length} test colleges`,
        data: { count: searchResult.length, sample: searchResult.slice(0, 2) },
      };
      console.log('✅ Search test successful');
    } catch (error) {
      results.search = {
        success: false,
        message: 'Failed to test search',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      console.log('❌ Failed to test search:', error);
    }

    // Test 6: Test sorting functionality
    console.log('Test 6: Testing sorting functionality...');
    try {
      const sortResult = await prisma.college.findMany({
        take: 10,
        orderBy: [
          { name: 'asc' },
          { createdAt: 'desc' },
        ],
      });

      results.sorting = {
        success: true,
        message: 'Sorting test successful',
        data: { count: sortResult.length, sample: sortResult.slice(0, 2) },
      };
      console.log('✅ Sorting test successful');
    } catch (error) {
      results.sorting = {
        success: false,
        message: 'Failed to test sorting',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      console.log('❌ Failed to test sorting:', error);
    }

    // Test 7: Test validation (try to create invalid data)
    console.log('Test 7: Testing validation...');
    try {
      // This should fail due to missing name
      await prisma.college.create({
        data: {
          address: 'Test Address',
          // name is missing - should fail
        } as any,
      });

      results.validation = {
        success: false,
        message: 'Validation test failed - should have rejected invalid data',
      };
      console.log('❌ Validation test failed - should have rejected invalid data');
    } catch (error) {
      // This is expected - validation should fail
      results.validation = {
        success: true,
        message: 'Validation test successful - correctly rejected invalid data',
        error: error instanceof Error ? error.message : 'Expected validation error',
      };
      console.log('✅ Validation test successful - correctly rejected invalid data');
    }

    // Test 8: Delete the test college
    if (testCollegeId) {
      console.log('Test 8: Deleting the test college...');
      try {
        await prisma.college.delete({
          where: { id: testCollegeId },
        });

        results.delete = {
          success: true,
          message: 'College deleted successfully',
        };
        console.log('✅ College deleted successfully');
      } catch (error) {
        results.delete = {
          success: false,
          message: 'Failed to delete college',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        console.log('❌ Failed to delete college:', error);
      }
    }

    // Calculate overall success
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    const overallSuccess = failedTests === 0;

    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess 
        ? 'All tests passed successfully!' 
        : `${passedTests}/${totalTests} tests passed`,
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: `${Math.round((passedTests / totalTests) * 100)}%`,
      },
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Test execution failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Test execution failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
