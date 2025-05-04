import { Polar } from "@polar-sh/sdk";

export const polarConfig = {
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: "sandbox",
} as const;

export const polar = new Polar(polarConfig);
