import { Controller } from "./Controller.js"
import { loadPage } from "./pageLoader.js"
import { cardToHTML, Card } from "../../common/Card.js"

export class TutorialController extends Controller {
    constructor() {
        super()
    }

    async beforeLoad(uuid) {
        super.beforeLoad()
        this.uuid = uuid
    }

    async afterLoad() {
        super.afterLoad()

        document.querySelectorAll("button").forEach(button => {
            button.addEventListener("click", this.skip.bind(this), { signal: this.cleanup.signal })
        })

        document.querySelector(".exploding-defuse.flexbox").appendChild(cardToHTML(Card.fromData({ cardType: "exploding", index: 1 })))
        document.querySelector(".exploding-defuse.flexbox").appendChild(cardToHTML(Card.fromData({ cardType: "defuse", index: 6 })))
        document.querySelector(".nope.flexbox").appendChild(cardToHTML(Card.fromData({ cardType: "nope", index: 1 })))
        document.querySelector(".attack-skip.flexbox").appendChild(cardToHTML(Card.fromData({ cardType: "attack", index: 1 })))
        document.querySelector(".attack-skip.flexbox").appendChild(cardToHTML(Card.fromData({ cardType: "skip", index: 1 })))
        document.querySelector(".future-shuffle.flexbox").appendChild(cardToHTML(Card.fromData({ cardType: "future", index: 1 })))
        document.querySelector(".future-shuffle.flexbox").appendChild(cardToHTML(Card.fromData({ cardType: "shuffle", index: 1 })))
        document.querySelector(".favor.flexbox").appendChild(cardToHTML(Card.fromData({ cardType: "favor", index: 1 })))
        document.querySelector(".cat.flexbox").appendChild(cardToHTML(Card.fromData({ cardType: "cat2", index: 1 })))
        document.querySelector(".cat.flexbox").appendChild(cardToHTML(Card.fromData({ cardType: "cat3", index: 1 })))
    }

    async skip() {
        this.cleanup.abort()
        loadPage("rooms", this.uuid)
    }
}