import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // Use Node.js runtime for robust networking

const POSTHOG_HOST = 'https://us.i.posthog.com';
const POSTHOG_ASSETS_HOST = 'https://us-assets.i.posthog.com';

async function proxyRequest(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    const { slug } = await params;
    const path = slug.join('/');

    // Determine target hostname
    let targetUrl = '';
    if (slug[0] === 'static') {
        targetUrl = `${POSTHOG_ASSETS_HOST}/static/${slug.slice(1).join('/')}`;
    } else {
        targetUrl = `${POSTHOG_HOST}/${path}`;
    }

    // Preserve query parameters
    const searchParams = request.nextUrl.searchParams.toString();
    if (searchParams) {
        targetUrl += `?${searchParams}`;
    }

    try {
        const headers = new Headers(request.headers);
        // Strip headers that might confuse the upstream
        headers.delete('host');
        headers.delete('connection');
        headers.delete('content-length');

        const response = await fetch(targetUrl, {
            method: request.method,
            headers: headers,
            body: request.method !== 'GET' ? request.body : undefined,
            // @ts-ignore - 'duplex' is a valid option in Node/Next fetch but TS might complain
            duplex: 'half',
        });

        const responseHeaders = new Headers(response.headers);
        // Ensure we don't pass confusing CORS or transfer-encoding headers back if not needed
        // But usually passing them back is fine. Next.js handles transfer-encoding.

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('PostHog Proxy Error:', error);
        return NextResponse.json({ error: 'Proxy failed' }, { status: 502 });
    }
}

export async function GET(request: NextRequest, ctx: any) {
    return proxyRequest(request, ctx);
}

export async function POST(request: NextRequest, ctx: any) {
    return proxyRequest(request, ctx);
}
