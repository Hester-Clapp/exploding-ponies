import { RoomClient } from '../service/RoomClient.js';
import { SocketMessage } from '../../common/SocketMessage.js';
import { loadPage } from './pageLoader.js';

export class RoomsController {
    constructor(state) {
        this.state = state
        state.roomClient = new RoomClient(state);
        state.rooms = new Map()
    }

    async beforeLoad() {

    }

    async afterLoad() {
        this.ws = new WebSocket(location.origin.replace(/^http/, "ws") + "/rooms")
        this.ws.addEventListener("message", event => this.onMessage(event))
    }

    onMessage(event) {
        const { type, payload } = SocketMessage.fromEvent(event)
        switch (type) {
            case "init":
                // payload = array of rooms
                this.state.rooms.clear()
                for (const room of payload.rooms) {
                    this.state.rooms.set(room.roomId, room)
                }
                break;
            case "create":
            case "edit":
                // payload = room
                this.state.rooms.set(payload.roomId, payload)
                break;
            case "close":
                // payload = room id
                this.state.rooms.delete(payload)
                break;
        }

        this.showRooms()
    }

    showRooms() {
        const container = document.getElementById("rooms");
        container.innerHTML = "";

        // Create Room
        const createDiv = document.createElement("div");
        createDiv.classList.add("room");

        const createButton = document.createElement("button");
        createButton.textContent = "Create Room";
        createButton.addEventListener("click", this.createRoom.bind(this));
        createDiv.appendChild(createButton);
        container.appendChild(createDiv);

        // Available rooms
        if (this.state.rooms.size === 0) {
            const noRooms = document.createElement("p");
            noRooms.textContent = "No active rooms. Create one!";
            createDiv.appendChild(noRooms);
            return;
        }

        for (const room of this.state.rooms.values()) {
            const div = document.createElement("div");
            div.classList.add("room");

            const title = document.createElement("h2");
            title.textContent = `Room ${room.roomId} (${room.numPlayers}/${room.capacity})`;
            div.appendChild(title);

            const joinButton = document.createElement("button");
            joinButton.textContent = "Join";
            joinButton.disabled = room.numPlayers >= room.capacity;
            joinButton.addEventListener("click", this.joinRoom.bind(this, room.roomId));
            div.appendChild(joinButton);

            container.appendChild(div);
        }
    }

    async createRoom() {
        try {
            const { roomId } = await fetch("/rooms", { method: "POST" }).then(res => res.json())
            await this.joinRoom(roomId);
        } catch (error) {
            alert(`Failed to create room: ${error.message}`);
        }
    }

    async joinRoom(roomId) {
        try {
            this.state.roomId = roomId
            await loadPage("room");
            this.state.socket = await this.state.roomClient.joinRoom(roomId, this.state.uuid);
        } catch (error) {
            alert(`Failed to join room: ${error.message}`);
        }
    }

}