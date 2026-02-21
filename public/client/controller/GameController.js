import { loadPage } from './pageLoader.js';


export class GameController {
    constructor() {
        this.bound = {
            setStatus: this.setStatus.bind(this),
            renderHand: this.renderHand.bind(this),
            onPlayCard: this.onPlayCard.bind(this),
            onDrawCard: this.onDrawCard.bind(this),
            onRequestInput: this.onRequestInput.bind(this),
        }

        this.eventHandlers = {
            statusupdate: this.bound.setStatus,
            deal: this.bound.renderHand,
            hand: this.bound.renderHand,
            draw: this.bound.onDrawCard,
            playcard: this.bound.onPlayCard,
            requestinput: this.bound.onRequestInput,
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

    // Rendering
    renderPlayerList(event) {
        const players = event.detail
        const playersDisplay = document.getElementById("otherPlayers");
        playersDisplay.innerHTML = "";

        for (const uuid of players.keys()) {
            if (uuid === this.uuid) continue
            const player = players.get(uuid)

            const div = document.createElement("div");
            div.classList.add("player")
            div.classList.add(`player${uuid}`)

            const nameTag = document.createElement("h3")
            nameTag.textContent = player;
            div.appendChild(nameTag)

            const hand = document.createElement("div");
            hand.classList.add(`hand`)
            div.appendChild(hand)

            playersDisplay.appendChild(div);

            this.initialisePlayerHand(uuid)
        }
    }

    initialisePlayerHand(uuid, length = 8) {
        if (uuid === this.uuid) return
        for (let i = 0; i < length; i++) {
            this.addToPlayerHand(uuid)
        }
    }

    addToPlayerHand(uuid) {
        const hand = document.querySelector(`.player${uuid} .hand`)
        const card = this.cardToHTML()
        document.getElementById("drawPile").appendChild(card)
        this.glide(card, hand, 0, 0.5)
    }

    renderHand(event) {
        const hand = event.detail
        const handDisplay = document.getElementById("hand");

        for (const type in hand) {
            const cardGroup = handDisplay.querySelector(`.${type}`)
            cardGroup.innerHTML = "";

            for (const card of hand[type]) {
                const cardDiv = this.cardToHTML(card, true)
                document.getElementById("drawPile").appendChild(cardDiv);
                this.glide(cardDiv, cardGroup)
            }
        }
    }

    cardToHTML(card = { cardType: "back", color: "black" }, functional = false) {
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

    // Animations
    async glide(element, newParent, rotate = 0, scale = 1) {
        const startPosition = element.parentElement.getBoundingClientRect()
        const endPosition = newParent.getBoundingClientRect()
        const offset = {
            x: "0px",
            y: newParent.classList.contains("cardGroup") ? `${element.children.length * 2.75}rem` :
                newParent.classList.contains("hand") ? `-2.5rem` : "0px"
        }

        const ghost = element.cloneNode(true)
        ghost.style.position = "fixed"
        ghost.style.left = `${startPosition.x}px`
        ghost.style.top = `${startPosition.y}px`
        ghost.style.transform = `rotate(0deg) scale(1)`
        document.getElementById("app").appendChild(ghost)

        element.style.display = "none"
        newParent.appendChild(element)

        return new Promise(resolve => {
            ghost.style.transition = `all 0.5s`
            setTimeout(() => {
                element.style.display = ghost.style.display
                ghost.remove()
                resolve()
            }, 500)

            requestAnimationFrame(() => {
                ghost.style.left = `calc(${endPosition.x}px + ${offset.x})`
                ghost.style.top = `calc(${endPosition.y}px + ${offset.y})`
                ghost.style.transform = `rotate(${rotate}deg) scale(${scale})`
                element.style.transform = `rotate(${rotate}deg) scale(${scale})`
            })
        })
    }

    animateDiscard(element) {
        const angle = (Math.random() ** 2) * 20 - 10
        this.glide(element, this.discardPile, angle, 1)

        element.style.position = "absolute"
        if (this.discardPile.children.length >= 5) this.discardPile.firstChild.remove()
    }

    animateCooldown() {
        const bar = this.cooldown.firstElementChild

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

    // Actions
    playCard(card, element) {
        this.gameClient.playCard(card)
        this.animateDiscard(element)
        this.animateCooldown()
    }

    async choosePlayer(players) {
        return new Promise(resolve => {
            this.setStatus({ detail: "Choose a player to target" })
            console.log(players)
            players.forEach(uuid => {
                if (uuid === this.uuid) return
                const element = document.querySelector(`.player${uuid}`)
                console.log(uuid, element)
                element.style.cursor = "pointer"

                element.addEventListener("click", () => {
                    element.style.cursor = "auto"
                    this.setStatus({ detail: "It's your turn! (draw a card to end it)" })
                    resolve(uuid)
                }, { once: true })
            })
        })
    }

    async chooseCard() {
        return new Promise(resolve => {
            this.setStatus({ detail: "Choose a card to give" })
            document.querySelectorAll(".cardGroup").forEach(element => {
                const type = element.className.split(" ")[0]

                element.style.cursor = "pointer"

                element.addEventListener("click", () => {
                    element.style.cursor = "auto"
                    // this.setStatus({ detail: "It's your turn! (draw a card to end it)" })
                    resolve(type)
                }, { once: true })
            })
        })
    }

    // Reactions
    onPlayCard(event) {
        const { card, uuid } = event.detail
        if (uuid === this.uuid) return

        const element = this.cardToHTML(card)
        // element.style.scale = "0.5"

        const hand = document.querySelector(`#otherPlayers .player${uuid} .hand`)
        hand.firstElementChild.remove()
        hand.appendChild(element)
        window.requestAnimationFrame(() => this.animateDiscard(element))

        this.animateCooldown()
    }

    onRequestInput(event) {
        const { input, players } = event.detail
        switch (input) {
            case "target":
                this.choosePlayer(Array.from(players.keys()))
                    .then(target => this.gameClient.provideInput({ target }))
                break
            case "cardType":
                this.chooseCard()
                    .then(cardType => this.gameClient.provideInput({ cardType }))
                break
        }
    }

    onDrawCard(event) {
        const { card, uuid, handSize } = event.detail
        const drawPile = document.getElementById("drawPile")

        if (uuid === this.uuid) {
            const cardGroup = document.getElementById("hand").querySelector(`.cardGroup.${card.cardType}`)

            const cardDiv = this.cardToHTML(card, true)
            drawPile.appendChild(cardDiv)
            this.glide(cardDiv, cardGroup)
        } else {
            this.addToPlayerHand(uuid, handSize)
        }
    }

    setStatus(event) {
        console.log(event.detail)
        document.getElementById("status").textContent = event.detail;
    }
}