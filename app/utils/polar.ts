import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN as string,
  server: process.env.POLAR_SERVER_ENVIRONMENT as "production" | "sandbox",
});
