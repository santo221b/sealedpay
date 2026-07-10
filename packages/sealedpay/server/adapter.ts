/**
 * Node (req, res) adapter shared by the Vercel functions in api/ and the vite
 * dev bridge — both hand us plain node streams. Parses a bounded JSON body,
 * runs the handler, serializes { error } failures with their status, and turns
 * anything unexpected into a calm 500 (never a stack trace to the client).
 */
import type { IncomingMessage, ServerResponse } from "node:http";

import { ApiFail } from "./errors.js";
import type { HandlerResult } from "./handlers.js";

const MAX_BODY_BYTES = 262_144; // 256 KB — far above any roster/runs payload

export type RouteHandler = (authorization: string | undefined, method: string, body: unknown) => Promise<HandlerResult>;

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  // Vercel may have parsed it already (functions get req.body for JSON).
  const pre = (req as IncomingMessage & { body?: unknown }).body;
  if (pre !== undefined && pre !== null && typeof pre !== "string") return pre;
  if (typeof pre === "string") {
    try {
      return pre.length ? JSON.parse(pre) : undefined;
    } catch {
      throw new ApiFail(400, "That request body isn't valid JSON.");
    }
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new ApiFail(413, "That request is too large.");
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiFail(400, "That request body isn't valid JSON.");
  }
}

export function adapt(handler: RouteHandler) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const send = (status: number, body: unknown) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify(body));
    };
    try {
      const method = (req.method ?? "GET").toUpperCase();
      const body = method === "GET" || method === "HEAD" ? undefined : await readJsonBody(req);
      const auth = req.headers.authorization;
      const result = await handler(Array.isArray(auth) ? auth[0] : auth, method, body);
      send(result.status, result.body);
    } catch (e) {
      if (e instanceof ApiFail) {
        send(e.status, { error: e.message });
        return;
      }
      // Log the real cause server-side; the client gets one calm sentence.
      console.error("[sealedpay api]", e);
      send(500, { error: "The SealedPay server hit a problem. Try again in a moment." });
    }
  };
}
