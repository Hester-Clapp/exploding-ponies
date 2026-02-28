import { Controller } from './Controller.js';
import { loadPage } from './pageLoader.js';
import { audibleCards } from "../../common/Card.js"
import { Avatar } from '../service/Avatar.js';

export class GameController extends Controller {
    constructor() {
        super()

        this.audio = Object.fromEntries(audibleCards
            .map(cardId => [cardId, new Audio(`resources/audio/${cardId}.mp3`)]))
    }

    async beforeLoad(uuid, gameClient, cooldownTime) {
        super.beforeLoad()

        this.uuid = uuid
        this.gameClient = gameClient
        this.cooldownTime = cooldownTime

        this.addEventListener("beforeunload", () => {
            this.gameClient.leaveGame()
            this.gameClient = null
        }, true)
    }

    async afterLoad() {
        super.afterLoad()

        this.drawPile = document.getElementById("drawPile")
        this.discardPile = document.getElementById("discardPile")
        this.cooldown = document.getElementById("cooldown")
        this.handDisplay = document.getElementById("hand")

        document.getElementById("leave").addEventListener("click", () => this.leaveGame(), { once: true })
        this.drawPile.addEventListener("click", this.gameClient.drawCard.bind(this.gameClient), { signal: this.cleanup.signal })

        this.addEventListener("newturn", this.onNewTurn)
        this.addEventListener("deal", this.renderHand)
        this.addEventListener("playcard", this.onPlayCard)
        this.addEventListener("provideinput", this.onProvideInput)
        this.addEventListener("requestinput", this.onRequestInput)
        this.addEventListener("show", this.showFuture)
        this.addEventListener("deck", this.onDeckLengthChange)
        this.addEventListener("give", this.giveCard)
        this.addEventListener("receive", this.receiveCard)
        this.addEventListener("transfer", this.animateTransfer)
        this.addEventListener("shuffle", this.shuffle)
        this.addEventListener("drawcard", this.onDrawCard)
        this.addEventListener("eliminate", this.eliminatePlayer)
        this.addEventListener("eliminated", this.eliminateSelf)
        this.addEventListener("win", this.onWin)
        this.addEventListener("leave", this.leaveGame)

        this.gameClient.send("ready", null)

        this.renderPlayerList({ detail: this.gameClient.players });
    }

    // Rendering

    /**
     * Renders the other players in the game and their hands
     * @param {Event} event 
     */
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

            const flex = document.createElement("div")
            flex.style.display = "flex"
            div.appendChild(flex)

            const nameTag = document.createElement("h3")
            nameTag.textContent = player.username;
            flex.appendChild(nameTag)

            const avatar = new Avatar(document.createElement("div"))
            avatar.setFeatures(player.avatar)
            flex.appendChild(avatar.container)

            const hand = document.createElement("div");
            hand.classList.add(`hand`)
            div.appendChild(hand)

            playersDisplay.appendChild(div);

