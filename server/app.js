import { serve } from "https://deno.land/std/http/server.ts";
import { serveDir } from "https://deno.land/std/http/file_server.ts";
import { UserHandler } from "./service/UserHandler.js";
import { RoomHandler } from "./service/RoomHandler.js";

const userHandler = new UserHandler();
const roomHandler = new RoomHandler(userHandler);

async function handle(req) {
    const url = new URL(req.url);
    const { pathname, searchParams } = url;
    const path = pathname.split("/").filter(Boolean);

    if (req.method === "POST" && pathname === "/play") {
        console.log(`Received play request from ${searchParams.get("username")}`);
        const uuid = userHandler.add(searchParams);
        return json({ uuid }, 201);
    }

    if (req.method === "DELETE" && pathname === "/play") {
        const uuid = searchParams.get("uuid")
        console.log(`Received leave request from ${uuid}`);
        userHandler.remove(uuid);
        return json({ uuid }, 200);
    }

    if (req.method === "POST" && pathname === "/rooms") {
        console.log("Received request to create room");
        const roomId = roomHandler.createRoom();
        return json({ roomId }, 201);
    }

    if (pathname === "/rooms" && req.headers.get("upgrade") === "websocket") {
        const { socket, response } = Deno.upgradeWebSocket(req);
        roomHandler.openSocket(socket)
        return response;
    }

    if (pathname === "/join" && req.headers.get("upgrade") === "websocket") {
        console.log("Received request to join room");
        const roomId = searchParams.get("roomId");
        const uuid = searchParams.get("uuid");

        const { socket, response } = Deno.upgradeWebSocket(req);

        if (!roomId) return socket.close(1000, "Missing roomId");
        if (!uuid) return socket.close(1000, "Missing uuid");

        if (!userHandler.get(uuid)) socket.close(1000, "Unknown uuid");

        const room = roomHandler.getRoom(roomId);
        if (!room) return socket.close(1000, "Room not found");

        if (room.isFull) return socket.close(1000, "Room is full");

        console.log(req.url)
        room.openSocket(socket, uuid);

        return response;
    }

    if (req.method === "PUT" && pathname === "/edit") {
        console.log("Received request to edit room");
        const roomId = searchParams.get("roomId");
        const room = roomHandler.getRoom(roomId)
        const players = searchParams.get("players");
        const bots = searchParams.get("bots");
        const decks = searchParams.get("decks");
        room.edit(Number(players), Number(bots), Number(decks));
        return json({ numPlayers: room.totalCapacity, numBots: room.totalCapacity - room.playerCapacity, decks: room.decks });
    }

    // ---- Static files ----
    return serveDir(req, {
        fsRoot: "public",
        urlRoot: "",
    });
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

serve(handle, { port: 3000 });
