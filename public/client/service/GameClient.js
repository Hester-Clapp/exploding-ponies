import { SocketMessage } from '../../common/SocketMessage.js';
import { Hand } from "../../common/Hand.js"

export class GameClient {
    constructor(uuid, players, socket) {
        this.uuid = uuid
        this.socket = socket

        this.players = new Map()
        for (const [uuid, username] of players.entries()) {
            this.players.set(uuid, { username, isAlive: true })
        }

        this.isMyTurn = false
        this.lastTypePlayed = ""
        this.lastTypeDrawn = ""
        this.drawPileLength = 0
    }

    onMessage(type, payload) {
        switch (type) {
            case "deal":
                this.initialiseHand(payload)
                break

            case "nextturn":
                this.newTurn(payload.uuid)
                break

            case "playcard":
                this.lastTypePlayed = payload.card.cardType
                this.dispatchEvent(type, { ...payload, username: this.getUsername(payload.uuid) })
            case "resolve":
                this.configureCardPlayability(payload.coolingDown)
                break

            case "requestinput":
                this.requestInput(payload)
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
                this.configureCardPlayability(false)
                break

            case "drawcard":
                this.drawPileLength = payload.length
                if (payload.uuid === this.uuid) this.onDrawCard(payload.card)
                this.dispatchEvent(type, payload)
                this.configureCardPlayability(false)
                break

            case "eliminate":
                this.lastTypePlayed = ""
                if (payload.uuid === this.uuid) this.dispatchEvent("eliminated")
                else this.dispatchEvent(type, payload)
                break

            case "shuffle":
            case "show":
            case "win":
                this.dispatchEvent(type, payload)
                break
        }
    }

    initialiseHand(payload) {
        this.hand = new Hand(payload.hand)
        this.dispatchEvent("deal", { hand: this.hand.toObject(), length: payload.length })
    }

    newTurn(uuid) {
        this.currentPlayerId = uuid
        this.isMyTurn = this.currentPlayerId === this.uuid
        this.dispatchEvent("newturn", { uuid })

        this.lastTypePlayed = ""
        this.lastTypeDrawn = ""
        this.configureCardPlayability()
    }

    configureCardPlayability(coolingDown = false) {
        const defaultPlayability = this.isMyTurn
            && this.lastTypeDrawn !== "exploding"
            && this.lastTypePlayed !== "exploding"

        const catPlayability = (catType) => (this.hand.has(catType, 2)
            || (coolingDown && this.hand.has(catType) && this.lastTypePlayed === catType))

        const playableCards = {
            attack: defaultPlayability,
            cat1: defaultPlayability && catPlayability("cat1"),
            cat2: defaultPlayability && catPlayability("cat2"),
            cat3: defaultPlayability && catPlayability("cat3"),
            cat4: defaultPlayability && catPlayability("cat4"),
            cat5: defaultPlayability && catPlayability("cat5"),
            defuse: this.isMyTurn && this.lastTypePlayed === "exploding",
            exploding: this.lastTypeDrawn === "exploding",
            favor: defaultPlayability,
            future: defaultPlayability,
            nope: coolingDown && (!this.isMyTurn || this.lastTypePlayed === "nope") && this.lastTypePlayed !== "defuse" && this.lastTypePlayed !== "exploding",
            shuffle: defaultPlayability,
            skip: defaultPlayability,
        }
        this.dispatchEvent("enablecard", playableCards)
        return playableCards
    }

    playCard(card) {
        this.send("playcard", card)
        this.hand.take(card.cardType)
        switch (card.cardType) {
            case "cat1":
            case "cat2":
            case "cat3":
            case "cat4":
            case "cat5":
                if (this.lastTypePlayed !== card.cardType) break // Only ask for input after the second cat
            case "favor":
                this.requestInput({ input: "target", players: this.players })
                break
            case "defuse":
                this.requestInput({ input: "position", length: this.drawPileLength })
                break
        }
        this.lastTypePlayed = card.cardType
        if (card.cardType === "defuse") this.lastTypeDrawn = ""
    }

    provideInput(payload) {
        this.send("provideinput", payload)
    }

    drawCard() {
        if (this.isMyTurn && this.lastTypeDrawn !== "exploding") {
            this.send("drawcard")
        }
    }

    leaveGame() {
        this.socket.close()
    }

    onDrawCard(card) {
        this.lastTypeDrawn = card.cardType
        this.hand.add(card)

        if (card.cardType === "exploding") {
            this.configureCardPlayability(false)
        }
    }

    requestInput(payload) {
        this.dispatchEvent("requestinput", payload)
    }

    getPlayer(uuid = this.currentPlayerId) {
        return this.players.get(uuid)
    }

    getUsername(uuid = this.currentPlayerId) {
        return this.getPlayer(uuid).username
    }

    send(type, payload) {
        const message = new SocketMessage(this.uuid, type, payload);
        this.socket.send(message.toString());
    }

    dispatchEvent(type, detail) {
        window.dispatchEvent(detail
            ? new CustomEvent(type, { detail })
            : new CustomEvent(type))
    }
}