export type Message = {
  _id: string;
  sender: string;
  receiver: string;
  message: string;
  seen: boolean;
  createdAt: string;
};
