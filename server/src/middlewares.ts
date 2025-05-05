import { createMiddleware } from "hono/factory";
import { polar } from "./polar.js";

// You should obviously get this from an auth middleware or similar
// but for this example we'll just use a fixed customer id
const customerId = "09b8b19b-ff4a-4b3a-b12d-78ab168bf7bb";

export const hasSufficientCredits = createMiddleware(async (c, next) => {
  const meterId = process.env.POLAR_USAGE_METER_ID ?? "";

  const customerMeter = await polar.customerMeters.list({
    customerId,
    meterId,
  });

  const hasCredits = customerMeter.result.items.some(
    (customerMeter) => customerMeter.balance > 0
  );

  if (!hasCredits) {
    return c.json({
      error: "Insufficient credits",
      status: 400,
    });
  }

  await next();
});
