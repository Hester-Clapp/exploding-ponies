export class User {
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