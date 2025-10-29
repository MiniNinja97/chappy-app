


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
    receverId: string; //mottagare finns inte eftersom det är till kanalen
    type: string;
}

export interface Channel{
    content: string;
    receiverId: string; //skapar ID till kanalen
    senderId: string;
    type: string;
}
export type ResponseMessage = {
  message: string;
};







