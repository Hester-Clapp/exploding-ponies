import { loadPage } from './pageLoader.js';
import { GameClient } from '../service/GameClient.js';


export class GameController {
    constructor(state) {
        this.state = state

        this.bound = {
        }

        this.eventHandlers = {
        }
    }

    async beforeLoad() {
        this.state.gameClient = new GameClient(this.state)
    }

    async afterLoad() {
        const leave = document.getElementById("leave");
        leave.addEventListener("click", this.leaveRoom.bind(this));

        this.drawPlayerList();
        this.drawHand();

        // for (const event in this.eventHandlers) {
        //     window.addEventListener(event, this.eventHandlers[event])
        // }
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