# PixelPinch 🖼️⚡

A privacy-focused, client-side batch image compression web app. Compress 50+ images at once without uploading anything to a server.

![PixelPinch Demo](docs/demo.png)

## Features

- **🔒 Privacy First** - All processing happens in your browser. Images never leave your device.
- **📦 Batch Processing** - Compress 50+ images at once
- **🖼️ Multiple Formats** - Supports JPG, PNG, WebP, and HEIC (iPhone photos)
- **⚙️ Adjustable Quality** - Fine-tune compression from 1-100%
- **📊 Real-time Stats** - See original vs compressed size and % saved per file
- **📥 Bulk Download** - Download all compressed files as a ZIP

## Tech Stack

- **Framework**: Next.js 16+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Compression**: [jSquash](https://github.com/nickreese/jSquash) (WASM-based MozJPEG, WebP, PNG codecs)
- **HEIC Support**: [heic2any](https://github.com/nickreese/heic2any)
- **Icons**: Lucide React

## Architecture

```
src/
├── app/
│   ├── page.tsx          # Main application page
│   ├── layout.tsx         # Root layout with metadata
│   └── globals.css        # Tailwind + global styles
├── components/
│   ├── drop-zone.tsx      # Drag & drop file input
│   ├── settings-panel.tsx # Quality slider + format selector
│   ├── file-list.tsx      # File status and progress
│   └── download-button.tsx# Single/batch ZIP download
├── lib/
│   └── compression.ts     # jSquash orchestration layer
└── types/
    └── compression.ts     # TypeScript interfaces
```

### Compression Flow

1. User drops images → validated and queued
2. Click "Compress" → `compression.ts` initializes jSquash codecs
3. Images decoded (JPEG/PNG/WebP) → encoded to target format
4. Results shown with size reduction stats
5. Download individual files or ZIP archive

### Web Worker Architecture

Image compression runs in a **parallel Web Worker pool** for maximum performance:

```
Main Thread                    Worker Pool (N-1 cores)
    │                              │
    ├─► HEIC→PNG conversion        │
    │   (requires Canvas API)      │
    │                              │
    └─► Send ArrayBuffer ──────────┼─► Worker 1: decode + encode
                                   ├─► Worker 2: decode + encode
                                   └─► Worker N: decode + encode
```

**Key design decisions:**

1. **Pre-compiled worker bundle** - The TypeScript worker is compiled with esbuild to `/public/workers/compression.worker.js`. This bypasses Turbopack's blob URL issues with WASM loading.

2. **HEIC on main thread** - `heic2any` requires the Canvas API, which isn't available in workers. HEIC files are converted to PNG on the main thread before being sent to workers.

3. **Parallel processing** - Worker pool uses `navigator.hardwareConcurrency - 1` workers, leaving one core for UI responsiveness.

4. **Transferable buffers** - ArrayBuffers are transferred (not copied) between main thread and workers for zero-copy performance.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/pixelpinch.app.git
cd pixelpinch.app

# Install dependencies
npm install

# Copy WASM files to public folder (required for WASM loading)
npm run copy-wasm

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Scripts

```bash
npm run dev          # Start Next.js dev server (Turbopack)
npm run dev:worker   # Watch mode for worker compilation
npm run dev:all      # Run both dev server + worker watch (recommended)
npm run build        # Production build (auto-builds worker)
npm run build:worker # Manually rebuild worker bundle
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Configuration

### Compression Settings

Edit `src/lib/compression.ts` to adjust:

- Default quality: `80` (1-100)
- Default output format: `webp` or `jpeg`
- Supported input formats: `SUPPORTED_TYPES` array

### WASM Files

WASM codecs are copied from `node_modules/@jsquash/*` to `public/wasm/`:

```
public/wasm/
├── mozjpeg_dec.wasm    # JPEG decoder
├── mozjpeg_enc.wasm    # JPEG encoder (MozJPEG)
├── webp_dec.wasm       # WebP decoder
├── webp_enc.wasm       # WebP encoder
└── squoosh_png_bg.wasm # PNG decoder
```

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

Requires WebAssembly support.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [jSquash](https://github.com/nickreese/jSquash) - WASM image codecs derived from Squoosh
- [Squoosh](https://squoosh.app/) - Google's image compression playground
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
