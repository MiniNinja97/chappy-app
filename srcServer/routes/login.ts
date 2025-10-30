
import express, { type Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { db, tableName } from "../data/dynamoDb.js";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

import { loginSchema, jwtPayloadSchema } from "../data/validation.js";
import { validateBody } from "../data/middleware.js";
import type { User } from "../data/types.js";

const router: Router = express.Router();

const RAW_SECRET = process.env.JWT_SECRET;
if (!RAW_SECRET) {
  throw new Error("JWT_SECRET saknas");
}
const JWT_SECRET = RAW_SECRET;


function signJwt(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
}
const normalize = (s: string) => s.trim().toLowerCase();




router.post(
  "/login",
  validateBody(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body as z.infer<typeof loginSchema>;
      const normalized = normalize(username);

      // Hämta userId via username-lookup
      const getLookup = new GetCommand({
        TableName: tableName,
        Key: { PK: `USERNAME#${normalized}`, SK: "METADATA" },
      });
      const lookupRes = await db.send(getLookup);
      if (!lookupRes.Item) {
        return res.status(401).send({ message: "Fel användarnamn eller lösenord" });
      }
      const userId: string =
        (lookupRes.Item as any).userId ?? (lookupRes.Item as any).userId;

      // hämta användaren via userId
      const getUser = new GetCommand({
        TableName: tableName,
        Key: { PK: `USER#${userId}`, SK: "METADATA" },
      });
      const userRes = await db.send(getUser);
      if (!userRes.Item) {
       
        return res.status(500).send({ message: "Inkonsistent användardata" });
      }
      const user = userRes.Item as User;

      //Verifiera lösenord
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).send({ message: "Fel användarnamn eller lösenord" });
      }

      // Gör token
      const token = signJwt(user.userId ?? (user as any).UserId);

      // (valfritt) matchar med jwtPayloadSchema
      const decoded = jwt.verify(token, JWT_SECRET);
      const parsed = jwtPayloadSchema.safeParse(decoded);
      if (!parsed.success) {
        return res.status(500).send({ message: "Kunde inte signera token korrekt" });
      }

      return res.status(200).send({
        message: "Inloggad",
        token,
        user: {
          userId: user.userId ?? (user as any).userId,
          username: user.username,
          accessLevel: user.accessLevel,
          type: user.type,
        },
      });
    } catch (err) {
      console.error("Fel vid login:", err);
      return res.status(500).send({ message: "Internt serverfel" });
    }
  }
);

export default router;
