import { SocketMessage } from "../../public/common/SocketMessage.js"
import { Bot } from "../../public/common/Bot.js"
import { getPonyName } from "../../public/common/ponyNameGenerator.js"
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

    openSocket(socket, uuid) {
        if (this.isFull) {
            socket.close(1000, "Room is full");
            return;
        }

        this.sockets.set(uuid, socket);
        this.hostQueue.push(uuid)

        const user = this.userHandler.get(uuid);
        socket.user = user
        socket.isHuman = true

        this.bindSocketEventListeners(socket)
    }

    bindSocketEventListeners(socket, isHuman = true) {
        const controller = new AbortController()
        socket.addEventListener("message", (e) => this.onMessage(e), { signal: controller.signal })
        socket.addEventListener("close", () => this.onClose(socket, controller), { signal: controller.signal })
        if (isHuman) {
            socket.addEventListener("open", () => this.onOpen(socket), { signal: controller.signal })
        } else {
            this.onOpen(socket)
        }
    }

    onOpen(socket) {
        if (!socket.user.expose) return

        this.send(socket, "init", this.getPlayers());
        this.publish("join", socket.user.expose(), socket.user.uuid);
        console.log(`${socket.user.username} has joined room ${this.roomId}`)

        if (socket.user.uuid === this.hostQueue[0]) { // Player is host
            this.send(socket, "promote", {
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

    onClose(socket, controller) {
        const user = socket.user
        const username = user?.username || "";
        console.log(`${username} has left room ${this.roomId}`);
        this.publish("leave", user.expose());
        this.gameServer?.onLeave(user.uuid)

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

        controller.abort()
    }

    kick(uuid, sender) {
        const target = this.sockets.get(uuid)
        this.send(target, "kick", { message: `You were kicked from room ${this.roomId}` }, sender)
    }

    addBots() {
        for (let i = this.sockets.size; i < this.totalCapacity; i++) {
            const username = getPonyName()
            const uuid = this.userHandler.add(username)
            const bot = new Bot(uuid, username)

            const socket = bot.socket
            this.bindSocketEventListeners(socket, false)
            this.sockets.set(uuid, socket)
        }
    }

    startGameServer() {
        this.addBots()
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