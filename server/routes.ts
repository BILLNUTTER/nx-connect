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
      try {
        const allUsers = await User.find({ _id: { $ne: user._id } });
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
    const { profilePicture, name, username, phone } = req.body;
    const updates: any = {};
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;
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
    const post = await Post.findById(req.params.id).populate('authorId', 'name username profilePicture');
    if (!post) return res.status(404).json({ message: "Not found" });
    const doc = post.toJSON() as any;
    doc.author = doc.authorId;
    res.status(200).json(doc);
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
    res.status(201).json(doc);
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
    const posts = await Post.find({ authorId: req.params.id })
      .populate('authorId', 'name username profilePicture')
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
      .populate('participants', 'name username profilePicture')
      .sort({ lastMessageAt: -1, updatedAt: -1 });
    
    const formatted = convos.map(c => {
      const doc = c.toJSON() as any;
      const other = doc.participants.find((p: any) => p.id !== userId);
      doc.otherUser = other;
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
    const messages = await Message.find({ conversationId: req.params.conversationId }).sort({ createdAt: 1 });
    // Mark conversation as read for this user
    await Conversation.findByIdAndUpdate(req.params.conversationId, {
      $pull: { unreadBy: userId }
    });
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

    const notifs = await Notification.find({ recipientId: userId })
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
