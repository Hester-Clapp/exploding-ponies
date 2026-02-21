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

        this.publish("nextturn", this.gameCtx.currentPlayerId)
    }

    advanceTurn() {
        this.gameCtx.advanceTurn()
        this.publish("nextturn", this.gameCtx.currentPlayerId)
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
            probability: this.gameCtx.getExplodingProbability()
        })

        if (card.cardType === "exploding") {
            this.cachedInputs.set("exploding", card)
        } else {
            this.advanceTurn()
        }
    }

    playCard(cardType, uuid) {
        const player = this.gameCtx.getPlayer(uuid)
        if (!player.hand.has(cardType)) return;
        const card = player.hand.take(cardType)

        this.cardHandler.enqueue(card)
        if (this.resolveTimeoutId) clearTimeout(this.resolveTimeoutId)
        this.resolveTimeoutId = setTimeout(this.resolveActions.bind(this), this.cooldown * 1000)

        this.publish("playcard", { card, uuid, allowNope: true })
    }

    requestInput(type, uuid) {
        const socket = this.sockets.get(uuid)
        switch (type) {
            case "cat1":
            case "cat2":
            case "cat3":
            case "cat4":
            case "cat5":
                const cards = this.gameCtx.getPlayer(uuid).hand.toArray()
                const index = Math.floor(Math.random() * cards.length)
                const value = cards[index].cardType
                this.provideInput("cardType", value)
                break
            case "favor":
                this.send(socket, "requestinput", { input: "cardType" })
                break
        }
    }

    provideInput(input, value) {
        if (input === "target") {
            // const card = this.cardHandler.lastCard
            // this.requestInput(card.cardType, value)

            const socket = this.sockets.get(value)
            this.send(socket, "requestinput", { input: "cardType" })
        }

        if (input === "cardType" && value === null) {
            const target = this.cachedInputs.get("target")
            if (!target) return
            const cards = this.gameCtx.getPlayer(target).hand.toArray()
            const index = Math.floor(Math.random() * cards.length)
            value = cards[index].cardType
        }

        console.log(input, value)

        if (this.pendingInputs.has(input)) {
            const action = this.pendingInputs.get(input)
            action.provideInput(input, value)
            this.pendingInputs.delete(input)
        }
        this.cachedInputs.set(input, value)

        console.log(this.cachedInputs, this.pendingInputs)
    }

    resolveActions() {
        this.publish("allownope", { allowNope: false })

        const actions = this.cardHandler.resolve()

        for (const action of actions) {
            for (const input in action.inputs) {
                if (this.cachedInputs.has(input)) {
                    action.provideInput(input, this.cachedInputs.get(input))
                    console.log(action)
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
        console.log(this.gameCtx.players)

        console.log("playing", actions)
        this.cachedInputs.clear()
        this.pendingInputs.clear()

        const changes = {}
        for (const action of actions) {
            await action.run(this.gameCtx)
            Object.assign(changes, action.changes)
        }

        // Send changes
        // this.publish("draws", this.gameCtx.draws)
        for (const uuid of this.gameCtx.players.keys()) {
            this.send(this.sockets.get(uuid), "hand", this.gameCtx.getPlayer(uuid).hand.toObject())
        }
        // if ("deck" in changes) this.publish("deck", { length: this.gameCtx.deck.cards.length })
        if ("draws" in changes) this.publish("draws", this.gameCtx.draws)
        if ("turn" in changes) this.publish("nextturn", this.gameCtx.currentPlayerId)
        console.log(this.gameCtx.players)
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