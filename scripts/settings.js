const appId = "smartphone-taxi-app";


export function registerSettings() {
    game.settings.register(appId, "taxiScenes", {
        name: "Taxi Scene",
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
        name: "TAXIAPP.settings.tag.name",
        hint: "TAXIAPP.settings.tag.hint",
        scope: "world",
        config: true,
        type: String,
        default: "TaxiDropOff"
    });

    game.settings.register(appId, "taxiBlocker", {
        name: "TAXIAPP.settings.block.name",
        hint: "TAXIAPP.settings.block.hint",
        scope: "world",
        config: true,
        type: String,
        default: "NoTaxi"
    });

    game.settings.register(appId, "useSceneThumbnail", {
        name: "TAXIAPP.settings.thumbnail.name",
        hint: "TAXIAPP.settings.thumbnail.hint", 
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });

    /*game.settings.register(appId, "requirePickupZone", {
        name: "TAXIAPP.settings.pickup.name",
        hint: "TAXIAPP.settings.pickup.hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });*/

    game.settings.register(appId, "autoPanAfterSwitch", {
        name: "TAXIAPP.settings.pan.name",
        hint: "TAXIAPP.settings.pan.hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(appId, "coverImage", {
        name: "TAXIAPP.settings.cover.name",
        hint: "TAXIAPP.settings.cover.hint",
        scope: "world", 
        config: true,
        type: String,
        default: "modules/smartphone-taxi-app/assets/map.png",
        filePicker: "image" 
    });

    game.settings.register(appId, "useSignalSystem", {
        name: "TAXIAPP.settings.signal.name",
        hint: "TAXIAPP.settings.signal.hint",
        scope: "world",
        config: true, 
        type: Boolean,
        default :true
    });
}