# PixelPinch ⚡

**Free, private, client-side batch image compression.**

> Your images never leave your browser. All compression happens locally using WebAssembly.

---

## ✨ Features

- **🔒 No Uploads** — Zero server uploads. All processing happens in your browser.
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
                │  (Threads 1-N)        │
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

## 🚀 Run this yourself!

### Prerequisites

- a reasonably recent version of NPM and Node

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
| `npm run copy-wasm` | Copy WASM files to public/ |

---

## 🔒 Privacy Policy & Details

**PixelPinch's Image Compression is 100% client-side.**

- NO images are uploaded to any server
- Works offline after initial load
- Pixelpinch tracks the user interaction and usage using Posthog's Analytics & Session Replay, these are the things that we know:
  - Number of images
  - Size of images
  - Number of threads/workers users set
  - User's client-side performance metrics
  - User's interaction with the footer (clicking the https://bylouis.io website, clicking "buy me a coffee" button)
  - Note: These are so that I can improve the app and provide better user experience. (+ im curious how many people clicks my footer links!)
- I CANNOT SEE:
  - Image name
  - Image content (both original and compressed)
- I DO NOT TRACK any personal information!

---

## 📄 License

MIT © 2026 Louis

---

<p align="center">
  <strong>⚡ PixelPinch</strong> — Instant batch compression, zero compromise.
</p>
