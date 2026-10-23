// Serialized MiniSearch index of every locked asset and rule. The search dialog fetches it on first open.
import type { APIRoute } from "astro";
import { buildSearchIndex } from "../lib/search-index.ts";

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(buildSearchIndex(), { headers: { "Content-Type": "application/json; charset=utf-8" } });
