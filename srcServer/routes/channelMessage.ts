import express, { type Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { db, tableName } from "../data/dynamoDb.js";
import {
  ScanCommand,
  QueryCommand,
  PutCommand,
  GetCommand,
  type ScanCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import { validateBody } from "../data/middleware.js";
import { createChannelMessageSchema } from "../data/validation.js";
import type { ResponseMessage } from "../data/types.js";

const router: Router = express.Router();


const RAW_SECRET = process.env.JWT_SECRET;
if (!RAW_SECRET) throw new Error("JWT_SECRET saknas");
const JWT_SECRET = RAW_SECRET;

//hjälpfunktion returnerar userId  om token är giltig, Returnerar null om header saknas, är felaktig eller JWT saknas
function getUserIdFromAuthHeader(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string };
    return typeof decoded.userId === "string" ? decoded.userId : null;
  } catch {
    return null;
  }
}

//Hjälpfunktion hämta kanalens metadata från dynamo, returnerar objektet eller null om kanalen inte finns
async function getChannelMeta(channelId: string) {
  const meta = await db.send(
    new GetCommand({
      TableName: tableName,
      Key: { PK: `CHANNEL#${channelId}`, SK: "CHANNELMETA" },
    })
  );
  return (meta.Item as null | { access?: "public" | "locked"; [k: string]: any }) ?? null;
}


router.get("/", async (_req: Request, res: Response<any[] | ResponseMessage>) => {
  try {
    const scan = new ScanCommand({
      TableName: tableName,
      FilterExpression: "begins_with(PK, :p)",
      ExpressionAttributeValues: { ":p": "CHANNELMSG#" },
    });

    const result: ScanCommandOutput = await db.send(scan);
    const items = (result.Items ?? []).sort((a, b) =>
      String(b.SK ?? "").localeCompare(String(a.SK ?? ""))
    );

    return res.status(200).send(items);
  } catch (err) {
    console.error("Fel vid hämtning av alla kanalmeddelanden:", err);
    return res.status(500).send({ message: "Internt serverfel" });
  }
});

//Öppna kanaler (public): alla får läsa Låsta kanaler (locked): kräver JWT 
 
 
 
 
router.get("/:channelId", async (req: Request, res: Response) => {
  try {
    // Säkerställ att channelId är en sträng 
    const { channelId } = req.params as { channelId: string };
    if (!channelId) {
      return res.status(400).send({ message: "Saknar channelId" });
    }

    // Hämta metadata för kanalen 
    const meta = await getChannelMeta(channelId);
    if (!meta) {
      return res.status(404).send({ message: "Kanalen hittades inte" });
    }

    const jwtUserId = getUserIdFromAuthHeader(req);
    const access = meta.access ?? "public"; // defaulta till public om fältet saknas
    const isLocked = access === "locked";

    // Om kanalen är låst kräver vi att användaren är inloggad 
    if (isLocked && !jwtUserId) {
      return res
        .status(401)
        .send({ message: "Den här kanalen är låst. Logga in för att se innehållet." });
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
    // Sortera stigande på SK 
    const messages = (result.Items ?? []).sort((a, b) =>
      String(a.SK ?? "").localeCompare(String(b.SK ?? ""))
    );

    return res.status(200).send({
      channel: { ...meta, channelId }, // skicka tillbaka meta + id
      messages,
    });
  } catch (err) {
    console.error("Fel vid hämtning av kanalens meddelanden:", err);
    return res.status(500).send({ message: "Internt serverfel" });
  }
});


  

 
 
 
router.post(
  "/",
  validateBody(createChannelMessageSchema), // validera att vi har { channelId, content }
  async (req: Request, res: Response) => {
    try {
      const { channelId, content } = req.body as { channelId: string; content: string };

      if (!channelId) {
        return res.status(400).send({ message: "Saknar channelId" });
      }

      // Hämta meta för att veta om kanalen är public eller locked
      const meta = await getChannelMeta(channelId);
      if (!meta) {
        return res.status(404).send({ message: "Kanalen hittades inte" });
      }

      const jwtUserId = getUserIdFromAuthHeader(req);
      const access = meta.access ?? "public";
      const isLocked = access === "locked";

      // Låst kanal kräver JWT
      if (isLocked && !jwtUserId) {
        return res
          .status(401)
          .send({ message: "Den här kanalen är låst. Logga in för att skriva." });
      }

      // Bestäm avsändare
      // public: JWT-userId om inloggad annars "GUEST"
      // locked: JWT-userId 
      const senderId = isLocked ? (jwtUserId as string) : (jwtUserId ?? "GUEST");

      // Spara med PK/ SK där SK är tidsstämpel (sorterbar)
      const pk = `CHANNELMSG#${channelId}`;
      const sk = `Timestamp#${new Date().toISOString()}`;

      const item = {
        PK: pk,
        SK: sk,
        content,
        receiverId: channelId, // mottagare = kanalen
        senderId,              // avsändare = JWT-user eller "GUEST"
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