            this.initialisePlayerHand(uuid)
        }
    }

    /**
     * Adds visual cards to the other players' hands after dealing
     * @param {string} uuid The player whose hand we are adding to
     * @param {number} length The number of cards they have
     */
    initialisePlayerHand(uuid, length = 8) {
        if (uuid === this.uuid) return
        for (let i = 0; i < length; i++) {
            this.addToPlayerHand(uuid)
        }
    }

    /**
     * Animates a card from the draw pile to another player's hand
     * @param {string} uuid The player who is drawing the card
     */
    addToPlayerHand(uuid) {
        const hand = document.querySelector(`.player${uuid} .hand`)
        const card = this.cardToHTML()
        document.getElementById("drawPile").appendChild(card)
        this.glide(card, hand, 0, 0.5)
    }

    /**
     * Renders the contents of this player's hand
     * @param {Event} event Encapsulates the cards in the hand and the length of the draw pile
     */
    renderHand(event) {
        const { hand, length } = event.detail
        this.setDrawPileHeight(length)

        for (const type in hand) {
            const cardGroup = this.handDisplay.querySelector(`.${type}`)
            cardGroup.innerHTML = "";

            for (const card of hand[type]) {
                const cardDiv = this.cardToHTML(card, true)
                document.getElementById("drawPile").appendChild(cardDiv);
                this.glide(cardDiv, cardGroup)
            }
        }
    }

    /**
     * Adjusts the visual height of the draw pile
     * @param {number} length The number of cards in the draw pile
     */
    setDrawPileHeight(length) {
        if (length === 0) {
            this.drawPile.style.opacity = "0"
        } else {
            this.drawPile.style.opacity = "1"
        }
        this.drawPile.style["box-shadow"] = `0 ${length}px 0 0.25rem #ddd`
    }

    /**
     * Creates a HTML representation of a card
     * @param {Card} card The card to represent - leave blank for a back card
     * @param {boolean} functional Whether the card is functional - can it be clicked or interacted with
     * @returns The HTML element representing the card
     */
    cardToHTML(card = { cardId: "back", color: "#eee" }, functional = false) {
        const { cardType, cardId, color, name, instructions } = card

        const div = document.createElement("div")
        div.classList.add("card")
        div.title = instructions || `Play ${name} card`
        div.style["border-color"] = color

        if (cardType === "exploding") {
            div.classList.add("exploding")
        }

        if (cardId === "back") {
            div.classList.add("back")
        } else {
            const heading = document.createElement("h5")
            heading.textContent = name
            div.appendChild(heading)
        }

        const img = document.createElement("img")
        img.src = `resources/images/${cardId}.png`
        img.alt = name
        if (!card.isCat) img.style.background = color
        div.appendChild(img)

        if (functional) {
            function enableCard(event) {
                const isEnabled = event.detail[card.cardType]
                div.classList.toggle("enabled", isEnabled)
                div.classList.toggle("disabled", !isEnabled)
            }

            window.addEventListener("enablecard", enableCard, { signal: this.cleanup.signal })

            div.addEventListener("click", function clickCard() {
                if (div.classList.contains("enabled")) {
                    div.classList.remove("enabled")
                    window.removeEventListener("enablecard", enableCard)
                    div.removeEventListener("click", clickCard)
                    this.playAudio(card, cardType === "nope" && this.gameClient.isMyTurn)
                    this.playCard(card, div)
                }
            }.bind(this))
        }

        return div
    }

    /**
     * Changes the status header to show whose turn it is
     * @param {string} uuid The player whose turn it is
     */
    setTurnStatus(uuid) {
        const isMyTurn = uuid === this.uuid
        const text = isMyTurn ? "It's your turn!" : `It's ${this.gameClient.getUsername(uuid)}'s turn`
        document.getElementById("turnStatus").textContent = text;
        document.querySelectorAll(".turn").forEach(el => el.classList.remove("turn"))
        if (isMyTurn) {
            this.handDisplay.classList.add("turn")
            this.drawPile.classList.add("turn")
        } else {
            document.querySelector(`.player${uuid}`)?.classList?.add("turn")
        }
    }

    /**
     * Changes the status header to show who won
     * @param {string} uuid The player who won
     */
    setWinStatus(uuid) {
        const isMyTurn = uuid === this.uuid
        const text = isMyTurn ? "You won!" : `${this.gameClient.getUsername(uuid)} won!`
        document.getElementById("turnStatus").textContent = text;
    }

    /**
     * Changes the status sub-header
     * @param {string} text The text to show
     */
    setPlayStatus(text) {
        document.getElementById("playStatus").textContent = text;
    }

    // Actions

    /**
     * Triggered when this player plays a card
     * @param {Card} card The card they played
     * @param {HTMLElement} element The element representing the card to be animated
     */
    playCard(card, element) {
        this.setPlayStatus(`You played ${card.name}`)
        this.gameClient.playCard(card)
        this.animateDiscard(element)
        this.animateCooldown()
    }

    /**
     * Prompts this user to choose a target player for favor and cat cards
     * @param {User[]} players All the players in the game
     * @returns The uuid of the chosen player
     */
    async choosePlayer(players) {
        return new Promise(resolve => {
            const controller = new AbortController()
            this.setPlayStatus("Choose a player to target")

            players.forEach(uuid => {
                if (uuid === this.uuid || !this.gameClient.players.get(uuid).isAlive) return
                const element = document.querySelector(`.player${uuid}`)
                element.style.cursor = "pointer"

                element.addEventListener("click", () => {
                    document.querySelectorAll(`#otherPlayers>div`).forEach(el => el.style.cursor = "auto")
                    element.style.cursor = "auto"

                    document.querySelector(`.player${uuid}`).classList.add("target")
                    this.setPlayStatus(`Waiting for ${this.gameClient.getUsername(uuid)} to choose a card...`)

                    controller.abort()
                    resolve(uuid)
                }, { once: true, signal: controller.signal })
            })
        })
    }

    /**
     * Prompts this user to choose a card type if they are targetted by a favor card
     * @param {string[]} types The different types of card they could choose
     * @returns The type of card they want to give
     */
    async chooseCard(types) {
        return new Promise(resolve => {
            const controller = new AbortController()
            this.setPlayStatus("Choose a card to give")
            this.handDisplay.classList.add("target")

            types.forEach(type => {
                const element = document.querySelector(`.${type}.cardGroup`)
                element.style.cursor = "pointer"

                element.addEventListener("click", (e) => {
                    e.stopPropagation()
                    document.querySelectorAll(`.cardGroup`).forEach(el => el.style.cursor = "auto")

                    controller.abort()
                    resolve(type)
                }, { signal: controller.signal, capture: true })
            })
        })
    }

    /**
     * Prompts this user to choose a position to re-insert an exploding card after defusing it
     * @param {number} length The number of cards in the draw pile
     * @returns The position where the card should be inserted
     */
    async choosePosition(length) {
        return new Promise(resolve => {
            const overlay = document.getElementById("overlay")
            const div = document.getElementById("insert")
            const input = div.querySelector("input")
            input.max = length
            input.value = Math.floor(length / 2)

            div.querySelector(".card").style["box-shadow"] = `0 ${length * 4}px 0 0.25rem #ddd`

            overlay.classList.remove("hidden")
            div.classList.remove("hidden")

            div.querySelector("button").addEventListener("click", () => {
                overlay.classList.add("hidden")
                div.classList.add("hidden")
                resolve(Number(input.value))
            }, { once: true })
        })
    }

    /**
     * Leaves the game and returns to the rooms overview
     */
    leaveGame() {
        this.cleanup.abort()
        this.gameClient?.leaveGame()
        this.gameClient = null
        loadPage("rooms", this.uuid)
    }

    /**
     * Plays the audio associated with a given card when it is played
     * @param {Card} card The card being played
     * @param {boolean} yup Whether the nope card should play the "yup" variant
     */
    playAudio(card, yup) {
        if (this.currentAudio) {
            this.currentAudio.pause()
            if (this.currentAudio != this.audio[card.cardId]) {
                this.currentAudio.currentTime = 0
            }
        }
        this.currentAudio = yup ? this.audio["yup" + card.index] : this.audio[card.cardId]
        this.currentAudio.play()
    }

    // Reactions

    /**
     * Configures the status headers when it is a new turn
     * @param {Event} event Encapsulates the uuid of the player whose turn it now is
     */
    onNewTurn(event) {
        const { uuid } = event.detail
        document.querySelector(`.target`)?.classList?.remove("target")
        if (uuid !== this.gameClient.currentPlayerId) {
            this.setTurnStatus(uuid)
            this.setPlayStatus("")
        }
    }

    /**
     * Animates another player playing a card
     * @param {Event} event Encapsulates the card played, the player who played it and whether it is a "yup" variant
     */
    onPlayCard(event) {
        const { card, uuid, yup } = event.detail
        if (uuid === this.uuid) return

        this.setPlayStatus(`${this.gameClient.getUsername(uuid)} played ${card.name}`)

        const element = this.cardToHTML(card)
        this.playAudio(card, yup)
        // element.style.scale = "0.5"

        const hand = document.querySelector(`#otherPlayers .player${uuid} .hand`)
        hand.firstElementChild.remove()
        hand.appendChild(element)
        window.requestAnimationFrame(() => this.animateDiscard(element))

        this.animateCooldown()
    }

    /**
     * Dispatches which chooser to use when input is requested from this user
     * @param {Event} event Encapsulates the input being requested and relevant arguments
     */
    onRequestInput(event) {
        const { input, players, types, length } = event.detail
        switch (input) {
            case "target":
                this.choosePlayer(Array.from(players.keys()))
                    .then(target => this.gameClient.provideInput({ target }))
                break
            case "cardType":
                this.chooseCard(types)
                    .then(cardType => this.gameClient.provideInput({ cardType }))
                break
            case "position":
                this.choosePosition(length)
                    .then(position => this.gameClient.provideInput({ position }))
                break
        }
    }

    /**
     * Configures the status sub-header when input is provided
     * @param {Event} event Encapsulates the target and relevant information
     */
    onProvideInput(event) {
        const { target, cardType } = event.detail
        if (cardType === "favor" && target === this.uuid) return; // Message is already handled
        this.setPlayStatus(`${this.gameClient.getUsername()} chose to target ${target === this.uuid ? "you!" : this.gameClient.getUsername(target)}`)
        document.querySelector(target === this.uuid ? "#hand" : `.player${target}`).classList.add("target")
    }

    /**
     * Animates any player drawing a card
     * @param {Event} event Encapsulates the card being drawn, the player drawing it, the new size of their hand and the length of the draw pile
     */
    onDrawCard(event) {
        const { card, uuid, handSize, length } = event.detail
        this.setDrawPileHeight(length)

        if (uuid === this.uuid) {
            const cardGroup = this.handDisplay.querySelector(`.cardGroup.${card.cardType}`)

            const cardDiv = this.cardToHTML(card, true)
            drawPile.appendChild(cardDiv)
            this.glide(cardDiv, cardGroup)
        } else {
            this.addToPlayerHand(uuid, handSize)
        }
    }

    /**
     * Configures the visual height of the draw pile when it changes
     * @param {Event} event Encapsulates the length of the deck
     */
    onDeckLengthChange(event) {
        const length = event.detail.length
        this.setDrawPileHeight(length)
    }

    /**
     * Displays the 3 cards on top of the deck to this player
     * @param {Event} event Encapsulates the cards coming up
     */
    showFuture(event) {
        const cards = event.detail
        const overlay = document.getElementById("overlay")
        const div = document.getElementById("future")
        const ol = div.querySelector("ol")
        cards.forEach(card => {
            const li = document.createElement("li")
            li.appendChild(this.cardToHTML(card))
            ol.appendChild(li)
        })

        overlay.classList.remove("hidden")
        div.classList.remove("hidden")

        function remove() {
            overlay.classList.add("hidden")
            div.classList.add("hidden")
            ol.innerHTML = ""
        }

        div.querySelector("button").addEventListener("click", remove, { once: true })
        setTimeout(remove, this.cooldownTime * 2000)
    }

    /**
     * Animates giving a card to another player
     * @param {Event} event Encapsulates the card being given and the player receiving it
     */
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

        this.setPlayStatus(`You sent a ${card.name} card to ${this.gameClient.getUsername(to)}`)
    }

    /**
     * Animates receiving a card from another player
     * @param {Event} event Encapsulates the card being received and the player giving it
     */
    receiveCard(event) {
        const { card, from } = event.detail

        const element = this.cardToHTML(card, true)
        element.style.transform = "scale(0.5)"

        const start = document.querySelector(`#otherPlayers .player${from} .hand`)
        const end = document.querySelector(`.cardGroup.${card.cardType}`)

        start.firstElementChild.remove()
        start.appendChild(element)
        window.requestAnimationFrame(() => this.glide(element, end))

        this.setPlayStatus(`You got a ${card.name} card from ${this.gameClient.getUsername(from)}!`)
    }

    /**
     * Animates the draw pile being shuffled
     */
    shuffle() {
        this.drawPile.style.transform = "scaleX(1)"
        this.drawPile.style.transition = "transform 0.25s ease-in-out"
        requestAnimationFrame(() => this.drawPile.style.transform = "scaleX(0)")
        setTimeout(() => requestAnimationFrame(() => this.drawPile.style.transform = "scaleX(1)"), 500)
    }

    /**
     * Configures the status bar when a player is eliminated or leaves the game
     * @param {Event} event Encapsulates the player who is eliminated and the new current player if they left
     */
    eliminatePlayer(event) {
        const { uuid, currentPlayerId } = event.detail
        if (currentPlayerId) { // Player left game
            this.setTurnStatus(currentPlayerId)
            this.setPlayStatus(`${this.gameClient.getUsername(uuid)} left the game`)
        } else { // Player exploded
            this.setPlayStatus(`${this.gameClient.getUsername(uuid)} has been eliminated!`)
        }
        document.querySelector(`.player${uuid}`).style.filter = "brightness(0.5)"
    }

    /**
     * Configures the status bar when this player is eliminated and hides their hand
     */
    eliminateSelf() {
        this.setPlayStatus(`You have been eliminated!`)
        this.hideUI()
    }

    /**
     * Hides the visual hand when this player wins or is eliminated
     */
    hideUI() {
        this.handDisplay.style.opacity = 0
        this.drawPile.style.cursor = "auto"
        setTimeout(() => this.handDisplay.remove(), 500)
    }

    /**
     * Configures the status bar when a player wins and hides this player's hand
     * Redirects to the rooms overview after 5 seconds
     * @param {Event} event Encapsulates the player who won
     */
    onWin(event) {
        const { uuid } = event.detail
        this.setWinStatus(uuid)
        this.hideUI()
        setTimeout(() => this.setPlayStatus("Exiting to lobby..."), 3000)
        setTimeout(() => this.leaveGame(), 5000)
    }

    // Animations

    /**
     * Animates gliding a card from its current location to another
     * @param {HTMLElement} element The card element to animate
     * @param {HTMLElement} newParent The element to glide the card to
     * @param {number} rotate The nubmer of degrees to rotate the card
     * @param {number} scale The final scale of the card
     * @returns 
     */
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
        ghost.style.transition = "none"
        document.getElementById("app").appendChild(ghost)

        element.style.display = "none"
        newParent.appendChild(element)

        return new Promise(resolve => {
            ghost.offsetHeight // Force reflow

            ghost.style.transition = `left 0.5s ease-out, top 0.5s ease-out, transform 0.5s ease-out`

            ghost.addEventListener("transitionend", () => {
                element.style.display = ghost.style.display
                ghost.remove()
                resolve()
            }, { once: true })

            requestAnimationFrame(() => {
                ghost.style.left = `calc(${endPosition.x}px + ${offset.x})`
                ghost.style.top = `calc(${endPosition.y}px + ${offset.y})`
                ghost.style.transform = `rotate(${rotate}deg) scale(${scale})`
                element.style.transform = `rotate(${rotate}deg) scale(${scale})`
            })
        })
    }

    /**
     * Glides a card to the discard pile, applying a random rotation
     * @param {HTMLElement} element The card to animate
     */
    animateDiscard(element) {
        const angle = (Math.random() ** 2) * 20 - 10
        this.glide(element, this.discardPile, angle, 1)

        element.style.position = "absolute"
        if (this.discardPile.children.length >= 5) this.discardPile.firstChild.remove()
    }

    /**
     * Animates the bar showing the cooldown before playing another card
     */
    animateCooldown() {
        const bar = this.cooldown.firstElementChild

        this.cooldown.style.opacity = "1"
        bar.style.transition = "none"
        bar.style.width = "100%"
        bar.style.background = "blue"

        window.requestAnimationFrame(() => {
            bar.offsetHeight // Force reflow

            bar.style.transition = `width ${this.cooldownTime}s linear, background-color ${this.cooldownTime}s linear`
            bar.style.width = "0"
            bar.style.background = "orange"

            bar.addEventListener("transitionend", () => {
                this.cooldown.style.opacity = "0"
            }, { once: true })
        })
    }

    /**
     * Animates transferring a card from one player to another, neither of whom are this player
     * @param {Event} event Encapsulates the sender and receiver of the card
     */
    animateTransfer(event) {
        const { from, to } = event.detail
        const fromDiv = document.querySelector(`.player${from} .hand`)
        const toDiv = document.querySelector(`.player${to} .hand`)
        const card = fromDiv.firstElementChild
        this.glide(card, toDiv, 0, 0.5)
    }
}