import { createMiddleware } from "hono/factory";
import { polar } from "./polar.js";

export const hasSufficientCredits = createMiddleware(async (c, next) => {
  const customerId = c.req.header("x-polar-customer-id") ?? "";
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
