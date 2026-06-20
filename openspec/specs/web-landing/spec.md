## Purpose

Provide the Astro landing page for `apps/web/` — the entry point that introduces the
system and links to the Customer and Backoffice pages and the API docs.

## Requirements

### Requirement: Landing page
The system SHALL provide an Astro landing page at `/` in `apps/web/` that displays:
- A title and brief system description.
- A link to the Customer page (`/customer`).
- A link to the Backoffice page (`/backoffice`).
- A link to the API docs (`apps/api-docs/` URL, configurable via `PUBLIC_API_DOCS_URL`).

The page SHALL use Tailwind + DaisyUI components and render as static HTML.

#### Scenario: Landing page renders with navigation links
- **WHEN** the landing page is opened in a browser
- **THEN** it displays a title, system description, and visible links to
  Customer, Backoffice, and API docs pages

#### Scenario: Landing page is statically generated
- **WHEN** `astro build` is run
- **THEN** the output directory contains a static `index.html` with no server-side runtime
