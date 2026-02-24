import { SocketMessage } from '../../common/SocketMessage.js';
import { GameClient } from '../service/GameClient.js';

export class RoomClient {
    constructor(uuid) {
        this.uuid = uuid

        this.baseHttp = location.origin;
        this.baseWs = location.origin.replace(/^http/, "ws");
        this.players = new Map()

        this.bound = {
            message: this.onMessage.bind(this),
            init: this.initializePlayers.bind(this),
            join: this.playerJoin.bind(this),
            leave: this.playerLeave.bind(this),
            kick: this.onKick.bind(this),
            promote: this.dispatchEvent.bind(this, "promote"),
            start: this.onStart.bind(this),
            end: this.leaveRoom.bind(this),
        }
    }

    socketIsOpen() {
        return this.socket?.readyState === WebSocket.OPEN
    }

    async createRoom() {
        const res = await fetch(`${this.baseHttp}/rooms`, { method: "POST" });

        if (!res.ok) throw new Error("Failed to create room");

        const data = await res.json();
        return data.roomId;
    }

    async joinRoom(roomId) {
        this.socket = new WebSocket(`${this.baseWs}/join?roomId=${roomId}&uuid=${this.uuid}`);
        this.socket.addEventListener("message", this.bound.message)
    }

    async leaveRoom() {
        this.dispatchEvent("leaveRoom")
        this.socket.removeEventListener("message", this.bound.message)
        this.gameClient = null

        await new Promise((resolve) => {
            this.socket.addEventListener("close", resolve, { once: true });
            this.socket.close();
        });

        this.players.clear()
    }

    kickPlayer(uuid) {
        new SocketMessage(this.uuid, "kick", { uuid }).send(this.socket)
    }

    onMessage(event) {
        const { type, payload } = SocketMessage.fromEvent(event);
        console.log(type)
        if (type in this.bound) {
            this.bound[type](payload)
        } else {
            if (this.gameClient) this.gameClient.onMessage(type, payload)
        }
    }

    initializePlayers(players) {
        this.players.clear()

        for (const player of players) {
            this.players.set(player.uuid, player.username);
        }
        this.dispatchEvent("drawplayerlist")
    }

    playerJoin(user) {
        this.players.set(user.uuid, user.username);
        this.dispatchEvent("drawplayerlist")
    }

    playerLeave(user) {
        this.players.delete(user.uuid);
        this.dispatchEvent("drawplayerlist")
    }

    onKick() {
        this.dispatchEvent("kick")
        alert("You were kicked from this room")
        this.leaveRoom();
    }

    startGame() {
        this.send("start")
    }

    onStart(roomSettings) {
        this.gameClient = new GameClient(this.uuid, this.players, this.socket)
        this.dispatchEvent("start", roomSettings)
    }

    send(type, payload) {
        const message = new SocketMessage(this.uuid, type, payload);
        this.socket.send(message.toString());
    }

    dispatchEvent(type, detail) {
        window.dispatchEvent(detail
            ? new CustomEvent(type, { detail })
            : new CustomEvent(type))
    }
}
