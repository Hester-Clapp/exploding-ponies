import { SocketMessage } from '../../public/common/SocketMessage.js'
import { CardHandler } from './CardHandler.js'
import { GameContext } from '../game/GameContext.js'

export class GameServer {
    constructor(players, sockets, numDecks = 1) {

        // Game
        this.gameCtx = new GameContext(numDecks)

        for (const player of players) {
            this.gameCtx.addPlayer(player.uuid, player.username)
        }

        this.cardHandler = new CardHandler()
        this.nopeWindow = 3000
        this.resolveTimeoutId = undefined

        // Sockets
        this.sockets = sockets

        for (const socket of sockets.values()) {
            socket.isReady = new Promise(resolve => {
                socket.setReady = resolve
            })
        }
    }

    setPlayerReady(uuid) {
        const socket = this.sockets.get(uuid)
        if (socket) socket.setReady()
    }

    async allReady() {
        await Promise.all(Array.from(this.sockets.values()).map(socket => socket.isReady))
    }

    deal() {
        this.gameCtx.deck.deal(
            Array.from(this.gameCtx.players.values())
                .map(player => player.hand)
        )
        for (const uuid of this.gameCtx.players.keys()) {
            this.send(this.sockets.get(uuid), "deal", this.gameCtx.getPlayer(uuid).hand.toArray())
        }
    }

    setupGame() {
        this.deal()
        // this.publish("update", this.gameCtx)
    }

    playCard(card, uuid) {
        this.cardHandler.enqueue(card)
        if (this.resolveTimeoutId) clearTimeout(this.resolveTimeoutId)
        this.resolveTimeoutId = setTimeout(this.playActions.bind(this), this.nopeWindow)

        this.publish("playcard", { card, uuid })
    }

    playActions() {
        const changes = {}
        for (const action of this.cardHandler.resolve()) {
            action.run(this.gameCtx)
            changes = { ...changes, ...action.changes }
        }

        // Send changes
        for (const uuid of this.gameCtx.players.keys()) {
            this.send(this.sockets.get(uuid), "hand", this.gameCtx.getPlayer(uuid).hand.toArray())
        }
        // if ("deck" in changes) this.publish("deck", { length: this.gameCtx.deck.cards.length })
        if ("draws" in changes) this.publish("draws", this.gameCtx.draws)
        if ("turn" in changes) this.publish("turn", this.gameCtx.currentPlayerId)
    }

    send(socket, type, payload, sender = "") {
        new SocketMessage(sender, type, payload).send(socket);
    }

    publish(type, payload, sender = null) {
        for (const [id, socket] of this.sockets) {
            if (!sender || id !== sender) {
                this.send(socket, type, payload);
            }
        }
    }

}