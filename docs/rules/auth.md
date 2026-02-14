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
