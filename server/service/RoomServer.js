import { SocketMessage } from "../../public/common/SocketMessage.js"

export class RoomServer {

    constructor(roomId, userHandler) {
        this.roomId = roomId;
        this.userHandler = userHandler;

        this.sockets = new Map();
        this.hostQueue = []

        this.totalCapacity = 4; // All players including bots
        this.playerCapacity = 4; // Only human players
        this.decks = 1;
    }

    setCloseCallback(callback) {
        this.close = callback;
    }

    setTotalCapacity(capacity) {
        this.totalCapacity = Math.min(Math.max(capacity, 1), 5);
        // this.setPlayerCapacity(this.playerCapacity); // Ensure player capacity is not greater than total capacity
    }

    setPlayerCapacity(capacity) {
        this.playerCapacity = Math.min(Math.max(capacity, 1), this.totalCapacity);
    }

    edit(players, bots, decks) {
        this.setTotalCapacity(players);
        this.setPlayerCapacity(players - bots);
        this.decks = decks;
    }

    get isFull() {
        return this.sockets.size >= this.playerCapacity;
    }

    getPlayers() {
        const players = []
        for (const uuid of this.sockets.keys()) {
            players.push(this.userHandler.get(uuid))
        }
        return players
    }

    async openSocket(ws, uuid) {
        if (this.isFull) {
            ws.close(1000, "Room is full");
            return;
        }

        this.sockets.set(uuid, ws);
        this.hostQueue.push(uuid)

        const user = this.userHandler.get(uuid);
        ws.user = user

        this.bound = {
            open: this.onOpen.bind(this, ws),
            message: this.onMessage.bind(this),
            close: this.onClose.bind(this, ws)
        }

        ws.addEventListener("open", this.bound.open)
        ws.addEventListener("message", this.bound.message)
        ws.addEventListener("close", this.bound.close, { once: true })
    }

    onOpen(ws) {
        if (!ws.user.expose) return

        this.send(ws, "init", this.getPlayers());
        this.publish("join", ws.user.expose(), ws.user.uuid);
        console.log(`${ws.user.username} has joined room ${this.roomId}`)

        if (ws.user.uuid === this.hostQueue[0]) { // Player is host
            this.send(ws, "promote", {
                players: this.playerCapacity,
                bots: this.totalCapacity - this.playerCapacity,
                decks: this.decks
            })
        }
    }

    onMessage(event) {
        const { type, payload } = SocketMessage.fromEvent(event);
        this.publish(type, payload);
    }

    onClose(ws) {
        const user = ws.user
        const username = user?.username || "";
        console.log(`${username} has left room ${this.roomId}`);
        this.publish("leave", user.expose());

        for (const event in this.bound) ws.removeEventListener(event, this.bound[event])
        this.sockets.delete(user.uuid);

        this.hostQueue = this.hostQueue.filter(id => id !== user.uuid)
        if (this.hostQueue.length > 0 && user.uuid !== this.hostQueue[0]) { // Host left, promote new host
            const newHost = this.sockets.get(this.hostQueue[0])
            this.send(newHost, "promote", {
                players: this.playerCapacity,
                bots: this.totalCapacity - this.playerCapacity,
                decks: this.decks
            })
        }

        if (this.sockets.size === 0) {
            console.log(`No players left, closing room ${this.roomId}`);
            this.close();
        }
    }

    send(socket, type, payload) {
        new SocketMessage(socket.id, type, payload).send(socket);
    }

    publish(type, payload, sender = null) {
        for (const [id, socket] of this.sockets) {
            if (!sender || id !== sender) {
                this.send(socket, type, payload);
            }
        }
    }

    expose() {
        return {
            roomId: this.roomId,
            capacity: this.totalCapacity,
            numPlayers: this.sockets.size,
            numBots: this.totalCapacity - this.playerCapacity,
            decks: this.decks
        }
    }
}