import { Controller } from './Controller.js';
import { loadPage } from './pageLoader.js';
import { SocketMessage } from '../../common/SocketMessage.js';

export class RoomsController extends Controller {
    constructor() {
        super()

        this.rooms = new Map()
    }

    async beforeLoad(uuid) {
        super.beforeLoad()

        this.uuid = uuid
    }

    async afterLoad() {
        super.afterLoad()

        this.container = document.getElementById("rooms");
        document.getElementById("leave").addEventListener("click", () => {
            this.cleanup.abort()
            loadPage("tutorial", this.uuid)
        }, { signal: this.cleanup.signal })

        this.ws = new WebSocket(location.origin.replace(/^http/, "ws") + "/rooms")
        this.ws.addEventListener("message", event => this.onMessage(event), { signal: this.cleanup.signal })
        this.showRooms()
    }

    /**
     * Dispatches logic for events relating to room updates
     * @param {Event} event 
     */
    onMessage(event) {
        const { type, payload } = SocketMessage.fromEvent(event)
        switch (type) {
            case "init":
                // payload = array of rooms
                this.rooms.clear()
                for (const room of payload.rooms) {
                    this.rooms.set(room.roomId, room)
                }
                this.showRooms()
                break

            case "create":
            case "update":
            case "edit":
                // payload = room
                this.rooms.set(payload.roomId, payload)
                this.patchRoom(payload)
                break

            case "close":
                // payload = room id
                this.rooms.delete(payload)
                this.deleteRoom(payload)
                if (this.rooms.size === 0) this.noRooms.textContent = "No active rooms. Create one!";
                break
        }
    }

    /**
     * Renders the list of available rooms to join
     */
    async showRooms() {
        await this.loaded

        this.container.innerHTML = "";

        // Create Room
        const createDiv = document.createElement("div");
        createDiv.classList.add("room");

        const createButton = document.createElement("button");
        createButton.textContent = "Create Room";
        createButton.addEventListener("click", this.createRoom.bind(this), { once: true });
        createDiv.appendChild(createButton);

        this.noRooms = document.createElement("p");
        createDiv.appendChild(this.noRooms);

        this.container.appendChild(createDiv);

        // Available rooms
        if (this.rooms.size === 0) {
            this.noRooms.textContent = "No active rooms. Create one!";
            return;
        }

        for (const room of this.rooms.values()) {
            this.container.appendChild(this.roomToHTML(room));
        }
    }

    async patchRoom(room) {
        await this.loaded

        const { roomId, numPlayers, capacity, host } = room

        const element = document.querySelector(`.room${roomId}`)

        if (element) {
            const title = element.querySelector("h2");
            title.textContent = `Room ${roomId} (${numPlayers}/${capacity})`;

            const hostLabel = element.querySelector("p");
            hostLabel.textContent = `Host: ${host}`;
        } else {
            this.container.appendChild(this.roomToHTML(room));
        }
    }

    async deleteRoom(roomId) {
        await this.loaded

        const div = document.querySelector(`.room${roomId}`)
        if (div) div.remove()
    }

    roomToHTML(room) {
        const { roomId, numPlayers, capacity, host } = room
        const div = document.createElement("div");
        div.classList.add("room");
        div.classList.add(`room${roomId}`)

        const title = document.createElement("h2");
        title.textContent = `Room ${roomId} (${numPlayers}/${capacity})`;
        div.appendChild(title);

        const hostLabel = document.createElement("p");
        hostLabel.textContent = `Host: ${host}`;
        div.appendChild(hostLabel);

        const joinButton = document.createElement("button");
        joinButton.textContent = "Join";
        joinButton.disabled = numPlayers >= capacity;
        joinButton.addEventListener("click", this.joinRoom.bind(this, roomId));
        div.appendChild(joinButton);

        return div
    }

    /**
     * Asks the server to create a new room, and then joins it
     */
    async createRoom() {
        try {
            const { roomId } = await fetch("/rooms", { method: "POST" }).then(res => res.json())
            await this.joinRoom(roomId);
        } catch (error) {
            alert(`Failed to create room: ${error.message}`);
        }
    }

    /**
     * Joins the room with the given id
     * @param {string} roomId 
     */
    async joinRoom(roomId) {
        try {
            this.cleanup.abort()
            await loadPage("room", roomId, this.uuid);
        } catch (error) {
            alert(`Failed to join room: ${error.message}`);
        }
    }

}