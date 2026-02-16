export class UserHandler {

    constructor() {
        this.users = new Map();
    }

    add(params) {
        const username = params.get("username") || "Anon";

        const uuid = crypto.randomUUID();
        this.users.set(uuid, new User(uuid, username));

        return uuid;
    }

    get(uuid) {
        return this.users.get(uuid) || {};
    }

    get usersArray() {
        return Array.from(this.users.values());
    }

    get usersObject() {
        return Object.fromEntries(this.users);
    }

    set(id, data) {
        const user = this.users.get(id) || {};
        user = { ...user, ...data };
        this.users.set(id, user);
    }

    remove(uuid) {
        this.users.delete(uuid);
    }
}

class User {
    constructor(uuid, username) {
        this.uuid = uuid;
        this.username = username;
    }

    expose() {
        return {
            uuid: this.uuid,
            username: this.username
        }
    }
}