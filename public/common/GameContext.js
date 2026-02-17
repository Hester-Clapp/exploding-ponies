import { Deck } from "./Deck.js"

export class GameContext {
    constructor(ctx) {
        this.players = new Map()
        for (const uuid in ctx.players) {
            const { username, hand, nextPlayerId, isAlive } = ctx.players[uuid]
            this.players.set(uuid, { uuid, username, hand, nextPlayerId, isAlive })
        }
        this.deck = Deck.fromData(ctx.deck)
        this.currentPlayerId = ctx.currentPlayerId
        this.draws = ctx.draws
    }

    getPlayer(uuid = this.currentPlayerId) {
        return this.players.get(uuid)
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

    eliminate() {
        const player = this.getPlayer()
        player.isAlive = false
        for (const p of this.players.values()) {
            if (p.nextPlayerId === player.uuid) {
                p.nextPlayerId = player.nextPlayerId
            }
        }
    }

    discard() { return this.deck.discard() }

    seeFuture() { return this.deck.seeFuture() }

    shuffle() { this.deck.shuffle() }

    async playCard(cardType, ...args) {
        const player = this.getPlayer(uuid)
        const card = player.hand.take(cardType)
        if (card) {
            if (card instanceof CatCard) {
                if (player.hand.has(cardType)) {
                    const card2 = player.hand.take(cardType)
                    this.discard(card2)
                    await card.play(this, ...args)
                } else {
                    // Cannot play only one cat card, so deny action
                    player.hand.add(card)
                }
            } else {
                await card.play(this, ...args)
            }
        }
    }
}