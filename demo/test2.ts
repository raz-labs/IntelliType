import { User1 } from './test';
import { User4 } from './test2 copy';

const user2: User4 = {
  name: "John",
  id: 1,
};
const user4: User1 = {
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  createdAt: new Date()
};

export interface User2 {
  name: string;
  id: number;
}