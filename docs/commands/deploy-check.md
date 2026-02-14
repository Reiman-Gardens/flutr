Run pre-deployment checks to verify the project is ready.

## Steps

1. **Type check**: Run `pnpm exec tsc --noEmit` and report any errors
2. **Lint**: Run `pnpm lint` and report any errors
3. **Format check**: Run `pnpm format:check` and report any issues
4. **Tests**: Run `pnpm test` and report results
5. **Build**: Run `pnpm build` and verify it succeeds

## Security Checks

- Verify no hardcoded secrets in committed files
- Verify `.env` is in `.gitignore`
- Verify API routes check authentication where required

## Summary

Report pass/fail for each step with details on any failures.
