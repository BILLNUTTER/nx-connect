import { z } from "zod";
import { 
  userSchema, insertUserSchema, loginUserSchema, 
  postSchema, insertPostSchema, 
  commentSchema, insertCommentSchema, 
  messageSchema, conversationSchema, 
  notificationSchema, forgotPasswordSchema,
  dailyPhotoSchema, insertDailyPhotoSchema
} from "./schema";

export const errorSchemas = {
  validation: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  notFound: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    signup: {
      method: 'POST' as const,
      path: '/api/auth/signup' as const,
      input: insertUserSchema,
      responses: {
        201: z.object({ token: z.string(), user: userSchema }),
        400: errorSchemas.validation,
      }
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: loginUserSchema,
      responses: {
        200: z.object({ token: z.string(), user: userSchema }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: userSchema,
        401: errorSchemas.unauthorized,
      }
    },
    forgotPassword: {
      method: 'POST' as const,
      path: '/api/auth/forgot-password' as const,
      input: z.object({ username: z.string(), desiredPassword: z.string() }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      }
    },
    updateProfile: {
      method: 'PUT' as const,
      path: '/api/auth/profile' as const,
      input: z.object({ profilePicture: z.string() }),
      responses: {
        200: userSchema,
        400: errorSchemas.validation,
      }
    }
  },
  posts: {
    list: {
      method: 'GET' as const,
      path: '/api/posts' as const,
      responses: { 200: z.array(postSchema) }
    },
    get: {
      method: 'GET' as const,
      path: '/api/posts/:id' as const,
      responses: { 200: postSchema, 404: errorSchemas.notFound }
    },
    create: {
      method: 'POST' as const,
      path: '/api/posts' as const,
      input: insertPostSchema,
      responses: { 201: postSchema }
    },
    like: {
      method: 'POST' as const,
      path: '/api/posts/:id/like' as const,
      responses: { 200: postSchema, 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/posts/:id' as const,
      responses: { 200: z.object({ message: z.string() }), 403: errorSchemas.unauthorized, 404: errorSchemas.notFound }
    },
    hide: {
      method: 'PATCH' as const,
      path: '/api/posts/:id/hide' as const,
      responses: { 200: postSchema, 403: errorSchemas.unauthorized, 404: errorSchemas.notFound }
    },
    edit: {
      method: 'PATCH' as const,
      path: '/api/posts/:id/edit' as const,
      input: z.object({ content: z.string().min(1) }),
      responses: { 200: postSchema, 403: errorSchemas.unauthorized, 404: errorSchemas.notFound }
    }
  },
  comments: {
    list: {
      method: 'GET' as const,
      path: '/api/posts/:postId/comments' as const,
      responses: { 200: z.array(commentSchema) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/posts/:postId/comments' as const,
      input: insertCommentSchema,
      responses: { 201: commentSchema }
    },
    edit: {
      method: 'PATCH' as const,
      path: '/api/posts/:postId/comments/:commentId' as const,
      input: z.object({ content: z.string().min(1) }),
      responses: { 200: commentSchema, 403: errorSchemas.unauthorized, 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/posts/:postId/comments/:commentId' as const,
      responses: { 200: z.object({ message: z.string() }), 403: errorSchemas.unauthorized, 404: errorSchemas.notFound }
    }
  },
  users: {
    discover: {
      method: 'GET' as const,
      path: '/api/users/discover' as const,
      responses: { 200: z.array(userSchema) }
    },
    friends: {
      method: 'GET' as const,
      path: '/api/users/friends' as const,
      responses: { 200: z.array(userSchema) }
    },
    friendRequests: {
      method: 'GET' as const,
      path: '/api/users/requests' as const,
      responses: { 200: z.array(userSchema) }
    },
    sendRequest: {
      method: 'POST' as const,
      path: '/api/users/:id/request' as const,
      responses: { 200: z.object({ message: z.string() }), 400: errorSchemas.validation }
    },
    acceptRequest: {
      method: 'POST' as const,
      path: '/api/users/:id/accept' as const,
      responses: { 200: z.object({ message: z.string() }) }
    },
    unfriend: {
      method: 'POST' as const,
      path: '/api/users/:id/unfriend' as const,
      responses: { 200: z.object({ message: z.string() }) }
    },
    profile: {
      method: 'GET' as const,
      path: '/api/users/:id' as const,
      responses: { 200: userSchema, 404: errorSchemas.notFound }
    },
    posts: {
      method: 'GET' as const,
      path: '/api/users/:id/posts' as const,
      responses: { 200: z.array(postSchema) }
    }
  },
  chats: {
    conversations: {
      method: 'GET' as const,
      path: '/api/chats' as const,
      responses: {
        200: z.array(conversationSchema.extend({
          otherUser: userSchema.optional(),
        }))
      }
    },
    getOrCreate: {
      method: 'POST' as const,
      path: '/api/chats/user/:userId' as const,
      responses: { 200: conversationSchema }
    },
    messages: {
      method: 'GET' as const,
      path: '/api/chats/:conversationId/messages' as const,
      responses: { 200: z.array(messageSchema) }
    },
    sendMessage: {
      method: 'POST' as const,
      path: '/api/chats/:conversationId/messages' as const,
      input: z.object({ content: z.string() }),
      responses: { 201: messageSchema }
    },
    editMessage: {
      method: 'PATCH' as const,
      path: '/api/chats/:conversationId/messages/:messageId' as const,
      input: z.object({ content: z.string().min(1) }),
      responses: { 200: messageSchema, 403: errorSchemas.unauthorized, 404: errorSchemas.notFound }
    },
    deleteMessage: {
      method: 'DELETE' as const,
      path: '/api/chats/:conversationId/messages/:messageId' as const,
      responses: { 200: z.object({ message: z.string() }), 403: errorSchemas.unauthorized, 404: errorSchemas.notFound }
    }
  },
  notifications: {
    list: {
      method: 'GET' as const,
      path: '/api/notifications' as const,
      responses: { 200: z.array(notificationSchema) }
    },
    markRead: {
      method: 'PUT' as const,
      path: '/api/notifications/:id/read' as const,
      responses: { 200: notificationSchema }
    },
    readAll: {
      method: 'PUT' as const,
      path: '/api/notifications/read-all' as const,
      responses: { 200: z.object({ updated: z.number() }) }
    }
  },
  admin: {
    users: {
      method: 'GET' as const,
      path: '/api/admin/users' as const,
      responses: { 200: z.array(userSchema) }
    },
    restrictUser: {
      method: 'PUT' as const,
      path: '/api/admin/users/:id/restrict' as const,
      responses: { 200: userSchema }
    },
    reactivateUser: {
      method: 'PUT' as const,
      path: '/api/admin/users/:id/reactivate' as const,
      responses: { 200: userSchema }
    },
    deleteUser: {
      method: 'DELETE' as const,
      path: '/api/admin/users/:id' as const,
      responses: { 200: z.object({ message: z.string() }) }
    },
    changePassword: {
      method: 'PUT' as const,
      path: '/api/admin/users/:id/password' as const,
      input: z.object({ password: z.string() }),
      responses: { 200: z.object({ message: z.string() }) }
    },
    sendNotification: {
      method: 'POST' as const,
      path: '/api/admin/notifications' as const,
      input: z.object({ content: z.string(), userId: z.string().optional() }),
      responses: { 201: z.object({ message: z.string() }) }
    },
    dashboardStats: {
      method: 'GET' as const,
      path: '/api/admin/stats' as const,
      responses: { 200: z.object({ totalUsers: z.number(), totalPosts: z.number() }) }
    },
    passwordRequests: {
      method: 'GET' as const,
      path: '/api/admin/password-requests' as const,
      responses: { 200: z.array(forgotPasswordSchema) }
    },
    resolvePasswordRequest: {
      method: 'PUT' as const,
      path: '/api/admin/password-requests/:id/resolve' as const,
      input: z.object({ password: z.string() }),
      responses: { 200: z.object({ message: z.string(), phone: z.string().optional() }) }
    },
    sendChat: {
      method: 'POST' as const,
      path: '/api/admin/send-chat/:userId' as const,
      input: z.object({ content: z.string() }),
      responses: { 201: z.object({ message: z.string() }) }
    },
    allPosts: {
      method: 'GET' as const,
      path: '/api/admin/all-posts' as const,
      responses: { 200: z.array(postSchema) }
    },
    createPost: {
      method: 'POST' as const,
      path: '/api/admin/posts' as const,
      input: z.object({ content: z.string() }),
      responses: { 201: postSchema }
    },
    deletePost: {
      method: 'DELETE' as const,
      path: '/api/admin/posts/:id' as const,
      responses: { 200: z.object({ message: z.string() }) }
    },
    getProfile: {
      method: 'GET' as const,
      path: '/api/admin/profile' as const,
      responses: { 200: userSchema }
    },
    updateProfile: {
      method: 'PUT' as const,
      path: '/api/admin/profile' as const,
      input: z.object({ profilePicture: z.string().optional(), name: z.string().optional() }),
      responses: { 200: userSchema }
    }
  },
  search: {
    query: {
      method: 'GET' as const,
      path: '/api/search' as const,
      responses: {
        200: z.object({
          users: z.array(userSchema),
          posts: z.array(postSchema),
        })
      }
    }
  },
  photos: {
    list: {
      method: 'GET' as const,
      path: '/api/photos' as const,
      responses: {
        200: z.array(dailyPhotoSchema),
        401: errorSchemas.unauthorized,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/photos' as const,
      input: insertDailyPhotoSchema,
      responses: {
        201: dailyPhotoSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        429: z.object({ message: z.string(), nextAllowed: z.string().datetime() }),
      }
    },
    myToday: {
      method: 'GET' as const,
      path: '/api/photos/my-today' as const,
      responses: {
        200: z.object({ hasPosted: z.boolean(), photo: dailyPhotoSchema.optional() }),
        401: errorSchemas.unauthorized,
      }
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type AuthResponse = z.infer<typeof api.auth.login.responses[200]>;
export type AdminStatsResponse = z.infer<typeof api.admin.dashboardStats.responses[200]>;
