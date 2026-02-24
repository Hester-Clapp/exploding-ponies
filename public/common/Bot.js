import { SocketMessage } from "./SocketMessage.js"
import { GameClient } from "../client/service/GameClient.js"
import { User } from "../../server/service/UserHandler.js"

export class Bot extends GameClient {
    constructor(uuid, username) {
        super(uuid, new Map(), new BackendSocket(uuid, username))
        this.socket.addEventListener("send", this.onMessage.bind(this))

        this.username = username
        this.upcomingCards = []
        this.isAlive = true

        // If a bot has the ability to play a card which will reduce the probability of drawing an exploding card by this value, then they will play it
        this.desiredProbabilityReduction = Math.random() * 0.4

        // Seeing the future does not affect the average probability of the next card exploding, but the knowledge gained may provide foresight. 
        // The bot expects that by seeing the future it will be able to reduce its probability of exploding by this amount
        this.seeFutureProbabilityReduction = Math.random() * 0.4

        // When asking players for a favor, they are more likely to give you one of their worse cards. This damping factor accounts for the disappointment with the card you get 
        this.favorDamping = 0.8 + Math.random() * 0.2

        // When the bot feels safe, it may randomly play a nope card with this probability
        this.nopeLolProbability = Math.random() * 0.4

        // When the bot is targetted but it has a nope card, it will play it with this probability
        this.nopeDefenceProbability = 0.4 + Math.random() * 0.6

        // When the bot's action is noped, it will play another nope card in response with this probability, given that it has one
        this.yupProbability = 0.8 + Math.random() * 0.2

        // Card value describes how much this bot values having one of each card
        this.cardValues = {
            attack: {
                value: Math.random(),
                number: 4
            },
            cat1: {
                value: Math.random() * 0.5,
                number: 4
            },
            cat2: {
                value: Math.random() * 0.5,
                number: 4
            },
            cat3: {
                value: Math.random() * 0.5,
                number: 4
            },
            cat4: {
                value: Math.random() * 0.5,
                number: 4
            },
            cat5: {
                value: Math.random() * 0.5,
                number: 4
            },
            defuse: {
                value: Math.random() * 5,
                number: 6
            },
            exploding: {
                value: -1,
                number: 0
            },
            favor: {
                value: Math.random(),
                number: 4
            },
            future: {
                value: Math.random(),
                number: 5
            },
            nope: {
                value: Math.random(),
                number: 5
            },
            skip: {
                value: Math.random(),
                number: 4
            },
            shuffle: {
                value: Math.random(),
                number: 4
            }
        }
    }

    get averageCardValue() {
        let total = 0
        for (const type in this.cardValues) {
            const { value, number } = this.cardValues[type]
            total += value * number
        }
        return total
    }

    initialisePlayers(players) {
        this.players = new Map()
        for (const player of players.values()) {
            this.players.set(player.uuid, { username: player.username, isAlive: true, handSize: 8 })
        }
    }

    configureCardPlayability(coolingDown = false) {
        this.playableCards = super.configureCardPlayability(coolingDown)
    }

    // Receive message from server
    onMessage(type, payload) {
        switch (type) {
            case "deal":
                this.initialiseHand(payload)
                break

            case "nextturn":
                this.newTurn(payload.uuid)
                break

            case "playcard":
                this.onPlayCard(payload)
            case "resolve":
                clearTimeout(this.nopeTimeout)
                this.configureCardPlayability(payload.coolingDown)
                if (payload.coolingDown === true) {
                    this.nopeTimeout = setTimeout(() => this.decideNope(this.nopeLolProbability), 1000 + 1500 * Math.random())
                }
                break

            case "requestinput":
                this.requestInput(payload)
                break

            case "provideinput":
                if (payload.target === this.uuid) {
                    setTimeout(() => this.decideNope(this.nopeDefenceProbability), 1000 + 1500 * Math.random())
                }
                break

            case "transfer":
                if (payload.from === this.uuid) {
                    this.hand.take(payload.card.cardType)
                    this.dispatchEvent("give", payload)
                } else if (payload.to === this.uuid) {
                    this.hand.add(payload.card)
                    this.dispatchEvent("receive", payload)
                } else {
                    this.dispatchEvent("transfer", payload)
                }
                this.players.get(payload.from).handSize--
                this.players.get(payload.to).handSize++
                this.configureCardPlayability(false)
                break

            case "drawcard":
                this.players.get(payload.uuid).handSize++
                this.drawPileLength = payload.length
                if (payload.uuid === this.uuid) this.onDrawCard(payload.card)
                this.upcomingCards.shift()
                this.configureCardPlayability(false)
                break

            case "eliminate":
                this.lastTypePlayed = ""
                this.players.get(payload.uuid).isAlive = false
                if (payload.uuid === this.uuid) this.eliminateSelf()
                break

            case "show":
                this.upcomingCards = payload
                break

            case "win":
                this.socket.removeEventListener("send")
                break
        }
    }

