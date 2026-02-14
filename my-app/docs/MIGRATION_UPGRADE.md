# Migration: Hospital Command Center Upgrade

After pulling the upgrade, apply schema changes:

## 1. Database migration

```bash
cd my-app
npx prisma migrate dev --name command_center_upgrade
```

If you use `db push` instead:

```bash
npx prisma db push
```

**Schema changes:**

- **DocumentProcessingStatus**: `PENDING` → `UPLOADED`, `COMPLETED` → `AI_EXTRACTED`. If you have existing rows, run a data migration to update enum values before switching code, or create a new migration that renames enum values and updates rows.
- **RiskLevel**: New value `REVIEW_REQUIRED`.
- **Patient**: New optional fields `ewsScore`, `aiDisagreement`.
- **DepartmentLoad**: New optional fields `avgTreatmentTime` (default 15), `bedOccupancy` (default 0).
- **AuditLog**: New table.

For an existing DB with old `DocumentProcessingStatus`, you can add a migration step:

```sql
-- Example: map old enum to new (PostgreSQL)
-- First add new enum values, then update rows, then remove old values.
-- Or use prisma migrate and handle data in a custom step.
```

## 2. Environment

Optional:

- `SURGE_MODE=true` — Enable surge mode (stricter overload threshold, higher risk weight).
- `X-User-Role` header on API requests: `ADMIN` | `TRIAGE_NURSE` | `DOCTOR` | `COMMAND_CENTER` (defaults to `TRIAGE_NURSE` if omitted).

## 3. New API routes

- `GET /api/documents/[id]/status` — Poll document processing status.
- `GET /api/audit` — List audit logs (ADMIN / COMMAND_CENTER).
- `GET /api/surge` — Current surge config.

## 4. Rate limiting

`POST /api/triage` is limited to 60 requests per minute per client (by IP or `X-Forwarded-For`). 429 when exceeded.
