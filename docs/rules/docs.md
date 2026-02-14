# Documentation Maintenance

After making code changes, update the relevant documentation to keep it in sync. Documentation should never describe files, endpoints, tables, or patterns that don't exist — and should never omit ones that do.

## When to Update

### AGENTS.md

Update when any of these change:

- **Project Structure** tree — files/directories added, removed, or renamed in `src/`
- **Commands** block — scripts added or changed in `package.json`
- **Key Patterns** — new architectural patterns introduced or existing ones changed
- **Database Tables** — tables added, removed, or renamed
- **Conventions & Utilities** table — new utilities created or existing ones moved/renamed

### docs/overview.md

Update when the overall architecture, tech stack, or high-level data flow changes.

### docs/rules/\*

Update the relevant rule file when:

- Patterns or conventions it documents are changed
- New pitfalls are discovered during development

## How to Update

- Match the existing format and level of detail in each doc
- Don't add speculative "future" sections — only document what exists now
- Keep tables, trees, and lists sorted consistently with surrounding content
