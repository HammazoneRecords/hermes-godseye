# Review Interface Adaptation

## When to Use

Use when adapting the existing review interface to a new content class:

- article drafts
- staged ideas or concepts
- research notes
- outreach artifacts
- any document set that needs preview + feedback + history

## Plain HTML vs React — Decision Notes

Choose the plain HTML interface when:

- the review batch is small to medium
- the content is mostly markdown, HTML, or PDF
- quick self-contained review matters more than rich app state
- you want the lowest-coupling path to a working review session

Choose the React app when:

- the team already maintains that stack
- the workflow needs routing, richer state, or component-driven interactions
- you are willing to debug Vite, proxy, and module resolution as part of the task

## Adaptation Steps

### 1. Define the review batch

Write down:

- what is being reviewed
- what format each item is in
- what the user wants to do with the feedback afterward

### 2. Prepare a manifest

Prefer a single source of truth for the file list. A lightweight JSON manifest is usually enough:

```json
[
  {
    "path": "/absolute/or/relative/path",
    "name": "Readable Title",
    "type": "md",
    "desc": "One-line context"
  }
]
```

Types to support at minimum: `md`, `html`, `pdf`.

### 3. Point the UI at the manifest

- If using the plain HTML interface, replace the hardcoded `FILES` array with a load from the manifest or a generated list.
- If using the React app, update the store/component that owns the file list and verify both the React and any parallel HTML list stay aligned.

### 4. Verify preview per format

- Markdown: rendered, not raw.
- HTML: rendered in an iframe where appropriate.
- PDF: served by the Python server with `Content-Type: application/pdf` and `Content-Disposition: inline`.

### 5. Verify feedback capture

- Feedback should persist where the workflow expects it.
- If the review batch is staged work, consider adding a staging status field (`staged`, `reviewed`, `approved`, `rejected`) alongside the feedback.

## Manifesting Staged Review Work

For workflows where items move through stages, keep the stage state with the manifest, not only in the UI:

- `staged` — in the review list
- `reviewed` — feedback captured
- `approved` / `rejected` — decision recorded

This makes the review state recoverable and auditable without relying on UI-only state.

## Coupling Pitfalls

- **Local absolute paths in the UI:** if the file list uses local paths that only resolve on one machine, remote or published access breaks. Keep path expectations explicit.
- **Duplicated file lists:** if the React app and plain HTML interface both hardcode the list, updates can diverge. Maintain one source and render from it.
- **Feedback destination mismatch:** if the UI writes feedback to local storage only, server-side persistence or downstream review workflows may miss it. Decide where feedback should live before the first review session.

## Hosting for Web or Phone Review

When remote access is wanted, publish the review interface via `here.now`:

- build or prepare the static review files
- publish through the `here.now` API
- hand the live URL to the user

See the `here-now` skill for the publish workflow. This skill covers the review interface itself; hosting is an integration point, not a duplicate hosting procedure.