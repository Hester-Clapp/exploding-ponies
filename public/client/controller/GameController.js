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

    async beforeLoad(uuid, gameClient, cooldownTime) {
        this.uuid = uuid
        this.gameClient = gameClient
        this.cooldownTime = cooldownTime
    }

    async afterLoad() {
        this.discardPile = document.getElementById("discardPile")
        this.cooldown = document.getElementById("cooldown")

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
            div.classList.add(`player${uuid}`)
            div.textContent = player;

            const hand = document.createElement("div");
            hand.classList.add(`hand`)

            div.appendChild(hand)
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

    async glide(element, newParent, rotate = 0, offset = "0px") {
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
                ghost.style.top = `calc(${endPosition.y}px + ${offset})`
                ghost.style.transform = `rotate(${rotate}deg)`
                element.style.transform = `rotate(${rotate}deg)`
            })
        })
    }

    playCard(card, element) {
        this.gameClient.playCard(card)
        this.animateDiscard(element)
        this.animateCooldown()
    }

    animateDiscard(element) {
        const angle = (Math.random() ** 2) * 20 - 10
        this.glide(element, this.discardPile, angle)

        element.style.position = "absolute"
        if (this.discardPile.children.length >= 5) this.discardPile.firstChild.remove()
    }

    animateCooldown() {
        const bar = this.cooldown.firstElementChild
        console.log(this.cooldownTime)

        this.cooldown.style.opacity = "1"
        bar.style.transition = ""
        bar.style.width = "100%"
        bar.style.background = "blue"

        window.requestAnimationFrame(() => {
            bar.style.transition = `width ${this.cooldownTime}s linear, background-color ${this.cooldownTime}s linear`
            bar.style.width = "0"
            bar.style.background = "orange"

            bar.addEventListener("transitionend", () => {
                this.cooldown.style.opacity = "0"
            }, { once: true })
        })
    }

    onPlayCard(event) {
        const { card, uuid } = event.detail
        if (uuid === this.uuid) return

        const element = this.cardToHTML(card, false)
        document.querySelector(`#otherPlayers .player${uuid} .hand`).appendChild(element)
        window.requestAnimationFrame(() => this.animateDiscard(element))

        this.animateCooldown()
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