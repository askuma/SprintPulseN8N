import { Router } from "express";
import axios from "axios";
import { z } from "zod";

export const authRouter = Router();

const TokenRequestSchema = z.object({
  code: z.string().min(1),
  redirect_uri: z.string().url(),
});

authRouter.post("/token", async (req, res) => {
  const body = TokenRequestSchema.parse(req.body);

  const response = await axios.post(
    `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
    {
      grant_type: "authorization_code",
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      code: body.code,
      redirect_uri: body.redirect_uri,
    },
    { headers: { "Content-Type": "application/json" } }
  );

  res.json({
    access_token: response.data.access_token,
    expires_in: response.data.expires_in,
    refresh_token: response.data.refresh_token,
  });
});

authRouter.post("/refresh", async (req, res) => {
  const { refresh_token } = z.object({ refresh_token: z.string() }).parse(req.body);

  const response = await axios.post(
    `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
    {
      grant_type: "refresh_token",
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      refresh_token,
    },
    { headers: { "Content-Type": "application/json" } }
  );

  res.json({
    access_token: response.data.access_token,
    expires_in: response.data.expires_in,
  });
});
