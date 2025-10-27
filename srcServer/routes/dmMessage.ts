
import express, { type Router, type Request, type Response } from "express";
import { db, tableName } from "../data/dynamoDb.js";
import { ScanCommand, type ScanCommandOutput, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { ResponseMessage } from "../data/types.js";


import { authMiddleware } from "../data/middleware.js";
import { createDmSchema } from "../data/validation.js";
import { validateBody } from "../data/middleware.js";

const router: Router = express.Router();

// GET /api/messages


 //Hämta alla direktmeddelanden, items där PK börjar med "MSG#"
 
router.get("/", async (_req: Request, res: Response<any[] | ResponseMessage>) => {
  try {
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression: "begins_with(PK, :prefix)",
      ExpressionAttributeValues: {
        ":prefix": "MSG#",              
      },
    });

    const result: ScanCommandOutput = await db.send(command);

    if (!result.Items || result.Items.length === 0) {
      return res.status(404).send({ message: "Inga meddelanden hittades" });
    }

    // Sortera på SK Timestamp# 
    const sorted = [...result.Items].sort((a, b) =>
      String(b.SK ?? "").localeCompare(String(a.SK ?? ""))
    );

    return res.status(200).send(sorted);
  } catch (err) {
    console.error("Failed to scan messages:", err);
    return res.status(500).send({ message: "Internt serverfel" });
  }
});

router.post(
  "/",
  authMiddleware,               
  validateBody(createDmSchema), 
  async (req: Request, res: Response) => {
    try {
      //  body (redan validerade av zod)
      const { content, receiverId } = req.body;
      const senderId = String(req.userId);

      // extra säkerhet
      if (typeof req.userId !== "string") {
        return res.status(401).send({ message: "Ingen giltig användaridentitet i token" });
      }

      // så man inte skickar till sig själv
      if (senderId === receiverId) {
        return res.status(400).send({ message: "Du kan inte skicka meddelande till dig själv" });
      }

      // kolla att receiver finns
      const checkReceiver = new GetCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${receiverId}`,
          SK: "METADATA",
        },
      });

      const receiverResult = await db.send(checkReceiver);
      if (!receiverResult.Item) {
        return res.status(404).send({ message: "Mottagaren hittades inte" });
      }

      // skapa PK och SK
      const [A, B] = [senderId, receiverId].sort((x, y) => x.localeCompare(y));
      const pk = `MSG#${A}#${B}`;
      const sk = `Timestamp#${new Date().toISOString()}`;

      // nytt meddelande
      const item = {
        PK: pk,
        SK: sk,
        content,
        senderId,
        receiverId,
        type: "MESSAGE",
      };

      // spara i DynamoDB
      await db.send(
        new PutCommand({
          TableName: tableName,
          Item: item,
        })
      );

      return res.status(201).send({
        success: true,
        message: "Meddelande skickat",
        data: item,
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      return res.status(500).send({
        success: false,
        message: "Internt serverfel vid skick av meddelande",
      });
    }
  }
);

export default router;


