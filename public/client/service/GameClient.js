import { SocketMessage } from '../../common/SocketMessage.js';
import { Hand } from "../../common/Hand.js"

export class GameClient {
    constructor(uuid, players, socket) {
        this.uuid = uuid
        this.players = players
        this.socket = socket

        this.isMyTurn = false
        this.lastTypePlayed = ""
        this.lastTypeDrawn = ""
    }

    onMessage(type, payload) {
        switch (type) {
            case "deal":
                this.initialiseHand(payload)
                break
            case "nextturn":
                this.newTurn(payload.uuid)
                this.dispatchEvent("newturn", { ...payload, username: this.players.get(payload.uuid) })
                break
            case "playcard":
                this.lastTypePlayed = payload.card.cardType
                this.dispatchEvent("playcard", { ...payload, username: this.players.get(payload.uuid) })
            case "allownope":
                this.configureCardPlayability(payload.allowNope)
                break
            case "requestinput":
                this.requestInput(payload)
                break
            case "show":
            case "give":
            case "receive":
                this.dispatchEvent(type, payload)
                break
            case "drawcard":
                if (payload.uuid === this.uuid) this.onDrawCard(payload.card)
                this.dispatchEvent("draw", payload)
                this.configureCardPlayability(false)
                break
        }
    }

    initialiseHand(cards) {
        this.hand = new Hand(cards)
        this.dispatchEvent("deal", this.hand.toObject())
    }

    newTurn(uuid) {
        this.currentPlayerId = uuid
        this.isMyTurn = this.currentPlayerId === this.uuid

        this.dispatchEvent("newturn", { currentPlayerId: uuid, isMyTurn: this.isMyTurn })

        this.configureCardPlayability()
    }

    configureCardPlayability(allowNope = false) {
        const defaultPlayability = this.isMyTurn
            && this.lastTypeDrawn !== "exploding"
            && this.lastTypePlayed !== "exploding"

        const catPlayability = (catType) => (this.hand.has(catType, 2)
            || (this.hand.has(catType) && this.lastTypePlayed === catType))

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
            nope: allowNope && (!this.isMyTurn || this.lastTypePlayed === "nope"),
            shuffle: defaultPlayability,
            skip: defaultPlayability,
        }
        this.dispatchEvent("enablecard", playableCards)
    }

    playCard(card) {
        this.send("playcard", card)
        switch (card.cardType) {
            case "cat1":
            case "cat2":
            case "cat3":
            case "cat4":
            case "cat5":
                console.log(this.lastTypePlayed, card.cardType)
                if (this.lastTypePlayed !== card.cardType) break // Only ask for input after the second cat
            case "favor":
                this.dispatchEvent("requestinput", { input: "target", players: this.players })
                break
            case "defuse":
                this.dispatchEvent("requestinput", { input: "insertPosition", players: this.players })
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

    onDrawCard(card) {
        this.lastTypeDrawn = card.cardType
        this.hand.add(card)

        if (card.cardType === "exploding") {
            this.configureCardPlayability(false)
        }
    }

    requestInput(payload) {
        console.log("Requesting input for", payload.input)
        if (payload.input === "cardType" && this.lastTypePlayed === "favor") {
            this.dispatchEvent("requestinput", payload)
        }
    }

    getPlayer(uuid = this.currentPlayerId) {
        return this.players.get(uuid)
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