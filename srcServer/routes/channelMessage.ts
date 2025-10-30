import express, { type Router, type Request, type Response } from "express";
import { db, tableName } from "../data/dynamoDb.js";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  type ScanCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import { authMiddleware, validateBody } from "../data/middleware.js";
import { channelMessageSchema } from "../data/validation.js";
import { z } from "zod";
import type { Channel, ChannelMessage, ResponseMessage} from "../data/types.js";
import { createChannelMessageSchema } from "../data/validation.js";

const router: Router = express.Router();

//hämtar alla kanal meddelanden
router.get("/", async (_req: Request, res: Response< ChannelMessage[] | ResponseMessage>) => {
  try {
    const scan = new ScanCommand({
      TableName: tableName,
      FilterExpression: "begins_with(PK, :p)",
      ExpressionAttributeValues: { ":p": "CHANNELMSG#" },
    });

    const result: ScanCommandOutput = await db.send(scan);
    const items = result.Items ?? [];

    // Sortera nyast först 
    const sorted = items.sort((a, b) =>
      String(b.SK ?? "").localeCompare(String(a.SK ?? ""))
    );

    return res.status(200).send(sorted as ChannelMessage[]);
  } catch (err) {
    console.error("Fel vid hämtning av alla kanalmeddelanden:", err);
    return res.status(500).send({ message: "Internt serverfel" });
  }
});


router.get("/:channelId", async (req: Request, res: Response<{ channel: Channel; messages: ChannelMessage[] } | ResponseMessage>) => {
  try {
    const { channelId } = req.params;

    // Hämta kanalens metadata
    const getMeta = new GetCommand({
      TableName: tableName,
      Key: { PK: `CHANNEL#${channelId}`, SK: "CHANNELMETA" },
    });
    const meta = await db.send(getMeta);
    if (!meta.Item) {
      return res.status(404).send({ message: "Kanalen hittades inte" });
    }

    // Hämta alla meddelanden i kanalen
    const query = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :ts)",
      ExpressionAttributeValues: {
        ":pk": `CHANNELMSG#${channelId}`,
        ":ts": "Timestamp#",
      },
    });

    const result = await db.send(query);
    const messages = (result.Items ?? []).sort((a, b) =>
      String(b.SK ?? "").localeCompare(String(a.SK ?? ""))
    );

    return res.status(200).send({
      channel: meta.Item as Channel,
      messages: messages as ChannelMessage[],
    });
  } catch (err) {
    console.error("Fel vid hämtning av kanalens meddelanden:", err);
    return res.status(500).send({ message: "Internt serverfel" });
  }
});

//Skapar nytt kanalmeddelande
router.post(
  "/",
  authMiddleware,
  validateBody(createChannelMessageSchema), // <-- byt schema här
  async (req, res) => {
    try {
      const { channelId, content } = req.body as z.infer<typeof createChannelMessageSchema>;

      if (typeof req.userId !== "string") {
        return res.status(401).send({ message: "Ingen giltig användaridentitet i token" });
      }

      // Verifiera att kanalen finns
      const meta = await db.send(new GetCommand({
        TableName: tableName,
        Key: { PK: `CHANNEL#${channelId}`, SK: "CHANNELMETA" },
      }));
      if (!meta.Item) {
        return res.status(404).send({ message: "Kanalen hittades inte" });
      }

      const pk = `CHANNELMSG#${channelId}`;
      const sk = `Timestamp#${new Date().toISOString()}`;

      const item = {
        PK: pk,
        SK: sk,
        content,
        receiverId: channelId,          // sätts server-side
        senderId: req.userId,           // sätts server-side från token
        type: "MESSAGE",
      };

      await db.send(new PutCommand({ TableName: tableName, Item: item }));

      return res.status(201).send({ message: "Kanalmeddelande sparat", data: item });
    } catch (err) {
      console.error("Fel vid skapande av kanalmeddelande:", err);
      return res.status(500).send({ message: "Internt serverfel" });
    }
  }
);

export default router;
