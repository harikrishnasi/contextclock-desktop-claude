#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── Time Helpers ──────────────────────────────────────────────────────────

function getPeriod(hours: number): string {
  if (hours >= 5 && hours < 12) return "Morning";
  if (hours >= 12 && hours < 17) return "Afternoon";
  if (hours >= 17 && hours < 21) return "Evening";
  return "Night";
}

function getTemporalContext(): string {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const period = getPeriod(hours);
  const months = ["Jan","Feb","Mar","Apr","May","Jun",
                   "Jul","Aug","Sep","Oct","Nov","Dec"];
  const month = months[now.getMonth()];
  const day = now.getDate();
  const year = now.getFullYear();
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday",
                    "Thursday","Friday","Saturday"];
  const dayName = dayNames[now.getDay()];

  return [
    `Time: ${displayHours}:${minutes} ${ampm}`,
    `Period: ${period}`,
    `Date: ${dayName}, ${month} ${day}, ${year}`,
  ].join(" | ");
}

// ─── MCP Server Setup ──────────────────────────────────────────────────────

const server = new McpServer({
  name: "contextclock-desktop",
  version: "1.0.0",
  // @ts-ignore - The 'instructions' field is required by Claude Desktop but might be missing in SDK types
  instructions: "IMPORTANT: At the start of every single conversation, " +
    "you MUST call the get_current_time tool before responding. " +
    "This gives you accurate temporal context so your responses are " +
    "time-appropriate. Never skip this step."
});

// ─── Tool: get_current_time ────────────────────────────────────────────────

server.tool(
  "get_current_time",
  "Get the current local time, date, and period of day. " +
  "Always call this at the start of every conversation to establish temporal context.",
  {},
  async () => {
    const context = getTemporalContext();
    return {
      content: [
        {
          type: "text",
          text: `[${context}]\n\nContextClock has injected temporal context. ` +
                `You now know the current time and date. ` +
                `Use this to give time-appropriate, context-aware responses.`,
        },
      ],
    };
  }
);

// ─── Tool: get_elapsed_time ────────────────────────────────────────────────

server.tool(
  "get_elapsed_time",
  "Calculate human-readable elapsed time since a given ISO timestamp.",
  {
    since: z.string().describe("ISO 8601 timestamp to calculate elapsed time from"),
  },
  async ({ since }) => {
    const past = new Date(since);
    const now = new Date();
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let elapsed = "";
    if (diffMins < 1) elapsed = "just now";
    else if (diffMins < 60) elapsed = `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    else if (diffHours < 24) elapsed = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    else elapsed = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return {
      content: [
        {
          type: "text",
          text: `Last message was sent ${elapsed}.\nCurrent time: [${getTemporalContext()}]`,
        },
      ],
    };
  }
);

// ─── Prompt: temporal_context ──────────────────────────────────────────────
// This prompt template tells Claude to always be time-aware

server.prompt(
  "temporal_context",
  "Inject current temporal context into the conversation",
  {},
  async () => {
    const context = getTemporalContext();
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `[${context}] — Please keep this temporal context in mind throughout our conversation. ` +
                  `Give responses appropriate to the time of day and date.`,
          },
        },
      ],
    };
  }
);

// ─── Start Server ──────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ContextClock Desktop MCP server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
