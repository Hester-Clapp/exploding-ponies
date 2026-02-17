import { SocketMessage } from '../../public/common/SocketMessage.js'
import { Deck } from '../../public/common/Deck.js'
// import { Player } from '../../public/common/Player.js'
import { GameContext } from '../../public/common/GameContext.js'

export class GameServer {
    constructor(players, sockets, numDecks = 1) {

        // Game
        this.gameCtx = new GameContext({
            players: {},
            deck: new Deck(numDecks),
        });

        for (const player of players) {
            this.gameCtx.addPlayer(player.uuid, player.username)
        }

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
        console.log(this.gameCtx.players)
        for (const uuid of this.gameCtx.players.keys()) {
            this.send(this.sockets.get(uuid), "deal", this.gameCtx.getPlayer(uuid).hand.toArray())
        }
    }

    advanceTurn() {
        this.gameCtx.advanceTurn()
        this.publish("nextturn", this.currentPlayerId)
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
