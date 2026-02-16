import { SocketMessage } from '../../common/SocketMessage.js';

export class RoomClient {
    constructor(state) {
        this.baseHttp = location.origin;
        this.baseWs = location.origin.replace(/^http/, "ws");

        this.bound = { message: this.onMessage.bind(this) }

        this.state = state
    }

    socketIsOpen() {
        return this.state.socket?.readyState === WebSocket.OPEN
    }

    async createRoom() {
        const res = await fetch(`${this.baseHttp}/rooms`, { method: "POST" });

        if (!res.ok) throw new Error("Failed to create room");

        const data = await res.json();
        return data.roomId;
    }

    async joinRoom(roomId) {
        this.state.socket = new WebSocket(`${this.baseWs}/join?roomId=${roomId}&uuid=${this.state.uuid}`);
        this.state.socket.addEventListener("message", this.bound.message)
        return this.state.socket;
    }

    async leaveRoom() {
        this.state.socket.removeEventListener("message", this.bound.message)

        await new Promise((resolve) => {
            this.state.socket.addEventListener("close", resolve, { once: true });
            this.state.socket.close();
        });

        delete this.state.socket
        delete this.state.roomId
        delete this.state.gameClient
        this.state.players.clear()
    }

    kickPlayer(uuid) {
        new SocketMessage(this.state.uuid, "kick", { uuid }).send(this.state.socket)
    }

    onMessage(event) {
        const { type, payload } = SocketMessage.fromEvent(event);
        switch (type) {
            case "init":
                this.initializePlayers(payload);
                break
            case "join":
                this.playerJoin(payload);
                break
            case "leave":
                this.playerLeave(payload);
                break
            case "kick":
                alert(payload.message)
                this.state.leaveRoom();
                break
        }
        window.dispatchEvent(new CustomEvent(type, { detail: payload }));
    }

    initializePlayers(players) {
        if (this.state.players) this.state.players.clear()
        else this.state.players = new Map()

        for (const player of players) {
            this.state.players.set(player.uuid, player.username);
        }
    }

    playerJoin(user) {
        console.log(`${user.username} has joined the game`);
        this.state.players.set(user.uuid, user.username);
    }

    playerLeave(user) {
        console.log(`${user.username} has left the game`);
        this.state.players.delete(user.uuid);
    }

    startGame() {
        this.send("start", {})
    }

    send(type, payload) {
        const message = new SocketMessage(this.state.uuid, type, payload);
        this.state.socket.send(message.toString());
    }
}
