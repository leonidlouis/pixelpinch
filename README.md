# PixelPinch ⚡

**Free, private, client-side batch image compression.**

> Your images never leave your browser. All compression happens locally using WebAssembly.

---

## ✨ Features

- **🔒 100% Private** — Zero server uploads. All processing happens in your browser.
- **⚡ Blazing Fast** — Parallel compression via Web Workers (uses all CPU cores).
- **📦 Batch Processing** — No arbitrary limits. Compress as many images as your device can handle.
- **🔄 Re-compress** — Tweak settings and re-process without re-uploading.
- **📱 Mobile Ready** — Responsive design works on any device.
- **📥 One-Click Download** — Individual files or ZIP archive.

### Supported Formats

| Input | Output |
|-------|--------|
| JPEG, PNG, WebP, HEIC/HEIF | JPEG, WebP |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Drop Zone  │───▶│  File State  │───▶│  Settings Panel  │  │
│  │  (Upload UI) │    │   (React)    │    │  (Quality/Format)│  │
│  └──────────────┘    └──────┬───────┘    └────────┬─────────┘  │
│                             │                     │             │
│                             ▼                     │             │
│                   ┌─────────────────┐             │             │
│                   │   Compression   │◀────────────┘             │
│                   │  Orchestrator   │                           │
│                   │  (Main Thread)  │                           │
│                   └────────┬────────┘                           │
│                            │                                    │
│         ┌──────────────────┼──────────────────┐                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Worker #1  │    │  Worker #2  │    │  Worker #N  │         │
│  │   (WASM)    │    │   (WASM)    │    │   (WASM)    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│        │                  │                  │                  │
│        └──────────────────┴──────────────────┘                  │
│                            │                                    │
│                            ▼                                    │
│                   ┌─────────────────┐                           │
│                   │  Compressed     │                           │
│                   │  Blob / ZIP     │──▶ Download               │
│                   └─────────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
src/
├── app/                       # Next.js App Router
│   ├── page.tsx               # Main page component
│   ├── layout.tsx             # Root layout with metadata
│   ├── globals.css            # Tailwind styles
│   ├── icon.png               # Favicon
│   ├── apple-icon.png         # Apple touch icon
│   ├── opengraph-image.png    # OG image for social sharing
│   └── twitter-image.png      # Twitter card image
│
├── components/
│   ├── drop-zone.tsx          # Drag & drop file upload
│   ├── file-list.tsx          # File list with progress + individual rows
│   ├── settings-panel.tsx     # Quality slider + format toggle
│   ├── download-button.tsx    # Single/ZIP download logic
│   └── ui/                    # Radix-based UI primitives
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── progress.tsx
│       └── slider.tsx
│
├── lib/
│   ├── compression.ts         # Orchestrates compression flow
│   ├── worker-pool.ts         # Manages Web Worker concurrency
│   └── utils.ts               # Tailwind merge utility
│
├── workers/
│   └── compression.worker.ts  # WASM compression worker
│
└── types/
    └── compression.ts         # TypeScript interfaces
```

---

## 🚀 How It Works (Flowchart)

```
                    ┌───────────────┐
                    │  User Drops   │
                    │    Images     │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Validate &   │
                    │  Add to List  │
                    │ (pending state│
                    └───────┬───────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  User Adjusts Settings│
                │  (Quality 1-100%)     │
                │  (Format: JPEG/WebP)  │
                └───────────┬───────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Click Compress│
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │Worker #1│         │Worker #2│         │Worker #N│
   │ (WASM)  │         │ (WASM)  │         │ (WASM)  │
   │ encode  │         │ encode  │         │ encode  │
   └────┬────┘         └────┬────┘         └────┬────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Update State │
                    │  (done/error) │
                    └───────┬───────┘
                            │
          ┌─────────────────┴─────────────────┐
          │                                   │
          ▼                                   ▼
   ┌──────────────┐                  ┌──────────────┐
   │ Settings     │                  │   Download   │
   │ Changed?     │                  │  (ZIP if >1) │
   └──────┬───────┘                  └──────────────┘
          │
          ▼ Yes
   ┌──────────────┐
   │ Re-compress  │◀────────────────────────┐
   │ (reset state)│                         │
   └──────────────┘                         │
                                            │
          ▲                                 │
          └─────────── Loop ────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1 (App Router) |
| UI | React 19, Radix UI, Tailwind CSS 4 |
| Compression | jSquash (WebP, JPEG, PNG WASM codecs) |
| HEIC Support | heic2any |
| Concurrency | Web Workers (parallel, pool-based) |
| Downloads | Browser Blob API, JSZip |
| Build | Turbopack, esbuild (worker bundling) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/pixelpinch.git
cd pixelpinch

# Install dependencies (also copies WASM files and builds worker)
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
npm start
```

---

## 🐳 Docker

```bash
# Build image
docker build -t pixelpinch .

# Run container
docker run -p 3000:3000 pixelpinch
```

---

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run dev:worker` | Watch & rebuild compression worker |
| `npm run dev:all` | Run dev server + worker watcher concurrently |
| `npm run build` | Production build |
| `npm run build:worker` | Bundle compression worker |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run copy-wasm` | Copy WASM files to public/ |

---

## 🔒 Privacy

**PixelPinch is 100% client-side.**

- No images are uploaded to any server
- No analytics or tracking
- No cookies
- Works offline after initial load

---

## 📄 License

MIT © 2026 Louis

---

<p align="center">
  <strong>⚡ PixelPinch</strong> — Instant batch compression, zero compromise.
</p>
