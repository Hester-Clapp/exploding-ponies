import { loadPage } from './pageLoader.js';


export class GameController {
    constructor() {
        this.bound = {
            setStatus: this.setStatus.bind(this),
            renderHand: this.renderHand.bind(this),
            onPlayCard: this.onPlayCard.bind(this),
            onDrawCard: this.onDrawCard.bind(this),
        }

        this.eventHandlers = {
            statusupdate: this.bound.setStatus,
            deal: this.bound.renderHand,
            hand: this.bound.renderHand,
            draw: this.bound.onDrawCard,
            playcard: this.bound.onPlayCard,
        }
    }

    async beforeLoad(uuid, gameClient) {
        this.uuid = uuid
        this.gameClient = gameClient
    }

    async afterLoad() {
        this.discardPile = document.getElementById("discardPile")

        const drawPile = document.getElementById("drawPile");
        drawPile.addEventListener("click", () => { this.gameClient.drawCard() })

        for (const event in this.eventHandlers) {
            window.addEventListener(event, this.eventHandlers[event])
        }

        this.gameClient.send("ready", null)

        this.renderPlayerList({ detail: this.gameClient.players });
    }

    renderPlayerList(event) {
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

    renderHand(event) {
        const hand = event.detail
        const handDisplay = document.getElementById("hand");

        for (const type in hand) {
            const cardGroup = handDisplay.querySelector(`.${type}`)
            cardGroup.innerHTML = "";

            for (const card of hand[type]) {
                const cardDiv = this.cardToHTML(card)
                cardGroup.appendChild(cardDiv);
            }
        }
    }

    cardToHTML(card, functional = true) {
        const div = document.createElement("div")
        div.classList.add("card")
        div.title = `Play ${card.cardType} card`
        div.style["border-color"] = card.color

        const img = document.createElement("img")
        img.src = "resources/images/" + card.cardType + ".png"
        img.alt = card.cardType
        div.appendChild(img)

        if (functional) {
            function enableCard(event) {
                const isEnabled = event.detail[card.cardType]
                div.classList.toggle("enabled", isEnabled)
                div.classList.toggle("disabled", !isEnabled)
            }

            window.addEventListener("enablecard", enableCard)

            div.addEventListener("click", () => {
                if (div.classList.contains("enabled")) {
                    div.classList.remove("enabled")
                    window.removeEventListener("enablecard", enableCard)
                    this.playCard(card, div)
                }
            }, { once: true })
        }

        return div
    }

    async glide(element, newParent, rotate = 0, offset) {
        const startPosition = element.parentElement.getBoundingClientRect()
        const endPosition = newParent.getBoundingClientRect()

        const ghost = element.cloneNode(true)
        ghost.style.position = "fixed"
        ghost.style.left = `${startPosition.x}px`
        ghost.style.top = `${startPosition.y}px`
        ghost.style.transform = `rotate(0deg)`
        document.getElementById("app").appendChild(ghost)

        element.style.display = "none"
        newParent.appendChild(element)

        return new Promise(resolve => {
            ghost.style.transition = `left 0.5s, top 0.5s, transform 0.5s`
            ghost.addEventListener("transitionend", () => {
                element.style.display = ghost.style.display
                ghost.remove()
                resolve()
            })

            requestAnimationFrame(() => {
                ghost.style.left = `${endPosition.x}px`
                ghost.style.top = offset ? `calc(${endPosition.y}px + ${offset})` : `${endPosition.y}px`
                ghost.style.transform = `rotate(${rotate}deg)`
                element.style.transform = `rotate(${rotate}deg)`
            })
        })
    }

    playCard(card, element) {
        this.gameClient.playCard(card)

        const angle = (Math.random() ** 2) * 20 - 10
        this.glide(element, this.discardPile, angle)

        element.style.position = "absolute"
        if (this.discardPile.children.length >= 5) this.discardPile.firstChild.remove()
    }

    onPlayCard(event) {
        // const card = event.detail
        // const discardPile = document.getElementById("discardPile");
        // discardPile.innerHTML = "";
        // discardPile.appendChild(this.cardToHTML(card));
    }

    onDrawCard(event) {
        const card = event.detail
        const cardGroup = document.getElementById("hand").querySelector(`.cardGroup.${card.cardType}`)
        const drawPile = document.getElementById("drawPile")

        const cardDiv = this.cardToHTML(card)
        drawPile.appendChild(cardDiv)
        this.glide(cardDiv, cardGroup, 0, `${cardGroup.children.length * 2.75}rem`)
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