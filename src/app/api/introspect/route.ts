import { NextRequest, NextResponse } from 'next/server';
import { getIntrospectionQuery } from 'graphql';

export async function POST(request: NextRequest) {
  try {
    const targetUrl = request.headers.get('X-GraphIt-Target');

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Missing X-GraphIt-Target header' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid target URL' },
        { status: 400 }
      );
    }

    // Extract forwarded headers
    const forwardedHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (key.startsWith('x-graphit-header-')) {
        const headerName = key.replace('x-graphit-header-', '');
        forwardedHeaders[headerName] = value;
      }
    });

    // Use the body if provided, otherwise use standard introspection query
    let body: string;
    try {
      body = await request.text();
      if (!body) {
        body = JSON.stringify({ query: getIntrospectionQuery() });
      }
    } catch {
      body = JSON.stringify({ query: getIntrospectionQuery() });
    }

    // Forward introspection request
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...forwardedHeaders,
      },
      body,
    });

    const responseBody = await response.text();
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Introspection proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Introspection request failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
