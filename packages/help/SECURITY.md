# Help package security model

## Build-time HTML

Help body HTML is generated at build time from trusted repo markdown and sanitized again at render time in the browser via DOMPurify (`HelpAccordion`).

## User feedback form

`HelpFeedbackForm` opens a `mailto:` link with user-supplied body text. It does not POST to a server. Treat displayed contact email as public.

## No server surface

This package has no Edge Functions, database tables, or auth endpoints.
