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
            this.resolvers[input](value)
        }
    }

}

export class AttackAction extends Action {
    changes = { turn: true }
    constructor() {
        super("attack")
    }

    async run(gameCtx) {
        gameCtx.advanceTurn()
        gameCtx.draws = (gameCtx.draws === 1) ? 2 : gameCtx.draws + 2
    }
}

export class DefuseAction extends Action {
    changes = { turn: true }
    constructor() {
        super("defuse")
        this.inputs = {
            exploding: new Promise(resolve => this.resolvers.exploding = resolve),
            position: new Promise(resolve => this.resolvers.position = resolve)
        }
    }

    async run(gameCtx) {
        gameCtx.deck.insert(await this.inputs.exploding, await this.inputs.position)
        gameCtx.advanceTurn()
        gameCtx.draws = 1
    }
}

export class ExplodingAction extends Action {
    changes = { turn: true }
    constructor() {
        super("exploding")
    }

    async run(gameCtx) {
        const player = gameCtx.getPlayer()
        gameCtx.eliminatePlayer()
        this.changes.eliminate = player.uuid
        gameCtx.draws = 1
    }
}

export class FutureAction extends Action {
    changes = { show: true }
    constructor() {
        super("future")
    }

    async run() {
    }
}

export class ShuffleAction extends Action {
    changes = { shuffle: true }
    constructor() {
        super("shuffle")
    }

    async run(gameCtx) {
        gameCtx.shuffle()
    }
}

export class SkipAction extends Action {
    constructor() {
        super("skip")
    }

    async run(gameCtx) {
        if (gameCtx.draws > 1) {
            gameCtx.draws--
        } else {
            gameCtx.advanceTurn()
            this.changes.turn = true
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
        const card = gameCtx.transferCard(target, player, await this.inputs.cardType)
        this.changes.transfer = { card, from: target.uuid, to: player.uuid }
    }
}