import { Action } from "../game/Action.js"

export class CardHandler {
    constructor() {
        this.stack = []
    }

    push(card) {
        this.stack.unshift(card)
    }

    resolve() {
        const actions = []
        for (let i = 0; i < this.stack.length; i++) {
            const card = this.stack[i]
            const nextCard = this.stack?.[i + 1]
            const nextNextCard = this.stack?.[i + 2]
            const nextNextNextCard = this.stack?.[i + 3]
            switch (card.cardType) {
                case "nope":
                    if (nextCard.stacksOn(nextNextCard)) {
                        i++ // Nope doubles
                        if (nextNextCard.stacksOn(nextNextNextCard)) i++ // Nope triples
                    }
                    i++;
                    break;
                case "cat1":
                case "cat2":
                case "cat3":
                case "cat4":
                case "cat5":
                    if (card.stacksOn(nextCard)) {
                        if (nextCard.stacksOn(nextNextCard)
                            && !nextNextCard.stacksOn(nextNextNextCard)) { // Interpret 4 as 2 doubles ipv 1 triple
                            actions.unshift(new Action("triple"))
                            i++
                        } else {
                            actions.unshift(new Action("double"))
                        }
                    }
                    i++
                    break;
                default:
                    actions.unshift(new Action(card.cardType))
                    break;
            }
        }
        return actions
    }
}