const appId = "smartphone-taxi-app";


export function registerSettings() {
    game.settings.register(appId, "taxiScenes", {
        name: "Taxi Scenes",
        scope: "world",
        config: false,
        type: Array,
        default: []
    });

    game.settings.register(appId, "blockedTaxiScenes", {
        name: "Blocked Scenes",
        scope: "world",
        config: false,
        type: Array,
        default: []
    });
    
    game.settings.register(appId, "taxiSpawner", {
        name: "Taxi Spawn Tag",
        hint: "The Tagger Tag to use to Spawn a token on a scene.",
        scope: "world",
        config: true,
        type: String,
        default: "TaxiDropOff"
    });

    game.settings.register(appId, "taxiBlocker", {
        name: "Block Taxi Tag",
        hint: "The Tagger Tag to use to block actors from accessing Taxi on scene.",
        scope: "world",
        config: true,
        type: String,
        default: "NoTaxi"
    });

    game.settings.register(appId, "useSceneThumbnail", {
        name: "Use Scene Thumbnail",
        hint: "Use a thumbnail of the scene instead of static image", 
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });

    /*game.settings.register(appId, "requirePickupZone", {
        name: "Use Taxi Pickup",
        hint: "Require the player to be in a Taxi Zone region to be picked up by a taxi.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });*/

    game.settings.register(appId, "autoPanAfterSwitch", {
        name: "Automatic Token Pan",
        hint: "Automatically pan to a token after arriving on new scene.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(appId, "coverImage", {
        name: "Cover Image",
        hint: "The default 'map' image.",
        scope: "world", 
        config: true,
        type: String,
        default: "modules/smartphone-taxi-app/assets/map.png",
        filePicker: "image" 
    });

    game.settings.register(appId, "useSignalSystem", {
        name: "Use Signal System",
        hint: "Use Smartphone Signal to block access to taxi.",
        scope: "world",
        config: true, 
        type: Boolean,
        default :true
    });
}