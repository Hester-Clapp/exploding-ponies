import { Card, AttackCard, CatCard, DefuseCard, ExplodingCard, FavorCard, FutureCard, NopeCard, ShuffleCard, SkipCard } from "./Card.js"

export class Deck {
    constructor(numDecks = 1) {
        this.numDecks = numDecks
        this.drawPile = []
        this.discardPile = []
    }

    static fromData(data) {
        const deck = new Deck(data.numDecks)
        deck.drawPile = data.drawPile.map(Card.fromData)
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

        this.add(ExplodingCard, (hands.length - 1) / this.numDecks)
        this.shuffle()
    }

    add(Card, number, ...args) {
        for (let deck = 1; deck <= this.numDecks; deck++) {
            for (let i = 1; i <= number; i++) {
                this.drawPile.push(new Card(i, ...args))
            }
        }
    }

    draw() {
        return this.drawPile.pop()
    }

    discard(card) {
        this.discardPile.push(card)
    }

    shuffle() {
        // for (let i = 0; i < this.drawPile.length; i++) {
        //     const j = Math.floor(Math.random() * this.drawPile.length)
        //     const temp = this.drawPile[i]
        //     this.drawPile[i] = this.drawPile[j]
        //     this.drawPile[j] = temp
        // }


        for (let i = this.drawPile.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
        }
    }

    seeFuture() {
        return this.drawPile.slice(-3)
    }
}