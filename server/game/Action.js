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
    constructor() {
        super("attack")
    }

    changes = { turn: true, draws: true }
    run(gameCtx) {
        gameCtx.advanceTurn()
        gameCtx.draws = (gameCtx.draws === 1) ? 2 : gameCtx.draws + 2
    }
}

export class DefuseAction extends Action {
    // changes = { deck: true }
    constructor() {
        super("defuse")
        this.explosing = new Promise(resolve => this.setExploding = resolve)
        this.position = new Promise(resolve => this.setPosition = resolve)
    }

    run(gameCtx) {
        gameCtx.deck.insert(this.exploding, this.position)
    }
}

export class ExplodingAction extends Action {
    changes = { turn: true }
    constructor() {
        super("exploding")
    }


    run(gameCtx) {
        const player = gameCtx.getPlayer()
        gameCtx.eliminatePlayer(player)
        ganeCtx.advanceTurn()
        this.changes[player.uuid] = true
    }
}

export class FutureAction extends Action {
    constructor() {
        super("future")
    }

    run(gameCtx) {
        const player = gameCtx.getPlayer()
        // await gameCtx.showFuture(player)
    }
}

export class ShuffleAction extends Action {
    // changes = { deck: true }

    constructor() {
        super("shuffle")
    }

    run(gameCtx) {
        gameCtx.shuffle()
    }
}

export class SkipAction extends Action {
    changes = { turn: true, draws: true }

    constructor() {
        super("skip")
    }

    run(gameCtx) {
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
            targetId: new Promise(resolve => this.resolvers.target = resolve),
            cardType: new Promise(resolve => this.resolvers.targetCardType = resolve)
        }
    }

    run(gameCtx) {
        const player = gameCtx.getPlayer()
        const target = gameCtx.getPlayer(this.targetId)
        gameCtx.transferCard(target, player, this.cardType)
        this.changes[player.uuid] = true
        this.changes[target.uuid] = true
    }
}