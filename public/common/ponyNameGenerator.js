const forenames = ["Blue", "Brushed", "Cheery", "Cookie", "Dancing", "Dark", "Fancy", "Flawless", "Frost", "Frozen", "Full", "Golden", "Lightning", "Little", "Lucky", "Lunar", "Magic", "Marble", "Midnight", "Morning", "Mystic", "Mythic", "Ocean", "Peppermint", "Quirk", "Rainbow", "Rapid", "Rocking", "Sapphire", "Scarlet", "Shadow", "Shining", "Shooting", "Shuffle", "Silent", "Silver", "Sky", "Smooth", "Snow", "Star", "Stone", "Straight", "Sugar", "Sunshine", "Sweet", "Swift", "Tiny", "Twinkle"];
const lastnames = ["Arrow", "Beat", "Blanket", "Breeze", "Charm", "Chaser", "Cube", "Dash", "Dough", "Eyes", "Fang", "Fury", "Gadget", "Gem", "Haste", "Heart", "Hoof", "Hooves", "Leap", "Light", "Manes", "Meteor", "Might", "Mist", "Moon", "Moonlight", "Mystery", "Note", "Prize", "Sapphire", "Scar", "Shadow", "Shy", "Smirk", "Solo", "Song", "Sparkle", "Spice", "Star", "Step", "Steps", "Stream", "Style", "Sunset", "Sunshine", "Thimble", "Tinker", "Toes", "Tooth", "Tumbler", "Vision", "Wing", "Wish"];

export function getPonyName() {
    return forenames[Math.floor(Math.random() * forenames.length)] + " " + lastnames[Math.floor(Math.random() * lastnames.length)];
}
