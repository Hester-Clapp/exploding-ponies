import { loadPage } from './pageLoader.js';
import { getPonyName } from '../service/ponyNameGenerator.js';

export class HomeController {
    res

    constructor(state) {
        this.state = state
    }

    async beforeLoad() {
        this.state.username = sessionStorage.getItem("username")
        if (this.state.username) this.login()

        window.addEventListener("beforeunload", async (e) => {
            // e.preventDefault()
            if (this.res) fetch(`/play?uuid=${this.res.uuid}`, { method: "DELETE" })
        });
    }

    async afterLoad() {
        this.state.username = localStorage.getItem("username");
        document.getElementById("username").value = this.state.username
        document.querySelector("form").addEventListener("submit", async (e) => {
            e.preventDefault();
            this.state.username = document.getElementById("username").value
            await this.login()
        });
    }

    async login() {
        if (this.state.username) {
            localStorage.setItem("username", this.state.username)
            sessionStorage.setItem("username", this.state.username)
        } else {
            this.state.username = getPonyName()
        }
        this.res = await fetch(`/play?username=${this.state.username}`, { method: "POST" }).then(res => res.json());
        this.state.uuid = this.res.uuid
        loadPage("rooms");
    }
}