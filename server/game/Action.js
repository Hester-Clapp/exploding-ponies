export class Action {
    changes = {}
    inputs = {}
    resolvers = {}

    constructor() {
    }

    static ofType(cardType) {
        switch (cardType) {
            case "attack":
                return new AttackAction()
            case "defuse":
                return new DefuseAction()
            case "exploding":
                return new ExplodingAction()
            case "future":
                return new FutureAction()
            case "shuffle":
                return new ShuffleAction()
            case "skip":
                return new SkipAction()
            // case "double":
            // case "triple":
            case "favor":
                return new TransferAction()
            default:
                throw new Error("Unknown card type: " + cardType)
        }
    }

    provideInput(input, value) {
        if (input in this.resolvers) {
            console.log("Resolving", input)
            this.resolvers[input](value)
        }
    }

}

export class AttackAction extends Action {
    constructor() {
        super("attack")
    }

    changes = { turn: true, draws: true }
    async run(gameCtx) {
        gameCtx.advanceTurn()
        gameCtx.draws = (gameCtx.draws === 1) ? 2 : gameCtx.draws + 2
    }
}

export class DefuseAction extends Action {
    // changes = { deck: true }
    constructor() {
        super("defuse")
        this.inputs = {
            exploding: new Promise(resolve => this.resolvers.exploding = resolve),
            insertPosition: new Promise(resolve => this.resolvers.insertPosition = resolve)
        }
    }

    async run(gameCtx) {
        gameCtx.deck.insert(await this.exploding, await this.insertPosition)
        gameCtx.advanceTurn()
    }
}

export class ExplodingAction extends Action {
    changes = { turn: true }
    constructor() {
        super("exploding")
    }


    async run(gameCtx) {
        const player = gameCtx.getPlayer()
        gameCtx.eliminatePlayer(player)
        gameCtx.advanceTurn()
        this.changes[player.uuid] = true
    }
}

export class FutureAction extends Action {
    constructor() {
        super("future")
    }

    async run(gameCtx) {
        const player = gameCtx.getPlayer()
        this.changes[player.uuid] = { "show": gameCtx.seeFuture() }
    }
}

export class ShuffleAction extends Action {
    // changes = { deck: true }

    constructor() {
        super("shuffle")
    }

    async run(gameCtx) {
        gameCtx.shuffle()
    }
}

export class SkipAction extends Action {
    changes = { turn: true, draws: true }

    constructor() {
        super("skip")
    }

    async run(gameCtx) {
        if (gameCtx.draws > 1) {
            gameCtx.draws--;
        } else {
            gameCtx.advanceTurn()
            gameCtx.draws = 1
        }
    }
}

export class TransferAction extends Action {
    constructor() {
        super("transfer")
        this.inputs = {
            target: new Promise(resolve => this.resolvers.target = resolve),
            cardType: new Promise(resolve => this.resolvers.cardType = resolve)
        }
    }

    async run(gameCtx) {
        const player = gameCtx.getPlayer()
        const target = gameCtx.getPlayer(await this.inputs.target)
        console.log("Transferring from", target.username, "to", player.username)
        const card = gameCtx.transferCard(target, player, await this.inputs.cardType)
        this.changes[player.uuid] = { "receive": { card, from: target.uuid } }
        this.changes[target.uuid] = { "give": { card, to: player.uuid } }
    }
}