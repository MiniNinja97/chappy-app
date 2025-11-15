import express from "express";
import type { Router, Request, Response } from "express";
import { db, tableName } from "../data/dynamoDb.js";
import {
  DeleteCommand,
  ScanCommand,
  GetCommand,
  type ScanCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import type { User, ResponseMessage } from "../data/types.js";
import { userIdParamSchema } from "../data/validation.js";
import { authMiddleware } from "../data/middleware.js";

const router: Router = express.Router();

// Hjälptyp för att få typad req.userId från authMiddleware
type AuthedRequest = Request & { userId?: string };

// GET /api/users - hämtar alla användare
router.get(
  "/",
  async (req: Request, res: Response<User[] | ResponseMessage>) => {
    try {
      const command = new ScanCommand({
        TableName: tableName,
        FilterExpression: "SK = :sk",
        ExpressionAttributeValues: {
          ":sk": "METADATA",
        },
      });

      const result: ScanCommandOutput = await db.send(command);
      if (!result.Items || result.Items.length === 0) {
        return res.status(404).send({ message: "Inga users hittades" });
      }

      const users: User[] = result.Items as User[];
      res.status(200).send(users);
    } catch (err) {
      console.error("Failed to scan users:", err);
      res.status(500).send({ message: "Internt serverfel" });
    }
  }
);

// DELETE /api/users/me – radera inloggat konto
router.delete(
  "/me",
  authMiddleware,
  async (req: AuthedRequest, res: Response<ResponseMessage>) => {
    try {
      const uid = req.userId;
      if (typeof uid !== "string" || uid.length === 0) {
        return res.status(401).send({ message: "Ingen giltlig token" });
      }

      // Finns användaren?
      const getRes = await db.send(
        new GetCommand({
          TableName: tableName,
          Key: { PK: `USER#${uid}`, SK: "METADATA" },
        })
      );
      if (!getRes.Item) {
        return res.status(404).send({ message: "Användaren hittades inte" });
      }

      // Ta bort metadata-posten
      await db.send(
        new DeleteCommand({
          TableName: tableName,
          Key: { PK: `USER#${uid}`, SK: "METADATA" },
          ConditionExpression: "attribute_exists(PK)",
        })
      );

      return res.status(200).send({ message: "Ditt konto har raderats" });
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        (err as { name?: string }).name === "ConditionalCheckFailedException"
      ) {
        return res.status(404).send({ message: "Användare hittades inte" });
      }
      console.error("Fel vid radering av inloggat konto:", err);
      return res.status(500).send({ message: "Internt serverfel" });
    }
  }
);

// Skydda DELETE /:id så endast ägaren kan radera sitt konto
// router.delete('/:id', authMiddleware, async (req: AuthedRequest, res: Response<ResponseMessage>) => {
//   try {
//     const { id } = userIdParamSchema.parse(req.params);
//     const uid = req.userId;

//     if (typeof uid !== 'string' || uid.length === 0) {
//       return res.status(401).send({ message: 'Ingen giltlig token' });
//     }

//     // Tillåt bara att man raderar sig själv
//     if (uid !== id) {
//       return res.status(403).send({ message: 'Du får inte radera denna användare' });
//     }

//     await db.send(
//       new DeleteCommand({
//         TableName: tableName,
//         Key: { PK: `USER#${id}`, SK: 'METADATA' },
//         ConditionExpression: 'attribute_exists(PK)',
//       })
//     );

//     res.status(200).send({ message: 'Användare raderad' });
//   } catch (err) {
//     if (
//       typeof err === 'object' &&
//       err !== null &&
//       (err as { name?: string }).name === 'ZodError'
//     ) {
//       return res.status(400).json({ message: 'Ogiltigt userId' });
//     }
//     if (
//       typeof err === 'object' &&
//       err !== null &&
//       (err as { name?: string }).name === 'ConditionalCheckFailedException'
//     ) {
//       return res.status(404).send({ message: 'Användare hittades inte' });
//     }
//     console.error('Fel vid radering av användare:', err);
//     res.status(500).send({ message: 'Internt serverfel' });
//   }
// });

export default router;
