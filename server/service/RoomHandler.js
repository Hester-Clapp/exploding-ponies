import { RoomServer } from "./RoomServer.js";
import { SocketMessage } from "../../public/common/SocketMessage.js"

export class RoomHandler {

    constructor(userHandler) {
        this.userHandler = userHandler;
        this.rooms = new Map();

        this.sockets = new Set();
    }

    createRoom() {
        const roomId = String(Math.floor(1000 + 9000 * Math.random()));
        const room = new RoomServer(roomId, this.userHandler);
        this.rooms.set(roomId, room);

        room.setCloseCallback(this.closeRoom.bind(this, room));

        this.publish("create", room.expose())
        return roomId;
    }

    closeRoom(room) {
        for (const socket of room.sockets.values()) {
            socket.close();
        }

        const roomId = room.roomId
        this.rooms.delete(roomId);
        this.publish("close", roomId)
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    getRoomsPreview() {
        const previews = []
        for (const room of this.rooms.values()) {
            previews.push(room.expose());
        }
        return previews;
    }

    editRoom(roomId, players, bots, decks) {
        const room = this.getRoom(roomId);
        if (!room) return;

        room.setPlayerCapacity(players);
        room.setTotalCapacity(Number(players) + Number(bots));
        room.decks = decks;

        this.publish("edit", room.expose())
    }

    async openSocket(ws) {
        this.sockets.add(ws);

        ws.addEventListener("open", () => this.send(ws, "init", { rooms: this.getRoomsPreview() }))

        ws.addEventListener("message", () => {
            const { type, payload } = SocketMessage.fromEvent(event);
            if (type === "edit") editRoom(payload.roomId, payload.players, payload.bots, payload.decks)
        })

        ws.addEventListener("close", () => this.sockets.delete(ws))
    }

    send(socket, type, payload) {
        const message = new SocketMessage("", type, payload);
        socket.send(message.toString());
    }

    publish(type, payload) {
        for (const socket of this.sockets) {
            this.send(socket, type, payload);
        }
    }
}