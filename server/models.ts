import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: "" },
  isAdmin: { type: Boolean, default: false },
  status: { type: String, enum: ["active", "restricted"], default: "active" },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  hidden: { type: Boolean, default: false },
}, { timestamps: true });

const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  isSystem: { type: Boolean, default: false },
}, { timestamps: true });

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date, default: null },
  unreadBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ["like", "comment", "friend_request", "friend_accept", "friend_post", "system"], required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  content: { type: String },
  read: { type: Boolean, default: false },
}, { timestamps: true });

const forgotPasswordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String, required: true },
  desiredPassword: { type: String, required: true },
  status: { type: String, enum: ["pending", "resolved"], default: "pending" },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Post = mongoose.models.Post || mongoose.model("Post", postSchema);
export const Comment = mongoose.models.Comment || mongoose.model("Comment", commentSchema);
export const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
export const Conversation = mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);
export const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
export const ForgotPassword = mongoose.models.ForgotPassword || mongoose.model("ForgotPassword", forgotPasswordSchema);
