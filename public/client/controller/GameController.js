import { loadPage } from './pageLoader.js';
import { GameClient } from '../service/GameClient.js';


export class GameController {
    constructor(state) {
        this.state = state

        this.bound = {
            setStatus: this.setStatus.bind(this),
            drawHand: this.drawHand.bind(this),
            drawDiscard: this.drawDiscard.bind(this),
        }

        this.eventHandlers = {
            statusupdate: this.bound.setStatus,
            deal: this.bound.drawHand,
            hand: this.bound.drawHand,
            playcard: this.bound.drawDiscard,
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

        this.state.roomClient.send("ready", null)

        this.drawPlayerList();
        // this.drawHand();

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

        for (const card of this.state.hand.toArray()) {
            const cardDiv = this.cardToHTML(card)
            handDisplay.appendChild(cardDiv);
            cardDiv.addEventListener("click", () => {
                this.state.roomClient.send("playcard", card)
                cardDiv.remove()
            })
        }
    }

    drawDiscard(event) {
        const card = event.detail
        const discardPile = document.getElementById("discardPile");
        discardPile.innerHTML = "";
        discardPile.appendChild(this.cardToHTML(card));
    }

    cardToHTML(card) {
        const div = document.createElement("div")
        div.classList.add("card")

        const img = document.createElement("img")
        img.src = "resources/images/" + card.cardType + ".png"
        img.alt = card.cardType
        div.appendChild(img)

        return div
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