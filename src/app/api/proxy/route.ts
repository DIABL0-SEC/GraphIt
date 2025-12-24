import { NextRequest, NextResponse } from 'next/server';

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

    // Get request body
    const body = await request.text();

    // Check for GET method override
    const methodOverride = request.headers.get('X-GraphIt-Method');

    if (methodOverride === 'GET') {
      // For GET requests, encode query in URL
      const parsedBody = JSON.parse(body);
      const url = new URL(targetUrl);
      url.searchParams.set('query', parsedBody.query);
      if (parsedBody.variables) {
        url.searchParams.set('variables', JSON.stringify(parsedBody.variables));
      }
      if (parsedBody.operationName) {
        url.searchParams.set('operationName', parsedBody.operationName);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: forwardedHeaders,
      });

      const responseBody = await response.text();
      const responseHeaders = new Headers();
      response.headers.forEach((value, key) => {
        // Don't forward certain headers
        if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      });

      return new NextResponse(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    // Forward POST request
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
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy request failed' },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight
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
