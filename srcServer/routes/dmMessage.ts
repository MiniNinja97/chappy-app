
// routes/dmMessage.ts
import express, { type Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { db, tableName } from "../data/dynamoDb.js";
import { ScanCommand, PutCommand, GetCommand, type ScanCommandOutput } from "@aws-sdk/lib-dynamodb";
import { validateBody } from "../data/middleware.js";
import { createDmSchema } from "../data/validation.js"; // vi utökar denna nedan
import type { ResponseMessage } from "../data/types.js";

const router: Router = express.Router();

const RAW_SECRET = process.env.JWT_SECRET;
if (!RAW_SECRET) throw new Error("JWT_SECRET saknas");
const JWT_SECRET = RAW_SECRET;

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

// --- GET /api/messages (oförändrad) ---
router.get("/", async (_req: Request, res: Response<any[] | ResponseMessage>) => {
  try {
    const result: ScanCommandOutput = await db.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "begins_with(PK, :prefix)",
        ExpressionAttributeValues: { ":prefix": "MSG#" },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return res.status(404).send({ message: "Inga meddelanden hittades" });
    }

    const sorted = [...result.Items].sort((a, b) =>
      String(b.SK ?? "").localeCompare(String(a.SK ?? ""))
    );
    return res.status(200).send(sorted);
  } catch (err) {
    console.error("Failed to scan messages:", err);
    return res.status(500).send({ message: "Internt serverfel" });
  }
});

// --- POST /api/messages (JWT frivilligt + guestId stöds) ---
router.post(
  "/",
  validateBody(createDmSchema),   // se ändring i validation.ts nedan
  async (req: Request, res: Response) => {
    try {
      const jwtUserId = getUserIdFromAuthHeader(req); // kan vara null
      const { content, receiverId, guestId } = req.body as {
        content: string;
        receiverId: string;
        guestId?: string;
      };

      // säkerhet: receiver måste finnas
      const receiver = await db.send(
        new GetCommand({ TableName: tableName, Key: { PK: `USER#${receiverId}`, SK: "METADATA" } })
      );
      if (!receiver.Item) {
        return res.status(404).send({ message: "Mottagaren hittades inte" });
      }

      // bestäm senderId
      const senderId =
        jwtUserId ??
        (guestId && guestId.trim() ? `GUEST#${guestId.trim()}` : null);

      if (!senderId) {
        return res
          .status(400)
          .send({ message: "Saknar identitet: ange guestId i body eller skicka JWT." });
      }

      if (senderId === receiverId) {
        return res.status(400).send({ message: "Du kan inte skicka meddelande till dig själv" });
      }

      // PK/ SK för konversation (sortera A, B för stabil nyckel)
      const [A, B] = [senderId, receiverId].sort((x, y) => x.localeCompare(y));
      const pk = `MSG#${A}#${B}`;
      const sk = `Timestamp#${new Date().toISOString()}`;

      const item = { PK: pk, SK: sk, content, senderId, receiverId, type: "MESSAGE" };

      await db.send(new PutCommand({ TableName: tableName, Item: item }));

      return res.status(201).send({
        success: true,
        message: "Meddelande skickat",
        data: item,
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      return res
        .status(500)
        .send({ success: false, message: "Internt serverfel vid skick av meddelande" });
    }
  }
);

export default router;



