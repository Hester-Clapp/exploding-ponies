import { SocketMessage } from '../../common/SocketMessage.js';
import { Hand } from "../../common/Hand.js"

export class GameClient {
    constructor(uuid, players, socket) {
        this.uuid = uuid
        this.players = players
        this.socket = socket
    }

    onMessage(type, payload) {
        switch (type) {
            case "deal":
                this.initialiseHand(payload)
                break
            case "nextturn":
                this.nextTurn(payload)
                break
            case "playcard":
                console.log(payload)
                this.lastCard = payload.card
                this.dispatchEvent("playcard", payload.card)
            case "allownope":
                this.configureCardPlayability(payload.allowNope)
                break
        }
    }

    initialiseHand(cards) {
        this.hand = new Hand(cards)
        this.dispatchEvent("deal", cards)
    }

    nextTurn(uuid) {
        this.currentPlayerId = uuid
        const isMyTurn = this.currentPlayerId === this.uuid

        this.dispatchEvent("statusupdate", isMyTurn
            ? "It's your turn!"
            : `It's ${this.getPlayer()}'s turn`)

        this.configureCardPlayability()

    }

    configureCardPlayability(allowNope = false) {
        const isMyTurn = this.currentPlayerId === this.uuid
        const lastCardType = this.lastCard?.cardType
        const playableCards = {
            "attack": isMyTurn,
            "cat1": isMyTurn,
            "cat2": isMyTurn,
            "cat3": isMyTurn,
            "cat4": isMyTurn,
            "cat5": isMyTurn,
            "defuse": lastCardType === "exploding",
            "favor": isMyTurn,
            "future": isMyTurn,
            "nope": allowNope && (!isMyTurn || lastCardType === "nope"),
            "shuffle": isMyTurn,
            "skip": isMyTurn,
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

    getPlayer(uuid = this.currentPlayerId) {
        console.log(this.players, uuid)
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