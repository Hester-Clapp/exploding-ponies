import { loadPage } from './pageLoader.js';


export class GameController {
    constructor() {
        this.bound = {
            onNewTurn: this.onNewTurn.bind(this),
            renderHand: this.renderHand.bind(this),
            onPlayCard: this.onPlayCard.bind(this),
            onRequestInput: this.onRequestInput.bind(this),
            showFuture: this.showFuture.bind(this),
            giveCard: this.giveCard.bind(this),
            receiveCard: this.receiveCard.bind(this),
            onDrawCard: this.onDrawCard.bind(this),
        }

        this.eventHandlers = {
            newturn: this.bound.onNewTurn,
            deal: this.bound.renderHand,
            playcard: this.bound.onPlayCard,
            requestinput: this.bound.onRequestInput,
            show: this.bound.showFuture,
            give: this.bound.giveCard,
            receive: this.bound.receiveCard,
            draw: this.bound.onDrawCard,
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

    // Actions
    playCard(card, element) {
        this.setPlayStatus(`You played ${card.name}`)
        this.gameClient.playCard(card)
        this.animateDiscard(element)
        this.animateCooldown()
    }

    async choosePlayer(players) {
        return new Promise(resolve => {
            this.setPlayStatus("Choose a player to target")
            console.log(players)
            players.forEach(uuid => {
                if (uuid === this.uuid) return
                const element = document.querySelector(`.player${uuid}`)
                console.log(uuid, element)
                element.style.cursor = "pointer"

                element.addEventListener("click", () => {
                    element.style.cursor = "auto"
                    this.setPlayStatus(`Waiting for ${this.gameClient.getPlayer(uuid)} to choose a card...`)
                    resolve(uuid)
                }, { once: true })
            })
        })
    }

    async chooseCard(types) {
        return new Promise(resolve => {
            this.setPlayStatus("Choose a card to give")
            types.forEach(type => {
                const element = document.querySelector(`.${type}.cardGroup`)

                element.style.cursor = "pointer"

                element.addEventListener("click", () => {
                    element.style.cursor = "auto"
                    resolve(type)
                }, { once: true })
            })
        })
    }

    getUsername(uuid) {
        return this.gameClient.getPlayer(uuid)
    }

    // Reactions
    onNewTurn(event) {
        const { uuid } = event.detail
        this.setTurnStatus(uuid)
        this.setPlayStatus("")
    }

    onPlayCard(event) {
        const { card, uuid } = event.detail
        const isMyTurn = uuid === this.uuid
        if (isMyTurn) return

        const username = this.gameClient.getPlayer(uuid)
        this.setPlayStatus(`${username} played ${card.name}`)

        const element = this.cardToHTML(card)
        // element.style.scale = "0.5"

        const hand = document.querySelector(`#otherPlayers .player${uuid} .hand`)
        hand.firstElementChild.remove()
        hand.appendChild(element)
        window.requestAnimationFrame(() => this.animateDiscard(element))

        this.animateCooldown()
    }

    onRequestInput(event) {
        const { input, players, types } = event.detail
        switch (input) {
            case "target":
                this.choosePlayer(Array.from(players.keys()))
                    .then(target => this.gameClient.provideInput({ target }))
                break
            case "cardType":
                this.chooseCard(types)
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

    showFuture(event) {
        const cards = event.detail
        console.log(cards)
        const div = document.getElementById("future")
        const ol = div.querySelector("ol")
        cards.forEach(card => {
            const li = document.createElement("li")
            li.appendChild(this.cardToHTML(card))
            ol.appendChild(li)
        })

        div.classList.remove("hidden")

        div.querySelector("button").addEventListener("click", () => {
            div.classList.add('hidden')
            ol.innerHTML = ""
        }, { once: true })
    }

    giveCard(event) {
        const { card, to } = event.detail

        const element = document.querySelector(`.cardGroup.${card.cardType}`).firstElementChild
        const end = document.querySelector(`#otherPlayers .player${to} .hand`)

        window.requestAnimationFrame(() => {
            this.glide(element, end, 0, 0.5).then(() => {
                element.remove()
                const cardBack = this.cardToHTML()
                end.appendChild(cardBack)
            })
        })

        this.setPlayStatus(`You sent a ${card.name} card to ${this.gameClient.getPlayer(to)}`)
    }

    receiveCard(event) {
        const { card, from } = event.detail

        const element = this.cardToHTML(card, true)
        element.style.transform = "scale(0.5)"

        const start = document.querySelector(`#otherPlayers .player${from} .hand`)
        const end = document.querySelector(`.cardGroup.${card.cardType}`)

        start.firstElementChild.remove()
        start.appendChild(element)
        window.requestAnimationFrame(() => this.glide(element, end))

        this.setPlayStatus(`You got a ${card.name} card from ${this.gameClient.getPlayer(from)}!`)
    }

    setTurnStatus(uuid) {
        const isMyTurn = uuid === this.uuid
        const text = isMyTurn ? "It's your turn!" : `It's ${this.gameClient.getPlayer(uuid)}'s turn`
        console.log(text)
        document.getElementById("turnStatus").textContent = text;
    }

    setPlayStatus(text) {
        console.log(text)
        document.getElementById("playStatus").textContent = text;
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

}