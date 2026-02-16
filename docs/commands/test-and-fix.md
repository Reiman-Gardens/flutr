# Run All Tests and Fix Failures

## Overview

Execute the full test suite and systematically fix any failures, ensuring code
quality and functionality.

## Steps

1. **Type check**
   - Run `pnpm exec tsc --noEmit`
   - Fix any TypeScript errors before proceeding
2. **Lint**
   - Run `pnpm lint`
   - Fix any linting errors before proceeding
3. **Run test suite**
   - Execute all tests in the project
   - Capture output and identify failures
   - Check both unit and integration tests
4. **Analyze failures**
   - Categorize by type: flaky, broken, new failures
   - Prioritize fixes based on impact
   - Check if failures are related to recent changes
5. **Fix issues systematically**
   - Start with the most critical failures
   - Fix one issue at a time
   - Re-run tests after each fix

## Test Recovery Checklist

- [ ] TypeScript type check passed
- [ ] Lint check passed
- [ ] Full test suite executed
- [ ] Failures categorized and tracked
- [ ] Root causes resolved
- [ ] Tests re-run with passing results
- [ ] Follow-up improvements noted
