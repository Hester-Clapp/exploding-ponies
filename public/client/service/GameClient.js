import { Player } from '../../common/Player.js';
import { Card } from '../../common/Card.js';
import { GameContext } from '../../common/GameContext.js';

export class GameClient {
    constructor(state) {
        this.state = state

        for (const uuid of this.state.players.keys()) {
            const username = this.state.players.get(uuid)
            this.state.players.set(uuid, new Player({ uuid, username }))
        }
        this.self = state.players.get(state.uuid)
        this.hand = this.self.hand

        this.isMyTurn = false

        this.bound = {
            deal: this.initialiseHand.bind(this),
            nextturn: this.advanceTurn.bind(this)
        }

        for (const event in this.bound) {
            window.addEventListener(event, this.bound[event])
        }
    }

    initialiseHand(event) {
        const cards = event.detail
        for (const cardData of cards) {
            const card = Card.fromData(cardData)
            this.hand.add(card)
        }
        window.dispatchEvent(new CustomEvent("handupdate", { detail: cards }))
    }

    advanceTurn(event) {
        this.state.currentPlayerId = event.detail
        this.isMyTurn = (this.state.currentPlayerId === this.state.uuid)

        const detail = this.isMyTurn ? "It's your turn!" : `It's ${this.getPlayer().username}'s turn`
        window.dispatchEvent(new CustomEvent("statusupdate", { detail }))
    }

    async choosePlayer() {
        const playersArray = Array.from(this.state.players.keys())
        const index = prompt(`Choose a number between 1 and : ${playersArray.length}\n${playersArray.map((id, i) => `${i + 1}: ${this.getPlayer(id).username}`).join("\n")}`) - 1
        return playersArray[index]
    }

    async chooseCard(target) {
        const hand = target.hand
        const cardsArray = (target.uuid === this.state.uuid) ? hand.toArray() : hand.toShuffledArray()
        const index = (target.uuid === this.state.uuid)
            ? (prompt(`Choose a number between 1 and ${cardsArray.length}\n${cardsArray.map((card, i) => `${i + 1}: ${card.type}`).join("\n")}`) - 1)
            : (prompt(`Choose a number between 1 and ${cardsArray.length}`) - 1)
        return cardsArray[index].cardId
    }

    transferCard(from, to, cardId) {
        const fromPlayer = this.getPlayer(from)
        const toPlayer = this.getPlayer(to)

        if (fromPlayer.has(cardId)) {
            const card = fromPlayer.hand.take(cardId)
            toPlayer.hand.add(card)
        }
    }

    setAlive(uuid, alive) {
        this.getPlayer(uuid).alive = alive
    }

    getPlayer(uuid = this.state.currentPlayerId) {
        console.log(this.state.players, uuid)
        return this.state.players.get(uuid)
    }
}