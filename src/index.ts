#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── State ─────────────────────────────────────────────────────────────────
let lastCheckedAt: number | null = null;
const envIntervalMins = process.env.REFRESH_INTERVAL_MINS
  ? parseInt(process.env.REFRESH_INTERVAL_MINS, 10)
  : 30;
const REFRESH_INTERVAL_MS = (isNaN(envIntervalMins) ? 30 : envIntervalMins) * 60 * 1000;

const WORK_START_HOUR = process.env.WORK_START_HOUR ? parseInt(process.env.WORK_START_HOUR, 10) : 9;
const WORK_END_HOUR = process.env.WORK_END_HOUR ? parseInt(process.env.WORK_END_HOUR, 10) : 17;
const WORK_DAYS_MAP: Record<string, boolean> = {
  monday: process.env.WORK_MON !== "false",
  tuesday: process.env.WORK_TUE !== "false",
  wednesday: process.env.WORK_WED !== "false",
  thursday: process.env.WORK_THU !== "false",
  friday: process.env.WORK_FRI !== "false",
  saturday: process.env.WORK_SAT === "true",
  sunday: process.env.WORK_SUN === "true",
};

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
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec",
  ];
  const dayNames = [
    "Sunday","Monday","Tuesday","Wednesday",
    "Thursday","Friday","Saturday",
  ];
  const now2 = new Date();
  const currentDayName = dayNames[now2.getDay()].toLowerCase();
  const isWorkingDay = WORK_DAYS_MAP[currentDayName];
  const safeStart = isNaN(WORK_START_HOUR) ? 9 : WORK_START_HOUR;
  const safeEnd = isNaN(WORK_END_HOUR) ? 17 : WORK_END_HOUR;
  const isWorkingHours = hours >= safeStart && hours < safeEnd;
  
  const status = isWorkingDay 
    ? (isWorkingHours ? "On-duty (Working hours)" : "Off-duty (Outside working hours)")
    : "Day Off (Non-working day)";

  return [
    `Time: ${displayHours}:${minutes} ${ampm}`,
    `Period: ${period}`,
    `Date: ${dayNames[now2.getDay()]}, ${months[now2.getMonth()]} ${now2.getDate()}, ${now2.getFullYear()}`,
    `Status: ${status}`,
  ].join(" | ");
}

function getElapsedSinceLastCheck(): string {
  if (!lastCheckedAt) return "first check";
  const diffMs = Date.now() - lastCheckedAt;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
}

function shouldRefresh(): boolean {
  if (!lastCheckedAt) return true;
  return Date.now() - lastCheckedAt > REFRESH_INTERVAL_MS;
}

// ─── MCP Server ────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "contextclock-desktop",
  version: "1.0.0",
  // @ts-ignore - The 'instructions' field is required by Claude Desktop but might be missing in SDK types
  instructions: `
You are connected to ContextClock — an AI temporal context server.

RULES YOU MUST ALWAYS FOLLOW:
1. At the START of every new conversation, call get_current_time immediately 
   before your first response. No exceptions.

2. Before EVERY message you send, call should_refresh_time first.
   - If it returns { refresh: true }, call get_current_time immediately 
     to get updated time before responding.
   - If it returns { refresh: false }, proceed normally.

3. When the user mentions ANY time-sensitive phrase — "just woke up", 
   "good morning", "good night", "just got back", "I'm back", 
   "been a while", "long time" — always call get_current_time 
   to refresh your temporal context before responding.

4. Never assume you know the time. Always trust ContextClock.
  `.trim(),
});

// ─── Tool: should_refresh_time ─────────────────────────────────────────────

server.tool(
  "should_refresh_time",
  "Check if temporal context needs refreshing. Call this before every response. " +
  "If refresh is true, immediately call get_current_time before responding.",
  {},
  async () => {
    const refresh = shouldRefresh();
    const lastCheck = getElapsedSinceLastCheck();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            refresh,
            reason: refresh
              ? `Last time check was ${lastCheck}. Time context is stale — call get_current_time now.`
              : `Time context is fresh. Last checked ${lastCheck}. No refresh needed.`,
            lastCheckedAt: lastCheckedAt
              ? new Date(lastCheckedAt).toISOString()
              : null,
          }),
        },
      ],
    };
  }
);

// ─── Tool: get_current_time ────────────────────────────────────────────────

server.tool(
  "get_current_time",
  "Get the current local time, date, and period of day. " +
  "Call this at conversation start and whenever should_refresh_time returns { refresh: true }.",
  {},
  async () => {
    lastCheckedAt = Date.now();
    const context = getTemporalContext();

    return {
      content: [
        {
          type: "text",
          text: `[${context}]\n\nContextClock refreshed. Temporal context is now current. ` +
                `Use this to give time-appropriate responses.`,
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
    else if (diffMins < 60)
      elapsed = `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    else if (diffHours < 24)
      elapsed = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    else elapsed = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return {
      content: [
        {
          type: "text",
          text: `Elapsed: ${elapsed}\nCurrent time: [${getTemporalContext()}]`,
        },
      ],
    };
  }
);

// ─── Tool: convert_timezone ────────────────────────────────────────────────

server.tool(
  "convert_timezone",
  "Convert current local time to a specified IANA timezone (e.g. 'Europe/London')",
  {
    target_timezone: z.string().describe("IANA timezone string (e.g. 'America/New_York')"),
  },
  async ({ target_timezone }) => {
    try {
      const formatted = new Date().toLocaleString("en-US", {
        timeZone: target_timezone,
        dateStyle: "full",
        timeStyle: "long",
      });
      return {
        content: [
          {
            type: "text",
            text: `Current time in ${target_timezone}: ${formatted}`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Invalid timezone '${target_timezone}'. Please provide a valid IANA timezone string like 'Europe/London' or 'America/New_York'.`,
          },
        ],
      };
    }
  }
);

// ─── Prompt: temporal_context ──────────────────────────────────────────────

server.prompt(
  "temporal_context",
  "Manually inject current temporal context into the conversation",
  {},
  async () => {
    lastCheckedAt = Date.now();
    const context = getTemporalContext();
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `[${context}] — Please keep this temporal context in mind ` +
                  `throughout our conversation and give time-appropriate responses.`,
          },
        },
      ],
    };
  }
);

// ─── Start ─────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ContextClock Desktop MCP server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
