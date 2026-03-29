import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  password: text("password").notNull(),
  profilePicture: text("profile_picture").notNull().default(""),
  coverPhoto: text("cover_photo").notNull().default(""),
  isAdmin: boolean("is_admin").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  status: text("status").notNull().default("active"),
  lastSeen: timestamp("last_seen"),
  friends: text("friends").array().notNull().default(sql`'{}'::text[]`),
  friendRequests: text("friend_requests").array().notNull().default(sql`'{}'::text[]`),
  sentRequests: text("sent_requests").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: text("author_id").notNull(),
  content: text("content").notNull(),
  likes: text("likes").array().notNull().default(sql`'{}'::text[]`),
  hidden: boolean("hidden").notNull().default(false),
  isAdminPost: boolean("is_admin_post").notNull().default(false),
  imageUrl: text("image_url"),
  expiresAt: timestamp("expires_at"),
  isEdited: boolean("is_edited").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: text("post_id").notNull(),
  authorId: text("author_id").notNull(),
  content: text("content").notNull(),
  replyTo: text("reply_to"),
  likes: text("likes").array().notNull().default(sql`'{}'::text[]`),
  isEdited: boolean("is_edited").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: text("conversation_id").notNull(),
  senderId: text("sender_id").notNull(),
  content: text("content").notNull(),
  audioUrl: text("audio_url"),
  isSystem: boolean("is_system").notNull().default(false),
  replyTo: text("reply_to"),
  readBy: text("read_by").array().notNull().default(sql`'{}'::text[]`),
  expiresAt: timestamp("expires_at"),
  isEdited: boolean("is_edited").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  participants: text("participants").array().notNull().default(sql`'{}'::text[]`),
  lastMessage: text("last_message").notNull().default(""),
  lastMessageAt: timestamp("last_message_at"),
  unreadBy: text("unread_by").array().notNull().default(sql`'{}'::text[]`),
  isAdminChat: boolean("is_admin_chat").notNull().default(false),
  isGroup: boolean("is_group").notNull().default(false),
  groupName: text("group_name").notNull().default(""),
  groupPhoto: text("group_photo").notNull().default(""),
  adminId: text("admin_id"),
  inviteToken: text("invite_token").unique(),
  disappearingMessages: text("disappearing_messages"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientId: text("recipient_id").notNull(),
  senderId: text("sender_id"),
  type: text("type").notNull(),
  postId: text("post_id"),
  content: text("content"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const forgotPasswords = pgTable("forgot_passwords", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id"),
  username: text("username"),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dailyPhotos = pgTable("daily_photos", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: text("author_id").notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption").notNull().default(""),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
