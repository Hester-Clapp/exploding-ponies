import { Deck } from "./Deck.js"
import { Hand } from "../../public/common/Hand.js"

export class GameContext {
    constructor(numDecks) {
        this.players = new Map()

        this.deck = new Deck(numDecks)
        this.currentPlayerId = ""
        this.draws = 1
    }

    addPlayer(uuid, username) {
        if (this.players.has(uuid)) return
        if (this.players.size == 0) {
            this.currentPlayerId = uuid
        } else {
            for (const player of this.players.values()) {
                if (player.nextPlayerId === this.currentPlayerId) {
                    player.nextPlayerId = uuid
                }
            }
        }
        this.players.set(uuid, {
            uuid,
            username,
            hand: new Hand(),
            nextPlayerId: this.currentPlayerId,
            isAlive: true
        })
    }

    getPlayer(uuid = this.currentPlayerId) {
        return this.players.get(uuid)
    }

    eliminatePlayer() {
        const player = this.getPlayer()
        player.isAlive = false
        for (const p of this.players.values()) {
            if (p.nextPlayerId === player.uuid) {
                p.nextPlayerId = player.nextPlayerId
            }
        }
    }

    advanceTurn() {
        this.currentPlayerId = this.getPlayer().nextPlayerId
    }

    drawCard() {
        const card = this.deck.draw()
        this.getPlayer().hand.add(card)
        if (card instanceof ExplodingCard) playCard("exploding")
        return card
    }

    discard() { return this.deck.discard() }

    transferCard(from, to, cardType) {
        if (!from.hand.has(cardType)) return;
        const card = from.hand.take(cardType)
        to.hand.add(card)
    }

    seeFuture() { return this.deck.seeFuture() }

    shuffle() { this.deck.shuffle() }

    // async playCard(cardType, ...args) {
    //     const player = this.getPlayer(uuid)
    //     const card = player.hand.take(cardType)
    //     if (card) {
    //         if (card instanceof CatCard && player.hand.has(cardType, 2)) {

    //         }
    //         await card.play(this, ...args)
    //     }
    // }
}