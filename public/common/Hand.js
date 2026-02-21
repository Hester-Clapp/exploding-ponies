export class Hand {
    constructor(cards = []) {
        this.cards = new Map()
        cards.forEach(card => this.add(card))
    }

    get size() {
        let count = 0
        for (const group of this.cards.values()) {
            count += group.length
        }
        return count
    }

    add(card) {
        const cardType = card.cardType
        if (this.cards.has(cardType)) {
            this.cards.get(cardType).push(card)
        } else {
            this.cards.set(cardType, [card])
        }
    }

    has(cardType, number = 1) {
        return this.cards.has(cardType) && this.cards.get(cardType).length >= number
    }

    hasOnly(cardType, number = 1) {
        return this.cards.has(cardType) && this.cards.get(cardType).length === number
    }

    get(cardType) {
        if (!this.has(cardType)) return null;
        return this.cards.get(cardType)[0]
    }

    take(cardType) {
        if (!this.has(cardType)) return null;
        const cards = this.cards.get(cardType)
        if (cards.length === 1) {
            this.cards.delete(cardType)
            return cards[0]
        } else return cards.shift()
    }

    toObject() {
        const obj = {}
        for (const [type, cards] of this.cards.entries()) {
            obj[type] = cards
        }
        return obj
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