    newTurn(uuid) {
        super.newTurn(uuid)
        this.startCooldown()
        this.finishCooldown()
        if (this.isMyTurn) this.decidePlay()
    }

    playType(type) {
        if (this.canPlay(type)) {
            this.playCard(this.hand.get(type))
        }
    }

    startCooldown() {
        this.cooldown = new Promise(resolve => this.finishCooldown = resolve)
    }

    requestInput(payload) {
        const { input, players, types, length } = payload
        console.log(input)
        setTimeout(() => {
            switch (input) {
                case "target":
                    this.provideInput({ target: this.choosePlayer(players) })
                    break
                case "cardType":
                    this.provideInput({ cardType: this.chooseCard(types) })
                    break
                case "position":
                    this.provideInput({ position: this.choosePosition(length) })
                    break
            }
        }, 500 + 1000 * Math.random())
    }

    choosePlayer(players) {
        const filtered = Array.from(players.keys())
            .filter(uuid => uuid !== this.uuid)
            .filter(uuid => players.get(uuid).isAlive)
            .filter(uuid => players.get(uuid).handSize > 0)
        const index = Math.floor(Math.random() * filtered.length)
        return filtered[index]
    }

    chooseCard(types) {
        return types.sort((a, b) => this.cardValues[a].value - this.cardValues[b].value)[0]
    }

    choosePosition(length) {
        return Math.floor(Math.random() * length)
    }

    decideNope(probability) {
        if (this.canPlay("nope") && Math.random() < probability) {
            this.playType("nope")
        }
    }

    onPlayCard(payload) {
        this.players.get(payload.uuid).handSize--
        this.lastCardPlayer = payload.uuid
        this.lastTypePlayed = payload.card.cardType
    }

    onDrawCard(card) {
        super.onDrawCard(card)
        if (card.cardType === "exploding") {
            const delay = 1000 + 500 * Math.random()
            setTimeout(() => this.playType("exploding"), delay)
            if (this.hand.has("defuse")) setTimeout(() => this.playType("defuse"), 500 + delay)
        }
    }

    eliminateSelf() {
        this.isAlive = false
        this.socket.removeEventListener("send")
    }

    canPlay(type) {
        return this.isAlive && this.hand.has(type) && this.playableCards[type] === true
    }

    decidePlay() {
        this.cardValues.exploding.number = Array.from(this.players.values()).filter(player => player.isAlive).length - 1
        const probability = (this.upcomingCards.length > 0)
            ? (this.upcomingCards[0].cardType === "exploding" ? 1 : 0)
            : this.cardValues.exploding.number / this.drawPileLength

        setTimeout(async () => {
            if (probability < this.desiredProbabilityReduction) {
                this.drawCard()
            } else {
                for (const type of this.hand.types) {
                    if (this.canPlay(type)) {
                        let newProbability
                        let cardValueSurplus = -this.cardValues[type].value
                        switch (type) {
                            case "nope":
                                break

                            case "attack":
                            case "skip":
                            case "defuse":
                                newProbability = 0;
                                break

                            case "shuffle":
                                newProbability = this.cardValues.exploding.number / this.drawPileLength
                                break

                            case "future":
                                newProbability = probability - this.seeFutureProbabilityReduction
                                break

                            case "favor":
                                cardValueSurplus += this.averageCardValue * this.favorDamping

                            default: // cats
                                cardValueSurplus += this.averageCardValue - this.cardValues[type].value // Subtract 1 for the second cat
                        }

                        if (probability - newProbability > this.desiredProbabilityReduction || cardValueSurplus > 0) {
                            const isCat = type.slice(0, 3) === "cat"
                            if (isCat && !this.hand.has(type, 2)) continue

                            this.playType(type)
                            if (isCat) setTimeout(() => this.playType(type), 500)

                            this.startCooldown()
                            await this.cooldown

                            setTimeout(() => this.decidePlay(), 1000 + 1000 * Math.random())
                        }
                    }
                }

                // If it gets here, it doesn't like any of its options but will draw anyway
                this.drawCard()
            }
        }, 1000 + 1500 * Math.random())
    }

    // Send message from bot to server
    send(type, payload) {
        this.socket.trigger("message", { data: new SocketMessage(this.uuid, type, payload).toString() })
    }

    dispatchEvent() {
        // dud
    }
}

class BackendSocket {
    constructor(uuid, username, onMessage) {
        this.user = new User(uuid, username)
        this.isHuman = false
        this.onMessage = onMessage
        this.handlers = new Map()
    }

    // Send message from server to bot
    send(message) {
        const { type, payload } = SocketMessage.fromEvent({ data: message })
        this.trigger("send", type, payload)
    }

    close() {
    }

    // What the server does when the bot sends a message
    addEventListener(event, callback) {
        this.handlers.set(event, callback)
    }

    // What the server does when the bot sends a message
    removeEventListener(event) {
        this.handlers.delete(event)
    }

    trigger(event, ...args) {
        if (this.handlers.has(event)) {
            const handler = this.handlers.get(event)
            handler(...args)
        }
    }
}
