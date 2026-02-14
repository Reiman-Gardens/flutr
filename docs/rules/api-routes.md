# API Route Conventions

## Error Response Format

Always use consistent JSON error responses:

```typescript
return NextResponse.json({ error: "Human-readable message" }, { status: 400 });
```

## Required Checks

Every API route that accepts user input should:

1. **Authenticate**: Verify session via `auth()` from `@/auth` for protected endpoints
2. **Authorize**: Check `session.user.role` and `session.user.institutionId` for tenant isolation
3. **Validate input**: Check types, lengths, format using Zod schemas
4. **Sanitize**: Strip HTML from user-provided strings

## Multi-Tenant Isolation

Every data query must filter by `institution_id` to enforce tenant boundaries. Never return data from other institutions unless the route is explicitly public.

## Security

- Never expose internal error details to clients
- Validate that the authenticated user belongs to the institution they're querying
- Use parameterized queries (Drizzle handles this automatically)
