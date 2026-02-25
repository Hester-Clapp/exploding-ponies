import { loadPage } from './pageLoader.js';
import { getPonyName } from '../service/ponyNameGenerator.js';

export class HomeController {
    res

    async beforeLoad() {
        this.userData = UserData.fromStorage(sessionStorage)
        if (this.userData.saved) this.login()

        window.addEventListener("beforeunload", async (e) => {
            // e.preventDefault()
            if (this.res) fetch(`/play?uuid=${this.res.uuid}`, { method: "DELETE" })
        });
    }

    async afterLoad() {
        const fields = {
            username: document.getElementById("username"),
            coat: document.getElementById("coat"),
            mane: document.getElementById("mane"),
            eyes: document.getElementById("eyes"),
        }

        this.userData = UserData.fromStorage(localStorage);
        fields.username.value = this.userData.username
        fields.coat.value = this.userData.avatar.coat
        fields.mane.value = this.userData.avatar.mane
        fields.eyes.value = this.userData.avatar.eyes

        document.querySelector("form").addEventListener("submit", async (e) => {
            e.preventDefault();
            this.userData = UserData.fromFields(fields)
            await this.login()
        });
    }

    async login() {
        if (this.userData) {
            localStorage.setItem("userData", this.userData.toString())
            sessionStorage.setItem("userData", this.userData.toString())
        } else {
            this.userData = new UserData(getPonyName())
        }
        this.res = await fetch(`/play?${this.userData.toParams()}`, { method: "POST" }).then(res => res.json());
        loadPage("rooms", this.res.uuid);
    }
}

class UserData {
    constructor(
        username = "",
        coat = Math.floor(360 * Math.random()),
        mane = Math.floor(360 * Math.random()),
        eyes = Math.floor(360 * Math.random()),
        saved = false
    ) {
        this.username = username
        this.avatar = { coat, mane, eyes }
        this.saved = saved
    }

    static fromString(string) {
        if (string) {
            const json = JSON.parse(string)
            return new UserData(json.username, json.avatar.coat, json.avatar.mane, json.avatar.eyes, true)
        } else return new UserData()
    }

    static fromStorage(storage) {
        return this.fromString(storage.getItem("userData"))
    }

    static fromFields(fields) {
        return new UserData(
            fields.username.value,
            Number(fields.coat.value),
            Number(fields.mane.value),
            Number(fields.eyes.value),
            true
        )
    }

    toString() {
        return JSON.stringify(this)
    }

    toParams() {
        return `username=${encodeURIComponent(this.username)
            }&avatar=${this.avatar.coat}%2C${this.avatar.mane}%2C${this.avatar.eyes}`
    }
}