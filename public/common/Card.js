export class Card {
    hasAudio = true
    isCat = false

    constructor(index, cardType, cardId = cardType + index) {
        this.index = index
        this.cardType = cardType
        this.cardId = cardId
        this.name = (this.cardId in names) ? names[this.cardId] : names[this.cardType]
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
    color = "#EF5130"
    instructions = "End your turn without drawing a card. \nForce the next player to take 2 turns."

    constructor(index) {
        super(index, "attack")
    }
}

export class CatCard extends Card {
    color = "#DEDFD7"
    isCat = true

    constructor(index, catType) {
        super(index, "cat" + catType, "cat" + catType)
        this.instructions = `This is a pony card and is powerless on its own. \nPlay two ${this.name} cards as a pair to steal a random card from another player.`
    }

    stacksOn(that) {
        return (that instanceof CatCard) && this.cardType === that.cardType
    }
}

export class DefuseCard extends Card {
    color = "#8AA617"
    instructions = "Put your last drawn card back into the deck."

    constructor(index) {
        super(index, "defuse")
    }
}

export class ExplodingCard extends Card {
    color = "#222C24"
    instructions = "Play this card immediately."
    hasAudio = false

    constructor(index) {
        super(index, "exploding")
    }
}

export class FavorCard extends Card {
    color = "#222B27"
    instructions = "One player must give you a card of their choice."

    constructor(index) {
        super(index, "favor")
    }
}

export class FutureCard extends Card {
    color = "#DF346E"
    instructions = "Privately view the top 3 cards of the deck."

    constructor(index) {
        super(index, "future")
    }
}

export class NopeCard extends Card {
    color = "#A51614"
    instructions = "Stop the action of another player. \nYou can play this at any time."

    constructor(index) {
        super(index, "nope")
    }
}

export class ShuffleCard extends Card {
    color = "#B17331"
    instructions = "Shuffle the draw pile."

    constructor(index) {
        super(index, "shuffle")
    }
}

export class SkipCard extends Card {
    color = "#5372BF"
    instructions = "End your turn without drawing a card."

    constructor(index) {
        super(index, "skip")
    }
}

const names = {
    attack: "Attack",
    cat1: "Derpy Hooves",
    cat2: "Lyra Heartstrings",
    cat3: "Bon Bon",
    cat4: "DJ Pon-3",
    cat5: "Doctor Whooves",
    defuse1: "The Element Of Honesty",
    defuse2: "The Element Of Kindness",
    defuse3: "The Element Of Laughter",
    defuse4: "The Element Of Generosity",
    defuse5: "The Element Of Loyalty",
    defuse6: "The Element Of Magic",
    exploding1: "Nightmare Moon",
    exploding2: "Queen Chrysalis",
    exploding3: "King Sombra",
    exploding4: "Lord Tirek",
    exploding5: "Cozy Glow",
    favor: "Favor",
    future: "See The Future",
    nope: "Nope",
    shuffle: "Shuffle",
    skip: "Skip"
}

export const audibleCards = [
    "attack1",
    "attack2",
    "attack3",
    "attack4",
    "cat1",
    "cat2",
    "cat3",
    "cat4",
    "cat5",
    "defuse1",
    "defuse2",
    "defuse3",
    "defuse4",
    "defuse5",
    "defuse6",
    "favor1",
    "favor2",
    "favor3",
    "favor4",
    "future1",
    "future2",
    "future3",
    "future4",
    "future5",
    "nope1",
    "nope2",
    "nope3",
    "nope4",
    "nope5",
    "yup1",
    "yup2",
    "yup3",
    "yup4",
    "yup5",
    "shuffle1",
    "shuffle2",
    "shuffle3",
    "shuffle4",
    "skip1",
    "skip2",
    "skip3",
    "skip4",
]