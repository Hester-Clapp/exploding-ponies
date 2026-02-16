import { Hand } from "./Hand.js";

export class Player {
    constructor(user, socket) {
        this.uuid = user.uuid;
        this.username = user.username;
        this.socket = socket;
        this.hand = new Hand();
        this.alive = true
    }
}