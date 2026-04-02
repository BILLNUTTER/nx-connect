import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";

let initPromise: Promise<express.Express> | null = null;

async function initApp(): Promise<express.Express> {
  const app = express();

  app.use(
    express.json({
      limit: "10mb",
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false, limit: "10mb" }));

  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  return app;
}

export default async function handler(req: Request, res: Response) {
  if (!initPromise) {
    initPromise = initApp();
  }
  const app = await initPromise;
  app(req, res);
}
