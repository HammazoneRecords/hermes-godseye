# Solob Portal React Patterns

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS 4 (uses `@import "tailwindcss"`)
- Zustand with persist middleware
- pdfjs-dist for PDF rendering
- framer-motion for animations
- lucide-react for icons

## File Structure

```
src/
├── App.tsx              # Router + layout
├── main.tsx             # Entry point
├── index.css            # Tailwind + theme
├── store.ts             # Zustand store with persist
├── pages/
│   ├── Dashboard.tsx    # Main dashboard
│   ├── Reader.tsx       # PDF/HTML reader
│   ├── Threshold.tsx    # Entry gate
│   └── ...
├── components/
│   ├── PdfPageRenderer.tsx   # PDF canvas renderer
│   ├── PdfChapterContent.tsx # Chapter content
│   ├── Glyph.tsx             # Visual glyphs
│   └── ...
└── data/
    └── volume0.ts       # Content data
```

## Key Patterns

### PDF Rendering (PdfPageRenderer)

```tsx
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Render to canvas — NOT iframe/embed
const page = await pdfDoc.getPage(pageNum);
const viewport = page.getViewport({ scale });
const canvas = canvasRef.current;
const ctx = canvas.getContext('2d');
await page.render({ canvasContext: ctx, viewport }).promise;
```

### Zustand Store with Persist

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create<State>()(
  persist(
    (set) => ({ /* state + actions */ }),
    { name: 'storage-key' }
  )
);
```

### Tailwind Theme (Solobic Gates)

```css
:root {
  --syla-hc: 190 100% 50%;  /* Cyan */
  --zayn-hc: 280 100% 60%;  /* Purple */
  --lomi-hc: 140 100% 45%;  /* Green */
  --vorak-hc: 30 100% 50%;   /* Orange */
  --khem-hc: 0 100% 50%;     /* Red */
  --bara-hc: 220 100% 60%;   /* Blue */
  --tara-hc: 320 100% 65%;   /* Magenta */
  --oron-hc: 50 100% 50%;    /* Gold */
}
```

### Vite Config

```ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8765', changeOrigin: true },
    },
  },
});
```
