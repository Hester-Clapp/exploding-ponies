import { AttackCard, CatCard, DefuseCard, ExplodingCard, FavorCard, FutureCard, NopeCard, ShuffleCard, SkipCard } from "../../public/common/Card.js"

export class Deck {
    constructor(numDecks = 1) {
        this.numDecks = numDecks
        this.cards = []
        this.lastTypePlayed = ""
    }

    deal(hands) {
        this.add(AttackCard, 4)
        this.add(CatCard, 4, 1)
        this.add(CatCard, 4, 2)
        this.add(CatCard, 4, 3)
        this.add(CatCard, 4, 4)
        this.add(CatCard, 4, 5)
        this.add(FavorCard, 4)
        this.add(FutureCard, 5)
        this.add(NopeCard, 5)
        this.add(ShuffleCard, 4)
        this.add(SkipCard, 4)
        this.add(DefuseCard, 6)

        hands.forEach(hand => hand.add(this.draw())) // Draw defuse cards

        this.shuffle()
        for (let i = 0; i < 7; i++) {
            hands.forEach(hand => hand.add(this.draw())) // Draw remaining cards
        }

        const villains = new Deck()
        villains.add(ExplodingCard, 5)
        villains.shuffle() // Shuffle for variety in which villains are included

        for (let i = 1; i < hands.length; i++) { // 1 less than the number of players
            this.cards.push(villains.draw())
        }

        this.shuffle()
    }

    get length() {
        return this.cards.length
    }

    add(Card, number, ...args) {
        for (let deck = 1; deck <= this.numDecks; deck++) {
            for (let i = 1; i <= number; i++) {
                this.cards.push(new Card(i, ...args))
            }
        }
    }

    draw() {
        return this.cards.pop()
    }

    discard(card) {
        this.lastTypePlayed = card.cardType
    }

    insert(card, position) {
        this.cards.splice(position, 0, card)
    }

    shuffle() {
        for (let i = this.cards.length; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    seeFuture() {
        return this.cards.slice(-3).reverse()
    }
}