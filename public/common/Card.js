export class Card {
    constructor(index, cardType) {
        this.index = index
        this.cardType = cardType
        this.cardId = cardType + index
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

    stacksOn() {
        return false
    }
}

export class AttackCard extends Card {
    color = "orange"
    name = "Attack"

    constructor(index) {
        super(index, "attack")
    }
}

export class CatCard extends Card {
    color = "lightgrey"

    constructor(index, catType) {
        super(index, "cat" + catType)
        this.cardId = "cat" + catType
        const names = ["Lyra Heartstrings", "Bon Bon", "Derpy", "Doctor Whooves", "DJ Pon-3"]
        this.name = names[catType - 1]
    }

    stacksOn(that) {
        return (that instanceof CatCard) && this.cardType === that.cardType
    }
}

export class DefuseCard extends Card {
    color = "lime"
    name = "Element of Harmony"

    constructor(index) {
        super(index, "defuse")
    }
}

export class ExplodingCard extends Card {
    color = "darkgrey"
    name = "Villain"

    constructor(index) {
        super(index, "exploding")
    }
}

export class FavorCard extends Card {
    color = "darkgrey"
    name = "Favor"

    constructor(index) {
        super(index, "favor")
    }
}

export class FutureCard extends Card {
    color = "magenta"
    name = "See The Future"

    constructor(index) {
        super(index, "future")
    }
}

export class NopeCard extends Card {
    color = "red"
    name = "Nope"

    constructor(index) {
        super(index, "nope")
    }
}

export class ShuffleCard extends Card {
    color = "tan"
    name = "Shuffle"

    constructor(index) {
        super(index, "shuffle")
    }
}

export class SkipCard extends Card {
    color = "blue"
    name = "Skip"

    constructor(index) {
        super(index, "skip")
    }
}