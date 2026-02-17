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

    has(card, number = 1) {
        return this.cards.has(card.cardType) && this.cards.get(card.cardType).length >= number
    }

    get(cardType) {
        if (!this.has({ cardType })) return null;
        return this.cards.get(cardType)[0]
    }

    take(cardType, number = 1) {
        if (!this.has({ cardType }, number)) return null;
        const cards = this.cards.get(cardType)
        if (cards.length === number) {
            this.cards.delete(cardType)
            return (number === 1) ? cards[0] : cards
        } else return cards.splice(0, number)
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