import type { RequestHandler } from "express";
import { auth } from "../lib/auth";
import { HttpError } from "../lib/http-error";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// CSRF protection for cookie-authenticated application mutations, including
// DELETE. Better Auth guards its own /api/auth endpoints; this covers ours
// with the same trustedOrigins and the same pattern matching.
//
// The mobile app's native requests carry no Origin header, so apiFetch (like
// the Better Auth Expo client) sends expo-origin: `<scheme>://`, or exp://…
// from Expo Go. A browser always sends its real Origin, which wins, so a web
// page cannot pass by adding expo-origin. Command-line clients must set one.
export const requireTrustedOrigin: RequestHandler = async (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get("origin") ?? req.get("expo-origin");
  const context = await auth.$context;
  if (
    !origin ||
    !context.isTrustedOrigin(origin, { allowRelativePaths: false }) ||
    req.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(
      403,
      "FORBIDDEN_ORIGIN",
      "Send this request from the app's configured origin.",
    );
  next();
};
