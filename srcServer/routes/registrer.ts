
import express, { type Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { randomUUID } from "crypto";

import { db, tableName } from "../data/dynamoDb.js";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

import { signUpSchema, jwtPayloadSchema } from "../data/validation.js";
import { validateBody } from "../data/middleware.js";
import type { User, ResponseMessage } from "../data/types.js";

const router: Router = express.Router();

const RAW_SECRET = process.env.JWT_SECRET;
if (!RAW_SECRET) {
  throw new Error("JWT_SECRET saknas");
}
const JWT_SECRET = RAW_SECRET;


function signJwt(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
}


const normalizeUsername = (u: string) => u.trim().toLowerCase();



//  lyckad register
type RegisterOk = {
  message: string;
  token: string;
  user: {
    userId: string;
    username: string;
    accessLevel: string;
    type: string;
  };
};


router.post(
  "/register",
  validateBody(signUpSchema),
  async (req: Request, res: Response<RegisterOk | ResponseMessage>) => {
    try {
      const { username, password } = req.body as z.infer<typeof signUpSchema>;
      const normalized = normalizeUsername(username);

      // userId 
      const userId = randomUUID();

      // hash
      const passwordHash = await bcrypt.hash(password, 10);

      // user-item 
      const newUser: User = {
        PK: `USER#${userId}`,
        SK: "METADATA",
        userId,
        username: normalized,         // spara normaliserad variant
        accessLevel: "user",
        type: "USER",
        passwordHash,
      };

      // lookup-item: username = userId (för login utan Query eller Scan)
      const usernameLookupItem = {
        PK: `USERNAME#${normalized}`,
        SK: "METADATA",
        userId,
      };

      // lookup först, för att kolla att användaren är helt unik, sedan user
      const putLookup = new PutCommand({
        TableName: tableName,
        Item: usernameLookupItem,
        ConditionExpression: "attribute_not_exists(PK)", 
      });
      await db.send(putLookup);

      const putUser = new PutCommand({
        TableName: tableName,
        Item: newUser,
        ConditionExpression: "attribute_not_exists(PK)", 
      });
      await db.send(putUser);

      // JWT matchar mot schema
      const token = signJwt(userId);
      const decoded = jwt.verify(token, JWT_SECRET);
      const parsed = jwtPayloadSchema.safeParse(decoded);
      if (!parsed.success) {
        return res.status(500).send({ message: "Kunde inte signera token korrekt" });
      }

      // svar
      return res.status(201).send({
        message: "Användare skapad",
        token,
        user: {
          userId,
          username: newUser.username,
          accessLevel: newUser.accessLevel,
          type: newUser.type,
        },
      });
    } catch (error: any) {
      if (
        error?.name === "ConditionalCheckFailedException" // username upptaget
      ) {
        return res.status(409).send({ message: "Användaren finns redan" });
      }
      console.error("Error vid registrering:", error);
      return res
        .status(500)
        .send({ message: "Internt serverfel vid registrering" });
    }
  }
);

export default router;
