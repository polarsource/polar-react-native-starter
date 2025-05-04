import { Hono } from "hono";
import { Checkout } from "@polar-sh/hono";
import { streamText } from "ai";
import { Ingestion } from "@polar-sh/ingestion";
import { LLMStrategy } from "@polar-sh/ingestion/strategies/LLM";
import { openai } from "@ai-sdk/openai";
import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { hasSufficientCredits } from "./middlewares.js";
import { polarConfig } from "./polar.js";

dotenv.config();

const app = new Hono();

/// --- Checkout --- ///

app.get(
  "/checkout",
  Checkout({
    ...polarConfig,
    successUrl: process.env.POLAR_SUCCESS_URL,
  })
);

/// --- LLM --- ///

const llmIngestion = Ingestion(polarConfig)
  .strategy(new LLMStrategy(openai("gpt-4o")))
  .ingest("openai-usage");

app.post("/prompt", hasSufficientCredits, async (c) => {
  const customerId = c.req.header("x-polar-customer-id") ?? "";

  const { messages } = await c.req.json();

  const result = await streamText({
    model: llmIngestion.client({
      customerId,
    }),
    system: "You are a helpful assistant.",
    messages,
  });

  return result.toDataStreamResponse({
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
});

serve({
  port: 8787,
  fetch: app.fetch,
});
