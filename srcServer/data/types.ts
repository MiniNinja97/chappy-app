
export interface User {
  PK: string;                  // "USER#<userId>"
  SK: string;                  // "METADATA"
  userId: string;              // "<uuid>"
  username: string;            
  accessLevel: string;        
  type: "USER";
  passwordHash: string;
}

export interface DmMessage {
  PK: string;                  // "MSG#<A>#<B>" (A/B = userIds sorterade)
  SK: string;                  // "Timestamp#<ISO>"
  content: string;
  senderId: string;            // avsändarens userId
  receiverId: string;          // mottagarens userId
  type: "MESSAGE";
}

export interface ChannelMessage {
  PK: string;                  // "CHANNELMSG#<channelId>"
  SK: string;                  // "Timestamp#<ISO>"
  content: string;
  senderId: string;            // avsändarens userId
  type: "MESSAGE";
}


export interface Channel {
  PK: string;                  // "CHANNEL#<channelId>"
  SK: "CHANNELMETA";
  channelId: string;           //  uuid
  channelName: string;        
  access: "public" | "private";
  creatorId: string;           // userId som skapade kanalen
  creatorPK: string;           // "USER#<creatorId>"
  type: "CHANNEL";
}

export type ResponseMessage = { message: string };







