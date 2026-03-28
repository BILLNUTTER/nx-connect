import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users } from "./pg-schema";
import { eq } from "drizzle-orm";

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
    db.update(users)
      .set({ lastSeen: new Date() })
      .where(eq(users.id, decoded.userId))
      .catch(() => {});
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export async function adminOnly(req: Request, res: Response, next: NextFunction) {
  const adminKey = req.query.adminKey || req.headers['x-admin-key'];
  if (adminKey && process.env.ADMIN_KEY && adminKey === process.env.ADMIN_KEY) {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET) as { userId: string };
      const [user] = await db.select({ isAdmin: users.isAdmin })
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);
      if (user?.isAdmin) {
        (req as any).userId = decoded.userId;
        return next();
      }
    } catch {}
  }
  return res.status(401).json({ message: "Unauthorized Admin" });
}
