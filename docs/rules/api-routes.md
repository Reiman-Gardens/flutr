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

## Required Checks

Every protected API route must follow this order:

1. **Authenticate**: `const session = await auth(); const user = requireUser(session);`
2. **Authorize**: Use `canX(user)` helpers from `@/lib/authz` — never raw role checks
3. **Validate input**: Zod schemas with `.strict()` for body, params, and query
4. **Sanitize**: Required text fields use `sanitizedNonEmpty(maxLen)`, optional fields use `.transform(sanitizeText)`
5. **Tenant resolution**: read `x-tenant-slug` header, call `resolveTenantBySlug(user, slug)` in the service layer; return `400` if header is missing

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
