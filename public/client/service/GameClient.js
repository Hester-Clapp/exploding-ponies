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
                this.newTurn(payload)
                break
            case "playcard":
                console.log(payload)
                this.lastTypePlayed = payload.card.cardType
                this.dispatchEvent("playcard", payload)
            case "allownope":
                this.configureCardPlayability(payload.allowNope)
                break
            case "drawcard":
                this.takeCard(payload.card)
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

        this.dispatchEvent("statusupdate", this.isMyTurn
            ? "It's your turn!"
            : `It's ${this.getPlayer()}'s turn`)

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

    async choosePlayer() {
        const playersArray = Array.from(this.players.keys())
        const index = prompt(`Choose a number between 1 and : ${playersArray.length}\n${playersArray.map((id, i) => `${i + 1}: ${this.getPlayer(id).username}`).join("\n")}`) - 1
        return playersArray[index]
    }

    async chooseCard(target) {
        const hand = target.hand
        const cardsArray = (target.uuid === this.uuid) ? hand.toArray() : hand.toShuffledArray()
        const index = (target.uuid === this.uuid)
            ? (prompt(`Choose a number between 1 and ${cardsArray.length}\n${cardsArray.map((card, i) => `${i + 1}: ${card.type}`).join("\n")}`) - 1)
            : (prompt(`Choose a number between 1 and ${cardsArray.length}`) - 1)
        return cardsArray[index].cardId
    }

    playCard(card) {
        this.send("playcard", card)
        this.lastTypePlayed = card.cardType
        if (card.cardType === "defuse") this.lastTypeDrawn = ""
    }

    drawCard() {
        if (this.isMyTurn && this.lastTypeDrawn !== "exploding") {
            this.send("drawcard")
        }
    }

    takeCard(card) {
        this.lastTypeDrawn = card.cardType
        this.hand.add(card)
        this.dispatchEvent("draw", card)

        if (card.cardType === "exploding") {
            this.configureCardPlayability(false)
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