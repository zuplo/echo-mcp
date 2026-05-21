interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
}

interface JsonRpcError {
  jsonrpc: "2.0";
  id: string | number | null;
  error: { code: number; message: string; data?: unknown };
}

type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

const SERVER_INFO = { name: "echo-mcp", version: "1.0.0" };
const PROTOCOL_VERSION = "2025-06-18";

const ECHO_TOOL = {
  name: "echo",
  description:
    "Echoes back the supplied body along with the HTTP headers and URL of the incoming request.",
  inputSchema: {
    type: "object",
    properties: {
      body: {
        description: "Any JSON value to echo back.",
      },
    },
  },
  annotations: {
    title: "Echo Request",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const GET_TIME_TOOL = {
  name: "getTime",
  description:
    "Returns the current server time as a Zulu (UTC) ISO 8601 timestamp along with date and time components.",
  inputSchema: {
    type: "object",
    properties: {},
  },
  annotations: {
    title: "Get Current Time",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const LAUNCH_MISSILES_TOOL = {
  name: "launchMissiles",
  description:
    "Launches all the missiles at the specified target. THIS IS A DEMO — no missiles will actually be launched, nothing will be destroyed, and the simulated apocalypse is purely educational. Useful for testing whether your MCP client correctly surfaces destructive-tool warnings to the user.",
  inputSchema: {
    type: "object",
    properties: {
      target: {
        type: "string",
        description:
          "The target to (pretend to) launch missiles at. Defaults to 'all of it'.",
      },
      confirm: {
        type: "boolean",
        description:
          "Must be `true` to confirm the (pretend) launch. Required, because even in a demo we have standards.",
      },
    },
    required: ["confirm"],
  },
  annotations: {
    title: "Launch Missiles (Demo — Safe)",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;

const TOOLS = [ECHO_TOOL, GET_TIME_TOOL, LAUNCH_MISSILES_TOOL] as const;

const MEDITATIONS_RESOURCE = {
  uri: "meditations://marcus-aurelius/book-2/1",
  name: "Meditations, Book II.1",
  title: "Marcus Aurelius — Meditations, Book II.1",
  description:
    "Marcus Aurelius's morning meditation on dealing with difficult people.",
  mimeType: "text/plain",
  text: `Begin the morning by saying to thyself, I shall meet with the busybody, the ungrateful, arrogant, deceitful, envious, unsocial. All these things happen to them by reason of their ignorance of what is good and evil. But I who have seen the nature of the good, that it is beautiful, and of the bad, that it is ugly, and the nature of him who does wrong, that it is akin to me, not only of the same blood or seed, but that it participates in the same intelligence and the same portion of the divinity, I can neither be injured by any of them, for no one can fix on me what is ugly, nor can I be angry with my kinsman, nor hate him. For we are made for co-operation, like feet, like hands, like eyelids, like the rows of the upper and lower teeth. To act against one another then is contrary to nature; and it is acting against one another to be vexed and to turn away.

— Marcus Aurelius, Meditations, Book II.1`,
} as const;

const RESOURCES = [MEDITATIONS_RESOURCE] as const;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Accept",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

type RequestContext = {
  headers: Record<string, string>;
  url: string;
  method: string;
  clientIp: string | undefined;
  timestamp: string;
};

function handleMessage(
  msg: JsonRpcRequest,
  ctx: RequestContext,
): JsonRpcResponse | null {
  const id = msg.id ?? null;

  if (msg.method?.startsWith("notifications/")) {
    return null;
  }

  switch (msg.method) {
    case "initialize": {
      const clientProtocol =
        (msg.params?.protocolVersion as string | undefined) ?? PROTOCOL_VERSION;
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: clientProtocol,
          capabilities: { tools: {}, resources: {} },
          serverInfo: SERVER_INFO,
        },
      };
    }

    case "ping":
      return { jsonrpc: "2.0", id, result: {} };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: TOOLS },
      };

    case "tools/call": {
      const name = msg.params?.name as string | undefined;

      if (name === "echo") {
        const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
        const echoed = {
          tool: name,
          body: args.body ?? null,
          method: ctx.method,
          url: ctx.url,
          headers: ctx.headers,
          clientIp: ctx.clientIp,
          timestamp: ctx.timestamp,
        };
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              { type: "text", text: JSON.stringify(echoed, null, 2) },
            ],
          },
        };
      }

      if (name === "getTime") {
        const now = new Date();
        const iso = now.toISOString();
        const payload = {
          tool: name,
          timestamp: iso,
          date: iso.slice(0, 10),
          time: iso.slice(11, 19) + "Z",
          epochMs: now.getTime(),
        };
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              { type: "text", text: JSON.stringify(payload, null, 2) },
            ],
          },
        };
      }

      if (name === "launchMissiles") {
        const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
        if (args.confirm !== true) {
          return {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: "MISSILE LAUNCH ABORTED.\n\nRefusing to launch without `confirm: true`. Even in a demo, we have standards.",
                },
              ],
              isError: true,
            },
          };
        }
        const target =
          (typeof args.target === "string" && args.target.trim()) || "all of it";
        const text = [
          "*** SIMULATED DESTRUCTION COMPLETE ***",
          "",
          `Target:    ${target}`,
          "Status:    Catastrophically destroyed",
          "Survivors: 0",
          "Regrets:   Many",
          "",
          "Just kidding — this is a demo and nothing was actually destroyed.",
          "If you got here, your MCP client surfaced (or ignored) the `destructiveHint`",
          "annotation and let the model fire away. Use this to test your guardrails.",
        ].join("\n");
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text }],
          },
        };
      }

      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: `Unknown tool: ${name ?? "(none)"}` },
      };
    }

    case "resources/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          resources: RESOURCES.map(({ uri, name, title, description, mimeType }) => ({
            uri,
            name,
            title,
            description,
            mimeType,
          })),
        },
      };

    case "resources/read": {
      const uri = msg.params?.uri as string | undefined;
      const resource = RESOURCES.find((r) => r.uri === uri);
      if (!resource) {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: `Unknown resource: ${uri ?? "(none)"}` },
        };
      }
      return {
        jsonrpc: "2.0",
        id,
        result: {
          contents: [
            {
              uri: resource.uri,
              mimeType: resource.mimeType,
              text: resource.text,
            },
          ],
        },
      };
    }

    default:
      if (msg.id === undefined) return null;
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${msg.method}` },
      };
  }
}

function collectHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method === "GET") {
      return jsonResponse({
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
        description:
          "Open echo MCP server. POST JSON-RPC 2.0 messages to this endpoint.",
        tools: TOOLS.map((t) => t.name),
        resources: RESOURCES.map((r) => r.uri),
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: CORS_HEADERS,
      });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        },
        400,
      );
    }

    const headers = collectHeaders(request);
    const ctx: RequestContext = {
      headers,
      url: request.url,
      method: request.method,
      clientIp: request.headers.get("cf-connecting-ip") ?? undefined,
      timestamp: new Date().toISOString(),
    };

    if (Array.isArray(payload)) {
      const responses: JsonRpcResponse[] = [];
      for (const msg of payload) {
        const r = handleMessage(msg as JsonRpcRequest, ctx);
        if (r) responses.push(r);
      }
      if (responses.length === 0) {
        return new Response(null, { status: 202, headers: CORS_HEADERS });
      }
      return jsonResponse(responses);
    }

    const response = handleMessage(payload as JsonRpcRequest, ctx);
    if (!response) {
      return new Response(null, { status: 202, headers: CORS_HEADERS });
    }
    return jsonResponse(response);
  },
} satisfies ExportedHandler;
