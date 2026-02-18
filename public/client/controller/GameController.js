import { loadPage } from './pageLoader.js';


export class GameController {
    constructor() {
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

    async beforeLoad(uuid, gameClient, onLeaveRoom) {
        this.uuid = uuid
        this.gameClient = gameClient
        this.onLeaveRoom = onLeaveRoom
    }

    async afterLoad() {
        const leave = document.getElementById("leave");
        leave.addEventListener("click", this.leaveRoom.bind(this));

        for (const event in this.eventHandlers) {
            window.addEventListener(event, this.eventHandlers[event])
        }

        this.gameClient.send("ready", null)

        this.drawPlayerList({ detail: this.gameClient.players });
    }

    drawPlayerList(event) {
        const players = event.detail
        const playersDisplay = document.getElementById("otherPlayers");
        playersDisplay.innerHTML = "";

        for (const uuid of players.keys()) {
            const player = players.get(uuid)

            const div = document.createElement("div");
            div.className = "player"
            div.textContent = player;

            playersDisplay.appendChild(div);
        }
    }

    drawHand(event) {
        const hand = event.detail
        const handDisplay = document.getElementById("hand");
        handDisplay.innerHTML = "";

        for (const card of hand) {
            const cardDiv = this.cardToHTML(card)
            handDisplay.appendChild(cardDiv);

            window.addEventListener("enablecard", (event) => {
                const isEnabled = event.detail[card.cardType]
                console.log(card.cardType, isEnabled)
                cardDiv.classList.toggle("enabled", isEnabled)
                cardDiv.classList.toggle("disabled", !isEnabled)
            })

            cardDiv.addEventListener("click", () => {
                if (cardDiv.classList.contains("enabled")) {
                    this.gameClient.send("playcard", card)
                    cardDiv.remove()
                }
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
        div.title = `Play ${card.cardType} card`

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
        await this.onLeaveRoom()
        this.isHost = false;

        for (const event in this.eventHandlers) {
            window.removeEventListener(event, this.eventHandlers[event])
        }

        loadPage("rooms", this.uuid);
    }
}