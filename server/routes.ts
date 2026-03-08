import type { Express, Request, Response } from "express";
import type { Server } from "http";
import bcrypt from "bcrypt";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { connectDB } from "./db";
import { User, Post, Comment, Message, Conversation, Notification, ForgotPassword } from "./models";
import { generateToken, authenticate, adminOnly } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Connect to MongoDB
  await connectDB();

  // Auth Routes
  app.post(api.auth.signup.path, async (req: Request, res: Response) => {
    try {
      const input = api.auth.signup.input.parse(req.body);
      const existingUser = await User.findOne({ $or: [{ username: input.username }, { email: input.email }] });
      
      if (existingUser) {
        return res.status(400).json({ message: "Username or email already exists" });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = new User({ ...input, password: hashedPassword });
      await user.save();

      // Send notification to all users about new follow suggestions
      const allUsers = await User.find({ _id: { $ne: user._id } });
      if (allUsers.length > 0) {
        const notifications = allUsers.map(u => ({
          recipientId: u._id,
          type: 'system',
          content: `${input.name} just joined! New follow suggestion available.`
        }));
        await Notification.insertMany(notifications);
      }

      const token = generateToken(user.id);
      res.status(201).json({ token, user: user.toJSON() });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post(api.auth.login.path, async (req: Request, res: Response) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await User.findOne({ username: input.username });
      
      if (!user) {
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
    const { username, desiredPassword } = req.body;
    const user = await User.findOne({ username });
    
    if (user) {
      const request = new ForgotPassword({ userId: user._id, username, desiredPassword });
      await request.save();
    } else {
      // Create request even if user not found to not leak users? 
      // Actually user wanted forgot password via username. Let's just create it anyway
      const request = new ForgotPassword({ username, desiredPassword });
      await request.save();
    }
    
    res.status(200).json({ message: "Password reset request submitted" });
  });

  app.put(api.auth.updateProfile.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { profilePicture } = req.body;
    const user = await User.findByIdAndUpdate(userId, { profilePicture }, { new: true });
    if (!user) return res.status(404).json({ message: "Not found" });
    res.status(200).json(user.toJSON());
  });

  // Post Routes
  app.get(api.posts.list.path, authenticate, async (req: Request, res: Response) => {
    const posts = await Post.find().populate('authorId', 'name username profilePicture').sort({ createdAt: -1 });
    // Transform authorId to author for response matching schema, filter out bad posts
    const formattedPosts = posts
      .filter(p => p._id && p.authorId && p.content) // Filter out invalid posts
      .map(p => {
        const doc = p.toJSON();
        doc.author = doc.authorId;
        return doc;
      });
    res.status(200).json(formattedPosts);
  });

  app.post(api.posts.create.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const input = api.posts.create.input.parse(req.body);
    
    const post = new Post({ authorId: userId, content: input.content });
    await post.save();
    
    await post.populate('authorId', 'name username profilePicture');
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
        await new Notification({
          recipientId: post.authorId,
          senderId: userId,
          type: 'like',
          postId: post._id
        }).save();
      }
    } else {
      post.likes.splice(index, 1);
    }
    await post.save();
    res.status(200).json(post.toJSON());
  });

  // Comments
  app.get(api.comments.list.path, authenticate, async (req: Request, res: Response) => {
    const comments = await Comment.find({ postId: req.params.postId })
      .populate('authorId', 'name username profilePicture')
      .sort({ createdAt: 1 });
      
    const formatted = comments.map(c => {
      const doc = c.toJSON();
      doc.author = doc.authorId;
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
      content: input.content
    });
    await comment.save();
    await comment.populate('authorId', 'name username profilePicture');
    
    if (post.authorId.toString() !== userId) {
      await new Notification({
        recipientId: post.authorId,
        senderId: userId,
        type: 'comment',
        postId: post._id
      }).save();
    }

    const doc = comment.toJSON() as any;
    doc.author = doc.authorId;
    res.status(201).json(doc);
  });

  // Users (Friends, Discover) - Only show users with no pending requests or existing friendship
  app.get(api.users.discover.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const me = await User.findById(userId);
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    // Exclude: self, friends, people we sent requests to, people who sent us requests
    const excludeIds = [userId, ...me.friends, ...me.friendRequests, ...me.sentRequests];
    const users = await User.find({ _id: { $nin: excludeIds }, isAdmin: false, name: { $exists: true, $ne: "" } })
      .select('name username profilePicture _id')
      .limit(20);
      
    res.status(200).json(users.map(u => u.toJSON()));
  });

  app.get(api.users.friends.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const me = await User.findById(userId).populate('friends', 'name username profilePicture');
    res.status(200).json(me?.friends || []);
  });

  app.get(api.users.friendRequests.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const me = await User.findById(userId).populate('friendRequests', 'name username profilePicture');
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

    await new Notification({
      recipientId: targetId,
      senderId: userId,
      type: 'friend_request'
    }).save();

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

    await new Notification({
      recipientId: requesterId,
      senderId: userId,
      type: 'friend_accept'
    }).save();

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
    const user = await User.findById(req.params.id).select('name username profilePicture');
    if (!user) return res.status(404).json({ message: "Not found" });
    res.status(200).json(user.toJSON());
  });

  // Chats
  app.get(api.chats.conversations.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const convos = await Conversation.find({ participants: userId }).populate('participants', 'name username profilePicture');
    
    const formatted = convos.map(c => {
      const doc = c.toJSON() as any;
      const other = doc.participants.find((p: any) => p.id !== userId);
      doc.otherUser = other;
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
    const messages = await Message.find({ conversationId: req.params.conversationId }).sort({ createdAt: 1 });
    res.status(200).json(messages.map(m => m.toJSON()));
  });

  app.post(api.chats.sendMessage.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const msg = new Message({
      conversationId: req.params.conversationId,
      senderId: userId,
      content: req.body.content
    });
    await msg.save();
    res.status(201).json(msg.toJSON());
  });

  // Notifications
  app.get(api.notifications.list.path, authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const notifs = await Notification.find({ recipientId: userId })
      .populate('senderId', 'name username profilePicture')
      .sort({ createdAt: -1 });
    res.status(200).json(notifs.map(n => n.toJSON()));
  });

  app.put(api.notifications.markRead.path, authenticate, async (req: Request, res: Response) => {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    res.status(200).json(notif?.toJSON());
  });

  // Admin
  app.get(api.admin.users.path, adminOnly, async (req: Request, res: Response) => {
    const users = await User.find().select('-password');
    res.status(200).json(users.map(u => u.toJSON()));
  });

  app.put(api.admin.restrictUser.path, adminOnly, async (req: Request, res: Response) => {
    const user = await User.findByIdAndUpdate(req.params.id, { status: "restricted" }, { new: true }).select('-password');
    res.status(200).json(user?.toJSON());
  });

  app.put(api.admin.reactivateUser.path, adminOnly, async (req: Request, res: Response) => {
    const user = await User.findByIdAndUpdate(req.params.id, { status: "active" }, { new: true }).select('-password');
    res.status(200).json(user?.toJSON());
  });

  app.put(api.admin.changePassword.path, adminOnly, async (req: Request, res: Response) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });
    res.status(200).json({ message: "Password updated" });
  });

  app.post(api.admin.sendNotification.path, adminOnly, async (req: Request, res: Response) => {
    const { content, userId } = req.body;
    if (userId) {
      await new Notification({ recipientId: userId, type: 'system', content }).save();
    } else {
      const users = await User.find();
      const notifs = users.map(u => ({ recipientId: u._id, type: 'system', content }));
      await Notification.insertMany(notifs);
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
    
    if (reqDoc.userId) {
      const hashedPassword = await bcrypt.hash(reqDoc.desiredPassword, 10);
      await User.findByIdAndUpdate(reqDoc.userId, { password: hashedPassword });
    } else {
      const user = await User.findOne({ username: reqDoc.username });
      if (user) {
        const hashedPassword = await bcrypt.hash(reqDoc.desiredPassword, 10);
        user.password = hashedPassword;
        await user.save();
      }
    }
    
    reqDoc.status = "resolved";
    await reqDoc.save();
    res.status(200).json({ message: "Password request resolved" });
  });

  return httpServer;
}
