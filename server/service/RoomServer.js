import { SocketMessage } from "../../public/common/SocketMessage.js"
import { GameServer } from "./GameServer.js"

export class RoomServer {

    constructor(roomId, userHandler) {
        this.roomId = roomId;
        this.userHandler = userHandler;
        this.gameServer = null;

        this.sockets = new Map();
        this.hostQueue = []

        this.totalCapacity = 4; // All players including bots
        this.playerCapacity = 4; // Only human players
        this.decks = 1;
        this.cooldown = 3;
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

    edit(players, bots, decks, cooldown) {
        this.setTotalCapacity(players);
        this.setPlayerCapacity(players - bots);
        this.decks = decks;
        this.cooldown = cooldown;
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
        const { sender, type, payload } = SocketMessage.fromEvent(event);

        switch (type) {
            case "kick":
                this.kick(payload.uuid, sender)
                break
            case "ready":
                this.gameServer.setPlayerReady(sender)
                break
            case "playcard":
                this.gameServer.playCard(payload.cardType, sender)
                break
            case "provideinput":
                for (const input in payload) this.gameServer.provideInput(input, payload[input])
                break
            case "drawcard":
                this.gameServer.drawCard(sender)
                break
            case "start":
                this.startGameServer()
                break
            default:
                this.publish(type, payload);
        }
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

    kick(uuid, sender) {
        const target = this.sockets.get(uuid)
        this.send(target, "kick", { message: `You were kicked from room ${this.roomId}` }, sender)
    }

    startGameServer() {
        this.gameServer = new GameServer(this.getPlayers(), this.sockets, this.decks, this.cooldown);
        this.gameServer.allReady().then(() => {
            this.gameServer.deal();
        })
        this.publish("start", this.expose())
    }

    send(socket, type, payload, sender = socket.id) {
        new SocketMessage(sender, type, payload).send(socket);
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
            decks: this.decks,
            cooldown: this.cooldown,
        }
    }
}