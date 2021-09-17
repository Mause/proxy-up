import "reflect-metadata";
import { factory } from "vercel-jwt-auth";
import { VercelApiHandler, VercelRequest, VercelResponse } from "@vercel/node";

export default (handler: VercelApiHandler) =>
  async (req: VercelRequest, res: VercelResponse) => {
    const authenticate = factory(process.env.JWT_SECRET!)(handler);

    if (req.method === "OPTIONS") return res.status(200).json({});

    return await authenticate(req, res);
  };
