import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  phone: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  profilePicture: z.string().optional(),
  isAdmin: z.boolean().default(false),
  status: z.enum(["active", "restricted"]).default("active"),
  friends: z.array(z.string()).default([]),
  friendRequests: z.array(z.string()).default([]),
  sentRequests: z.array(z.string()).default([]),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const insertUserSchema = userSchema.pick({
  name: true,
  username: true,
  phone: true,
  email: true,
  password: true,
});

export const loginUserSchema = z.object({
  username: z.string(),
  password: z.string()
});

export const postSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  author: userSchema.optional(),
  content: z.string(),
  likes: z.array(z.string()).default([]),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const insertPostSchema = postSchema.pick({
  content: true,
});

export const commentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  authorId: z.string(),
  author: userSchema.optional(),
  content: z.string(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const insertCommentSchema = commentSchema.pick({
  content: true,
});

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const conversationSchema = z.object({
  id: z.string(),
  participants: z.array(z.string()),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const notificationSchema = z.object({
  id: z.string(),
  recipientId: z.string(),
  senderId: z.string().optional(),
  type: z.enum(["like", "comment", "friend_request", "friend_accept", "friend_post", "system"]),
  postId: z.string().optional(),
  content: z.string().optional(),
  read: z.boolean().default(false),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const forgotPasswordSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  username: z.string(),
  user: userSchema.optional(),
  desiredPassword: z.string(),
  status: z.enum(["pending", "resolved"]),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Post = z.infer<typeof postSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
