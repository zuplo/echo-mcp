# echo-mcp

A minimal, open [Model Context Protocol](https://modelcontextprotocol.io) server that echoes back the request body, HTTP headers, and URL of incoming calls. Built as a single [Cloudflare Worker](https://workers.cloudflare.com) speaking JSON-RPC 2.0 over HTTP.

Useful for debugging MCP clients, inspecting headers a client sends, testing transport behavior, and exercising destructive-tool warnings.

## Deployment

Deployed and publicly available at:

**https://mcp.zuplo.io**

`GET` returns a small JSON descriptor. `POST` accepts JSON-RPC 2.0 messages (single or batched).

## Tools

| Name | Description |
| --- | --- |
| `echo` | Echoes the supplied `body` argument back, along with the request headers, URL, method, client IP, and timestamp. |
| `getTime` | Returns the current server time as a UTC ISO 8601 timestamp with date, time, and epoch ms components. |
| `launchMissiles` | Demo destructive tool. Does **not** actually do anything — used to test whether MCP clients surface `destructiveHint` warnings to the user. Requires `confirm: true`. |

## Resources

| URI | Description |
| --- | --- |
| `meditations://marcus-aurelius/book-2/1` | Marcus Aurelius's morning meditation from *Meditations*, Book II.1. |

## Connecting an MCP client

Point any MCP client that supports the HTTP transport at `https://mcp.zuplo.io`. No authentication required.

## Local development

```sh
npm install
npm run dev       # wrangler dev
npm run typecheck # tsc --noEmit
npm run deploy    # wrangler deploy
```

## Example

```sh
curl -X POST https://mcp.zuplo.io \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```
