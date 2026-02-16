import { SocketMessage } from '../../public/common/SocketMessage.js'
import { Deck } from '../game/Deck.js'
import { Player } from '../../public/common/Player.js'

export class GameServer {
    constructor(players, sockets, numDecks = 1) {
        this.deck = new Deck(numDecks)

        this.players = new Map()
        for (const player of players) {
            this.players.set(player.uuid, new Player(player, sockets.get(player.uuid)))
        }

        for (let i = 0; i < players.length; i++) {
            const currentPlayerId = players[i].uuid
            const nextPlayerId = players[(i + 1) % players.length].uuid
            this.players.get(currentPlayerId).nextPlayerId = nextPlayerId
        }
        this.currentPlayerId = players[0].uuid
    }

    deal() {
        this.deck.deal(
            Array.from(this.players.values())
                .map(player => player.hand)
        )
        console.log(this.deck)
        for (const player of this.players.values()) {
            this.send(player.socket, "deal", player.hand.toArray())
        }
    }

    discard(card) {
        this.deck.discard(card)
    }

    advanceTurn() {
        this.currentPlayerId = this.players.get(this.currentPlayerId).nextPlayerId
        this.publish("nextturn", { uuid: this.currentPlayerId })
    }

    seeFuture() {
        return this.deck.seeFuture()
    }

    shuffle() {
        this.deck.shuffle()
    }

    send(socket, type, payload, sender = socket.id) {
        new SocketMessage(sender, type, payload).send(socket);
    }

    publish(type, payload, sender = null) {
        for (const [id, player] of this.players) {
            if (!sender || id !== sender) {
                this.send(player.socket, type, payload);
            }
        }
    }

}
