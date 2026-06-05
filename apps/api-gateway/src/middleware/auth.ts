import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { JWTPayload } from "@sprintpulse/shared-types";

const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key?.getPublicKey());
  });
}

export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
}

const DEV_USER: JWTPayload = {
  sub: "dev-user",
  email: "dev@sprintpulse.local",
  role: "admin",
  workspace_id: process.env.DEFAULT_WORKSPACE_ID ?? "",
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== "production") {
    (req as AuthenticatedRequest).user = DEV_USER;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: { code: "AUTH_TOKEN_MISSING", message: "Bearer token required" } });
  }

  const token = authHeader.slice(7);
  jwt.verify(token, getKey, {
    audience: process.env.AUTH0_AUDIENCE,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    algorithms: ["RS256"],
  }, (err, decoded) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: { code: "AUTH_TOKEN_EXPIRED", message: "JWT has expired" } });
      }
      return res.status(401).json({ error: { code: "AUTH_INVALID_TOKEN", message: "Invalid token" } });
    }
    (req as AuthenticatedRequest).user = decoded as JWTPayload;
    next();
  });
}

export function requireRole(...roles: JWTPayload["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: { code: "INSUFFICIENT_SCOPE", message: "Insufficient permissions" } });
    }
    next();
  };
}

export function requireInternalApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-internal-api-key"];
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected || key !== expected) {
    return res.status(401).json({ error: { code: "INTERNAL_KEY_INVALID", message: "Invalid internal API key" } });
  }
  next();
}
