# Authentication & Authorization

## Auth Stack

- NextAuth 5 with credentials provider (email/password)
- Bcrypt for password hashing
- JWT sessions with custom claims (`role`, `institutionId`)
- Drizzle adapter for database integration

## Session Data

JWT tokens and sessions include:

- `id` — User ID
- `name` — Display name
- `email` — Email address
- `role` — User role (default: `"user"`)
- `institutionId` — Associated institution ID

## Route Protection

- Middleware at `src/middleware.ts` protects `/:institution/(admin)/*` routes
- Login page at `/login`
- Use `auth()` in server components/API routes to get the session

## Password Handling

- Always hash with `bcrypt` before storing
- Never log or return passwords/hashes in responses
- Verify with `bcrypt.compare()`

## Tenant Denial & Status Code Semantics

### Protected Route Status Contract

| Scenario                              | Status |
| ------------------------------------- | ------ |
| Unauthenticated                       | 401    |
| Role/permission violation             | 403    |
| Explicit cross-tenant override denial | 403    |
| Resource not visible in tenant scope  | 404    |
| Resource does not exist               | 404    |
| Invalid input                         | 400    |

### Distinction

- Implicit wrong-tenant resource lookup → `404`
- Explicit tenant override attempt → `403`
- `resolveTenantId` failures → `403`

This policy must remain consistent across all protected API routes.

## Authz Helper Matrix

Source of truth: `src/lib/authz.ts`.

### Baseline helpers

- `requireUser(session)`
  - Throws on unauthenticated session; callers map to `401 Unauthorized`.
- `canCrossTenant(user)`
  - `SUPERUSER` only.

### Domain helpers

- `canReadShipment`, `canWriteShipment`, `canCreateRelease`, `canReadSuppliers`
  - Allowed: `EMPLOYEE+` (`EMPLOYEE`, `ADMIN`, `ORG_SUPERUSER`, `SUPERUSER`).
- `canManageSuppliers`, `canManageUsers`, `canManageInstitutionProfile`
  - Allowed: `ADMIN+` (`ADMIN`, `ORG_SUPERUSER`, `SUPERUSER`).
- `canCreateInstitution`, `canManageGlobalButterflies`
  - Allowed: `SUPERUSER` only.

### User-targeted helpers

- `canModifyUser(actor, target)`
  - `SUPERUSER`: any user.
  - `ORG_SUPERUSER`: self, `ADMIN`, `EMPLOYEE`.
  - `ADMIN`: self, `EMPLOYEE`.
- `canAssignRole(actor, newRole, target?)`
  - Non-`SUPERUSER` cannot change own role.
  - `SUPERUSER`: any role.
  - `ORG_SUPERUSER`: `ADMIN` or `EMPLOYEE`.
  - `ADMIN`: `EMPLOYEE` only.
- `canDeleteUser(actor, target)`
  - Never allows self-delete.
  - `SUPERUSER`: any non-self target.
  - `ORG_SUPERUSER`: `ADMIN` or `EMPLOYEE`.
  - `ADMIN`: `EMPLOYEE` only.
