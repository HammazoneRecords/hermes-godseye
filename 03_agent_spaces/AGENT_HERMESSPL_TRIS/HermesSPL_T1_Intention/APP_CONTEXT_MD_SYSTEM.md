# App Context Markdown System

Status: active proposal for all apps/sites. Purpose: every app gets a single loadable markdown variable/context file so any agent can work on that app without guessing.

## Core rule

Every app/site must maintain an app-local context file:

```text
APP_CONTEXT.md
```

Preferred location:

```text
<app-root>/APP_CONTEXT.md
```

If the app has existing project docs, link them from `APP_CONTEXT.md` rather than duplicating everything.

## Why

Agents keep losing time rediscovering:

- app name and purpose
- dev/start/build commands
- environment variables
- routes/pages
- deploy target
- data models
- styling syntax
- API endpoints
- app-specific terminology
- what changed during development

`APP_CONTEXT.md` becomes the first file an agent loads before touching the app.

## Required template

```markdown
# APP_CONTEXT — <App Name>

Status: active | staging | paused | archived
Last updated: YYYY-MM-DD
Primary owner: Drayl / Plato / <agent>

## One-line purpose

<What this app does in one sentence.>

## Current priority

<The one thing that matters now: launch, fix auth, record walkthrough, etc.>

## App identity variables

| Variable | Value |
|---|---|
| APP_NAME |  |
| APP_SLUG |  |
| PUBLIC_DOMAIN |  |
| LOCAL_DEV_URL |  |
| PRODUCTION_URL |  |
| STAGING_URL |  |
| REPO_PATH |  |
| DEPLOY_PATH |  |
| VPS_PATH |  |
| PACKAGE_MANAGER | npm / pnpm / yarn / uv / pip |
| FRAMEWORK | Next.js / Vite / Express / etc. |
| DB | SQLite / Postgres / none |
| AUTH | Better Auth / Clerk / custom / none |
| ANALYTICS | Umami / none |

## Commands

```bash
# install

# dev

# build

# test

# lint

# deploy
```

## Environment variables

Do not paste secret values. List names, purpose, and where configured.

| Name | Purpose | Required | Location | Notes |
|---|---|---|---|---|
| EXAMPLE_KEY | what it controls | yes/no | .env / VPS / Vercel | no secret values |

## Routes / pages

| Route | Purpose | Status | Notes |
|---|---|---|---|
| / | homepage | working |  |

## API endpoints

| Method | Path | Purpose | Auth | Notes |
|---|---|---|---|---|

## Data/schema notes

- Tables/models:
- Important fields:
- Migration notes:

## Styling/UI syntax

Record app-specific syntax and design rules:

- CSS framework:
- Component system:
- Theme variables:
- Icons:
- Common layout patterns:
- Things not to do:

## Domain language

| Term | Meaning |
|---|---|

## Known risks / blockers

- 

## Development log

Append newest entries at top.

### YYYY-MM-DD — <short change>

- Changed:
- Verified:
- Next:

## Agent load checklist

Before editing this app, an agent must read:

- `APP_CONTEXT.md`
- `AGENTS.md` / `CLAUDE.md` if present
- package manifest
- branch/status file if present
```

## Update rule

Any agent that changes app behavior must update `APP_CONTEXT.md` in the same work session with:

- new commands or changed commands
- new env vars
- new routes/endpoints
- new app-specific syntax
- deploy/status changes
- known blockers

## Suggested companion files

Optional if the app is large:

```text
docs/APP_ROUTES.md
docs/APP_API.md
docs/APP_DEPLOY.md
docs/APP_DESIGN_SYSTEM.md
docs/APP_DATABASE.md
```

But `APP_CONTEXT.md` remains the front door.

## First apps to add this to

- Chat2Cash
- solob-portal / Book of Solobility
- farbelos-lab
- HermesSPL forged UI
- future app projects after Chat2Cash launch
