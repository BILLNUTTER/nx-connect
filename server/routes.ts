import type { Express, Request, Response } from "express";
import type { Server } from "http";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { connectDB } from "./db";
import { User, Post, Comment, Message, Conversation, Notification, ForgotPassword, DailyPhoto } from "./models";
import { generateToken, authenticate, adminOnly } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Connect to MongoDB
  await connectDB();

  // Seed dedicated NX-Connect system account (admin identity, never tied to any real user login)
  const nxExists = await User.findOne({ username: 'nx-connect' });
  if (!nxExists) {
    const hashedPw = await bcrypt.hash('nxconnect-system-' + Date.now(), 10);
    await User.create({
      name: 'NX-Connect',
      username: 'nx-connect',
      email: 'system@nx-connect.internal',
      phone: '0000000000',
      password: hashedPw,
      isAdmin: true,
      profilePicture: '',
    });
    console.log('[seed] NX-Connect system account created.');
  }

  // Auth Routes
  app.post(api.auth.signup.path, async (req: Request, res: Response) => {
    try {
      const input = api.auth.signup.input.parse(req.body);
      if (input.username === 'nx-connect') {
        return res.status(400).json({ message: "Username not available" });
      }
      const existingUser = await User.findOne({ $or: [{ username: input.username }, { email: input.email }] });
      
      if (existingUser) {
        return res.status(400).json({ message: "Username or email already exists" });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = new User({ ...input, password: hashedPassword });
      await user.save();

      // Send notification to all users about new follow suggestions
      try {
        const allUsers = await User.find({ _id: { $ne: user._id }, username: { $ne: 'nx-connect' } });
        if (allUsers.length > 0) {
          const notifications = allUsers.map(u => ({
            recipientId: u._id,
            type: 'system',
            content: `${input.name} just joined! New follow suggestion available.`
          }));
          await Notification.insertMany(notifications);
        }
      } catch (notifError) {
        console.error("Failed to create welcome notifications:", notifError);
        // Don't fail signup if notifications fail
      }

      const token = generateToken(user.id);
      res.status(201).json({ token, user: user.toJSON() });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Signup error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post(api.auth.login.path, async (req: Request, res: Response) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await User.findOne({ username: input.username });
      
      if (!user || user.username === 'nx-connect') {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.status === "restricted") {
        return res.status(401).json({ message: "Account is restricted" });
      }

      const isValid = await bcrypt.compare(input.password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken(user.id);
      res.status(200).json({ token, user: user.toJSON() });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get(api.auth.me.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    res.status(200).json(user.toJSON());
  });

  app.post(api.auth.forgotPassword.path, async (req: Request, res: Response) => {
    const { phone, email } = req.body;
    if (!phone || !email) return res.status(400).json({ message: "Phone and email are required" });
    const user = await User.findOne({ $or: [{ email }, { phone }] });
    const request = new ForgotPassword({
      userId: user?._id,
      username: user?.username,
      phone,
      email,
    });
    await request.save();
    res.status(200).json({ message: "Password reset request submitted" });
  });

  app.put(api.auth.updateProfile.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { profilePicture, coverPhoto, name, username, phone } = req.body;
    const updates: any = {};
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;
    if (coverPhoto !== undefined) updates.coverPhoto = coverPhoto;
    if (name?.trim()) updates.name = name.trim();
    if (phone?.trim()) updates.phone = phone.trim();
    if (username?.trim()) {
      const existing = await User.findOne({ username: username.trim(), _id: { $ne: userId } });
      if (existing) return res.status(400).json({ message: "Username already taken" });
      updates.username = username.trim();
    }
    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    if (!user) return res.status(404).json({ message: "Not found" });
    res.status(200).json(user.toJSON());
  });

  app.put('/api/auth/change-password', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both current and new password are required" });
    if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const valid = await bcrypt.compare(currentPassword, user.password as string);
    if (!valid) return res.status(401).json({ message: "Current password is incorrect" });
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(userId, { password: hashed });
    res.status(200).json({ message: "Password changed successfully" });
  });

  // Post Routes
  app.get(api.posts.list.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const me = await User.findById(userId).select('friends');
    const friendSet = new Set<string>((me?.friends || []).map((f: any) => f.toString()));

    const now = new Date();
    const posts = await Post.find({
      $and: [
        { $or: [{ hidden: false }, { hidden: { $exists: false } }, { isAdminPost: true }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] }
      ]
    }).populate('authorId', 'name username profilePicture lastSeen').sort({ createdAt: -1 });

    const filteredPosts = posts.filter(p => p._id && p.authorId && p.content);
    const postIds = filteredPosts.map(p => p._id);

    const comments = await Comment.find({ postId: { $in: postIds } })
      .populate('authorId', 'name username profilePicture lastSeen')
      .sort({ createdAt: -1 });

    const commentsByPost: Record<string, { count: number; latest: any }> = {};
    for (const c of comments) {
      const pid = c.postId.toString();
      if (!commentsByPost[pid]) commentsByPost[pid] = { count: 0, latest: null };
      commentsByPost[pid].count++;
      if (!commentsByPost[pid].latest) {
        const cd = c.toJSON() as any;
        cd.author = cd.authorId;
        commentsByPost[pid].latest = cd;
      }
    }

    const allFriendLikeIds = new Set<string>();
    for (const p of filteredPosts) {
      for (const likeId of p.likes) {
        const id = likeId.toString();
        if (friendSet.has(id)) allFriendLikeIds.add(id);
      }
    }
    const friendLikers = await User.find({ _id: { $in: [...allFriendLikeIds] } }).select('name username profilePicture lastSeen');
    const friendLikerMap: Record<string, any> = {};
    for (const fl of friendLikers) {
      friendLikerMap[(fl._id as any).toString()] = { id: fl.id, name: (fl as any).name, profilePicture: (fl as any).profilePicture };
    }

    const formattedPosts = filteredPosts.map(p => {
      const doc = p.toJSON() as any;
      doc.author = doc.authorId;
      const pid = (p._id as any).toString();
      doc.commentCount = commentsByPost[pid]?.count || 0;
      doc.latestComment = commentsByPost[pid]?.latest || null;
      const friendLikeId = p.likes.map((id: any) => id.toString()).find((id: string) => friendLikerMap[id]);
      doc.friendLike = friendLikeId ? friendLikerMap[friendLikeId] : null;
      return doc;
    });
    res.status(200).json(formattedPosts);
  });

  app.delete(api.posts.delete.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const reqUser = await User.findById(userId).select('isAdmin');
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });
    if (post.authorId.toString() !== userId && !(reqUser as any)?.isAdmin) return res.status(403).json({ message: "Forbidden" });
    await Post.deleteOne({ _id: post._id });
    await Comment.deleteMany({ postId: post._id });
    res.status(200).json({ message: "Post deleted" });
  });

  app.patch(api.posts.hide.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });
    if (post.authorId.toString() !== userId) return res.status(403).json({ message: "Forbidden" });
    post.hidden = !post.hidden;
    await post.save();
    await post.populate('authorId', 'name username profilePicture lastSeen');
    const doc = post.toJSON() as any;
    doc.author = doc.authorId;
    res.status(200).json(doc);
  });

  app.post(api.posts.create.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const input = api.posts.create.input.parse(req.body);

    let expiresAt: Date | null = null;
    if (input.imageUrl) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existing = await Post.findOne({ authorId: userId, imageUrl: { $ne: null, $exists: true }, createdAt: { $gte: since } });
      if (existing) {
        const nextAllowed = new Date(existing.createdAt!.getTime() + 24 * 60 * 60 * 1000);
        return res.status(429).json({ message: "You can only post one photo per day.", nextAllowed: nextAllowed.toISOString() });
      }
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    
    const post = new Post({ authorId: userId, content: input.content, imageUrl: input.imageUrl || null, expiresAt });
    await post.save();
    
    await post.populate('authorId', 'name username profilePicture lastSeen');
    const doc = post.toJSON() as any;
    doc.author = doc.authorId;
    
    // Send notifications to friends
    const user = await User.findById(userId);
    if (user && user.friends) {
      const notifications = user.friends.map(friendId => ({
        recipientId: friendId,
        senderId: userId,
        type: 'friend_post',
        postId: post._id,
        content: `${user.name} created a new post`
      }));
      await Notification.insertMany(notifications);
    }
    
    res.status(201).json(doc);
  });

  app.post(api.posts.like.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });

    const index = post.likes.indexOf(userId);
    if (index === -1) {
      post.likes.push(userId);
      // Notify author
      if (post.authorId.toString() !== userId) {
        const liker = await User.findById(userId).select('name');
        await new Notification({
          recipientId: post.authorId,
          senderId: userId,
          type: 'like',
          postId: post._id,
          content: `${liker?.name || 'Someone'} liked your post`
        }).save();
      }
    } else {
      post.likes.splice(index, 1);
    }
    await post.save();
    res.status(200).json(post.toJSON());
  });

  // Get single post
  app.get(api.posts.get.path, authenticate, async (req: Request, res: Response) => {
    const post = await Post.findById(req.params.id).populate('authorId', 'name username profilePicture lastSeen');
    if (!post) return res.status(404).json({ message: "Not found" });
    const doc = post.toJSON() as any;
    doc.author = doc.authorId;
    res.status(200).json(doc);
  });

  // Comments
  app.get(api.comments.list.path, authenticate, async (req: Request, res: Response) => {
    const comments = await Comment.find({ postId: req.params.postId })
      .populate('authorId', 'name username profilePicture lastSeen')
      .sort({ createdAt: 1 });
      
    const formatted = comments.map(c => {
      const doc = c.toJSON() as any;
      doc.author = doc.authorId;
      doc.likes = (doc.likes || []).map((id: any) => id?.toString ? id.toString() : id);
      doc.replyTo = doc.replyTo ? doc.replyTo.toString() : null;
      return doc;
    });
    res.status(200).json(formatted);
  });

  app.post(api.comments.create.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const input = api.comments.create.input.parse(req.body);
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = new Comment({
      postId: post._id,
      authorId: userId,
      content: input.content,
      ...(req.body.replyTo ? { replyTo: req.body.replyTo } : {})
    });
    await comment.save();
    await comment.populate('authorId', 'name username profilePicture lastSeen');
    
    if (post.authorId.toString() !== userId) {
      const commenter = await User.findById(userId).select('name');
      await new Notification({
        recipientId: post.authorId,
        senderId: userId,
        type: 'comment',
        postId: post._id,
        content: `${commenter?.name || 'Someone'} commented on your post`
      }).save();
    }

    const doc = comment.toJSON() as any;
    doc.author = doc.authorId;
    doc.likes = [];
    doc.replyTo = doc.replyTo ? doc.replyTo.toString() : null;
    res.status(201).json(doc);
  });

  // Like/unlike a comment
  app.post('/api/posts/:postId/comments/:commentId/like', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    const alreadyLiked = comment.likes.some((id: any) => id.toString() === userId);
    if (alreadyLiked) {
      comment.likes = comment.likes.filter((id: any) => id.toString() !== userId);
    } else {
      comment.likes.push(userId);
    }
    await comment.save();
    const doc = comment.toJSON() as any;
    doc.likes = (doc.likes || []).map((id: any) => id?.toString ? id.toString() : id);
    res.status(200).json(doc);
  });

  // Users (Friends, Discover) - Only show users who joined AFTER current user, no pending requests or existing friendship
  app.get(api.users.discover.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const me = await User.findById(userId);
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    // Exclude: self, friends, people we sent requests to, people who sent us requests
    // Also exclude users who joined before current user (only show newer users)
    const excludeIds = [userId, ...me.friends, ...me.friendRequests, ...me.sentRequests];
    const users = await User.find({ 
      _id: { $nin: excludeIds }, 
      isAdmin: false, 
      name: { $exists: true, $ne: "" }
    })
      .select('name username profilePicture _id')
      .limit(20);
      
    res.status(200).json(users.map(u => u.toJSON()));
  });

  app.get(api.users.friends.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const me = await User.findById(userId).populate('friends', 'name username profilePicture lastSeen');
    res.status(200).json(me?.friends || []);
  });

  app.get(api.users.friendRequests.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const me = await User.findById(userId).populate('friendRequests', 'name username profilePicture lastSeen');
    res.status(200).json(me?.friendRequests || []);
  });

  app.post(api.users.sendRequest.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const targetId = req.params.id;
    if (userId === targetId) return res.status(400).json({ message: "Cannot request yourself" });

    const me = await User.findById(userId);
    const target = await User.findById(targetId);
    
    if (!target || !me) return res.status(404).json({ message: "User not found" });
    if (me.friends.includes(targetId) || me.sentRequests.includes(targetId)) {
      return res.status(400).json({ message: "Already friends or requested" });
    }

    me.sentRequests.push(targetId);
    target.friendRequests.push(userId);
    await me.save();
    await target.save();

    // Create notification with explicit content
    const notif = new Notification({
      recipientId: targetId,
      senderId: userId,
      type: 'friend_request',
      content: `${me.name} sent you a friend request`
    });
    await notif.save();

    res.status(200).json({ message: "Request sent" });
  });

  app.post(api.users.acceptRequest.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const requesterId = req.params.id;

    const me = await User.findById(userId);
    const requester = await User.findById(requesterId);

    if (!me || !requester) return res.status(404).json({ message: "User not found" });

    me.friendRequests = me.friendRequests.filter(id => id.toString() !== requesterId);
    requester.sentRequests = requester.sentRequests.filter(id => id.toString() !== userId);

    if (!me.friends.includes(requesterId)) me.friends.push(requesterId);
    if (!requester.friends.includes(userId)) requester.friends.push(userId);

    await me.save();
    await requester.save();

    // Mark the incoming friend_request notification as read
    await Notification.updateMany(
      { recipientId: userId, senderId: requesterId, type: 'friend_request' },
      { $set: { read: true } }
    );

    // Notify requester that their request was accepted
    const meUser = await User.findById(userId);
    await new Notification({
      recipientId: requesterId,
      senderId: userId,
      type: 'friend_accept',
      content: `${meUser?.name} accepted your friend request`
    }).save();

    // Auto-create a conversation between the two new friends with a welcome message
    let convo = await Conversation.findOne({
      participants: { $all: [userId, requesterId], $size: 2 }
    });
    if (!convo) {
      const welcomeText = `🎉 You and ${meUser?.name} are now friends! Start chatting.`;
      convo = new Conversation({
        participants: [userId, requesterId],
        lastMessage: welcomeText,
        lastMessageAt: new Date(),
        unreadBy: [requesterId],
      });
      await convo.save();
      // Send system welcome message
      await new Message({
        conversationId: convo._id,
        senderId: userId,
        content: welcomeText,
        isSystem: true,
      }).save();
    }

    res.status(200).json({ message: "Request accepted" });
  });

  app.post(api.users.unfriend.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const targetId = req.params.id;

    const me = await User.findById(userId);
    const target = await User.findById(targetId);

    if (me) {
      me.friends = me.friends.filter(id => id.toString() !== targetId);
      await me.save();
    }
    if (target) {
      target.friends = target.friends.filter(id => id.toString() !== userId);
      await target.save();
    }

    res.status(200).json({ message: "Unfriended" });
  });

  app.get(api.users.profile.path, authenticate, async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Not found" });
    res.status(200).json(user.toJSON());
  });

  app.get(api.users.posts.path, authenticate, async (req: Request, res: Response) => {
    const viewerId = (req as any).userId;
    const isOwner = viewerId === req.params.id;
    const query: any = { authorId: req.params.id, isAdminPost: { $ne: true } };
    if (!isOwner) query.$or = [{ hidden: false }, { hidden: { $exists: false } }];
    const posts = await Post.find(query)
      .populate('authorId', 'name username profilePicture lastSeen')
      .sort({ createdAt: -1 });
    const formatted = posts.map(p => {
      const doc = p.toJSON() as any;
      doc.author = doc.authorId;
      return doc;
    });
    res.status(200).json(formatted);
  });

  // Chats
  app.get(api.chats.conversations.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const convos = await Conversation.find({ participants: userId })
      .populate('participants', 'name username profilePicture lastSeen')
      .populate('adminId', 'name username id')
      .sort({ lastMessageAt: -1, updatedAt: -1 });
    
    const formatted = convos.map(c => {
      const doc = c.toJSON() as any;
      if (!doc.isGroup) {
        const other = doc.participants.find((p: any) => p.id !== userId);
        doc.otherUser = other;
      }
      doc.unreadCount = (doc.unreadBy || []).some((uid: any) => uid.toString() === userId.toString()) ? 1 : 0;
      return doc;
    });
    
    res.status(200).json(formatted);
  });

  app.post(api.chats.getOrCreate.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const otherId = req.params.userId;

    let convo = await Conversation.findOne({
      participants: { $all: [userId, otherId], $size: 2 }
    });

    if (!convo) {
      convo = new Conversation({ participants: [userId, otherId] });
      await convo.save();
    }

    res.status(200).json(convo.toJSON());
  });

  app.get(api.chats.messages.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const messages = await Message.find({ conversationId: req.params.conversationId })
      .populate('senderId', 'name username profilePicture')
      .populate({ path: 'replyTo', populate: { path: 'senderId', select: 'name username' } })
      .sort({ createdAt: 1 });
    // Mark conversation as read for this user AND add userId to readBy on all messages not sent by them
    await Conversation.findByIdAndUpdate(req.params.conversationId, {
      $pull: { unreadBy: userId }
    });
    await Message.updateMany(
      { conversationId: req.params.conversationId, senderId: { $ne: userId }, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );
    const formatted = messages.map(m => {
      const doc = m.toJSON() as any;
      if (doc.senderId && typeof doc.senderId === 'object') {
        doc.sender = doc.senderId;
        doc.senderId = doc.senderId.id || doc.senderId._id;
      }
      if (doc.replyTo && typeof doc.replyTo === 'object') {
        if (doc.replyTo.senderId && typeof doc.replyTo.senderId === 'object') {
          doc.replyTo.senderName = doc.replyTo.senderId.name || doc.replyTo.senderId.username;
          doc.replyTo.senderId = doc.replyTo.senderId.id || doc.replyTo.senderId._id;
        }
      }
      // Normalize readBy to strings
      doc.readBy = (doc.readBy || []).map((id: any) => id?.toString ? id.toString() : id);
      return doc;
    });
    res.status(200).json(formatted);
  });

  app.post(api.chats.sendMessage.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const msg = new Message({
      conversationId: req.params.conversationId,
      senderId: userId,
      content: req.body.content,
      ...(req.body.replyTo ? { replyTo: req.body.replyTo } : {})
    });
    await msg.save();
    // Update conversation's lastMessage and mark other participants as having unread
    const convo = await Conversation.findById(req.params.conversationId);
    if (convo) {
      const others = convo.participants.filter((p: any) => p.toString() !== userId.toString());
      convo.lastMessage = req.body.content;
      convo.lastMessageAt = new Date();
      for (const otherId of others) {
        if (!convo.unreadBy.some((uid: any) => uid.toString() === otherId.toString())) {
          convo.unreadBy.push(otherId);
        }
      }
      await convo.save();
    }
    res.status(201).json(msg.toJSON());
  });

  // Groups
  app.post('/api/groups', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { groupName, groupPhoto, memberIds } = req.body;
    if (!groupName?.trim()) return res.status(400).json({ message: "Group name is required" });
    const members: string[] = Array.isArray(memberIds) ? memberIds : [];
    const allParticipants = [userId, ...members.filter((id: string) => id !== userId)];
    const inviteToken = crypto.randomUUID();
    const group = new Conversation({
      isGroup: true,
      groupName: groupName.trim(),
      groupPhoto: groupPhoto || '',
      adminId: userId,
      participants: allParticipants,
      inviteToken,
      lastMessage: `Group "${groupName.trim()}" created`,
      lastMessageAt: new Date(),
    });
    await group.save();
    const systemMsg = new Message({ conversationId: group._id, senderId: userId, content: `Group "${groupName.trim()}" was created.`, isSystem: true });
    await systemMsg.save();
    const populated = await Conversation.findById(group._id).populate('participants', 'name username profilePicture lastSeen').populate('adminId', 'name username');
    res.status(201).json(populated!.toJSON());
  });

  app.put('/api/groups/:id', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const group = await Conversation.findOne({ _id: req.params.id, isGroup: true });
    if (!group) return res.status(404).json({ message: "Group not found" });
    if ((group.adminId as any)?.toString() !== userId) return res.status(403).json({ message: "Only the group admin can edit settings" });
    const { groupName, groupPhoto } = req.body;
    if (groupName?.trim()) group.groupName = groupName.trim();
    if (groupPhoto !== undefined) group.groupPhoto = groupPhoto;
    await group.save();
    const populated = await Conversation.findById(group._id).populate('participants', 'name username profilePicture lastSeen').populate('adminId', 'name username');
    res.status(200).json(populated!.toJSON());
  });

  app.delete('/api/groups/:id/members/:memberId', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const group = await Conversation.findOne({ _id: req.params.id, isGroup: true });
    if (!group) return res.status(404).json({ message: "Group not found" });
    if ((group.adminId as any)?.toString() !== userId) return res.status(403).json({ message: "Only the group admin can remove members" });
    const memberId = req.params.memberId;
    if (memberId === userId) return res.status(400).json({ message: "Admin cannot remove themselves" });
    group.participants = (group.participants as any[]).filter((p: any) => p.toString() !== memberId);
    await group.save();
    const sysMsg = new Message({ conversationId: group._id, senderId: userId, content: `A member was removed from the group.`, isSystem: true });
    await sysMsg.save();
    res.status(200).json({ message: "Member removed" });
  });

  app.post('/api/groups/leave/:id', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const group = await Conversation.findOne({ _id: req.params.id, isGroup: true });
    if (!group) return res.status(404).json({ message: "Group not found" });
    if ((group.adminId as any)?.toString() === userId) return res.status(400).json({ message: "Admin cannot leave — transfer admin or delete the group" });
    group.participants = (group.participants as any[]).filter((p: any) => p.toString() !== userId);
    await group.save();
    res.status(200).json({ message: "Left group" });
  });

  app.get('/api/groups/join/:token', async (req: Request, res: Response) => {
    const group = await Conversation.findOne({ inviteToken: req.params.token, isGroup: true })
      .populate('participants', 'name username profilePicture lastSeen')
      .populate('adminId', 'name username');
    if (!group) return res.status(404).json({ message: "Invalid or expired invite link" });
    res.status(200).json(group.toJSON());
  });

  app.post('/api/groups/join/:token', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const group = await Conversation.findOne({ inviteToken: req.params.token, isGroup: true });
    if (!group) return res.status(404).json({ message: "Invalid or expired invite link" });
    const alreadyMember = (group.participants as any[]).some((p: any) => p.toString() === userId);
    if (alreadyMember) return res.status(200).json(group.toJSON());
    group.participants.push(userId as any);
    await group.save();
    const sysMsg = new Message({ conversationId: group._id, senderId: userId, content: `A new member joined via invite link.`, isSystem: true });
    await sysMsg.save();
    const populated = await Conversation.findById(group._id).populate('participants', 'name username profilePicture lastSeen').populate('adminId', 'name username');
    res.status(200).json(populated!.toJSON());
  });

  // Notifications
  app.get(api.notifications.list.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    // Auto-mark friend_request notifications as read if the friendship is already established
    const me = await User.findById(userId);
    if (me && me.friends.length > 0) {
      await Notification.updateMany(
        { recipientId: userId, type: 'friend_request', read: false, senderId: { $in: me.friends } },
        { $set: { read: true } }
      );
    }

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const notifs = await Notification.find({
      recipientId: userId,
      $or: [{ read: false }, { createdAt: { $gte: twelveHoursAgo } }]
    })
      .populate('senderId', 'name username profilePicture id')
      .populate('postId', 'content id')
      .sort({ createdAt: -1 });
    const formatted = notifs.map(n => {
      const doc = n.toJSON() as any;
      if (doc.senderId) {
        doc.sender = doc.senderId;
      }
      return doc;
    });
    res.status(200).json(formatted);
  });

  app.put(api.notifications.readAll.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const result = await Notification.updateMany({ recipientId: userId, read: false }, { read: true });
    res.status(200).json({ updated: result.modifiedCount });
  });

  app.put(api.notifications.markRead.path, authenticate, async (req: Request, res: Response) => {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    res.status(200).json(notif?.toJSON());
  });

  app.get(api.search.query.path, authenticate, async (req: Request, res: Response) => {
    const q = (req.query.q as string || "").trim();
    if (!q || q.length < 2) return res.status(200).json({ users: [], posts: [] });
    const regex = new RegExp(q, "i");
    const [users, posts] = await Promise.all([
      User.find({ $or: [{ name: regex }, { username: regex }], username: { $ne: 'nx-connect' } }).select('-password').limit(8),
      Post.find({ content: regex, $or: [{ hidden: false }, { hidden: { $exists: false } }] })
        .populate('authorId', 'name username profilePicture lastSeen').sort({ createdAt: -1 }).limit(8),
    ]);
    const formattedPosts = posts.map(p => {
      const doc = p.toJSON() as any;
      doc.author = doc.authorId;
      return doc;
    });
    res.status(200).json({ users: users.map(u => u.toJSON()), posts: formattedPosts });
  });

  // Admin
  app.get(api.admin.users.path, adminOnly, async (req: Request, res: Response) => {
    const users = await User.find({ username: { $ne: 'nx-connect' } }).select('-password');
    res.status(200).json(users.map(u => u.toJSON()));
  });

  app.put(api.admin.restrictUser.path, adminOnly, async (req: Request, res: Response) => {
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { status: "restricted" }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user.toJSON());
  });

  app.put(api.admin.reactivateUser.path, adminOnly, async (req: Request, res: Response) => {
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { status: "active" }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user.toJSON());
  });

  app.put(api.admin.changePassword.path, adminOnly, async (req: Request, res: Response) => {
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });
    res.status(200).json({ message: "Password updated" });
  });

  app.post(api.admin.sendNotification.path, adminOnly, async (req: Request, res: Response) => {
    const { content, userId } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Content is required" });
    if (userId) {
      await new Notification({ recipientId: userId, type: 'system', content }).save();
    } else {
      const users = await User.find({ _id: { $exists: true, $ne: null } });
      const notifs = users
        .filter(u => u._id)
        .map(u => ({ recipientId: u._id, type: 'system', content }));
      if (notifs.length > 0) {
        await Notification.insertMany(notifs);
      }
    }
    res.status(201).json({ message: "Notification sent" });
  });

  app.get(api.admin.dashboardStats.path, adminOnly, async (req: Request, res: Response) => {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    res.status(200).json({ totalUsers, totalPosts });
  });

  app.get(api.admin.passwordRequests.path, adminOnly, async (req: Request, res: Response) => {
    const requests = await ForgotPassword.find({ status: "pending" }).populate('userId', 'name username');
    res.status(200).json(requests.map(r => r.toJSON()));
  });

  app.put(api.admin.resolvePasswordRequest.path, adminOnly, async (req: Request, res: Response) => {
    const reqDoc = await ForgotPassword.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: "Not found" });
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "New password is required" });

    let userPhone = (reqDoc as any).phone;
    if (reqDoc.userId) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const updated = await User.findByIdAndUpdate(reqDoc.userId, { password: hashedPassword }, { new: true }).select('phone');
      if (updated) userPhone = (updated as any).phone || userPhone;
    } else if (reqDoc.username) {
      const user = await User.findOne({ username: reqDoc.username });
      if (user) {
        user.password = await bcrypt.hash(password, 10);
        await user.save();
        userPhone = (user as any).phone || userPhone;
      }
    }

    reqDoc.status = "resolved";
    await reqDoc.save();
    res.status(200).json({ message: "Password updated", phone: userPhone });
  });

  app.get(api.admin.allPosts.path, adminOnly, async (req: Request, res: Response) => {
    const posts = await Post.find()
      .populate('authorId', 'name username profilePicture lastSeen')
      .sort({ createdAt: -1 })
      .limit(500);
    const result = posts.map((p: any) => {
      const doc = p.toJSON();
      doc.author = doc.authorId;
      doc.likes = doc.likes || [];
      return doc;
    });
    res.status(200).json(result);
  });

  app.post(api.admin.sendChat.path, adminOnly, async (req: Request, res: Response) => {
    const nxUser = await User.findOne({ username: 'nx-connect' }).lean() as any;
    if (!nxUser) return res.status(400).json({ message: 'NX-Connect system account not found' });
    const adminId = nxUser._id.toString();
    const { userId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Content required" });

    let conversation = await Conversation.findOne({ participants: { $all: [adminId, userId] }, isAdminChat: true });
    if (!conversation) {
      conversation = new Conversation({ participants: [adminId, userId], isAdminChat: true });
      await conversation.save();
    }
    const msg = new Message({ conversationId: conversation._id, senderId: adminId, content });
    await msg.save();
    conversation.lastMessage = content;
    conversation.lastMessageAt = new Date();
    (conversation as any).unreadBy = [userId];
    await conversation.save();

    await new Notification({ recipientId: userId, type: 'system', content: `Admin message: ${content.slice(0, 60)}` }).save();
    res.status(201).json({ message: "Sent" });
  });

  app.post(api.admin.createPost.path, adminOnly, async (req: Request, res: Response) => {
    const nxUser = await User.findOne({ username: 'nx-connect' }).lean() as any;
    if (!nxUser) return res.status(400).json({ message: 'NX-Connect system account not found' });
    const adminId = nxUser._id.toString();
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Content required" });
    const post = new Post({ authorId: adminId, content, isAdminPost: true });
    await post.save();
    await post.populate('authorId', 'name username profilePicture lastSeen');
    const doc = post.toJSON() as any;
    doc.author = doc.authorId;
    doc.likes = [];
    res.status(201).json(doc);
  });

  app.delete(api.admin.deletePost.path, adminOnly, async (req: Request, res: Response) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });
    await Post.deleteOne({ _id: post._id });
    await Comment.deleteMany({ postId: post._id });
    res.status(200).json({ message: "Post deleted" });
  });

  app.get(api.admin.getProfile.path, adminOnly, async (_req: Request, res: Response) => {
    const admin = await User.findOne({ username: 'nx-connect' }).lean() as any;
    if (!admin) return res.status(404).json({ message: "NX-Connect system account not found" });
    res.json({ ...admin, id: admin._id?.toString() });
  });

  app.put(api.admin.updateProfile.path, adminOnly, async (req: Request, res: Response) => {
    const { profilePicture, name } = req.body;
    const updates: any = {};
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;
    if (name !== undefined) updates.name = name;
    const admin = await User.findOneAndUpdate({ username: 'nx-connect' }, { $set: updates }, { new: true }).lean() as any;
    if (!admin) return res.status(404).json({ message: "NX-Connect system account not found" });
    res.json({ ...admin, id: admin._id?.toString() });
  });

  // Daily photos (stories)
  app.get('/api/photos/my-today', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const photo = await DailyPhoto.findOne({ authorId: userId, createdAt: { $gte: since } })
      .populate('authorId', 'name username profilePicture lastSeen');
    if (!photo) return res.json({ hasPosted: false });
    const doc = photo.toObject() as any;
    res.json({ hasPosted: true, photo: { ...doc, id: doc._id?.toString(), author: doc.authorId ? { id: doc.authorId._id?.toString(), name: doc.authorId.name, username: doc.authorId.username, profilePicture: doc.authorId.profilePicture, lastSeen: doc.authorId.lastSeen } : undefined } });
  });

  app.get('/api/photos', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const me = await User.findById(userId).lean() as any;
    const friendIds = (me?.friends || []).map((id: any) => id.toString());
    const visibleIds = [...friendIds, userId];
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const photos = await DailyPhoto.find({ authorId: { $in: visibleIds }, createdAt: { $gte: since } })
      .populate('authorId', 'name username profilePicture lastSeen')
      .sort({ createdAt: -1 });
    const result = photos.map((p: any) => {
      const doc = p.toObject();
      return { ...doc, id: doc._id?.toString(), author: doc.authorId ? { id: doc.authorId._id?.toString(), name: doc.authorId.name, username: doc.authorId.username, profilePicture: doc.authorId.profilePicture, lastSeen: doc.authorId.lastSeen } : undefined };
    });
    res.json(result);
  });

  app.post('/api/photos', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const parsed = api.photos.create.input.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await DailyPhoto.findOne({ authorId: userId, createdAt: { $gte: since } });
    if (existing) {
      const nextAllowed = new Date((existing as any).createdAt.getTime() + 24 * 60 * 60 * 1000);
      return res.status(429).json({ message: "You can only post one photo per day.", nextAllowed: nextAllowed.toISOString() });
    }
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const photo = await DailyPhoto.create({ authorId: userId, imageUrl: parsed.data.imageUrl, caption: parsed.data.caption || "", expiresAt });
    await photo.populate('authorId', 'name username profilePicture lastSeen');
    const doc = (photo as any).toObject();
    res.status(201).json({ ...doc, id: doc._id?.toString(), author: doc.authorId ? { id: doc.authorId._id?.toString(), name: doc.authorId.name, username: doc.authorId.username, profilePicture: doc.authorId.profilePicture, lastSeen: doc.authorId.lastSeen } : undefined });
  });

  return httpServer;
}
