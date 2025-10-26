


export interface User{
    PK: string;
    SK: string;
    userId: string;
    Username: string;
    accessLevel: string; 
    type: string;
    passwordHash: string;   

}

export interface DmMessage{
    content: string;
    recieverId: string;
    senderId: string;
    type: string;
}

export interface ChannelMessage{
    content: string;
    senderId: string;
    receverId: string;
    type: string;
}

export interface Channel{
    content: string;
    receiverId: string;
    senderId: string;
    type: string;
}
export type ResponseMessage = {
  message: string;
};







