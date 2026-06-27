export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
}

export const users: User[] = [
  { id: 1, username: "admin", password: "admin123", name: "Admin User" },
  { id: 2, username: "hr", password: "hr123", name: "HR Manager" },
];
