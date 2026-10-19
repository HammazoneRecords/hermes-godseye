---
name: review-interface-scaffold
description: "Document review interface with Godseye NVP scaffold — HTML + Python server (React/Vite was attempted but abandoned)."
version: 0.2.0
author: Ovando Brown, Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [html, python, godseye, nvp, review, feedback, pdf, markdown]
---

# Review Interface Scaffold

## When to Use

Use when building a review interface for documents, research papers, or any content that needs:
- Inline PDF/HTML/markdown rendering
- Feedback capture with rating, comments, and action items
- Godseye NVP scaffold architecture (metadata dashboard, work queues, warnings)
- Split-panel layout (file list left, preview center, feedback right)

## Architecture

### Current Working Stack: Plain HTML + Python Server

The durable, lower-risk working stack is:

- **Plain HTML** + **CSS** + **vanilla JavaScript** (no framework)
- **Python http.server** for API and file serving
- **SQLite** for feedback storage
- **pdfjs-dist** was planned for PDF rendering, but the HTML interface uses `<iframe>` with the Python server serving PDFs with correct MIME types

### React App — Exists, But Use Deliberately

A React/Vite app also exists in this workspace and can be made to run. Treat it as a real option, not a failed experiment. Its practical problems in review workflows are coupling and path assumptions, not a browser mount mystery:

- The React app is wired to a Python server and to local absolute file paths.
- The file list is often hardcoded in both the React component and the parallel plain HTML interface.
- Vite proxy config, module resolution, and HMR add moving parts that can obscure whether a rendering problem is the app, the server, or the file serving layer.

Use the React app when the team already owns that stack and the review flow needs component state, routing, or richer interactions. Start from the plain HTML interface when the priority is quick, self-contained review with minimal server coupling.

### Godseye NVP Scaffold

The interface is structured as a scaffold that can grow from review tool to full NVP cockpit:

1. **Phase 1 (Review)**: File viewer + feedback capture
2. **Phase 2 (Outreach)**: Application tracker, contact management, follow-ups
3. **Phase 3 (Knowledge Graph)**: Concepts linked, auto-tagged, cross-referenced
4. **Phase 4 (Agent Workspace)**: Subagents report here, user approves
5. **Phase 5 (Public Hub)**: Substack auto-publishes, Reddit auto-drafts

### Layout

```
+-----------------------------------------------------+
| Header (title + Godseye badge)                      |
+----------+---------------------------+------------------+
|          |  Godseye status bar        |                  |
|  File    +---------------------------+  Feedback        |
|  List    |  Tabs: Preview | Godseye  |  Panel           |
|  (left)  |                           |  (right)         |
|          |  Preview: PDF iframe /    |  Rating +        |
|          |  HTML iframe / MD render  |  comments +      |
|          |  Godseye: Metrics +       |  action items +  |
|          |  queues + warnings        |  history         |
+----------+---------------------------+------------------+
| Status bar                                          |
+-----------------------------------------------------+
```

## Setup

### 1. Create the HTML interface

```
feedback/
├── index.html          — Main interface (split-panel layout)
├── server.py           — Python API server (port 8765)
└── feedback_db.py      — SQLite feedback database
```

### 2. Create the Python API server

```python
# server.py
import http.server, json, os, sqlite3
from urllib.parse import urlparse, parse_qs

DB_PATH = 'feedback.db'

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/godseye':
            with open('GODSEYE_DASHBOARD/data/dashboard.json') as f:
                data = json.load(f)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        elif self.path == '/api/feedback':
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute('SELECT * FROM feedback ORDER BY created_at DESC')
            rows = c.fetchall()
            conn.close()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps([{
                'id': r[0], 'file_path': r[1], 'file_name': r[2],
                'rating': r[3], 'comments': r[4], 'action_items': r[5],
                'created_at': r[6]
            } for r in rows]).encode())
        elif self.path.startswith('/file/'):
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            file_path = params.get('path', [''])[0]
            if not file_path or not os.path.exists(file_path):
                self.send_response(404)
                self.end_headers()
                return
            ext = os.path.splitext(file_path)[1].lower()
            content_types = {
                '.pdf': 'application/pdf', '.html': 'text/html',
                '.md': 'text/markdown', '.txt': 'text/plain',
            }
            content_type = content_types.get(ext, 'application/octet-stream')
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(os.path.getsize(file_path)))
            if ext == '.pdf':
                self.send_header('Content-Disposition', 'inline; filename="' + os.path.basename(file_path) + '"')
            self.end_headers()
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
```

### 3. Markdown rendering

The interface renders markdown with proper formatting:
- Headers (H1, H2, H3) with proper styling
- Bold and italic text
- Code blocks and inline code
- Tables with header rows
- Blockquotes
- Unordered lists
- Horizontal rules

### 4. PDF rendering

PDFs are rendered via `<iframe>` with the Python server serving them with `Content-Type: application/pdf` and `Content-Disposition: inline`. This works in Chrome when the PDF is served from the same origin.

**Note:** pdfjs-dist was the original plan but was not needed** — the iframe approach works when the Python server serves the PDF with correct headers.

## Pitfalls

1. **Do not frame a coupling problem as a mysterious mount failure.** A React app can be present and partially runnable while still being the wrong starting point for a review UI. Prefer the plain HTML interface when the goal is fast, self-contained review with minimal server coupling; choose React when richer state/routing is actually required.

2. **Hardcoded file lists drift from the real review backlog.** File lists are often duplicated across the React component and the plain HTML interface. When scoping a new review batch, update the manifest or data file that feeds the UI, not just one copy of the list.

3. **PDFs require correct MIME type and Content-Disposition** — The Python server must send `Content-Type: application/pdf` and `Content-Disposition: inline` for PDFs to render in an iframe. Without these headers, Chrome blocks the PDF.

3. **Godseye data is metadata-only** — The dashboard shows counts and paths, never raw chat text. Always label runtime-unverified components honestly (`runtime_verified: false`).

4. **Feedback panel should be always visible** — The user wants the feedback panel on the right side, always visible when a file is selected, not hidden in a tab. The Godseye view is a tab within the center panel.

5. **Markdown must be rendered, not shown as raw text** — The user wants to see headings, formatting, tables, and code blocks rendered properly, not as raw markdown text.

6. **Large patch calls timeout** — When updating files with large content, break into multiple smaller patch calls. A single patch with full file content can exceed the stream timeout. Use targeted old_string/new_string pairs instead of full rewrites.

7. **Skill creation description limit** — New skill descriptions must be ≤60 characters (one sentence, trigger first, ends with a period). The system truncates longer descriptions to 57 chars + '...', destroying the routing signal. Move detail into the skill body.

## Adapting the Review UI to a New Content Class

The review UI is reusable across content classes (articles, drafts, staged candidates, outreach artifacts). The adaptation work is usually:

1. Decide the content class and the review goal.
2. Prepare a manifest or data file listing what should be reviewable.
3. Point the UI at that manifest instead of a one-off hardcoded list.
4. Confirm preview works for the relevant formats (PDF, HTML, markdown).
5. Confirm feedback capture writes where the workflow expects it.

For the concrete adaptation steps and decision points, see `references/review-adaptation.md`.

## Hosting a Review UI for Remote Access

When the user wants to review on the web or phone, publish the review interface through `here.now` rather than only running it locally. The publish flow lives in the `here-now` skill; treat that as the integration point for remote review access. Do not invent a new hosting path inside this skill.
