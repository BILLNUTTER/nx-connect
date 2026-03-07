import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:admin@whatsapp-cluster.38vq8k0.mongodb.net/nutterxfb";

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected successfully.");
    
    // Configure mongoose to transform _id to id when calling toJSON
    mongoose.set('toJSON', {
      virtuals: true,
      transform: (doc, converted) => {
        delete converted._id;
        delete converted.__v;
      }
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}
