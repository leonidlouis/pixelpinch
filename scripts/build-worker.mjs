#!/usr/bin/env node
/**
 * Build script for compression worker
 * 
 * Compiles the TypeScript worker with esbuild, bundling all jSquash
 * dependencies into a single ESM file that can be loaded from /public/workers/.
 * 
 * Usage:
 *   node scripts/build-worker.mjs          # One-time build
 *   node scripts/build-worker.mjs --watch  # Watch mode for development
 */

import * as esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const isWatch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
    entryPoints: [resolve(projectRoot, 'src/workers/compression.worker.ts')],
    outfile: resolve(projectRoot, 'public/workers/compression.worker.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['chrome90', 'firefox90', 'safari15'],
    minify: !isWatch, // Only minify for production
    sourcemap: isWatch ? 'inline' : false,

    // Important: Define any Node.js globals that might leak through
    define: {
        'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
    },

    // Don't externalize anything - we want a complete bundle
    // jSquash and its WASM loaders should all be inlined
    external: [],

    // Log level
    logLevel: 'info',
};

async function build() {
    try {
        if (isWatch) {
            console.log('👀 Watching for worker changes...');
            const ctx = await esbuild.context(buildOptions);
            await ctx.watch();
            console.log('✅ Worker built. Watching for changes...');
        } else {
            console.log('🔨 Building compression worker...');
            const result = await esbuild.build(buildOptions);
            console.log('✅ Worker built successfully!');

            if (result.metafile) {
                const outputs = Object.keys(result.metafile.outputs);
                console.log('   Output:', outputs.join(', '));
            }
        }
    } catch (error) {
        console.error('❌ Worker build failed:', error);
        process.exit(1);
    }
}

build();
