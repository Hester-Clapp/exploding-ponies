import { Deck } from "./Deck.js"
import { Hand } from "./Hand.js"

export class GameContext {
    constructor(ctx) {
        this.players = new Map()
        for (const uuid in ctx.players) {
            const { username, hand, nextPlayerId, isAlive } = ctx.players[uuid]
            this.players.set(uuid, { uuid, username, hand, nextPlayerId, isAlive })
        }
        this.deck = Deck.fromData(ctx.deck)
        this.currentPlayerId = ctx.currentPlayerId || ""
        this.draws = ctx.draws || 1
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

    eliminate() {
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

    seeFuture() { return this.deck.seeFuture() }

    shuffle() { this.deck.shuffle() }

    async playCard(cardType, ...args) {
        const player = this.getPlayer(uuid)
        const card = player.hand.take(cardType)
        if (card) {
            if (card instanceof CatCard && player.hand.has(cardType, 2)) {

            }
            await card.play(this, ...args)
        }
    }
}