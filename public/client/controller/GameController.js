import { loadPage } from './pageLoader.js';
import { GameClient } from '../service/GameClient.js';


export class GameController {
    constructor(state) {
        this.state = state

        this.bound = {
            setStatus: this.setStatus.bind(this),
            drawHand: this.drawHand.bind(this),
        }

        this.eventHandlers = {
            statusupdate: this.bound.setStatus,
            handupdate: this.bound.drawHand,
        }
    }

    async beforeLoad() {

    }

    async afterLoad() {
        this.state.gameClient = new GameClient(this.state)

        const leave = document.getElementById("leave");
        leave.addEventListener("click", this.leaveRoom.bind(this));

        for (const event in this.eventHandlers) {
            window.addEventListener(event, this.eventHandlers[event])
        }

        console.log(this.state.gameClient)
        this.state.roomClient.send("ready", null)

        this.drawPlayerList();
        this.drawHand();

    }

    drawPlayerList() {
        const playersDisplay = document.getElementById("otherPlayers");
        playersDisplay.innerHTML = "";

        for (const uuid of this.state.players.keys()) {
            const player = this.state.players.get(uuid)

            const div = document.createElement("div");
            div.textContent = player.username;

            playersDisplay.appendChild(div);
        }
    }

    drawHand() {
        const handDisplay = document.getElementById("hand");
        handDisplay.innerHTML = "";

        const hand = this.state.players.get(this.state.uuid).hand
        for (const card of hand.toArray()) {
            handDisplay.appendChild(card.toHTML());
        }
    }

    setStatus(event) {
        console.log(event.detail)
        document.getElementById("status").textContent = event.detail;
    }

    async leaveRoom() {
        await this.state.roomClient.leaveRoom()
        delete this.state.roomId
        delete this.state.leaveRoom
        this.isHost = false;

        for (const event in this.eventHandlers) {
            window.removeEventListener(event, this.eventHandlers[event])
        }

        loadPage("rooms", this.state.uuid);
    }
}