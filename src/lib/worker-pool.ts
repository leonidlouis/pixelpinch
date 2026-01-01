import type { CompressionRequest, CompressionResponse, WorkerResponse } from '@/types/compression';

type TaskCallback = (response: CompressionResponse) => void;

interface QueuedTask {
    request: CompressionRequest;
    callback: TaskCallback;
}

// Detect mobile devices for conservative worker limits
export function isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;

    // Check for touch capability + small screen (rules out touch laptops)
    const hasTouch = navigator.maxTouchPoints > 0;
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 1024;

    // Also check user agent for mobile keywords
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );

    return mobileUA || (hasTouch && isSmallScreen);
}

// Get the maximum allowed workers for this device
export function getMaxParallelWorkers(): number {
    if (typeof navigator === 'undefined') return 4;
    return Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
}

// Get the recommended default workers based on device type
export function getDefaultParallelWorkers(): number {
    const max = getMaxParallelWorkers();
    if (isMobileDevice()) {
        return Math.min(3, max);
    }
    return max;
}


/**
 * Manages a pool of Web Workers for parallel image compression.
 * Limits concurrency based on device type to balance performance and memory.
 */
export class WorkerPool {
    private workers: Worker[] = [];
    private availableWorkers: Worker[] = [];
    private taskQueue: QueuedTask[] = [];
    private pendingTasks: Map<string, { worker: Worker; callback: TaskCallback }> = new Map();
    private maxWorkers: number;
    private isInitialized = false;

    constructor(maxWorkers?: number) {
        const cpuWorkers = Math.max(1, (navigator.hardwareConcurrency || 4) - 1);

        if (maxWorkers !== undefined) {
            this.maxWorkers = maxWorkers;
        } else if (isMobileDevice()) {
            // Mobile: cap at 3 to prevent memory issues
            this.maxWorkers = Math.min(3, cpuWorkers);
        } else {
            // Desktop: use full CPU capacity
            this.maxWorkers = cpuWorkers;
        }
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        const workerPromises: Promise<Worker>[] = [];

        for (let i = 0; i < this.maxWorkers; i++) {
            workerPromises.push(this.createWorker());
        }

        this.workers = await Promise.all(workerPromises);
        this.availableWorkers = [...this.workers];
        this.isInitialized = true;
    }

    private createWorker(): Promise<Worker> {
        return new Promise((resolve, reject) => {
            // Use pre-compiled worker from public directory
            // This bypasses Turbopack's blob URL issues with WASM loading
            const worker = new Worker('/workers/compression.worker.js', {
                type: 'module'
            });

            const handleMessage = (event: MessageEvent<WorkerResponse>) => {
                if (event.data.type === 'ready') {
                    worker.removeEventListener('message', handleMessage);
                    worker.addEventListener('message', this.handleWorkerMessage.bind(this, worker));
                    resolve(worker);
                } else if (event.data.type === 'init-error') {
                    worker.removeEventListener('message', handleMessage);
                    worker.terminate();
                    reject(new Error(event.data.payload.message));
                }
            };

            worker.addEventListener('message', handleMessage);
            worker.addEventListener('error', (error) => {
                reject(new Error(`Worker failed to initialize: ${error.message}`));
            });

            // Send init message with the base URL for WASM loading
            worker.postMessage({
                type: 'init',
                baseUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
            });
        });
    }

    private handleWorkerMessage(worker: Worker, event: MessageEvent<WorkerResponse>): void {
        const message = event.data;

        if (message.type === 'result') {
            const taskId = message.payload.id;
            const pending = this.pendingTasks.get(taskId);

            if (pending) {
                pending.callback(message.payload);
                this.pendingTasks.delete(taskId);
            }

            // Return worker to pool and process next task
            this.availableWorkers.push(worker);
            this.processNextTask();
        }
    }

    private processNextTask(): void {
        if (this.taskQueue.length === 0 || this.availableWorkers.length === 0) {
            return;
        }

        const worker = this.availableWorkers.pop()!;
        const task = this.taskQueue.shift()!;

        this.pendingTasks.set(task.request.id, {
            worker,
            callback: task.callback,
        });

        // Send the image data to the worker with transferable buffer
        worker.postMessage(
            { type: 'compress', payload: task.request },
            [task.request.imageData]
        );
    }


    /**
     * Schedules a compression task to be run by the worker pool.
     * @param request - The compression request containing image data and settings
     * @returns Promise resolving to the compression response
     */
    async compress(request: CompressionRequest): Promise<CompressionResponse> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        return new Promise((resolve) => {
            this.taskQueue.push({
                request,
                callback: resolve,
            });
            this.processNextTask();
        });
    }

    terminate(): void {
        for (const worker of this.workers) {
            worker.terminate();
        }
        this.workers = [];
        this.availableWorkers = [];
        this.taskQueue = [];
        this.pendingTasks.clear();
        this.isInitialized = false;
    }

    get queueLength(): number {
        return this.taskQueue.length;
    }

    get activeWorkers(): number {
        return this.maxWorkers - this.availableWorkers.length;
    }
}

// Singleton instance with size tracking
let poolInstance: WorkerPool | null = null;
let poolSize: number | null = null;


/**
 * Gets or creates a WorkerPool with the specified size.
 * If maxWorkers differs from current pool, terminates old pool and creates new one.
 * 
 * @param maxWorkers - Number of workers to create (optional, uses device default if not specified)
 */
export function getWorkerPool(maxWorkers?: number): WorkerPool {
    const requestedSize = maxWorkers ?? getDefaultParallelWorkers();

    // If pool exists with different size, terminate and recreate
    if (poolInstance && poolSize !== requestedSize) {
        poolInstance.terminate();
        poolInstance = null;
        poolSize = null;
    }

    if (!poolInstance) {
        poolInstance = new WorkerPool(requestedSize);
        poolSize = requestedSize;
    }

    return poolInstance;
}
