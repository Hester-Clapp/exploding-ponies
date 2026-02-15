import { loadPage } from './pageLoader.js';

export class RoomController {
    constructor(state) {
        this.state = state

        this.bound = {
            drawPlayerList: this.drawPlayerList.bind(this),
            promote: this.promote.bind(this),
            leaveRoom: this.leaveRoom.bind(this),
        }

        this.eventHandlers = {
            init: this.bound.drawPlayerList,
            join: this.bound.drawPlayerList,
            leave: this.bound.drawPlayerList,
            promote: this.bound.promote,
            beforeunload: this.bound.leaveRoom
        }
    }

    async beforeLoad() {

    }

    async afterLoad() {
        document.querySelector("h1").textContent = `Room ${this.state.roomId}`
        const leave = document.getElementById("leave");
        leave.addEventListener("click", this.leaveRoom.bind(this));

        for (const event in this.eventHandlers) {
            window.addEventListener(event, this.eventHandlers[event])
        }
    }

    async leaveRoom() {
        await this.state.roomClient.leaveRoom()
        delete this.state.roomId

        for (const event in this.eventHandlers) {
            window.removeEventListener(event, this.eventHandlers[event])
        }

        loadPage("rooms", this.state.uuid);
    }

    drawPlayerList() {
        const playerList = document.getElementById("playerList");
        playerList.innerHTML = "";

        for (const username of this.state.players.values()) {
            const li = document.createElement("li");
            li.textContent = username;
            playerList.appendChild(li);
        }
    }

    async promote() {
        const controls = await fetch("../../resources/host.html").then(res => res.text())
        document.getElementById("hostControls").innerHTML = controls

        const form = document.querySelector("form");
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fields = {
                numPlayers: document.getElementById("numPlayers"),
                numBots: document.getElementById("numBots"),
                decks: document.getElementById("decks")
            }

            const url = `/edit?roomId=${this.state.roomId}&players=${fields.numPlayers.value}&bots=${fields.numBots.value}&decks=${fields.decks.value}`
            const actual = await fetch(url, { method: "PUT" }).then(res => res.json());

            for (const name in fields) {
                fields[name].value = actual[name]
                fields[name].nextElementSibling.textContent = actual[name]
            }
        });
    }
}