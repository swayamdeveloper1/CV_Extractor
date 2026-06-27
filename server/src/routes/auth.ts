import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { users as USERS } from "../data/users";

const router = Router();

router.post("/login", (req: Request, res: Response): void => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const user = USERS.find((u) => u.username === username && u.password === password);

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any,
  });

  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name },
  });
});

export default router;
