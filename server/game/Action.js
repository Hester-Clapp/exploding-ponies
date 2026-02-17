export class Action {
    changes = {}

    constructor(cardType) {
        this.cardType = cardType

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
            case "double":
            case "triple":
            case "favor":
                return new TransferAction()
            default:
                throw new Error("Unknown card type: " + cardType)
        }
    }
}

export class AttackAction extends Action {
    changes = { turn: true, draws: true }
    run(gameCtx) {
        gameCtx.advanceTurn()
        gameCtx.draws = (gameCtx.draws === 1) ? 2 : gameCtx.draws + 2
    }
}

export class DefuseAction extends Action {
    // changes = { deck: true }

    run(gameCtx, explodingCard, insertPosition) {
        gameCtx.deck.insert(explodingCard, insertPosition)
    }
}

export class ExplodingAction extends Action {
    changes = { turn: true }

    run(gameCtx) {
        const player = gameCtx.getPlayer()
        gameCtx.eliminatePlayer(player)
        ganeCtx.advanceTurn()
        this.changes[player.uuid] = true
    }
}

export class FutureAction extends Action {
    run(gameCtx) {
        const player = gameCtx.getPlayer()
        // await gameCtx.showFuture(player)
    }
}

export class ShuffleAction extends Action {
    // changes = { deck: true }

    run(gameCtx) {
        gameCtx.shuffle()
    }
}

export class SkipAction extends Action {
    changes = { turn: true, draws: true }

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
    run(gameCtx, target, cardType) {
        const player = gameCtx.getPlayer()
        gameCtx.transferCard(target, player, cardType)
        this.changes[player.uuid] = true
        this.changes[target.uuid] = true
    }
}