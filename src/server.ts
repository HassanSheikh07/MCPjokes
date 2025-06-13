import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const server = new McpServer({
    name: "mcp-streamable-http",
    version: "1.0.0",
});

// Get Chuck Norris joke tool
server.tool("get-chuck-joke", "Get a random Chuck Norris joke", async () => {
    const response = await fetch("https://api.chucknorris.io/jokes/random");
    const data = await response.json();
    return {
        content: [{ type: "text", text: data.value }],
    };
});

// Get Chuck Norris joke by category tool
server.tool(
    "get-chuck-joke-by-category",
    "Get a random Chuck Norris joke by category",
    {
        category: z.string().describe("Category of the Chuck Norris joke"),
    },
    async (params: { category: string }) => {
        const response = await fetch(
            `https://api.chucknorris.io/jokes/random?category=${params.category}`
        );
        const data = await response.json();
        return {
            content: [{ type: "text", text: data.value }],
        };
    }
);

// Get Chuck Norris joke categories tool
server.tool("get-chuck-categories", "List Chuck Norris joke categories", async () => {
    const response = await fetch("https://api.chucknorris.io/jokes/categories");
    const data = await response.json();
    return {
        content: [{ type: "text", text: data.join(", ") }],
    };
});

// Get Dad joke tool
server.tool("get-dad-joke", "Get a random dad joke", async () => {
    const response = await fetch("https://icanhazdadjoke.com/", {
        headers: { Accept: "application/json" },
    });
    const data = await response.json();
    return {
        content: [{ type: "text", text: data.joke }],
    };
});

const app = express();
app.use(express.json());

const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless server
});

// Root route to fix "Cannot GET /"
app.get("/", (req, res) => {
    res.send("? MCPjokes server is running.");
});

// MCP POST handler
app.post("/mcp", async (req: Request, res: Response) => {
    console.log("Received MCP request:", req.body);
    try {
        await transport.handleRequest(req, res, req.body);
    } catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: "2.0",
                error: { code: -32603, message: "Internal server error" },
                id: null,
            });
        }
    }
});

// Disallow unsupported methods on /mcp
["get", "delete", "put"].forEach((method) => {
    app[method]("/mcp", (req: Request, res: Response) => {
        console.log(`Received ${method.toUpperCase()} MCP request`);
        res.status(405).json({
            jsonrpc: "2.0",
            error: {
                code: -32000,
                message: "Method not allowed.",
            },
            id: null,
        });
    });
});

// Boot MCP server
const PORT = process.env.PORT || 3000;
server.connect(transport).then(() => {
    app.listen(PORT, () => {
        console.log(`?? MCP Streamable HTTP Server running on port ${PORT}`);
    });
}).catch((err) => {
    console.error("? Failed to start MCP server:", err);
    process.exit(1);
});
