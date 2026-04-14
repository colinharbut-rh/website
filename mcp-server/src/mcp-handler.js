/**
 * MCP JSON-RPC handler.
 * Implements the MCP Streamable HTTP transport (request/response, no SSE).
 */

import { scrapeGallery } from './tools/scrape-gallery.js';
import { listVendors } from './tools/list-vendors.js';

const SERVER_INFO = {
  name: 'reportinghub-mcp',
  version: '1.0.0',
};

const TOOL_SCHEMAS = [
  {
    name: 'scrape_gallery',
    description:
      'Fetch a vendor dashboard template gallery and return structured card data: titles, descriptions, preview image URLs, template links, and the curl headers needed to download images without hotlink blocking.',
    inputSchema: {
      type: 'object',
      properties: {
        vendor: {
          type: 'string',
          description: 'Vendor ID. Use list_vendors to see all supported options.',
        },
        category: {
          type: 'string',
          description:
            'Optional category/integration filter, e.g. "google-ads", "facebook-ads", "linkedin-ads". Leave empty for all templates.',
        },
        url: {
          type: 'string',
          description:
            'Optional: override the default gallery URL. Useful if the vendor has changed their URL structure.',
        },
      },
      required: ['vendor'],
    },
  },
  {
    name: 'list_vendors',
    description: 'List all supported dashboard vendors with their IDs and available category filters.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export async function handleMCPRequest(body, env) {
  const { jsonrpc, id, method, params } = body;

  if (jsonrpc !== '2.0') {
    return { jsonrpc: '2.0', id: id ?? null, error: { code: -32600, message: 'Invalid Request' } };
  }

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        },
      };

    case 'notifications/initialized':
      // Notification — no response body needed, but return empty result to be safe
      return { jsonrpc: '2.0', id, result: {} };

    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: { tools: TOOL_SCHEMAS },
      };

    case 'tools/call': {
      const toolName = params?.name;
      const args = params?.arguments ?? {};

      try {
        let result;
        if (toolName === 'scrape_gallery') {
          result = await scrapeGallery(args, env);
        } else if (toolName === 'list_vendors') {
          result = listVendors();
        } else {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Unknown tool: ${toolName}` },
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          },
        };
      } catch (err) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }],
            isError: true,
          },
        };
      }
    }

    default:
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
  }
}
