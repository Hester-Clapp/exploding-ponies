import { loadPage } from './pageLoader.js';
import { getPonyName } from '../../common/ponyNameGenerator.js';

export class HomeController {
    res

    async beforeLoad() {
        this.username = sessionStorage.getItem("username")
        if (this.username) this.login()

        window.addEventListener("beforeunload", async (e) => {
            // e.preventDefault()
            if (this.res) fetch(`/play?uuid=${this.res.uuid}`, { method: "DELETE" })
        });
    }

    async afterLoad() {
        this.username = localStorage.getItem("username");
        document.getElementById("username").value = this.username
        document.querySelector("form").addEventListener("submit", async (e) => {
            e.preventDefault();
            this.username = document.getElementById("username").value
            await this.login()
        });
    }

    async login() {
        if (this.username) {
            localStorage.setItem("username", this.username)
            sessionStorage.setItem("username", this.username)
        } else {
            this.username = getPonyName()
        }
        this.res = await fetch(`/play?username=${this.username}`, { method: "POST" }).then(res => res.json());
        loadPage("rooms", this.res.uuid);
    }
}