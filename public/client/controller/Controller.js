export class Controller {

    /**
     * Code to run when this page is first loaded, before rendering the HTML content
     */
    async beforeLoad() {
        this.cleanup = new AbortController() // Used to remove event listeners when unloaded
        this.loaded = new Promise(resolve => this.onLoad = resolve) // Resolves when content is loaded
    }

    /**
     * Code to run when this page is first loaded, after rendering the HTML content
     */
    async afterLoad() {
        this.onLoad()
    }

    /**
     * Binds a handler function to an event, which will be cleaned up when the page is unloaded
     * @param {Event} event The event to listen for
     * @param {function} callback The handler function
     * @param {boolean} once Whether the listener should be removed after the event happens
     * @param {Signal} signal The signal to abort the listener
     */
    addEventListener(event, callback, once = false, signal = this.cleanup.signal) {
        window.addEventListener(event, callback.bind(this), { once, signal })
    }
}