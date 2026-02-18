import { Action, TransferAction } from "../game/Action.js"

export class CardHandler {
    constructor() {
        this.queue = []
        this.changes = {}
    }

    enqueue(card) {
        this.queue.unshift(card)
    }

    resolve() {
        const actions = []
        this.changes = {}
        for (let i = 0; i < this.queue.length; i++) {
            const card = this.queue[i]
            const nextCard = this.queue?.[i + 1]
            const nextNextCard = this.queue?.[i + 2]
            const nextNextNextCard = this.queue?.[i + 3]
            switch (card.cardType) {
                case "nope":
                    if (nextCard.stacksOn(nextNextCard)) {
                        i++ // Nope doubles
                        if (nextNextCard.stacksOn(nextNextNextCard)) i++ // Nope triples
                    }
                    i++;
                    break;
                case "defuse":
                    if (nextCard?.cardType === "exploding") i++
                    break;
                case "cat1":
                case "cat2":
                case "cat3":
                case "cat4":
                case "cat5":
                    if (card.stacksOn(nextCard)) {
                        if (nextCard.stacksOn(nextNextCard) && !nextNextCard.stacksOn(nextNextNextCard)) { // Interpret 4 as 2 doubles ipv 1 triple
                            actions.unshift(new TransferAction())
                            i++
                        } else {
                            actions.unshift(new TransferAction())
                        }
                    }
                    i++
                    break;
                default:
                    const action = Action.ofType(card.cardType)
                    actions.unshift(action)
                    break;
            }
        }
        this.queue = []
        return actions
    }
}