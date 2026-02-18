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

        this.cachedInputs = new Map() // name => value
        this.pendingInputs = new Map() // name => resolver

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

    playCard(cardType, uuid) {
        console.log(cardType)
        const player = this.gameCtx.getPlayer(uuid)
        if (!player.hand.has(cardType)) return;
        const card = player.hand.take(cardType)

        this.cardHandler.enqueue(card)
        if (this.resolveTimeoutId) clearTimeout(this.resolveTimeoutId)
        this.resolveTimeoutId = setTimeout(this.resolveActions.bind(this), this.nopeWindow)
    }

    provideInput(input, value) {
        if (this.pendingInputs.has(input)) {
            const action = this.pendingInputs.get(input)
            action.provideInput(input, value)
            this.pendingInputs.delete(input)
        }
        this.cachedInputs.set(input, value)
    }

    resolveActions() {
        const actions = this.cardHandler.resolve()

        for (const action of actions) {
            for (const input in action.inputs) {
                if (this.cachedInputs.has(input)) {
                    action.provideInput(input, this.cachedInputs.get(input))
                } else {
                    this.pendingInputs.set(input, action)
                }
            }
        }

        const inputPromises = actions.flatMap(action =>
            Object.values(action.inputs)
        )

        Promise.all(inputPromises).then(() => this.playActions(actions))
    }

    playActions(actions) {
        console.log("playing", actions)
        this.cachedInputs.clear()
        this.pendingInputs.clear()

        const changes = {}
        for (const action of actions) {
            action.run(this.gameCtx)
            Object.assign(changes, action.changes)
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