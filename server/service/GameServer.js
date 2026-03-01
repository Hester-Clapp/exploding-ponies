import { SocketMessage } from '../../public/common/SocketMessage.js'
import { CardHandler } from './CardHandler.js'
import { GameContext } from '../game/GameContext.js'

export class GameServer {
    constructor(players, sockets, numDecks = 1, cooldown = 3) {

        // Game
        this.gameCtx = new GameContext(numDecks)

        for (const player of players) {
            this.gameCtx.addPlayer(player.uuid, player.username)
        }

        this.cardHandler = new CardHandler()
        this.cooldown = cooldown

        this.cachedInputs = new Map() // name => value
        this.pendingInputs = new Map() // name => resolver

        // Sockets
        this.sockets = sockets

        for (const socket of sockets.values()) {
            if (socket.isHuman) {
                socket.isReady = new Promise(resolve => {
                    socket.setReady = resolve
                })
            }
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
            this.send(uuid, "deal", {
                hand: this.gameCtx.getPlayer(uuid).hand.toArray(),
                length: this.gameCtx.deck.length
            })
        }

        this.publish("nextturn", { uuid: this.gameCtx.currentPlayerId })
    }

    advanceTurn() {
        if (this.gameCtx.draws > 1) {
            this.gameCtx.draws--;
            this.publish("draws", { draws: this.gameCtx.draws })
        } else {
            this.gameCtx.draws = 1
            this.gameCtx.advanceTurn()
        }
        this.publish("nextturn", { uuid: this.gameCtx.currentPlayerId })
    }

    drawCard(uuid) {
        const hand = this.gameCtx.players.get(uuid).hand

        const card = this.gameCtx.deck.draw();
        if (!card) return
        hand.add(card)

        this.publish("drawcard", {
            card,
            uuid,
            handSize: this.gameCtx.getPlayer(uuid).hand.toArray().length,
            length: this.gameCtx.deck.length
        })

        if (card.cardType === "exploding") {
            this.cachedInputs.set("exploding", card)
        } else {
            this.advanceTurn()
        }
    }

    playCard(cardType, uuid) {
        const player = this.gameCtx.getPlayer(uuid)
        if (!player.hand.has(cardType)) {
            console.log(player.hand.types, player.hand.size)
            console.error(`Player does not own a ${cardType} card: ${player.hand.toArray().map(card => card.cardType)}`)
            this.publish("newturn", { uuid: this.currentPlayerId })
            return
        }
        const card = player.hand.take(cardType)
        this.gameCtx.deck.discard(card)
        this.cardHandler.enqueue(card)
        if (this.resolveTimeoutId) clearTimeout(this.resolveTimeoutId)
        this.resolveTimeoutId = setTimeout(() => this.resolveActions(), this.cooldown * 1000)

        this.publish("playcard", { card, uuid, coolingDown: true })
    }

    provideInput(input, value) {
        if (input === "target") {
            if (this.gameCtx.deck.lastTypePlayed === "favor") {
                const types = this.gameCtx.getPlayer(value).hand.types
                this.send(value, "requestinput", { input: "cardType", types })
            } else {
                const cards = this.gameCtx.getPlayer(value).hand.toArray()
                const index = Math.floor(Math.random() * cards.length)
                this.provideInput("cardType", cards[index].cardType)
            }
            this.publish("provideinput", { target: value, cardType: this.gameCtx.deck.lastTypePlayed })
        }

        if (this.pendingInputs.has(input)) {
            const action = this.pendingInputs.get(input)
            action.provideInput(input, value)
            this.pendingInputs.delete(input)
        }
        this.cachedInputs.set(input, value)
    }

    resolveActions() {
        this.publish("resolve", { coolingDown: false })

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

    async playActions(actions) {
        this.cachedInputs.clear()
        this.pendingInputs.clear()

        const changes = {}
        for (const action of actions) {
            await action.run(this.gameCtx)
            Object.assign(changes, action.changes)
        }

        // Send changes
        for (const uuid of this.gameCtx.players.keys()) {
            for (const change in changes[uuid]) {
                this.send(uuid, change, changes[uuid][change])
            }
        }
        if ("shuffle" in changes) this.publish("shuffle")
        if ("draws" in changes) this.publish("draws", { draws: this.gameCtx.draws })
        if ("deck" in changes) this.publish("deck", { length: this.gameCtx.deck.length })
        if ("show" in changes) this.send(this.gameCtx.currentPlayerId, "show", this.gameCtx.seeFuture())
        if ("transfer" in changes) this.publish("transfer", changes.transfer)
        this.publish("nextturn", { uuid: this.gameCtx.currentPlayerId })
        if ("eliminate" in changes) {
            this.publish("eliminate", { uuid: changes.eliminate })
            this.checkWin()
        }
    }

    onLeave(uuid) {
        // Check if they were targetted by a favor, and if so give a random card
        const player = this.gameCtx.getPlayer(uuid)
        if (player) {
            const cards = player.hand.toArray()
            const index = Math.floor(Math.random() * cards.length)
            if (this.cachedInputs.has("target") || this.pendingInputs.has("target")) {
                const target = this.cachedInputs.get("target")
                if (target === uuid) this.provideInput("cardType", cards[index].cardType)
            }
        }

        this.gameCtx.eliminatePlayer(uuid)
        this.publish("eliminate", { uuid, currentPlayerId: this.gameCtx.currentPlayerId })
        this.publish("nextturn", { uuid: this.gameCtx.currentPlayerId })
        this.checkWin()
    }

    checkWin() {
        if (this.gameCtx.getPlayer().nextPlayerId === this.gameCtx.currentPlayerId) {
            this.publish("win", { uuid: this.gameCtx.currentPlayerId })
            setTimeout(() => this.publish("end"), 5000)
        }
    }

    send(uuid, type, payload, sender = "") {
        new SocketMessage(sender, type, payload).send(this.sockets.get(uuid));
    }

    publish(type, payload, sender = "") {
        for (const uuid of this.sockets.keys()) {
            if (!sender || uuid !== sender) {
                this.send(uuid, type, payload);
            }
        }
    }
}