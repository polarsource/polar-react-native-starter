import dotenv from "dotenv";
dotenv.config();

import { Hono } from "hono";
import { Checkout } from "@polar-sh/hono";
import { streamText } from "ai";
import { Ingestion } from "@polar-sh/ingestion";
import { LLMStrategy } from "@polar-sh/ingestion/strategies/LLM";
import { openai } from "@ai-sdk/openai";
import { serve } from "@hono/node-server";
import { hasSufficientCredits } from "./middlewares.js";
import { polarConfig } from "./polar.js";

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
  // You should obviously get this from an auth middleware or similar
  // but for this example we'll just use a fixed customer id
  const customerId = "09b8b19b-ff4a-4b3a-b12d-78ab168bf7bb";

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

app.get("/checkout_redirect", (c) => {
  // Redirect to the app
  return c.redirect("exp://172.22.79.116:8081?checkout_redirect");
});

serve({
  port: 8787,
  fetch: app.fetch,
});
