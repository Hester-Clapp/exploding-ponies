import { Hand } from "../../common/Hand.js"

export class GameClient {
    constructor(state) {
        this.state = state

        this.bound = {
            deal: this.initialiseHand.bind(this),
            nextturn: this.onNextTurn.bind(this)
        }

        for (const event in this.bound) {
            window.addEventListener(event, this.bound[event])
        }
    }


    initialiseHand(event) {
        const cards = event.detail
        this.state.hand = new Hand(cards)
    }

    onNextTurn(event) {
        this.state.currentPlayerId = event.detail

        const detail = (this.state.currentPlayerId === this.state.uuid)
            ? "It's your turn!"
            : `It's ${this.getPlayer().username}'s turn`
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

    getPlayer(uuid = this.state.currentPlayerId) {
        console.log(this.state.players, uuid)
        return this.state.players.get(uuid)
    }
}