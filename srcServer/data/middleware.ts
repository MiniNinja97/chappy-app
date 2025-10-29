

import type { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { ZodSchema } from "zod";
import { jwtPayloadSchema } from "./validation.js";
import z from "zod";


export const logger: RequestHandler = (req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
};

// Ladda JWT hemlig nyckel 
 
const RAW_SECRET = process.env.JWT_SECRET;
if (!RAW_SECRET) {
  throw new Error("JWT_SECRET saknas");
}
const JWT_SECRET: string = RAW_SECRET;


export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.header("Authorization");

  // Kontrollera att headern finns och börjar med "Bearer "
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).send({ message: "Du måste vara inloggad för att se detta" });
    return;
  }

  // Ta ut token-delen, tar bort Bearer 7 tecken
  const token = authHeader.substring(7);

  try {
    // Verifiera token
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded === "string") {
      res.status(401).send({ message: "Ogiltig token" });
      return;
    }

    // Validera payloaden med Zod
    const parsed = jwtPayloadSchema.safeParse(decoded);
    if (!parsed.success) {
      res.status(401).send({ message: "Ogiltig token" });
      return;
    }

    // Spara userId på req
    req.userId = parsed.data.userId;

    next(); 
  } catch (error: any) {
    if (error?.name === "TokenExpiredError") {
      res.status(401).send({ message: "Token har gått ut" });
      return;
    }
    res.status(401).send({ message: "Ogiltig eller utgången token" });
  }
}

// validering med zod
export const validateBody = (schema: ZodSchema): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).send({
        success: false,
        message: "Valideringsfel",
        errors: z.flattenError(result.error)
      });
      return;
    }
    req.body = result.data;
    next();
  };
};

//Response-validering 
 
export const validateResponse = (schema: ZodSchema, data: unknown, res: Response): boolean => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.log("Response valideringsfel: ", parsed.error.format());
    res.status(500).send({ success: false, message: "Serverfel vid servergenerering" });
    return false;
  }
  res.send(parsed.data);
  return true;
};
