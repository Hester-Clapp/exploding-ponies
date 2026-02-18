import { HomeController } from "./HomeController.js";
import { RoomsController } from "./RoomsController.js";
import { RoomController } from "./RoomController.js";
import { GameController } from "./GameController.js";

const controllers = {
    home: new HomeController(),
    rooms: new RoomsController(),
    room: new RoomController(),
    game: new GameController(),
}

const app = document.getElementById("app")

export async function loadPage(page, ...args) {
    try {
        await controllers[page].beforeLoad(...args);

        const res = await fetch(`/resources/pages/${page}.html`);
        if (!res.ok) throw new Error(`Failed to load page: ${res.statusText}`);

        const html = await res.text();
        app.innerHTML = html;

        await controllers[page].afterLoad()
    } catch (err) {
        console.error(err);
        app.innerHTML = "<h1>Failed to load page</h1>";
    }
}   