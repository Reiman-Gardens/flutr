Review the current changes for code quality, correctness, and project conventions.

## Checklist

### Logic & Correctness

- [ ] Edge cases handled (null, empty, boundary values)
- [ ] Async operations have proper error handling
- [ ] No race conditions in concurrent operations

### Security

- [ ] No hardcoded secrets or credentials
- [ ] User input validated and sanitized
- [ ] Multi-tenant isolation enforced (institution_id filtering)
- [ ] Auth checked on protected endpoints
- [ ] No SQL injection (Drizzle parameterizes automatically, but verify raw queries)
- [ ] No XSS attack vectors
- [ ] Authentication and authorization issues

### Accessibility (WCAG 2.1 AA)

- [ ] Semantic HTML used correctly
- [ ] All interactive elements keyboard-accessible
- [ ] ARIA attributes correct and complete
- [ ] Color contrast meets AA minimums
- [ ] Focus management proper for modals/dialogs

### Project Patterns

- [ ] `logger` used instead of `console.log`
- [ ] `cn()` used for conditional class names
- [ ] `@/` path alias used for imports
- [ ] Zod schemas used for form/API validation
- [ ] Consistent error response format in API routes

### Type Safety & Performance

- [ ] No `any` types without justification
- [ ] No unnecessary re-renders (proper memoization)
- [ ] Database queries are efficient (no N+1)

### Tests & Documentation

- [ ] New logic has test coverage
- [ ] Documentation updated per `docs/rules/docs.md`

### API Contract Stability (Refactors)

- [ ] Path + HTTP method unchanged (or intentionally versioned + documented)
- [ ] Auth behavior unchanged (`401` on unauthenticated protected routes)
- [ ] Authz behavior unchanged (`403` on permission denials)
- [ ] Tenant behavior unchanged (`403` vs `404` semantics preserved)
- [ ] Validation envelope unchanged (`400` + documented `error/details` format)
- [ ] Sanitization behavior preserved (trim/HTML stripping as expected)
- [ ] Success status/shape unchanged (`200/201/204` + response keys/types)
- [ ] Conflict/not-found semantics unchanged (`409`/`404` behavior)
- [ ] Contract tests updated for any intentional response/status changes
