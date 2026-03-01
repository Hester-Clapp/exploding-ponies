export class Avatar {
    constructor(container) {
        this.container = container
        container.classList.add("avatar")
        container.innerHTML = ""
        this.features = ["coat", "eyes", "mane"]
        this.features.forEach(feature => {
            const img = document.createElement("img")
            img.src = `resources/images/avatar-${feature}.png`
            img.classList.add(feature)
            container.appendChild(img)
            this[feature] = img
        })
        this.mane.src = `resources/images/avatar-mane-0.png`
    }

    setFeatures(values) {
        this.features.forEach(feature => {
            this[feature].style.filter = `hue-rotate(${values[feature]}deg)`
        })
        this.mane.src = `resources/images/avatar-mane-${values.style}.png`
    }

    // randomise() {
    //     this.setColours({
    //         coat: Math.floor(360 * Math.random()),
    //         mane: Math.floor(360 * Math.random()),
    //         eyes: Math.floor(360 * Math.random()),
    //     })
    // }
}