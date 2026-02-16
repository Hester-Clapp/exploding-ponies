import { HomeController } from "./HomeController.js";
import { RoomsController } from "./RoomsController.js";
import { RoomController } from "./RoomController.js";
import { GameController } from "./GameController.js";

const state = {}
window.state = state

const controllers = {
    home: new HomeController(state),
    rooms: new RoomsController(state),
    room: new RoomController(state),
    game: new GameController(state),
}

const app = document.getElementById("app")

export async function loadPage(page) {
    try {
        await controllers[page].beforeLoad();

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