// validation.ts
import { z, type ZodSchema } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import e from 'express';


export const signUpSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6).max(100),
});

export const loginSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6).max(100),
});

export const dmMessageSchema = z.object({
  content: z.string().min(1).max(500),
  recieverId: z.string().min(1),
  senderId: z.string().min(1),
});

export const channelMessageSchema = z.object({
  content: z.string().min(1).max(500),
  receiverId: z.string().min(1),
  senderId: z.string().min(1),
});

export const channelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
});

export const userSchema = z.object({
  userId: z.string().min(1),
  username: z.string().min(3).max(20),
  accessLevel: z.string().min(1),
  type: z.string().min(1),
  passwordHash: z.string().min(1),
});
export const jwtPayloadSchema = z.object({
  userId: z.uuid(),
  exp: z.number().int(),
});

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createDmSchema = z.object({
  content: z.string().min(1).max(500),
  receiverId: z.string().min(1)
  
});


export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type DmMessageInput = z.infer<typeof dmMessageSchema>;
export type ChannelMessageInput = z.infer<typeof channelMessageSchema>;
export type ChannelInput = z.infer<typeof channelSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type JWTPayload = z.infer<typeof jwtPayloadSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type CreateDmInput = z.infer<typeof createDmSchema>;


