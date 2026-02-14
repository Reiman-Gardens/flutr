# Accessibility Requirements

Flutr must meet **WCAG 2.1 AA** compliance for all interfaces (public and admin).

## Mandatory Practices

- Use semantic HTML elements (`nav`, `main`, `section`, `article`, `header`, `footer`)
- All interactive elements must be keyboard-accessible (Tab, Enter, Escape, Arrow keys)
- All images must have meaningful `alt` text (or `alt=""` for decorative images)
- Form inputs must have associated `<label>` elements or `aria-label`
- Color contrast must meet AA minimum (4.5:1 for normal text, 3:1 for large text)
- Focus indicators must be visible on all interactive elements
- Error messages must be associated with their form fields via `aria-describedby`

## ARIA Guidelines

- Prefer native HTML semantics over ARIA roles when possible
- Use `aria-live` regions for dynamic content updates
- Use `aria-expanded`, `aria-controls`, `aria-haspopup` for interactive widgets
- Never use `aria-hidden="true"` on focusable elements

## Testing

- Test with keyboard-only navigation
- Verify screen reader announcements for dynamic content
- Check color contrast ratios for all text/background combinations
