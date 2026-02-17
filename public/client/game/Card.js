export class Card {
    constructor(index, cardType) {
        this.index = index
        this.cardType = cardType
        this.cardId = cardType + index

        // this.playOnTurn = true
    }

    static fromData(data) {
        const { index, cardType } = data
        switch (cardType) {
            case "attack":
                return new AttackCard(index)
            case "defuse":
                return new DefuseCard(index)
            case "exploding":
                return new ExplodingCard(index)
            case "favor":
                return new FavorCard(index)
            case "future":
                return new FutureCard(index)
            case "nope":
                return new NopeCard(index)
            case "yup":
                return new YupCard(index)
            case "shuffle":
                return new ShuffleCard(index)
            case "skip":
                return new SkipCard(index)
            default:
                if (cardType.slice(0, 3) === "cat") {
                    const catType = cardType.slice(3)
                    return new CatCard(index, catType)
                }
                throw new Error("Unknown card type: " + cardType)
        }
    }

    async play(gameCtx) {
        gameCtx.discard(this)
    }

    toHTML() {
        const div = document.createElement("div")
        div.classList.add("card")

        const img = document.createElement("img")
        img.src = "resources/images/" + this.cardType + ".png"
        img.alt = this.cardType
        div.appendChild(img)

        return div
    }

    stacksOn() {
        return false
    }
}

export class AttackCard extends Card {
    constructor(index) {
        super(index, "attack")
    }

    async play(gameCtx) {
        gameCtx.discard(this)
        gameCtx.advanceTurn()
        gameCtx.draws = (gameCtx.draws === 1) ? 2 : gameCtx.draws + 2
    }
}

export class CatCard extends Card {
    constructor(index, catType) {
        super(index, "cat" + catType)
        this.cardId = "cat" + catType
    }

    async play(gameCtx, target, cardType) {
        const player = gameCtx.getPlayer()
        gameCtx.transferCard(target.hand, player.hand, cardType)
        super.play(gameCtx)
    }

    stacksOn(that) {
        return (that instanceof CatCard) && this.cardType === that.cardType
    }
}

export class DefuseCard extends Card {
    constructor(index) {
        super(index, "defuse")
    }

    async play(gameCtx, insertPosition) {
        gameCtx.deck.insert(this, position)
        super.play(gameCtx)
    }
}

export class ExplodingCard extends Card {
    constructor(index) {
        super(index, "exploding")
    }

    async play(gameCtx) {
        const player = gameCtx.getPlayer()
        if (player.hand.has("defuse")) {
            await gameCtx.playCard("defuse")
        }
        super.play(gameCtx)
    }
}

export class FavorCard extends Card {
    constructor(index) {
        super(index, "favor")
    }

    async play(gameCtx, target, cardType) {
        const player = gameCtx.getPlayer()
        gameCtx.transferCard(target.hand, player.hand, cardType)
        super.play(gameCtx)
    }
}

export class FutureCard extends Card {
    constructor(index) {
        super(index, "future")
    }

    async play(gameCtx) {
        const player = gameCtx.getPlayer()
        // await gameCtx.showFuture(player)
        super.play(gameCtx)
    }
}

export class NopeCard extends Card {
    constructor(index) {
        super(index, "nope")
    }

    async play(gameCtx) {
        await gameCtx.nope()
        super.play(gameCtx)
    }
}

export class ShuffleCard extends Card {
    constructor(index) {
        super(index, "shuffle")
    }

    async play(gameCtx) {
        gameCtx.shuffle()
        super.play(gameCtx)
    }
}

export class SkipCard extends Card {
    constructor(index) {
        super(index, "skip")
    }

    async play(gameCtx) {
        if (gameCtx.draws > 1) {
            gameCtx.draws--;
        } else {
            gameCtx.advanceTurn()
            gameCtx.draws = 1
        }
        super.draw()
    }
}