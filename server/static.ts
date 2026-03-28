import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";

function getBaseUrl(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
  return `${proto}://${host}`;
}

function injectOgTags(html: string, baseUrl: string, overrides: Record<string, string>): string {
  let result = html;
  for (const [prop, content] of Object.entries(overrides)) {
    const escaped = content.replace(/"/g, "&quot;");
    const regex = new RegExp(`<meta\\s+property="${prop.replace(".", "\\.")}[^"]*"[^/]*/?>`, "i");
    if (regex.test(result)) {
      result = result.replace(regex, `<meta property="${prop}" content="${escaped}" />`);
    } else {
      result = result.replace("</head>", `  <meta property="${prop}" content="${escaped}" />\n</head>`);
    }
  }
  const imageAbsolute = `${baseUrl}/icon-512.png`;
  result = result.replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${imageAbsolute}" />`);
  return result;
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("/{*path}", (req: Request, res: Response) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = fs.readFileSync(indexPath, "utf-8");
    const baseUrl = getBaseUrl(req);
    html = injectOgTags(html, baseUrl, {
      "og:url": baseUrl,
      "og:type": "website",
    });
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });
}
