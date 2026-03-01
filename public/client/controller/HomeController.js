import { Controller } from './Controller.js';
import { loadPage } from './pageLoader.js';
import { getPonyName } from '../../common/ponyNameGenerator.js';
import { Avatar } from '../service/Avatar.js';

export class HomeController extends Controller {
    res

    async beforeLoad() {
        super.beforeLoad()

        this.userData = UserData.fromStorage(sessionStorage)
        if (this.userData.saved) this.login()

        window.addEventListener("beforeunload", async (e) => {
            if (this.res) fetch(`/play?uuid=${this.res.uuid}`, { method: "DELETE" })
            this.res = null
        }, { once: true });
    }

    async afterLoad() {
        super.afterLoad()

        const fields = {
            username: document.getElementById("username"),
            coat: document.getElementById("coat"),
            mane: document.getElementById("mane"),
            eyes: document.getElementById("eyes"),
            style: document.getElementById("style"),
        }

        this.userData = UserData.fromStorage(localStorage);
        fields.username.value = this.userData.username
        fields.coat.value = this.userData.avatar.coat
        fields.mane.value = this.userData.avatar.mane
        fields.eyes.value = this.userData.avatar.eyes
        fields.style.value = this.userData.avatar.style

        const avatar = new Avatar(document.querySelector(".avatar"))
        avatar.setFeatures({
            coat: fields.coat.value,
            mane: fields.mane.value,
            eyes: fields.eyes.value,
            style: fields.style.value,
        })

        document.querySelector("fieldset").addEventListener("input", () => {
            avatar.setFeatures({
                coat: fields.coat.value,
                mane: fields.mane.value,
                eyes: fields.eyes.value,
                style: fields.style.value,
            })
        })

        document.querySelector("form").addEventListener("submit", async (e) => {
            e.preventDefault();
            this.userData = UserData.fromFields(fields)
            await this.login()
        }, { once: true });
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
        style = Math.floor(3 * Math.random()),
        saved = false
    ) {
        this.username = username
        this.avatar = { coat, mane, eyes, style }
        this.saved = saved
    }

    static fromString(string) {
        if (string) {
            const json = JSON.parse(string)
            return new UserData(json.username, json.avatar.coat, json.avatar.mane, json.avatar.eyes, json.avatar.style, true)
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
            Number(fields.style.value),
            true
        )
    }

    toString() {
        return JSON.stringify(this)
    }

    toParams() {
        return `username=${encodeURIComponent(this.username)
            }&avatar=${this.avatar.coat}%2C${this.avatar.mane}%2C${this.avatar.eyes}%2C${this.avatar.style}`
    }
}