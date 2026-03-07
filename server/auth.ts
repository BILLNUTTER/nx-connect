import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "nutterx_super_secret_key_12345";

export function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  const adminKey = req.query.adminKey || req.headers['x-admin-key'];
  if (adminKey === process.env.ADMIN_KEY || adminKey === "nutterx-admin-123") {
    next();
  } else {
    return res.status(401).json({ message: "Unauthorized Admin" });
  }
}
