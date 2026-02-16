import { Card } from "./Card.js"

export class Hand {
    constructor() {
        this.cards = new Map()
    }

    add(card) {
        const cardType = card.cardType
        if (this.cards.has(cardType)) {
            this.cards.get(cardType).push(card)
        } else {
            this.cards.set(cardType, [card])
        }
    }

    has(card) {
        return this.cards.has(card.cardType) && this.cards.get(card.cardType).length > 0
    }

    get(cardType) {
        if (!this.has({ cardType })) return null;
        return this.cards.get(cardType)[0]
    }

    take(cardType) {
        if (!this.has({ cardType })) return null;
        const cards = this.cards.get(cardType)
        if (cards.length === 1) {
            this.cards.delete(cardType)
            return cards[0]
        } else return cards.shift()
    }

    toArray() {
        return Array.from(this.cards.values()).flat()
    }

    toShuffledArray() {
        const array = this.toArray()
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array
    }
}