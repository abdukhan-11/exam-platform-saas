### Student Dashboard – Technical Notes

- **APIs**:
  - `/api/exams` and `/api/exams/available` (student-scoped, RLS via enrollments)
  - `/api/subjects`, `/api/results/personal`, `/api/awards/student`, `/api/notifications`
- **Security**:
  - NextAuth session scoping; permission checks in handlers
  - Audit logging via `lib/security/audit-logger`
- **UI**:
  - Calendar with month/week/day views and ICS reminder
  - History table supports virtualization for large datasets (>200 rows)
  - Global search dialog, inline search in pages
  - Notification center with unread polling
  - Charts via Recharts with a simple render-time indicator
- **Hooks**: `useApi` (cached fetch), `useSearchPreferences`
- **Performance**:
  - Virtualized list for large history
  - Concurrent fetch for data-heavy screens
  - Overflow scroll for wide grids on mobile


