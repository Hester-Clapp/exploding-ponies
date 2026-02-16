import { Player } from '../../common/Player.js';
import { Card } from '../../common/Card.js';

export class GameClient {
    constructor(state) {
        this.state = state

        for (const uuid of this.state.players.keys()) {
            const username = this.state.players.get(uuid)
            this.state.players.set(uuid, new Player({ uuid, username }))
        }
        this.player = state.players.get(state.uuid)
        this.hand = this.player.hand

        this.isMyTurn = false
        this.draws = 1

        this.bound = {
            deal: this.initialiseHand.bind(this),
            nextTurn: this.advanceTurn.bind(this)
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
    }

    advanceTurn(event) {
        this.state.currentPlayerId = event.detail
        this.isMyTurn = (this.state.currentPlayerId === this.state.uuid)
    }

    async choosePlayer() {
        const playersArray = Array.from(state.players.keys())
        const index = prompt(`Choose a number between 1 and : ${playersArray.length}\n${playersArray.map((id, i) => `${i + 1}: ${state.players.get(id).username}`).join("\n")}`) - 1
        return playersArray[index]
    }

    async chooseCard(target) {
        const hand = target.hand
        const cardsArray = (target.uuid === state.uuid) ? hand.toArray() : hand.toShuffledArray()
        const index = (target.uuid === state.uuid)
            ? (prompt(`Choose a number between 1 and ${cardsArray.length}\n${cardsArray.map((card, i) => `${i + 1}: ${card.type}`).join("\n")}`) - 1)
            : (prompt(`Choose a number between 1 and ${cardsArray.length}`) - 1)
        return cardsArray[index].cardId
    }

    transferCard(from, to, cardId) {
        const fromPlayer = state.players.get(from)
        const toPlayer = state.players.get(to)

        if (fromPlayer.has(cardId)) {
            const card = fromPlayer.hand.take(cardId)
            toPlayer.hand.add(card)
        }
    }

    setAlive(player, alive) {
        state.players.get(player).alive = alive
    }
}