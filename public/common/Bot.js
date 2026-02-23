import { SocketMessage } from "./SocketMessage.js"
import { User } from "../../server/service/UserHandler.js"

export class Bot {
    constructor(uuid, username) {
        this.uuid = uuid
        this.username = username
        this.socket = new BackendSocket(uuid, username, this.onMessage)
    }

    onMessage(message) {
        const { type, payload } = message
        switch (type) {
            case "start":
                this.socket.setReady()
                break
        }
    }

    send(type, payload) {
        this.socket.trigger("message", new SocketMessage(this.uuid, type, payload).toString())
    }
}

class BackendSocket {
    constructor(uuid, username, onMessage) {
        this.user = new User(uuid, username)
        this.isBot = true
        this.onMessage = onMessage
        this.handlers = new Map()
    }

    send(message) {
        this.onMessage(message)
    }

    close() {
        this.dispatchEvent("close", this)
    }

    addEventListener(event, callback) {
        this.handlers.set(event, callback)
    }

    trigger(event, ...args) {
        if (this.handlers.has(event)) {
            const handler = this.handlers.get(event)
            handler(...args)
        }
    }
}
