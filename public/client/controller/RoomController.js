import { Controller } from './Controller.js';
import { loadPage } from './pageLoader.js';
import { RoomClient } from '../service/RoomClient.js';

export class RoomController extends Controller {
    constructor() {
        super()

        this.isHost = false

        // this.bound = {
        //     drawPlayerList: this.drawPlayerList.bind(this),
        //     promote: this.promote.bind(this),
        //     leaveRoom: this.leaveRoom.bind(this),
        //     startGame: this.startGame.bind(this),
        // }

        // this.eventHandlers = {
        //     drawplayerlist: this.bound.drawPlayerList,
        //     promote: this.bound.promote,
        //     beforeunload: this.bound.leaveRoom,
        //     kick: this.bound.leaveRoom,
        //     start: this.bound.startGame,
        // }
    }

    async beforeLoad(roomId, uuid) {
        super.beforeLoad()

        this.roomId = roomId
        this.uuid = uuid

        this.roomClient = new RoomClient(uuid);
        await this.roomClient.joinRoom(roomId)

        this.addEventListener("drawplayerlist", this.drawPlayerList)
        this.addEventListener("promote", this.promote)
        this.addEventListener("beforeunload", this.leaveRoom)
        this.addEventListener("kick", this.leaveRoom)
        this.addEventListener("start", this.startGame)
    }

    async afterLoad() {
        super.afterLoad()

        document.querySelector("h1").textContent = `Room ${this.roomId}`
        const leave = document.getElementById("leave");
        leave.addEventListener("click", () => this.leaveRoom(), { once: true });
    }

    /**
     * Leaves the room and returns to the rooms page
     */
    async leaveRoom() {
        await this.roomClient.leaveRoom()
        this.roomClient = null
        this.isHost = false;
        this.cleanup.abort()
        loadPage("rooms", this.uuid);
    }

    /**
     * Renders the list of other players in the room
     */
    async drawPlayerList() {
        await this.loaded

        const playerList = document.getElementById("playerList");
        playerList.innerHTML = "";

        for (const uuid of this.roomClient.players.keys()) {
            const { username } = this.roomClient.players.get(uuid)

            const li = document.createElement("li");
            li.textContent = username;

            const kick = document.createElement("button");
            kick.textContent = "Kick";
            kick.addEventListener("click", async () => {
                await this.roomClient.kickPlayer(uuid);
            }, { once: true });

            if (this.isHost && uuid !== this.uuid) li.appendChild(kick);
            playerList.appendChild(li);
        }
    }

    /**
     * Renders the host controls when the client is promoted to room host
     */
    async promote() {
        await this.loaded

        this.isHost = true;

        const controls = await fetch("../../resources/pages/host.html").then(res => res.text())
        document.getElementById("hostControls").innerHTML = controls

        async function editRoom(roomId) {
            const fields = {
                capacity: document.getElementById("capacity"),
                decks: document.getElementById("decks"),
                cooldown: document.getElementById("cooldown"),
            }

            const url = `/edit?roomId=${roomId}&capacity=${fields.capacity.value}&decks=${fields.decks.value}&cooldown=${fields.cooldown.value}`
            const actual = await fetch(url, { method: "PUT" }).then(res => res.json());

            for (const name in fields) {
                fields[name].value = actual[name]
                fields[name].nextElementSibling.textContent = actual[name]
            }

            return actual
        }

        document.querySelector("form").addEventListener("submit", async (e) => {
            e.preventDefault();
            const actual = await editRoom(this.roomId)
            this.cooldown = actual.cooldown
        });

        document.getElementById("start").addEventListener("click", async () => {
            const actual = await editRoom(this.roomId)
            this.cooldown = actual.cooldown
            this.roomClient.startGame()
        }, { once: true })
    }

    /**
     * Reacts to being kicked from the room
     */
    onKick() {
        alert("You were kicked from this room")
    }

    /**
     * Reacts to the game being started and loads the game page
     * @param {Event} event 
     */
    startGame(event) {
        this.cleanup.abort()
        loadPage("game", this.uuid, this.roomClient.gameClient, event.detail.cooldown)
    }
}