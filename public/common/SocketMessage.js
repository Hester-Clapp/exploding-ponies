export class SocketMessage {
    constructor(sender, type, payload = {}) {
        this.sender = sender;
        this.type = type;
        this.payload = payload;
    }

    static fromEvent(event) {
        const { sender, type, payload } = JSON.parse(event.data);
        const message = new SocketMessage(sender, type, payload);
        return message
    }

    toString() {
        return JSON.stringify(this);
    }

    send(socket) {
        socket.send(this.toString())
    }
}