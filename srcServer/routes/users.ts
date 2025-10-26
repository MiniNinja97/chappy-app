import express from 'express';
import type { Router, Request, Response } from 'express';
import { db, tableName } from '../data/dynamoDb.js';
import { DeleteCommand, ScanCommand, type ScanCommandOutput } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import type { User, ResponseMessage } from '../data/types.js';
import { userIdParamSchema } from '../data/validation.js';

const router: Router = express.Router();



// GET /api/users - Hämta alla användare
router.get('/', async (_req: Request, res: Response<User[] | ResponseMessage>) => {
  try {
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'SK = :sk',
      ExpressionAttributeValues: {
        ':sk': 'METADATA',
      },
    });

    const result: ScanCommandOutput = await db.send(command);
    if (!result.Items || result.Items.length === 0) {
      return res.status(404).send({ message: 'Inga users hittades' });
    }

    const users: User[] = result.Items as User[];
    res.status(200).send(users);
  } catch (err) {
    console.error('Failed to scan users:', err);
    res.status(500).send({ message: 'Internt serverfel' });
  }
});

// DELETE /api/users/:id - Radera en användare
router.delete('/:id', async (req: Request, res: Response<ResponseMessage>) => {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    const pk = `USER#${id}`;

    const command = new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: pk,
        SK: 'METADATA',
      },
      ConditionExpression: 'attribute_exists(PK)',
    });

    await db.send(command);
    res.status(200).send({ message: 'Användare raderad' });
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return res.status(400).json({ message: 'Ogiltigt userId' });
    }
    if (err?.name === 'ConditionalCheckFailedException') {
      return res.status(404).send({ message: 'Användare hittades inte' });
    }
    console.error('Fel vid radering av användare:', err);
    res.status(500).send({ message: 'Internt serverfel' });
  }
});

export default router;
