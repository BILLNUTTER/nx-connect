import type { Express, Request, Response } from "express";
import type { Server } from "http";
import bcrypt from "bcrypt";
import { api } from "@shared/routes";
import { z } from "zod";
import { db, connectDB } from "./db";
import {
  users, posts, comments, messages, conversations, notifications,
  forgotPasswords, dailyPhotos,
} from "./pg-schema";
import {
  eq, ne, and, or, gt, lt, gte, isNull, isNotNull, ilike, inArray, notInArray, sql, desc, asc,
} from "drizzle-orm";
import { generateToken, authenticate, adminOnly } from "./auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeUser(u: any) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

async function getUserById(id: string) {
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return u || null;
}

async function getUserMap(ids: string[], fields?: (keyof typeof users)[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {} as Record<string, any>;
  const rows = await db.select({
    id: users.id,
    name: users.name,
    username: users.username,
    profilePicture: users.profilePicture,
    lastSeen: users.lastSeen,
    isVerified: users.isVerified,
  }).from(users).where(inArray(users.id, unique));
  return Object.fromEntries(rows.map(r => [r.id, r])) as Record<string, any>;
}

async function getPostMap(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {} as Record<string, any>;
  const rows = await db.select({ id: posts.id, content: posts.content })
    .from(posts).where(inArray(posts.id, unique));
  return Object.fromEntries(rows.map(r => [r.id, r])) as Record<string, any>;
}

// ─── Register Routes ───────────────────────────────────────────────────────────

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await connectDB();

  // Seed NX-Connect system account
  const [nxExists] = await db.select({ id: users.id }).from(users)
    .where(eq(users.username, 'nx-connect')).limit(1);
  if (!nxExists) {
    const hashedPw = await bcrypt.hash('nxconnect-system-' + Date.now(), 10);
    await db.insert(users).values({
      name: 'NX-Connect', username: 'nx-connect',
      email: 'system@nx-connect.internal', phone: '0000000000',
      password: hashedPw, isAdmin: true, profilePicture: '',
    });
    console.log('[seed] NX-Connect system account created.');
  }

  // Health check
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  // ─── Auth ────────────────────────────────────────────────────────────────────

  app.post(api.auth.signup.path, async (req: Request, res: Response) => {
    try {
      const input = api.auth.signup.input.parse(req.body);
      if (input.username === 'nx-connect') {
        return res.status(400).json({ message: "Username not available" });
      }
      const [existing] = await db.select({ id: users.id }).from(users).where(
        or(eq(users.username, input.username), eq(users.email, input.email))
      ).limit(1);
      if (existing) return res.status(400).json({ message: "Username or email already exists" });

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const [user] = await db.insert(users).values({ ...input, password: hashedPassword }).returning();

      // Friend suggestion notifications to all existing users
      try {
        const allUsers = await db.select({ id: users.id }).from(users)
          .where(and(ne(users.id, user.id), ne(users.username, 'nx-connect')));
        if (allUsers.length > 0) {
          await db.insert(notifications).values(allUsers.map(u => ({
            recipientId: u.id,
            senderId: user.id,
            type: 'friend_suggestion',
            content: `You have a new friend suggestion — ${input.name} (@${input.username}) just joined NX-Connect!`,
          })));
        }
      } catch (notifError) {
        console.error("Failed to create welcome notifications:", notifError);
      }

      const token = generateToken(user.id);
      res.status(201).json({ token, user: safeUser(user) });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
      console.error("Signup error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post(api.auth.login.path, async (req: Request, res: Response) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const identifier = input.username.trim();
      const isEmail = identifier.includes('@');
      const [user] = await db.select().from(users).where(
        isEmail ? eq(users.email, identifier) : eq(users.username, identifier)
      ).limit(1);
      if (!user || user.username === 'nx-connect') {
        return res.status(401).json({ message: "No account found with that username or email." });
      }
      if (user.status === "restricted") {
        return res.status(401).json({ message: "Account suspended. Please contact NX-Connect support on WhatsApp: 0713881613 or 0758891491 for further guidance." });
      }
      const isValid = await bcrypt.compare(input.password, user.password);
      if (!isValid) return res.status(401).json({ message: "Incorrect password. Please try again." });
      const token = generateToken(user.id);
      res.status(200).json({ token, user: safeUser(user) });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get(api.auth.me.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const user = await getUserById(userId);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    res.status(200).json(safeUser(user));
  });

  app.post(api.auth.forgotPassword.path, async (req: Request, res: Response) => {
    const { phone, email } = req.body;
    if (!phone || !email) return res.status(400).json({ message: "Phone and email are required" });
    const [user] = await db.select({ id: users.id, username: users.username }).from(users)
      .where(or(eq(users.email, email), eq(users.phone, phone))).limit(1);
    await db.insert(forgotPasswords).values({
      userId: user?.id || null,
      username: user?.username || null,
      phone, email,
    });
    res.status(200).json({ message: "Password reset request submitted" });
  });

  app.put(api.auth.updateProfile.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { profilePicture, coverPhoto, name, username, phone } = req.body;

    // Fetch current user before update so we can detect profile picture change
    const currentUser = await getUserById(userId);

    const updates: any = { updatedAt: new Date() };
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;
    if (coverPhoto !== undefined) updates.coverPhoto = coverPhoto;
    if (name?.trim()) updates.name = name.trim();
    if (phone?.trim()) updates.phone = phone.trim();
    if (username?.trim()) {
      const [existing] = await db.select({ id: users.id }).from(users)
        .where(and(eq(users.username, username.trim()), ne(users.id, userId))).limit(1);
      if (existing) return res.status(400).json({ message: "Username already taken" });
      updates.username = username.trim();
    }
    const [user] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
    if (!user) return res.status(404).json({ message: "Not found" });

    // If profile picture actually changed, create a post and notify friends
    const newPic = profilePicture;
    const picChanged = newPic && newPic !== currentUser?.profilePicture;
    if (picChanged) {
      const displayName = updates.name || currentUser?.name || 'Someone';
      const [pfpPost] = await db.insert(posts).values({
        authorId: userId,
        content: `📷 updated their profile picture`,
        imageUrl: newPic,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      }).returning();

      if (currentUser?.friends && currentUser.friends.length > 0) {
        await db.insert(notifications).values(currentUser.friends.map((friendId: string) => ({
          recipientId: friendId,
          senderId: userId,
          type: 'friend_post',
          postId: pfpPost.id,
          content: `${displayName} updated their profile picture`,
        })));
      }
    }

    res.status(200).json(safeUser(user));
  });

  app.put('/api/auth/change-password', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both current and new password are required" });
    if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ message: "Current password is incorrect" });
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashed, updatedAt: new Date() }).where(eq(users.id, userId));
    res.status(200).json({ message: "Password changed successfully" });
  });

  // ─── Posts ───────────────────────────────────────────────────────────────────

  app.get(api.posts.list.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const me = await getUserById(userId);
    const friendSet = new Set<string>(me?.friends || []);

    const now = new Date();
    const postRows = await db.select().from(posts).where(
      and(
        or(eq(posts.hidden, false), eq(posts.isAdminPost, true)),
        or(isNull(posts.expiresAt), gt(posts.expiresAt, now))
      )
    ).orderBy(desc(posts.createdAt));

    const validPosts = postRows.filter(p => p.authorId && p.content);
    const authorIds = [...new Set(validPosts.map(p => p.authorId))];
    const authorMap = await getUserMap(authorIds);

    // Comment counts per post
    const postIds = validPosts.map(p => p.id);
    let commentCounts: Record<string, { count: number; latest: any }> = {};
    if (postIds.length > 0) {
      const commentRows = await db.select().from(comments)
        .where(inArray(comments.postId, postIds))
        .orderBy(desc(comments.createdAt));
      const commentAuthorIds = [...new Set(commentRows.map(c => c.authorId))];
      const commentAuthorMap = await getUserMap(commentAuthorIds);
      for (const c of commentRows) {
        if (!commentCounts[c.postId]) commentCounts[c.postId] = { count: 0, latest: null };
        commentCounts[c.postId].count++;
        if (!commentCounts[c.postId].latest) {
          commentCounts[c.postId].latest = { ...c, author: commentAuthorMap[c.authorId] };
        }
      }
    }

    // Friend likers
    const friendLikerIds = new Set<string>();
    for (const p of validPosts) {
      for (const likeId of p.likes) {
        if (friendSet.has(likeId)) friendLikerIds.add(likeId);
      }
    }
    const friendLikerMap = await getUserMap([...friendLikerIds]);

    const formattedPosts = validPosts.map(p => ({
      ...p,
      author: authorMap[p.authorId] || null,
      commentCount: commentCounts[p.id]?.count || 0,
      latestComment: commentCounts[p.id]?.latest || null,
      friendLike: p.likes.find(id => friendLikerMap[id])
        ? friendLikerMap[p.likes.find(id => friendLikerMap[id])!]
        : null,
    }));
    res.status(200).json(formattedPosts);
  });

  app.delete(api.posts.delete.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const reqUser = await getUserById(userId);
    const [post] = await db.select().from(posts).where(eq(posts.id, req.params.id)).limit(1);
    if (!post) return res.status(404).json({ message: "Not found" });
    if (post.authorId !== userId && !reqUser?.isAdmin) return res.status(403).json({ message: "Forbidden" });
    await db.delete(comments).where(eq(comments.postId, post.id));
    await db.delete(posts).where(eq(posts.id, post.id));
    res.status(200).json({ message: "Post deleted" });
  });

  app.patch(api.posts.hide.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const [post] = await db.select().from(posts).where(eq(posts.id, req.params.id)).limit(1);
    if (!post) return res.status(404).json({ message: "Not found" });
    if (post.authorId !== userId) return res.status(403).json({ message: "Forbidden" });
    const [updated] = await db.update(posts).set({ hidden: !post.hidden, updatedAt: new Date() })
      .where(eq(posts.id, post.id)).returning();
    const authorMap = await getUserMap([updated.authorId]);
    res.status(200).json({ ...updated, author: authorMap[updated.authorId] });
  });

  app.patch(api.posts.edit.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { content } = api.posts.edit.input.parse(req.body);
    const [post] = await db.select().from(posts).where(eq(posts.id, req.params.id)).limit(1);
    if (!post) return res.status(404).json({ message: "Not found" });
    if (post.authorId !== userId) return res.status(403).json({ message: "Forbidden" });
    const [updated] = await db.update(posts).set({ content, updatedAt: new Date() })
      .where(eq(posts.id, post.id)).returning();
    const authorMap = await getUserMap([updated.authorId]);
    res.status(200).json({ ...updated, author: authorMap[updated.authorId] });
  });

  app.post(api.posts.create.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const input = api.posts.create.input.parse(req.body);

    let expiresAt: Date | null = null;
    if (input.imageUrl) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [existing] = await db.select({ id: posts.id, createdAt: posts.createdAt })
        .from(posts).where(and(
          eq(posts.authorId, userId),
          isNotNull(posts.imageUrl),
          gte(posts.createdAt, since)
        )).limit(1);
      if (existing) {
        const nextAllowed = new Date(existing.createdAt.getTime() + 24 * 60 * 60 * 1000);
        return res.status(429).json({ message: "You can only post one photo per day.", nextAllowed: nextAllowed.toISOString() });
      }
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const [post] = await db.insert(posts).values({
      authorId: userId,
      content: input.content,
      imageUrl: input.imageUrl || null,
      expiresAt,
    }).returning();

    const authorMap = await getUserMap([userId]);
    const me = await getUserById(userId);
    if (me && me.friends?.length > 0) {
      await db.insert(notifications).values(me.friends.map((friendId: string) => ({
        recipientId: friendId,
        senderId: userId,
        type: 'friend_post',
        postId: post.id,
        content: `${me.name} created a new post`,
      })));
    }

    res.status(201).json({ ...post, author: authorMap[userId] });
  });

  app.post(api.posts.like.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const [post] = await db.select().from(posts).where(eq(posts.id, req.params.id)).limit(1);
    if (!post) return res.status(404).json({ message: "Not found" });

    const alreadyLiked = post.likes.includes(userId);
    let newLikes: string[];
    if (!alreadyLiked) {
      newLikes = [...post.likes, userId];
      if (post.authorId !== userId) {
        const liker = await getUserById(userId);
        await db.insert(notifications).values({
          recipientId: post.authorId, senderId: userId,
          type: 'like', postId: post.id,
          content: `${liker?.name || 'Someone'} liked your post`,
        });
      }
    } else {
      newLikes = post.likes.filter(id => id !== userId);
    }

    const [updated] = await db.update(posts).set({ likes: newLikes, updatedAt: new Date() })
      .where(eq(posts.id, post.id)).returning();
    res.status(200).json(updated);
  });

  app.get(api.posts.get.path, authenticate, async (req: Request, res: Response) => {
    const [post] = await db.select().from(posts).where(eq(posts.id, req.params.id)).limit(1);
    if (!post) return res.status(404).json({ message: "Not found" });
    const authorMap = await getUserMap([post.authorId]);
    res.status(200).json({ ...post, author: authorMap[post.authorId] });
  });

  // ─── Comments ────────────────────────────────────────────────────────────────

  app.get(api.comments.list.path, authenticate, async (req: Request, res: Response) => {
    const commentRows = await db.select().from(comments)
      .where(eq(comments.postId, req.params.postId))
      .orderBy(asc(comments.createdAt));
    const authorMap = await getUserMap(commentRows.map(c => c.authorId));
    const formatted = commentRows.map(c => ({ ...c, author: authorMap[c.authorId] }));
    res.status(200).json(formatted);
  });

  app.post(api.comments.create.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const input = api.comments.create.input.parse(req.body);
    const [post] = await db.select().from(posts).where(eq(posts.id, req.params.postId)).limit(1);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const [comment] = await db.insert(comments).values({
      postId: post.id,
      authorId: userId,
      content: input.content,
      replyTo: req.body.replyTo || null,
    }).returning();

    if (post.authorId !== userId) {
      const commenter = await getUserById(userId);
      await db.insert(notifications).values({
        recipientId: post.authorId, senderId: userId,
        type: 'comment', postId: post.id,
        content: `${commenter?.name || 'Someone'} commented on your post`,
      });
    }

    const authorMap = await getUserMap([userId]);
    res.status(201).json({ ...comment, author: authorMap[userId] });
  });

  app.post('/api/posts/:postId/comments/:commentId/like', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const [comment] = await db.select().from(comments).where(eq(comments.id, req.params.commentId)).limit(1);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    const alreadyLiked = comment.likes.includes(userId);
    const newLikes = alreadyLiked
      ? comment.likes.filter(id => id !== userId)
      : [...comment.likes, userId];
    const [updated] = await db.update(comments).set({ likes: newLikes, updatedAt: new Date() })
      .where(eq(comments.id, comment.id)).returning();
    res.status(200).json(updated);
  });

  app.patch(api.comments.edit.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { content } = api.comments.edit.input.parse(req.body);
    const [comment] = await db.select().from(comments).where(eq(comments.id, req.params.commentId)).limit(1);
    if (!comment) return res.status(404).json({ message: "Not found" });
    if (comment.authorId !== userId) return res.status(403).json({ message: "Forbidden" });
    const [updated] = await db.update(comments).set({ content, updatedAt: new Date() })
      .where(eq(comments.id, comment.id)).returning();
    const authorMap = await getUserMap([updated.authorId]);
    res.status(200).json({ ...updated, author: authorMap[updated.authorId] });
  });

  app.delete(api.comments.delete.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const reqUser = await getUserById(userId);
    const [comment] = await db.select().from(comments).where(eq(comments.id, req.params.commentId)).limit(1);
    if (!comment) return res.status(404).json({ message: "Not found" });
    if (comment.authorId !== userId && !reqUser?.isAdmin) return res.status(403).json({ message: "Forbidden" });
    await db.delete(comments).where(eq(comments.id, comment.id));
    res.status(200).json({ message: "Comment deleted" });
  });

  // ─── Users / Friends ─────────────────────────────────────────────────────────

  app.get(api.users.discover.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const me = await getUserById(userId);
    if (!me) return res.status(401).json({ message: "Unauthorized" });
    const excludeIds = [userId, ...(me.friends || []), ...(me.friendRequests || []), ...(me.sentRequests || [])];
    const discovered = await db.select({
      id: users.id, name: users.name, username: users.username, profilePicture: users.profilePicture,
      lastSeen: users.lastSeen, isVerified: users.isVerified,
    }).from(users).where(
      and(
        notInArray(users.id, excludeIds),
        eq(users.isAdmin, false),
        isNotNull(users.name),
        ne(users.name, '')
      )
    ).limit(20);
    res.status(200).json(discovered);
  });

  app.get(api.users.friends.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const me = await getUserById(userId);
    if (!me?.friends?.length) return res.status(200).json([]);
    const friendRows = await db.select({
      id: users.id, name: users.name, username: users.username,
      profilePicture: users.profilePicture, lastSeen: users.lastSeen, isVerified: users.isVerified,
    }).from(users).where(inArray(users.id, me.friends));
    res.status(200).json(friendRows);
  });

  app.get(api.users.friendRequests.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const me = await getUserById(userId);
    if (!me?.friendRequests?.length) return res.status(200).json([]);
    const requesters = await db.select({
      id: users.id, name: users.name, username: users.username,
      profilePicture: users.profilePicture, lastSeen: users.lastSeen, isVerified: users.isVerified,
    }).from(users).where(inArray(users.id, me.friendRequests));
    res.status(200).json(requesters);
  });

  app.post(api.users.sendRequest.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const targetId = req.params.id;
    if (userId === targetId) return res.status(400).json({ message: "Cannot request yourself" });
    const [me, target] = await Promise.all([getUserById(userId), getUserById(targetId)]);
    if (!target || !me) return res.status(404).json({ message: "User not found" });
    if ((me.friends || []).includes(targetId) || (me.sentRequests || []).includes(targetId)) {
      return res.status(400).json({ message: "Already friends or requested" });
    }

    await Promise.all([
      db.update(users).set({
        sentRequests: sql`array_append(${users.sentRequests}, ${targetId})`,
        updatedAt: new Date(),
      }).where(eq(users.id, userId)),
      db.update(users).set({
        friendRequests: sql`array_append(${users.friendRequests}, ${userId})`,
        updatedAt: new Date(),
      }).where(eq(users.id, targetId)),
      db.insert(notifications).values({
        recipientId: targetId, senderId: userId,
        type: 'friend_request',
        content: `${me.name} sent you a friend request`,
      }),
    ]);
    res.status(200).json({ message: "Request sent" });
  });

  app.post(api.users.acceptRequest.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const requesterId = req.params.id;
    const [me, requester] = await Promise.all([getUserById(userId), getUserById(requesterId)]);
    if (!me || !requester) return res.status(404).json({ message: "User not found" });

    await Promise.all([
      db.update(users).set({
        friendRequests: sql`array_remove(${users.friendRequests}, ${requesterId})`,
        friends: (me.friends || []).includes(requesterId)
          ? users.friends
          : sql`array_append(${users.friends}, ${requesterId})`,
        updatedAt: new Date(),
      }).where(eq(users.id, userId)),
      db.update(users).set({
        sentRequests: sql`array_remove(${users.sentRequests}, ${userId})`,
        friends: (requester.friends || []).includes(userId)
          ? users.friends
          : sql`array_append(${users.friends}, ${userId})`,
        updatedAt: new Date(),
      }).where(eq(users.id, requesterId)),
      db.update(notifications).set({ read: true }).where(
        and(eq(notifications.recipientId, userId), eq(notifications.senderId, requesterId), eq(notifications.type, 'friend_request'))
      ),
      db.insert(notifications).values({
        recipientId: requesterId, senderId: userId,
        type: 'friend_accept',
        content: `${me.name} accepted your friend request`,
      }),
    ]);

    // Auto-create DM conversation
    const [existingConvo] = await db.select({ id: conversations.id }).from(conversations).where(
      and(
        sql`${userId} = ANY(${conversations.participants})`,
        sql`${requesterId} = ANY(${conversations.participants})`,
        eq(conversations.isGroup, false),
        sql`array_length(${conversations.participants}, 1) = 2`
      )
    ).limit(1);

    if (!existingConvo) {
      const welcomeText = `🎉 You and ${me.name} are now friends! Start chatting.`;
      const [convo] = await db.insert(conversations).values({
        participants: [userId, requesterId],
        lastMessage: welcomeText,
        lastMessageAt: new Date(),
        unreadBy: [requesterId],
      }).returning();
      await db.insert(messages).values({
        conversationId: convo.id, senderId: userId,
        content: welcomeText, isSystem: true,
      });
    }

    res.status(200).json({ message: "Request accepted" });
  });

  app.post(api.users.unfriend.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const targetId = req.params.id;
    await Promise.all([
      db.update(users).set({
        friends: sql`array_remove(${users.friends}, ${targetId})`,
        updatedAt: new Date(),
      }).where(eq(users.id, userId)),
      db.update(users).set({
        friends: sql`array_remove(${users.friends}, ${userId})`,
        updatedAt: new Date(),
      }).where(eq(users.id, targetId)),
    ]);
    res.status(200).json({ message: "Unfriended" });
  });

  app.get(api.users.profile.path, authenticate, async (req: Request, res: Response) => {
    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: "Not found" });
    res.status(200).json(safeUser(user));
  });

  app.get(api.users.posts.path, authenticate, async (req: Request, res: Response) => {
    const viewerId = (req as any).userId;
    const isOwner = viewerId === req.params.id;
    const conditions = [eq(posts.authorId, req.params.id), eq(posts.isAdminPost, false)];
    if (!isOwner) conditions.push(eq(posts.hidden, false));
    const postRows = await db.select().from(posts).where(and(...conditions)).orderBy(desc(posts.createdAt));
    const authorMap = await getUserMap([req.params.id]);
    const formatted = postRows.map(p => ({ ...p, author: authorMap[p.authorId] }));
    res.status(200).json(formatted);
  });

  // ─── Chats ───────────────────────────────────────────────────────────────────

  app.get(api.chats.conversations.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const convos = await db.select().from(conversations).where(
      sql`${userId} = ANY(${conversations.participants})`
    ).orderBy(desc(conversations.lastMessageAt), desc(conversations.updatedAt));

    const allParticipantIds = [...new Set(convos.flatMap(c => c.participants))];
    const participantMap = await getUserMap(allParticipantIds);

    const adminIdSet = [...new Set(convos.map(c => c.adminId).filter(Boolean) as string[])];
    const adminDetails: Record<string, any> = {};
    if (adminIdSet.length > 0) {
      const adminRows = await db.select({ id: users.id, name: users.name, username: users.username })
        .from(users).where(inArray(users.id, adminIdSet));
      for (const a of adminRows) adminDetails[a.id] = a;
    }

    const formatted = convos.map(c => {
      const participants = c.participants.map(pid => participantMap[pid]).filter(Boolean);
      const otherUser = !c.isGroup ? participants.find(p => p.id !== userId) : undefined;
      const unreadCount = c.unreadBy.includes(userId) ? 1 : 0;
      return {
        ...c,
        participants,
        otherUser,
        unreadCount,
        adminId: c.adminId ? adminDetails[c.adminId] || c.adminId : null,
      };
    });
    res.status(200).json(formatted);
  });

  app.post(api.chats.getOrCreate.path, authenticate, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const otherId = req.params.userId;
      const [otherUser] = await db.select({ id: users.id }).from(users).where(eq(users.id, otherId)).limit(1);
      if (!otherUser) return res.status(404).json({ message: "User not found" });

      const [existing] = await db.select().from(conversations).where(
        and(
          sql`${userId} = ANY(${conversations.participants})`,
          sql`${otherId} = ANY(${conversations.participants})`,
          eq(conversations.isGroup, false),
          sql`array_length(${conversations.participants}, 1) = 2`
        )
      ).limit(1);

      if (existing) return res.status(200).json(existing);
      const [convo] = await db.insert(conversations).values({ participants: [userId, otherId] }).returning();
      res.status(200).json(convo);
    } catch (err) {
      console.error("getOrCreate error:", err);
      res.status(500).json({ message: "Failed to start conversation" });
    }
  });

  app.get(api.chats.messages.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const convId = req.params.conversationId;
    const msgRows = await db.select().from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt));

    const senderIds = [...new Set(msgRows.map(m => m.senderId))];
    const senderMap = await getUserMap(senderIds);

    const replyIds = msgRows.map(m => m.replyTo).filter(Boolean) as string[];
    let replyMap: Record<string, any> = {};
    if (replyIds.length > 0) {
      const replyRows = await db.select().from(messages).where(inArray(messages.id, replyIds));
      const replySenderIds = [...new Set(replyRows.map(m => m.senderId))];
      const replySenderMap = await getUserMap(replySenderIds);
      for (const r of replyRows) {
        replyMap[r.id] = { ...r, senderName: replySenderMap[r.senderId]?.name || replySenderMap[r.senderId]?.username };
      }
    }

    // Mark as read
    await Promise.all([
      db.update(conversations).set({
        unreadBy: sql`array_remove(${conversations.unreadBy}, ${userId})`,
        updatedAt: new Date(),
      }).where(eq(conversations.id, convId)),
      db.update(messages).set({
        readBy: sql`array_append(${messages.readBy}, ${userId})`,
        updatedAt: new Date(),
      }).where(
        and(
          eq(messages.conversationId, convId),
          ne(messages.senderId, userId),
          sql`NOT (${userId} = ANY(${messages.readBy}))`
        )
      ),
    ]);

    const formatted = msgRows.map(m => ({
      ...m,
      sender: senderMap[m.senderId] || null,
      replyTo: m.replyTo ? replyMap[m.replyTo] || null : null,
    }));
    res.status(200).json(formatted);
  });

  app.post(api.chats.sendMessage.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const convId = req.params.conversationId;
    const [msg] = await db.insert(messages).values({
      conversationId: convId,
      senderId: userId,
      content: req.body.content,
      replyTo: req.body.replyTo || null,
    }).returning();

    const [convo] = await db.select().from(conversations).where(eq(conversations.id, convId)).limit(1);
    if (convo) {
      const others = convo.participants.filter(p => p !== userId);
      const newUnreadBy = [...new Set([...convo.unreadBy, ...others])];
      await db.update(conversations).set({
        lastMessage: req.body.content,
        lastMessageAt: new Date(),
        unreadBy: newUnreadBy,
        updatedAt: new Date(),
      }).where(eq(conversations.id, convId));
    }

    res.status(201).json(msg);
  });

  app.patch(api.chats.editMessage.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { content } = api.chats.editMessage.input.parse(req.body);
    const [msg] = await db.select().from(messages).where(eq(messages.id, req.params.messageId)).limit(1);
    if (!msg) return res.status(404).json({ message: "Not found" });
    if (msg.senderId !== userId) return res.status(403).json({ message: "Forbidden" });
    const [updated] = await db.update(messages).set({ content, updatedAt: new Date() })
      .where(eq(messages.id, msg.id)).returning();
    res.status(200).json(updated);
  });

  app.delete(api.chats.deleteMessage.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const [msg] = await db.select().from(messages).where(eq(messages.id, req.params.messageId)).limit(1);
    if (!msg) return res.status(404).json({ message: "Not found" });
    if (msg.senderId !== userId) return res.status(403).json({ message: "Forbidden" });
    await db.delete(messages).where(eq(messages.id, msg.id));
    res.status(200).json({ message: "Message deleted" });
  });

  // ─── Groups ──────────────────────────────────────────────────────────────────

  app.post('/api/groups', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { groupName, groupPhoto, memberIds } = req.body;
    if (!groupName?.trim()) return res.status(400).json({ message: "Group name is required" });
    const members: string[] = Array.isArray(memberIds) ? memberIds : [];
    const allParticipants = [userId, ...members.filter(id => id !== userId)];
    const inviteToken = crypto.randomUUID();
    const [group] = await db.insert(conversations).values({
      isGroup: true, groupName: groupName.trim(),
      groupPhoto: groupPhoto || '', adminId: userId,
      participants: allParticipants, inviteToken,
      lastMessage: `Group "${groupName.trim()}" created`,
      lastMessageAt: new Date(),
    }).returning();
    await db.insert(messages).values({
      conversationId: group.id, senderId: userId,
      content: `Group "${groupName.trim()}" was created.`, isSystem: true,
    });
    const participantMap = await getUserMap(allParticipants);
    const adminUser = await db.select({ id: users.id, name: users.name, username: users.username })
      .from(users).where(eq(users.id, userId)).limit(1).then(r => r[0]);
    res.status(201).json({
      ...group,
      participants: allParticipants.map(id => participantMap[id]).filter(Boolean),
      adminId: adminUser,
    });
  });

  app.put('/api/groups/:id', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const [group] = await db.select().from(conversations)
      .where(and(eq(conversations.id, req.params.id), eq(conversations.isGroup, true))).limit(1);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.adminId !== userId) return res.status(403).json({ message: "Only the group admin can edit settings" });
    const { groupName, groupPhoto } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (groupName?.trim()) updates.groupName = groupName.trim();
    if (groupPhoto !== undefined) updates.groupPhoto = groupPhoto;
    const [updated] = await db.update(conversations).set(updates)
      .where(eq(conversations.id, group.id)).returning();
    const participantMap = await getUserMap(updated.participants);
    res.status(200).json({
      ...updated,
      participants: updated.participants.map(id => participantMap[id]).filter(Boolean),
    });
  });

  app.delete('/api/groups/:id/members/:memberId', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const [group] = await db.select().from(conversations)
      .where(and(eq(conversations.id, req.params.id), eq(conversations.isGroup, true))).limit(1);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.adminId !== userId) return res.status(403).json({ message: "Only the group admin can remove members" });
    const memberId = req.params.memberId;
    if (memberId === userId) return res.status(400).json({ message: "Admin cannot remove themselves" });
    await db.update(conversations).set({
      participants: sql`array_remove(${conversations.participants}, ${memberId})`,
      updatedAt: new Date(),
    }).where(eq(conversations.id, group.id));
    await db.insert(messages).values({
      conversationId: group.id, senderId: userId,
      content: `A member was removed from the group.`, isSystem: true,
    });
    res.status(200).json({ message: "Member removed" });
  });

  app.post('/api/groups/leave/:id', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const [group] = await db.select().from(conversations)
      .where(and(eq(conversations.id, req.params.id), eq(conversations.isGroup, true))).limit(1);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.adminId === userId) return res.status(400).json({ message: "Admin cannot leave — transfer admin or delete the group" });
    await db.update(conversations).set({
      participants: sql`array_remove(${conversations.participants}, ${userId})`,
      updatedAt: new Date(),
    }).where(eq(conversations.id, group.id));
    res.status(200).json({ message: "Left group" });
  });

  app.get('/api/groups/join/:token', async (req: Request, res: Response) => {
    const [group] = await db.select().from(conversations)
      .where(and(eq(conversations.inviteToken, req.params.token), eq(conversations.isGroup, true))).limit(1);
    if (!group) return res.status(404).json({ message: "Invalid or expired invite link" });
    const participantMap = await getUserMap(group.participants);
    const adminUser = group.adminId
      ? await db.select({ id: users.id, name: users.name, username: users.username })
          .from(users).where(eq(users.id, group.adminId)).limit(1).then(r => r[0])
      : null;
    res.status(200).json({
      ...group,
      participants: group.participants.map(id => participantMap[id]).filter(Boolean),
      adminId: adminUser,
    });
  });

  app.post('/api/groups/join/:token', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const [group] = await db.select().from(conversations)
      .where(and(eq(conversations.inviteToken, req.params.token), eq(conversations.isGroup, true))).limit(1);
    if (!group) return res.status(404).json({ message: "Invalid or expired invite link" });
    if (group.participants.includes(userId)) return res.status(200).json(group);
    await db.update(conversations).set({
      participants: sql`array_append(${conversations.participants}, ${userId})`,
      updatedAt: new Date(),
    }).where(eq(conversations.id, group.id));
    await db.insert(messages).values({
      conversationId: group.id, senderId: userId,
      content: `A new member joined via invite link.`, isSystem: true,
    });
    const [updated] = await db.select().from(conversations).where(eq(conversations.id, group.id)).limit(1);
    const participantMap = await getUserMap(updated.participants);
    res.status(200).json({
      ...updated,
      participants: updated.participants.map(id => participantMap[id]).filter(Boolean),
    });
  });

  // ─── Notifications ───────────────────────────────────────────────────────────

  app.get(api.notifications.list.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const me = await getUserById(userId);
    if (me && (me.friends || []).length > 0) {
      await db.update(notifications).set({ read: true }).where(
        and(
          eq(notifications.recipientId, userId),
          eq(notifications.type, 'friend_request'),
          eq(notifications.read, false),
          inArray(notifications.senderId as any, me.friends)
        )
      );
    }

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const notifs = await db.select().from(notifications).where(
      and(
        eq(notifications.recipientId, userId),
        or(eq(notifications.read, false), gte(notifications.createdAt, twelveHoursAgo))
      )
    ).orderBy(desc(notifications.createdAt));

    const senderIds = [...new Set(notifs.map(n => n.senderId).filter(Boolean) as string[])];
    const postIds = [...new Set(notifs.map(n => n.postId).filter(Boolean) as string[])];
    const senderMap = await getUserMap(senderIds);
    const postMap = await getPostMap(postIds);

    const formatted = notifs.map(n => ({
      ...n,
      sender: n.senderId ? senderMap[n.senderId] : null,
      postId: n.postId ? postMap[n.postId] || n.postId : null,
    }));
    res.status(200).json(formatted);
  });

  app.put(api.notifications.readAll.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const result = await db.update(notifications).set({ read: true })
      .where(and(eq(notifications.recipientId, userId), eq(notifications.read, false)));
    res.status(200).json({ updated: result.rowCount || 0 });
  });

  app.put(api.notifications.markRead.path, authenticate, async (req: Request, res: Response) => {
    const [notif] = await db.update(notifications).set({ read: true })
      .where(eq(notifications.id, req.params.id)).returning();
    res.status(200).json(notif);
  });

  // ─── Search ──────────────────────────────────────────────────────────────────

  app.get(api.search.query.path, authenticate, async (req: Request, res: Response) => {
    const q = (req.query.q as string || "").trim();
    if (!q || q.length < 2) return res.status(200).json({ users: [], posts: [] });
    const pattern = `%${q}%`;
    const [userRows, postRows] = await Promise.all([
      db.select({
        id: users.id, name: users.name, username: users.username,
        profilePicture: users.profilePicture, lastSeen: users.lastSeen,
        isAdmin: users.isAdmin, status: users.status, isVerified: users.isVerified,
      }).from(users).where(
        and(
          or(ilike(users.name, pattern), ilike(users.username, pattern)),
          ne(users.username, 'nx-connect')
        )
      ).limit(8),
      db.select().from(posts).where(
        and(ilike(posts.content, pattern), eq(posts.hidden, false))
      ).orderBy(desc(posts.createdAt)).limit(8),
    ]);
    const postAuthorMap = await getUserMap(postRows.map(p => p.authorId));
    const formattedPosts = postRows.map(p => ({ ...p, author: postAuthorMap[p.authorId] }));
    res.status(200).json({ users: userRows, posts: formattedPosts });
  });

  app.get('/api/app-url', (_req: Request, res: Response) => {
    const domains = process.env.REPLIT_DOMAINS;
    if (domains) {
      const primary = domains.split(',')[0].trim();
      return res.json({ url: `https://${primary}` });
    }
    res.json({ url: null });
  });

  // ─── Admin ───────────────────────────────────────────────────────────────────

  app.get(api.admin.users.path, adminOnly, async (req: Request, res: Response) => {
    const allUsers = await db.select({
      id: users.id, name: users.name, username: users.username,
      email: users.email, phone: users.phone, profilePicture: users.profilePicture,
      coverPhoto: users.coverPhoto, isAdmin: users.isAdmin, isVerified: users.isVerified,
      status: users.status, lastSeen: users.lastSeen, friends: users.friends, createdAt: users.createdAt,
    }).from(users).where(ne(users.username, 'nx-connect'));
    res.status(200).json(allUsers);
  });

  app.put(api.admin.restrictUser.path, adminOnly, async (req: Request, res: Response) => {
    const [user] = await db.update(users).set({ status: "restricted", updatedAt: new Date() })
      .where(eq(users.id, req.params.id)).returning();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(safeUser(user));
  });

  app.put(api.admin.reactivateUser.path, adminOnly, async (req: Request, res: Response) => {
    const [user] = await db.update(users).set({ status: "active", updatedAt: new Date() })
      .where(eq(users.id, req.params.id)).returning();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(safeUser(user));
  });

  app.patch(api.admin.verifyUser.path, adminOnly, async (req: Request, res: Response) => {
    const { id } = req.params;
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) return res.status(404).json({ message: "User not found" });
    const [updated] = await db.update(users).set({ isVerified: !existing.isVerified, updatedAt: new Date() })
      .where(eq(users.id, id)).returning();
    res.status(200).json(safeUser(updated));
  });

  app.delete(api.admin.deleteUser.path, adminOnly, async (req: Request, res: Response) => {
    const id = req.params.id;
    const [target] = await db.select({ id: users.id, username: users.username })
      .from(users).where(eq(users.id, id)).limit(1);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.username === 'nx-connect') return res.status(400).json({ message: "Cannot delete system account" });

    // Delete all user content
    const userPostIds = await db.select({ id: posts.id }).from(posts).where(eq(posts.authorId, id));
    if (userPostIds.length > 0) {
      await db.delete(comments).where(inArray(comments.postId, userPostIds.map(p => p.id)));
    }
    await Promise.all([
      db.delete(posts).where(eq(posts.authorId, id)),
      db.delete(comments).where(eq(comments.authorId, id)),
      db.delete(messages).where(eq(messages.senderId, id)),
      db.delete(notifications).where(eq(notifications.recipientId, id)),
      db.delete(notifications).where(eq(notifications.senderId as any, id)),
      db.delete(dailyPhotos).where(eq(dailyPhotos.authorId, id)),
      db.delete(forgotPasswords).where(eq(forgotPasswords.userId, id)),
    ]);

    // Remove from other users' friend arrays
    await Promise.all([
      db.update(users).set({ friends: sql`array_remove(${users.friends}, ${id})`, updatedAt: new Date() })
        .where(sql`${id} = ANY(${users.friends})`),
      db.update(users).set({ friendRequests: sql`array_remove(${users.friendRequests}, ${id})`, updatedAt: new Date() })
        .where(sql`${id} = ANY(${users.friendRequests})`),
      db.update(users).set({ sentRequests: sql`array_remove(${users.sentRequests}, ${id})`, updatedAt: new Date() })
        .where(sql`${id} = ANY(${users.sentRequests})`),
    ]);

    // Remove from conversations
    await db.update(conversations).set({
      participants: sql`array_remove(${conversations.participants}, ${id})`,
      unreadBy: sql`array_remove(${conversations.unreadBy}, ${id})`,
      updatedAt: new Date(),
    }).where(sql`${id} = ANY(${conversations.participants})`);

    await db.delete(users).where(eq(users.id, id));
    res.status(200).json({ message: "User deleted successfully" });
  });

  app.put(api.admin.changePassword.path, adminOnly, async (req: Request, res: Response) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    await db.update(users).set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, req.params.id));
    res.status(200).json({ message: "Password updated" });
  });

  app.post(api.admin.sendNotification.path, adminOnly, async (req: Request, res: Response) => {
    const { content, userId } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Content is required" });
    if (userId) {
      await db.insert(notifications).values({ recipientId: userId, type: 'system', content });
    } else {
      const allUsers = await db.select({ id: users.id }).from(users);
      if (allUsers.length > 0) {
        await db.insert(notifications).values(allUsers.map(u => ({ recipientId: u.id, type: 'system', content })));
      }
    }
    res.status(201).json({ message: "Notification sent" });
  });

  app.get(api.admin.dashboardStats.path, adminOnly, async (req: Request, res: Response) => {
    const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`count(*)::int` }).from(users);
    const [{ totalPosts }] = await db.select({ totalPosts: sql<number>`count(*)::int` }).from(posts);
    res.status(200).json({ totalUsers, totalPosts });
  });

  app.get(api.admin.passwordRequests.path, adminOnly, async (req: Request, res: Response) => {
    const requests = await db.select().from(forgotPasswords).where(eq(forgotPasswords.status, "pending"));
    const userIds = requests.map(r => r.userId).filter(Boolean) as string[];
    const userMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const userRows = await db.select({ id: users.id, name: users.name, username: users.username })
        .from(users).where(inArray(users.id, userIds));
      for (const u of userRows) userMap[u.id] = u;
    }
    const formatted = requests.map(r => ({
      ...r, userId: r.userId ? userMap[r.userId] || { id: r.userId } : null,
    }));
    res.status(200).json(formatted);
  });

  app.put(api.admin.resolvePasswordRequest.path, adminOnly, async (req: Request, res: Response) => {
    const [reqDoc] = await db.select().from(forgotPasswords).where(eq(forgotPasswords.id, req.params.id)).limit(1);
    if (!reqDoc) return res.status(404).json({ message: "Not found" });
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "New password is required" });
    const hashedPassword = await bcrypt.hash(password, 10);
    let userPhone = reqDoc.phone;

    if (reqDoc.userId) {
      const [updated] = await db.update(users).set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, reqDoc.userId)).returning();
      if (updated) userPhone = updated.phone || userPhone;
    } else if (reqDoc.username) {
      const [user] = await db.select().from(users).where(eq(users.username, reqDoc.username)).limit(1);
      if (user) {
        await db.update(users).set({ password: hashedPassword, updatedAt: new Date() }).where(eq(users.id, user.id));
        userPhone = user.phone || userPhone;
      }
    }

    await db.update(forgotPasswords).set({ status: "resolved", updatedAt: new Date() })
      .where(eq(forgotPasswords.id, reqDoc.id));
    res.status(200).json({ message: "Password updated", phone: userPhone });
  });

  app.get(api.admin.allPosts.path, adminOnly, async (req: Request, res: Response) => {
    const postRows = await db.select().from(posts).orderBy(desc(posts.createdAt)).limit(500);
    const authorMap = await getUserMap(postRows.map(p => p.authorId));
    const result = postRows.map(p => ({ ...p, author: authorMap[p.authorId] }));
    res.status(200).json(result);
  });

  app.post(api.admin.sendChat.path, adminOnly, async (req: Request, res: Response) => {
    const [nxUser] = await db.select().from(users).where(eq(users.username, 'nx-connect')).limit(1);
    if (!nxUser) return res.status(400).json({ message: 'NX-Connect system account not found' });
    const adminId = nxUser.id;
    const { userId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Content required" });

    let [conversation] = await db.select().from(conversations).where(
      and(
        sql`${adminId} = ANY(${conversations.participants})`,
        sql`${userId} = ANY(${conversations.participants})`,
        eq(conversations.isAdminChat, true)
      )
    ).limit(1);

    if (!conversation) {
      [conversation] = await db.insert(conversations).values({
        participants: [adminId, userId], isAdminChat: true,
      }).returning();
    }

    const [msg] = await db.insert(messages).values({
      conversationId: conversation.id, senderId: adminId, content,
    }).returning();

    await db.update(conversations).set({
      lastMessage: content, lastMessageAt: new Date(),
      unreadBy: [userId], updatedAt: new Date(),
    }).where(eq(conversations.id, conversation.id));

    await db.insert(notifications).values({
      recipientId: userId, type: 'system',
      content: `Admin message: ${content.slice(0, 60)}`,
    });
    res.status(201).json({ message: "Sent" });
  });

  app.post(api.admin.createPost.path, adminOnly, async (req: Request, res: Response) => {
    const [nxUser] = await db.select().from(users).where(eq(users.username, 'nx-connect')).limit(1);
    if (!nxUser) return res.status(400).json({ message: 'NX-Connect system account not found' });
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Content required" });
    const [post] = await db.insert(posts).values({
      authorId: nxUser.id, content, isAdminPost: true,
    }).returning();
    const authorMap = await getUserMap([nxUser.id]);
    res.status(201).json({ ...post, author: authorMap[nxUser.id], likes: [] });
  });

  app.delete(api.admin.deletePost.path, adminOnly, async (req: Request, res: Response) => {
    try {
      const [post] = await db.select().from(posts).where(eq(posts.id, req.params.id)).limit(1);
      if (!post) return res.status(404).json({ message: "Post not found" });
      const reason = req.body?.reason || "Your post was removed for violating NX-Connect community guidelines.";
      await db.delete(comments).where(eq(comments.postId, post.id));
      await db.delete(posts).where(eq(posts.id, post.id));
      await db.insert(notifications).values({
        recipientId: post.authorId, type: 'system',
        content: `⚠️ Your post was removed by NX-Connect admin: "${reason}". If you believe this was a mistake, contact support on WhatsApp: 0713881613.`,
      });
      res.status(200).json({ message: "Post deleted" });
    } catch (err) {
      console.error("Admin delete post error:", err);
      res.status(500).json({ message: "Server error deleting post" });
    }
  });

  app.get(api.admin.getProfile.path, adminOnly, async (_req: Request, res: Response) => {
    const [admin] = await db.select().from(users).where(eq(users.username, 'nx-connect')).limit(1);
    if (!admin) return res.status(404).json({ message: "NX-Connect system account not found" });
    res.json(safeUser(admin));
  });

  app.put(api.admin.updateProfile.path, adminOnly, async (req: Request, res: Response) => {
    const { profilePicture, name } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;
    if (name !== undefined) updates.name = name;
    const [admin] = await db.update(users).set(updates)
      .where(eq(users.username, 'nx-connect')).returning();
    if (!admin) return res.status(404).json({ message: "NX-Connect system account not found" });
    res.json(safeUser(admin));
  });

  // ─── Daily Photos ─────────────────────────────────────────────────────────────

  app.get('/api/photos/my-today', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [photo] = await db.select().from(dailyPhotos).where(
      and(eq(dailyPhotos.authorId, userId), gte(dailyPhotos.createdAt, since))
    ).limit(1);
    if (!photo) return res.json({ hasPosted: false });
    const authorMap = await getUserMap([userId]);
    res.json({ hasPosted: true, photo: { ...photo, author: authorMap[userId] } });
  });

  app.get('/api/photos', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const me = await getUserById(userId);
    const visibleIds = [...(me?.friends || []), userId];
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const photos = await db.select().from(dailyPhotos).where(
      and(inArray(dailyPhotos.authorId, visibleIds), gte(dailyPhotos.createdAt, since))
    ).orderBy(desc(dailyPhotos.createdAt));
    const authorMap = await getUserMap(photos.map(p => p.authorId));
    const result = photos.map(p => ({ ...p, author: authorMap[p.authorId] }));
    res.json(result);
  });

  app.post('/api/photos', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const parsed = api.photos.create.input.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [existing] = await db.select({ id: dailyPhotos.id, createdAt: dailyPhotos.createdAt })
      .from(dailyPhotos).where(
        and(eq(dailyPhotos.authorId, userId), gte(dailyPhotos.createdAt, since))
      ).limit(1);
    if (existing) {
      const nextAllowed = new Date(existing.createdAt.getTime() + 24 * 60 * 60 * 1000);
      return res.status(429).json({ message: "You can only post one photo per day.", nextAllowed: nextAllowed.toISOString() });
    }
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [photo] = await db.insert(dailyPhotos).values({
      authorId: userId, imageUrl: parsed.data.imageUrl,
      caption: parsed.data.caption || "", expiresAt,
    }).returning();
    const authorMap = await getUserMap([userId]);
    res.status(201).json({ ...photo, author: authorMap[userId] });
  });

  app.delete('/api/photos/:id', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;
    const [photo] = await db.select().from(dailyPhotos).where(eq(dailyPhotos.id, id)).limit(1);
    if (!photo) return res.status(404).json({ message: "Photo not found" });
    const reqUser = await getUserById(userId);
    if (photo.authorId !== userId && !reqUser?.isAdmin) return res.status(403).json({ message: "Forbidden" });
    await db.delete(dailyPhotos).where(eq(dailyPhotos.id, id));
    res.json({ success: true });
  });

  return httpServer;
}
