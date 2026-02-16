export class Card {
    constructor(index, cardType) {
        this.index = index
        this.cardType = cardType
        this.cardId = cardType + index

        // this.playOnTurn = true
    }

    static fromData(data) {
        const { index, cardType } = data
        console.log(data)
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

        const img = document.createElement("img")
        img.src = "resources/images/" + this.cardType + ".png"
        img.classList.add("card")
        img.alt = this.cardType
        div.appendChild(img)

        return div
    }
}

export class AttackCard extends Card {
    constructor(index) {
        super(index, "attack")
    }

    async play(gameCtx) {
        super.play(gameCtx)
        gameCtx.advanceTurn()
        gameCtx.draws += 1
    }
}

export class CatCard extends Card {
    constructor(index, catType) {
        super(index, "cat" + catType)
        this.cardId = "cat" + catType
    }

    async play(gameCtx) {
        super.play(gameCtx)
        const player = gameCtx.currentPlayer()
        const target = await gameCtx.choosePlayer(player)
        const cardId = await gameCtx.chooseCard(target.hand, player)
        gameCtx.transferCard(target.hand, player.hand, cardId)
    }
}

export class DefuseCard extends Card {
    constructor(index) {
        super(index, "defuse")
    }

    async play(gameCtx) {
        super.play(gameCtx)
        gameCtx.defuse()
    }
}

export class ExplodingCard extends Card {
    constructor(index) {
        super(index, "exploding")
    }

    async play(gameCtx) {
        super.play(gameCtx)
        gameCtx.explode()
    }
}

export class FavorCard extends Card {
    constructor(index) {
        super(index, "favor")
    }

    async play(gameCtx) {
        super.play(gameCtx)
        const player = gameCtx.currentPlayer()
        const target = await gameCtx.choosePlayer(player)
        const cardId = await gameCtx.chooseCard(target.hand, target)
        gameCtx.transferCard(target.hand, player.hand, cardId)
    }
}

export class FutureCard extends Card {
    constructor(index) {
        super(index, "future")
    }

    async play(gameCtx) {
        super.play(gameCtx)
        const player = gameCtx.currentPlayer()
        await gameCtx.showFuture(player)
    }
}

export class NopeCard extends Card {
    constructor(index) {
        super(index, "nope")
    }

    async play(gameCtx) {
        super.play(gameCtx)
        await gameCtx.nope()
    }
}

export class ShuffleCard extends Card {
    constructor(index) {
        super(index, "shuffle")
    }

    async play(gameCtx) {
        super.play(gameCtx)
        gameCtx.shuffle()
    }
}

export class SkipCard extends Card {
    constructor(index) {
        super(index, "skip")
    }

    async play(gameCtx) {
        super.play(gameCtx)
        if (gameCtx.draws > 1) {
            gameCtx.draws--
        } else {
            gameCtx.advanceTurn()
            gameCtx.draws = 1
        }
    }
}