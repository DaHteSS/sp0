import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { WebSocketServer } from "ws";
import { handleSshSocket } from "@/server/ssh-ws";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

void app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const url = req.url;
      if (!url) {
        res.statusCode = 400;
        res.end("Bad Request");
        return;
      }
      await handle(req, res, parse(url, true));
    } catch (err) {
      console.error("Request error", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const wss = new WebSocketServer({ noServer: true });
  wss.on("connection", handleSshSocket);

  server.on("upgrade", (req, socket, head) => {
    const pathname = req.url ? parse(req.url, false).pathname : null;
    if (pathname === "/api/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(port, hostname, () => {
    console.log(`Ready http://${hostname}:${port}`);
  });
});
