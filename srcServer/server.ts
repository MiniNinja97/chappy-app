
import 'dotenv/config';
import express from 'express';
import type { Express, Request, Response } from 'express';
import { logger } from './data/middleware.js';
import cors from 'cors';
import userRouter from './routes/users.js';
import {
  authMiddleware,
  validateBody,
  validateResponse,
} from './data/middleware.js';
import registrerRouter from "./routes/registrer.js";
import loginRouter from "./routes/login.js";
import dmMessagesRouter from "./routes/dmMessage.js";


const app: Express = express();
const port: number = Number(process.env.PORT) || 1337;
const jwtSecret = process.env.JWT_SECRET || '';

console.log("JWT_SECRET laddad:", process.env.JWT_SECRET ? " Ja, den laddar" : "Nej, laddas inte");

app.use(express.static('./dist/'));
app.use(express.json());
app.use(logger);
app.use(cors());



// Registrera övriga routrar
app.use('/api/users', userRouter);

app.get('/api/ping', (req: Request, res: Response) => {
  res.send({ message: 'Pong' });
});

app.use("/api/users", registrerRouter);

app.use("/api/auth", loginRouter);

app.use("/api/messages", dmMessagesRouter);

app.listen(port, (error?: Error) => {
  if (error) {
    console.log('Server could not start! ', (error as any).message);
  } else {
    console.log(`Server is listening on port ${port}...`);
  }
});

