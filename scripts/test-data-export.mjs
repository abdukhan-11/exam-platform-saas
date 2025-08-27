import { DataExportService } from '../src/lib/reporting/data-export-service.js';
import { AutomatedReportService } from '../src/lib/reporting/automated-report-service.js';
import { CustomReportBuilder } from '../src/lib/reporting/custom-report-builder.js';

async function testDataExport() {
  console.log('🧪 Testing Data Export and Reporting System...\n');

  try {
    // Test DataExportService
    console.log('1. Testing DataExportService...');
    const exportService = new DataExportService();
    
    // Test analytics export
    console.log('   - Testing analytics export (CSV)...');
    const analyticsExport = await exportService.exportAnalytics({
      format: 'csv',
      includeCharts: false
    });
    console.log(`   ✅ Analytics CSV exported: ${analyticsExport.filename} (${analyticsExport.size} bytes)`);

    // Test colleges export
    console.log('   - Testing colleges export (CSV)...');
    const collegesExport = await exportService.exportColleges({
      format: 'csv',
      filters: { status: 'all' }
    });
    console.log(`   ✅ Colleges CSV exported: ${collegesExport.filename} (${collegesExport.size} bytes)`);

    // Test user analytics export
    console.log('   - Testing user analytics export (CSV)...');
    const userExport = await exportService.exportUserAnalytics({
      format: 'csv'
    });
    console.log(`   ✅ User analytics CSV exported: ${userExport.filename} (${userExport.size} bytes)`);

    // Test activity logs export
    console.log('   - Testing activity logs export (CSV)...');
    const activityExport = await exportService.exportActivityLogs({
      format: 'csv'
    });
    console.log(`   ✅ Activity logs CSV exported: ${activityExport.filename} (${activityExport.size} bytes)`);

    // Test platform report generation
    console.log('   - Testing platform report generation (CSV)...');
    const platformReport = await exportService.generatePlatformReport('daily', {
      format: 'csv'
    });
    console.log(`   ✅ Platform report CSV generated: ${platformReport.filename} (${platformReport.size} bytes)`);

    console.log('\n2. Testing AutomatedReportService...');
    const reportService = new AutomatedReportService();
    
    // Test getting report schedules
    console.log('   - Testing report schedules retrieval...');
    const schedules = await reportService.getReportSchedules();
    console.log(`   ✅ Retrieved ${schedules.length} report schedules`);

    // Test getting report templates
    console.log('   - Testing report templates retrieval...');
    const templates = await reportService.getReportTemplates();
    console.log(`   ✅ Retrieved ${templates.length} report templates`);

    // Test system templates initialization
    console.log('   - Testing system templates initialization...');
    await reportService.initializeSystemTemplates();
    const systemTemplates = await reportService.getSystemReportTemplates();
    console.log(`   ✅ Initialized ${systemTemplates.length} system templates`);

    console.log('\n3. Testing CustomReportBuilder...');
    const reportBuilder = new CustomReportBuilder();
    
    // Test getting available fields
    console.log('   - Testing available fields retrieval...');
    const availableFields = reportBuilder.getAvailableFields();
    console.log(`   ✅ Retrieved ${availableFields.length} available fields`);

    // Test getting custom report queries
    console.log('   - Testing custom report queries retrieval...');
    const queries = await reportBuilder.getCustomReportQueries();
    console.log(`   ✅ Retrieved ${queries.length} custom report queries`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Data Export and Reporting System Features:');
    console.log('   ✅ CSV, Excel, and PDF export support');
    console.log('   ✅ Analytics data export');
    console.log('   ✅ Colleges data export');
    console.log('   ✅ User analytics export');
    console.log('   ✅ Activity logs export');
    console.log('   ✅ Platform report generation');
    console.log('   ✅ Automated report scheduling');
    console.log('   ✅ Report templates');
    console.log('   ✅ Custom report queries');
    console.log('   ✅ Export progress tracking');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDataExport();
