import pino from "pino";

const redactPaths = [
  "authorization",
  "cookie",
  "*.token",
  "*.secret",
  "*.key",
  "*.password",
  "*.apiKey",
  "*.accessToken",
  "*.refreshToken",
  "encryptedCredentials",
];

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: redactPaths,
    censor: "[REDACTED]",
  },
});
