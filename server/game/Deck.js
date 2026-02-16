import { AttackCard, CatCard, DefuseCard, ExplodingCard, FavorCard, FutureCard, NopeCard, ShuffleCard, SkipCard } from "../../public/common/Card.js"

export class Deck {
    constructor(numDecks = 1) {
        this.numDecks = numDecks
        this.cards = []
        this.lastPlayed = null
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
                this.cards.push(new Card(i, ...args))
            }
        }
    }

    draw() {
        return this.cards.pop()
    }

    discard(card) {
        this.lastPlayed = card
    }

    shuffle() {
        // for (let i = 0; i < this.cards.length; i++) {
        //     const j = Math.floor(Math.random() * this.cards.length)
        //     const temp = this.cards[i]
        //     this.cards[i] = this.cards[j]
        //     this.cards[j] = temp
        // }


        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    seeFuture() {
        return this.cards.slice(-3)
    }
}