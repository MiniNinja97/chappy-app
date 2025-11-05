

import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import { logger } from "./data/middleware.js";
import userRouter from "./routes/users.js";
import registrerRouter from "./routes/registrer.js";
import loginRouter from "./routes/login.js";
import dmMessagesRouter from "./routes/dmMessage.js";
import channelsRouter from "./routes/channels.js";
import channelMessagesRouter from "./routes/channelMessage.js";

const app: Express = express();

// Backendporten på 1337
const port: number = Number(process.env.PORT) || 1337;
const jwtSecret = process.env.JWT_SECRET || "";

// Bas-middleware
app.use(express.static("./dist/"));
app.use(express.json());
app.use(logger);

// CORS – frontend på port 5173
app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);


app.get("/api/ping", (req: Request, res: Response) => {
  res.send({ message: "Pong" });
});

// Routrar 
app.use("/api/users", userRouter);
app.use("/api/register", registrerRouter);
app.use("/api/auth", loginRouter);
app.use("/api/messages", dmMessagesRouter);
app.use("/api/channels", channelsRouter);
app.use("/api/channel-messages", channelMessagesRouter);

// Skapa HTTP-server och Socket.io
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"], // frontend
    methods: ["GET", "POST"],
    credentials: true,
  },
});
function roomName(channelId: string) {
  return `channel:${channelId}`;
}

// Socket.io-hantering
io.on("connection", (socket) => {
  console.log("En användare anslöt:", socket.id);

  socket.on("channel:join", ({ channelId }: { channelId: string }) => {
    if (channelId) socket.join(roomName(channelId));
  });

  socket.on("channel:leave", ({ channelId }: { channelId: string }) => {
    if (channelId) socket.leave(roomName(channelId));
  });

  socket.on(
    "channel:message",
    ({
      channelId,
      msg,
    }: {
      channelId: string;
      msg: {
        PK: string;
        SK: string;
        type: "MESSAGE";
        receiverId: string;
        senderId: string;
        content: string;
      };
    }) => {
      if (channelId) {
        io.to(roomName(channelId)).emit("channel:message", { channelId, msg });
      }
    }
  );

  socket.on("disconnect", () => {
    console.log("Användare kopplade från:", socket.id);
  });
});

console.log(
  "JWT_SECRET laddad:",
  jwtSecret ? "Ja, den laddar" : "Nej, laddas inte"
);

// Starta servern 
server.listen(port, (error?: Error) => {
  if (error) {
    console.log("Server could not start! ", (error as any).message);
  } else {
    console.log(`Server is listening on port ${port}...`);
  }
});
