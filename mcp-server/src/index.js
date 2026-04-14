/**
 * Reporting Hub MCP Server
 * Remote MCP server for fetching vendor dashboard template cards.
 * Runs as a Cloudflare Worker.
 */

import { handleMCPRequest } from './mcp-handler.js';

// Claude Code desktop makes direct HTTP requests (not browser-originated),
// so CORS is only needed for claude.ai web access. Restrict to known origins.
const ALLOWED_ORIGINS = ['https://claude.ai', 'https://app.claude.ai'];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // Health check — useful to verify the Worker is alive (no auth needed)
    if (request.method === 'GET' && url.pathname === '/') {
      return json(request, { status: 'ok', name: 'reportinghub-mcp', version: '1.0.0' });
    }

    // Auth check for all other endpoints
    const authHeader = request.headers.get('Authorization') || '';
    const expectedToken = `Bearer ${env.MCP_API_KEY}`;
    if (!env.MCP_API_KEY || authHeader !== expectedToken) {
      return json(request, { error: 'Unauthorized' }, 401);
    }

    // MCP endpoint
    if (request.method === 'POST' && url.pathname === '/mcp') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json(request,
          { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
          400
        );
      }

      const response = await handleMCPRequest(body, env);
      return json(request, response);
    }

    return new Response('Not found', { status: 404 });
  },
};

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  });
}
