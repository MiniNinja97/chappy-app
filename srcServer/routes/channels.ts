import express, { type Router, type Request, type Response } from "express";
import { db, tableName } from "../data/dynamoDb.js";
import { GetCommand, PutCommand, DeleteCommand, ScanCommand, type ScanCommandOutput } from "@aws-sdk/lib-dynamodb";
import { authMiddleware, validateBody } from "../data/middleware.js";
import { channelSchema } from "../data/validation.js";
import { randomUUID } from "crypto";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

const router: Router = express.Router();

// Hämta alla kanaler
router.get("/", async (_req: Request, res: Response) => {
  try {
    const scan = new ScanCommand({
      TableName: tableName,
      FilterExpression: "begins_with(PK, :p) AND SK = :meta",
      ExpressionAttributeValues: {
        ":p": "CHANNEL#",
        ":meta": "CHANNELMETA",
      },
    });

    const result: ScanCommandOutput = await db.send(scan);

    if (!result.Items || result.Items.length === 0) {
      return res.status(404).send({ message: "Inga kanaler hittades" });
    }

    const items = [...result.Items].sort((a, b) =>
      String(a.channelName ?? a.PK).localeCompare(String(b.channelName ?? b.PK))
    );

    return res.status(200).send(items);
  } catch (err) {
    console.error("Fel vid hämtning av kanaler:", err);
    return res.status(500).send({ message: "Internt serverfel vid hämtning av kanaler" });
  }
});

// Hämta en kanal och alla dess meddelanden
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Hämta kanalens metadata
    const getMeta = new GetCommand({
      TableName: tableName,
      Key: { PK: `CHANNEL#${id}`, SK: "CHANNELMETA" },
    });

    const metaResult = await db.send(getMeta);

    if (!metaResult.Item) {
      return res.status(404).send({ message: "Kanalen hittades inte" });
    }

    // Hämta alla meddelanden i kanalen
    const query = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :t)",
      ExpressionAttributeValues: {
        ":pk": `CHANNEL#${id}`,
        ":t": "Timestamp#",
      },
    });

    const messagesResult = await db.send(query);
    const messages = messagesResult.Items ?? [];

    return res.status(200).send({
      channel: metaResult.Item,
      messages,
    });
  } catch (err) {
    console.error("Fel vid hämtning av kanal och meddelanden:", err);
    return res.status(500).send({ message: "Internt serverfel" });
  }
});

// Skapa ny kanal
router.post(
  "/",
  authMiddleware,
  validateBody(channelSchema),
  async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body as { name: string; description?: string };

      if (typeof req.userId !== "string") {
        return res.status(401).send({ message: "Ingen giltlig token" });
      }

      const creatorId = req.userId;
      const channelId = randomUUID();

      const item = {
        PK: `CHANNEL#${channelId}`,
        SK: "CHANNELMETA",
        type: "CHANNEL",
        channelId,
        channelName: name,
        access: "public",
        creatorId,
        creatorPK: `USER#${creatorId}`,
        description: description ?? null,
      };

      await db.send(
        new PutCommand({
          TableName: tableName,
          Item: item,
          ConditionExpression: "attribute_not_exists(PK)",
        })
      );

      return res.status(201).send({
        message: "Kanal skapad",
        channel: item,
      });
    } catch (err: any) {
      if (err?.name === "ConditionalCheckFailedException") {
        return res.status(409).send({ message: "Kunde inte skapa en ny kanal" });
      }
      console.error("Fel vid kanal-skapande:", err);
      return res.status(500).send({ message: "Internt serverfel när man skapar kanal" });
    }
  }
);

// Ta bort kanal (endast skaparen)
router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Hämta först för att kolla behörighet
    const found = await db.send(
      new GetCommand({
        TableName: tableName,
        Key: { PK: `CHANNEL#${id}`, SK: "CHANNELMETA" },
      })
    );

    if (!found.Item) {
      return res.status(404).send({ message: "Kanalen hittades inte" });
    }

    const creatorId = String(found.Item.creatorId ?? "");
    if (typeof req.userId !== "string" || creatorId !== req.userId) {
      return res.status(403).send({ message: "Det finns inte behörighet att ta bort kanalen" });
    }

    await db.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { PK: `CHANNEL#${id}`, SK: "CHANNELMETA" },
        ConditionExpression: "attribute_exists(PK)",
      })
    );

    return res.status(200).send({ message: "Kanalen är borttagen" });
  } catch (err: any) {
    if (err?.name === "ConditionalCheckFailedException") {
      return res.status(404).send({ message: "Kanalen fanns inte" });
    }
    console.error("Fel vid radering av kanal:", err);
    return res.status(500).send({ message: "Internt serverfel vid radering av kanal" });
  }
});

export default router;