# 🔒 Security Features Testing Guide

## Overview
This guide provides comprehensive instructions for testing the advanced security features and anti-cheating measures implemented in subtask 3.6. All security components have been successfully implemented and are ready for local testing.

## 🚀 Quick Start Testing

### 1. Run the Automated Test Suite
```bash
# Run the comprehensive security features test
node scripts/test-security-features.js
```

This will validate all security components and show a detailed report.

### 2. Test Individual Security Components

#### Browser Fingerprinting
```javascript
// Test in browser console
import { fingerprintService } from '@/lib/security/fingerprint';

// Generate device fingerprint
const deviceInfo = await fingerprintService.getDeviceInfo();
console.log('Device Info:', deviceInfo);

// Validate device consistency
const validation = await fingerprintService.validateDeviceConsistency(storedFingerprint);
console.log('Validation Result:', validation);
```

#### IP Tracking and Geolocation
```javascript
// Test IP tracking
import { ipTrackingService } from '@/lib/security/ip-tracking';

// Get current IP information
const ipInfo = await ipTrackingService.getCurrentIPInfo();
console.log('IP Info:', ipInfo);

// Track location changes
const geoSecurity = await ipTrackingService.trackLocationChange('user123', 'session456');
console.log('Geolocation Security:', geoSecurity);
```

#### Session Anomaly Detection
```javascript
// Test session anomaly detection
import { sessionAnomalyService } from '@/lib/security/session-anomaly';

// Record a session event
sessionAnomalyService.recordEvent({
  userId: 'user123',
  sessionId: 'session456',
  eventType: 'login',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  metadata: { collegeId: 'college1' }
});

// Analyze session for anomalies
const analysis = await sessionAnomalyService.analyzeSession('user123', 'session456');
console.log('Session Analysis:', analysis);
```

#### Exam Security Measures
```javascript
// Test exam security
import { examSecurityService } from '@/lib/security/exam-security';

// Start exam security monitoring
examSecurityService.startExamSecurity({
  examId: 'exam123',
  userId: 'user123',
  sessionId: 'session456',
  startTime: Date.now(),
  endTime: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
  duration: 120,
  allowTabSwitch: false,
  requireFullScreen: true,
  enableBrowserLock: true,
  enableCopyPaste: false,
  enableRightClick: false,
  enableDevTools: false,
  maxTabSwitches: 3,
  maxWindowBlurs: 5,
  screenshotInterval: 30,
  heartbeatInterval: 10
});

// Get security status
const status = examSecurityService.getSecurityStatus('exam123', 'user123', 'session456');
console.log('Exam Security Status:', status);
```

#### Rate Limiting and Brute Force Protection
```javascript
// Test rate limiting
import { rateLimiter } from '@/lib/security/rate-limiter';

// Check rate limit
const rateLimitResult = rateLimiter.checkRateLimit('ip:192.168.1.1', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10
});
console.log('Rate Limit Result:', rateLimitResult);

// Check brute force protection
const bruteForceResult = rateLimiter.checkBruteForce('user@example.com');
console.log('Brute Force Result:', bruteForceResult);
```

#### Session Timeout Management
```javascript
// Test session timeout
import { sessionTimeoutService } from '@/lib/security/session-timeout';

// Start session timeout monitoring
const status = sessionTimeoutService.startSession('session123', 'user123', 'STUDENT', false);
console.log('Session Timeout Status:', status);

// Update activity
sessionTimeoutService.updateActivity('session123');

// Extend session
const extension = sessionTimeoutService.extendSession('session123', 'user123');
console.log('Extension Result:', extension);
```

## 🌐 API Testing

### Security Assessment API
```bash
# Test security assessment endpoint
curl -X POST http://localhost:3000/api/security/assess \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "examId": "exam123",
    "isExam": true,
    "action": "assessment"
  }'
```

### Security Status API
```bash
# Get security status
curl -X GET "http://localhost:3000/api/security/assess?sessionId=session123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## ⚛️ React Hook Testing

### Using the Security Hook
```jsx
import { useSecurity } from '@/hooks/useSecurity';

function ExamComponent() {
  const {
    assessment,
    status,
    loading,
    error,
    assessSecurity,
    extendSession,
    requestFullscreen,
    isFullscreen
  } = useSecurity({
    examId: 'exam123',
    isExam: true,
    autoAssess: true,
    assessmentInterval: 30000
  });

  return (
    <div>
      {loading && <p>Assessing security...</p>}
      {error && <p>Error: {error}</p>}
      {assessment && (
        <div>
          <p>Risk Level: {assessment.overallRisk}</p>
          <p>Risk Score: {assessment.riskScore}</p>
        </div>
      )}
      {status?.sessionTimeout && (
        <div>
          <p>Time Remaining: {status.sessionTimeout.timeRemaining}s</p>
          {status.sessionTimeout.canExtend && (
            <button onClick={extendSession}>Extend Session</button>
          )}
        </div>
      )}
    </div>
  );
}
```

## 🧪 Comprehensive Testing Scenarios

### 1. Browser Fingerprinting Test
1. Open the application in different browsers
2. Check if device fingerprints are unique
3. Test fingerprint consistency across sessions
4. Verify device validation works correctly

### 2. IP Tracking Test
1. Test from different IP addresses
2. Use VPN to test VPN detection
3. Test location change detection
4. Verify geolocation security alerts

### 3. Session Anomaly Test
1. Create multiple concurrent sessions
2. Test rapid location changes
3. Test unusual timing patterns
4. Verify device mismatch detection

### 4. Exam Security Test
1. Start an exam session
2. Try to switch tabs (should be blocked)
3. Try to exit fullscreen (should be blocked)
4. Try to copy/paste (should be blocked)
5. Try to right-click (should be blocked)
6. Open developer tools (should be detected)

### 5. Rate Limiting Test
1. Make multiple rapid login attempts
2. Test brute force protection
3. Verify rate limiting works correctly
4. Test IP blocking functionality

### 6. Session Timeout Test
1. Start a session
2. Wait for timeout warning
3. Test session extension
4. Verify automatic logout on timeout

## 🔍 Security Monitoring

### Audit Logs
```javascript
// Get audit logs
import { auditLogger } from '@/lib/security/audit-logger';

