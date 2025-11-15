import express, { type Router, type Request, type Response } from "express";
import { db, tableName } from "../data/dynamoDb.js";
import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
  type ScanCommandOutput,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { authMiddleware, validateBody } from "../data/middleware.js";
import { channelSchema } from "../data/validation.js";
import { randomUUID } from "crypto";
import { z } from "zod";

const router: Router = express.Router();

//Zod-schema för hur en kanalpost ser ut i databasen

export const channelMetaSchema = z.object({
  PK: z.string().startsWith("CHANNEL#"),
  SK: z.literal("CHANNELMETA"),
  type: z.literal("CHANNEL"),
  channelId: z.string(),
  channelName: z.string(),
  access: z.union([z.literal("public"), z.literal("locked")]),
  creatorId: z.string(),
  creatorPK: z.string().startsWith("USER#"),
  description: z.string().nullable().optional(),
});

export type ChannelMeta = z.infer<typeof channelMetaSchema>;

//Hjälpfunktion för sortering

function sortChannels(items: ChannelMeta[]): ChannelMeta[] {
  return [...items].sort((a, b) =>
    String(a.channelName ?? a.PK).localeCompare(String(b.channelName ?? b.PK))
  );
}

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
    const rawItems = result.Items ?? [];

    const normalized = rawItems.map((item: any) => {
      const creatorPK =
        typeof item.creatorPK === "string"
          ? item.creatorPK.startsWith("USER#")
            ? item.creatorPK
            : `USER#${item.creatorPK}`
          : "USER#UNKNOWN"; 

      return { ...item, creatorPK };
    });

    const validItems = normalized.flatMap((i) => {
      const parsed = channelMetaSchema.safeParse(i);
      if (!parsed.success) {
        console.warn(
          "Ogiltig kanal hittades och hoppades över:",
          parsed.error.format()
        );
        return [];
      }
      return [parsed.data];
    });

    // Sorterar som tidigare
    const sorted = sortChannels(validItems);

    return res.status(200).send(sorted);
  } catch (err) {
    console.error("Fel vid hämtning av kanaler:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return res
      .status(500)
      .send({
        message: "Internt serverfel vid hämtning av kanaler",
        detail: msg,
      });
  }
});

//Hämta alla kanaler skapade av inloggad användare

router.get("/mine", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (typeof req.userId !== "string") {
      return res.status(401).send({ message: "Ingen giltlig token" });
    }

    const scan = new ScanCommand({
      TableName: tableName,
      FilterExpression:
        "begins_with(PK, :p) AND SK = :meta AND creatorId = :uid",
      ExpressionAttributeValues: {
        ":p": "CHANNEL#",
        ":meta": "CHANNELMETA",
        ":uid": req.userId,
      },
    });

    const result = await db.send(scan);
    // Validerar alla poster mot Zod-schema
    const items = (result.Items ?? []).map((i) => channelMetaSchema.parse(i));

    const sorted = sortChannels(items);
    return res.status(200).send(sorted);
  } catch (err) {
    console.error("Fel vid hämtning av mina kanaler:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).send({
      message: "Internt serverfel vid hämtning av dina kanaler",
      detail: msg,
    });
  }
});

//Hämta en kanal och alla dess meddelanden

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

    // Validerar posten med Zod
    const meta = channelMetaSchema.parse(metaResult.Item);

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
      channel: meta,
      messages,
    });
  } catch (err) {
    console.error("Fel vid hämtning av kanal och meddelanden:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).send({ message: "Internt serverfel", detail: msg });
  }
});

//Skapa ny kanal

router.post(
  "/",
  authMiddleware,
  validateBody(channelSchema),
  async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        access = "public",
      } = req.body as {
        name: string;
        description?: string;
        access?: "public" | "locked";
      };

      if (typeof req.userId !== "string") {
        return res.status(401).send({ message: "Ingen giltlig token" });
      }

      const creatorId = req.userId;
      const channelId = randomUUID();

      const item: ChannelMeta = {
        PK: `CHANNEL#${channelId}`,
        SK: "CHANNELMETA",
        type: "CHANNEL",
        channelId,
        channelName: name,
        access: access === "locked" ? "locked" : "public",
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

      return res.status(201).send({ message: "Kanal skapad", channel: item });
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        (err as { name?: string }).name === "ConditionalCheckFailedException"
      ) {
        return res
          .status(409)
          .send({ message: "Kunde inte skapa en ny kanal" });
      }
      console.error("Fel vid kanal-skapande:", err);
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).send({
        message: "Internt serverfel när man skapar kanal",
        detail: msg,
      });
    }
  }
);

//Ta bort kanal (endast skaparen)

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

    // Validerar posten mot Zod
    const meta = channelMetaSchema.parse(found.Item);

    const creatorId = meta.creatorId;
    if (typeof req.userId !== "string" || creatorId !== req.userId) {
      return res
        .status(403)
        .send({ message: "Det finns inte behörighet att ta bort kanalen" });
    }

    await db.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { PK: `CHANNEL#${id}`, SK: "CHANNELMETA" },
        ConditionExpression: "attribute_exists(PK)",
      })
    );

    return res.status(200).send({ message: "Kanalen är borttagen" });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { name?: string }).name === "ConditionalCheckFailedException"
    ) {
      return res.status(404).send({ message: "Kanalen fanns inte" });
    }
    console.error("Fel vid radering av kanal:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).send({
      message: "Internt serverfel vid radering av kanal",
      detail: msg,
    });
  }
});

export default router;
