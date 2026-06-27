export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
}

export const users: User[] = [
  { id: "ORG001", username: "org.admin", password: "CV@Admin123", name: "Organization Administrator" },
  { id: "EMP001", username: "emp001", password: "CV@Emp123", name: "Employee 001" },
  { id: "EMP002", username: "emp002", password: "CV@Emp234", name: "Employee 002" },
  { id: "EMP003", username: "emp003", password: "CV@Emp345", name: "Employee 003" },
  { id: "EMP004", username: "emp004", password: "CV@Emp456", name: "Employee 004" },
  { id: "EMP006", username: "emp006", password: "CV@Emp457", name: "Employee 005" },
   { id: "EMP005", username: "spartan", password: "Spartan@123", name: "Spartan@001" },
];
