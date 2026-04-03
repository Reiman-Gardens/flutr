# API Route Conventions

See `docs/api/API_ARCHITECTURE_V3.md` for the full authoritative spec. This file summarizes key rules.

## Error Response Format

All routes use a consistent JSON envelope via helpers in `@/lib/api-response`:

```typescript
// Success
return ok({ data });

// Errors
return unauthorized(); // 401
return forbidden(); // 403
return invalidRequest("msg", zodIssues); // 400
return notFound("msg"); // 404
return conflict("msg"); // 409
return internalError(); // 500
```

Error paths use bracket notation for array indices (e.g. `items[0].field`).

## Route vs Service responsibilities

### Route layer

Routes handle HTTP concerns only — they must not call `auth()`, perform role checks, or call queries directly.

Every route handler must:

1. **Read tenant header** (tenant routes only): read `x-tenant-slug`; return `400` if missing
2. **Validate input**: Zod schemas with `.strict()` for params, body, and query
3. **Call the service**: pass validated input (including slug) to the service function
4. **Map errors to HTTP**: catch sentinel strings (`"UNAUTHORIZED"` → 401, `"FORBIDDEN"` → 403, `"NOT_FOUND"` → 404, `"CONFLICT"` → 409); for tenant routes also call `handleTenantError`

### Service layer

Services own all auth, authorization, and tenant resolution:

1. **Authenticate**: `const user = requireUser(await auth());`
2. **Authorize**: Use `canX(user)` helpers from `@/lib/authz` — never raw role checks
3. **Resolve tenant** (tenant routes): `const tenantId = await resolveTenantBySlug(user, slug);`
4. **Strip slug** before passing data to the query layer

## Validation Rules

- Required text: `sanitizedNonEmpty(maxLen)` — sanitizes before enforcing non-empty
- Optional text: `.max(N).transform(sanitizeText).optional()`
- Query validation must pass full query object: `Object.fromEntries(request.nextUrl.searchParams)`
- Body validation must use `requireValidBody(request, schema)`

## Public Routes

- No auth required
- Slug-based institution lookups must filter by `stats_active = true`
- Use `publicEmptyQuerySchema` to reject unexpected query params

## Multi-Tenant Isolation

- All tenant routes resolve the institution via `resolveTenantBySlug(user, slug)` in the service layer
- `tenantCondition` from `@/lib/tenant` is used at the query layer only — not for access control
- Never return data from other institutions unless the route is explicitly public

## Security

- Never expose internal error details to clients
- Validate that the authenticated user belongs to the institution they're querying
- Use parameterized queries (Drizzle handles this automatically)