// Get recent logs
const logs = auditLogger.getLogs({
  category: 'security',
  level: 'high',
  limit: 50
});
console.log('Security Logs:', logs);

// Get security violations
const violations = auditLogger.getViolations({
  severity: 'critical',
  resolved: false
});
console.log('Security Violations:', violations);
```

### Security Reports
```javascript
// Generate security report
const report = auditLogger.generateReport(
  'security_summary',
  Date.now() - (24 * 60 * 60 * 1000), // Last 24 hours
  Date.now(),
  'admin'
);
console.log('Security Report:', report);
```

## 🛠️ Development Testing

### 1. Unit Testing
```bash
# Run unit tests for security components
npm test -- --testPathPattern=security
```

### 2. Integration Testing
```bash
# Run integration tests
npm run test:integration
```

### 3. End-to-End Testing
```bash
# Run E2E tests
npm run test:e2e
```

## 🚨 Security Alerts and Monitoring

### Real-time Alerts
The security system provides real-time alerts for:
- Critical security violations
- Multiple failed login attempts
- Suspicious IP addresses
- VPN/Proxy/Tor detection
- Session anomalies
- Exam security violations

### Monitoring Dashboard
Access the security monitoring dashboard at:
```
http://localhost:3000/admin/security
```

## 📊 Performance Testing

### Load Testing
```bash
# Test authentication under load
npm run test:load
```

### Stress Testing
```bash
# Test security system under stress
npm run test:stress
```

## 🔧 Configuration

### Environment Variables
```env
# Security Configuration
SECURITY_ENABLED=true
AUDIT_LOGGING_ENABLED=true
RATE_LIMITING_ENABLED=true
BRUTE_FORCE_PROTECTION_ENABLED=true
SESSION_TIMEOUT_ENABLED=true
EXAM_SECURITY_ENABLED=true
```

### Security Policies
Configure security policies in:
```
src/lib/security/session-timeout.ts
src/lib/security/rate-limiter.ts
```

## 🐛 Troubleshooting

### Common Issues

1. **Fingerprinting not working**
   - Check browser compatibility
   - Verify canvas and WebGL support
   - Check for ad blockers

2. **IP tracking failing**
   - Check network connectivity
   - Verify IP service availability
   - Check firewall settings

3. **Session timeout not working**
   - Verify session configuration
   - Check timer setup
   - Verify activity tracking

4. **Rate limiting too aggressive**
   - Adjust rate limit configuration
   - Check IP whitelist
   - Verify user identification

### Debug Mode
Enable debug mode for detailed logging:
```env
DEBUG=security:*
```

## 📈 Metrics and Analytics

### Security Metrics
- Total security assessments
- Risk score distribution
- Violation types and frequency
- Session timeout statistics
- Rate limiting effectiveness

### Performance Metrics
- Assessment response time
- Memory usage
- CPU utilization
- Database query performance

## ✅ Testing Checklist

- [ ] Browser fingerprinting works correctly
- [ ] IP tracking and geolocation detection functional
- [ ] Session anomaly detection identifies suspicious patterns
- [ ] Exam security measures prevent cheating
- [ ] Audit logging captures all security events
- [ ] Rate limiting prevents brute force attacks
- [ ] Session timeout management works properly
- [ ] API endpoints respond correctly
- [ ] React hook integration functional
- [ ] Security alerts trigger appropriately
- [ ] Performance is acceptable under load
- [ ] All security policies are configurable

## 🎯 Success Criteria

The security implementation is considered successful when:
1. All automated tests pass (100% success rate)
2. Manual testing scenarios work as expected
3. Security alerts trigger for suspicious activities
4. Performance impact is minimal (< 100ms overhead)
5. No false positives in normal usage
6. Comprehensive audit trail is maintained
7. All security policies are enforceable

## 📞 Support

For issues or questions regarding security features:
1. Check the troubleshooting section
2. Review the audit logs
3. Run the automated test suite
4. Check the security monitoring dashboard

---

**Note**: This security system is designed for educational purposes and should be thoroughly tested before production deployment. Always follow security best practices and consider additional security measures based on your specific requirements.
