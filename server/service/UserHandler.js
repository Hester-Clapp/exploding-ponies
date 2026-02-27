export class UserHandler {

    constructor() {
        this.users = new Map();
    }

    add(username, avatar) {
        const uuid = crypto.randomUUID();
        this.users.set(uuid, new User(uuid, username, avatar));

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

export class User {
    constructor(uuid, username, avatar) {
        this.uuid = uuid;
        this.username = username;
        if (avatar) {
            const [coat, mane, eyes] = avatar.split(",")
            this.avatar = {
                coat: Number(coat),
                mane: Number(mane),
                eyes: Number(eyes)
            }
        } else {
            this.avatar = {
                coat: Math.floor(360 * Math.random()),
                mane: Math.floor(360 * Math.random()),
                eyes: Math.floor(360 * Math.random()),
                style: Math.floor(3 * Math.random()),
            }
        }
    }

    expose() {
        return {
            uuid: this.uuid,
            username: this.username,
            avatar: this.avatar
        }
    }
}