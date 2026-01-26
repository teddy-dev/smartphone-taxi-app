const appId = "smartphone-taxi-app";

import { BaseApp } from '../../smartphone-widget/scripts/apps/BaseApp.js';
import { SmartphoneWidget } from '../../smartphone-widget/scripts/smartphone-widget.js';

let smartphoneApi;

class TaxiApp extends BaseApp {
    static socket = null; 

    constructor(widget) {
        super(widget);
        this.currentView = 'map';
        this.destination = null;
    }

    static initialize(socket) {
        this.socket = socket; 
        socket.register("movePlayerToScene", movePlayerToScene);
        socket.register("panToSpot", panToSpot);
        socket.register("getSceneList", async () => {
            const scenes = await game.settings.get(appId, "taxiScenes");
            return scenes;
        });
        socket.register("getSceneName", async (sceneid) => {
            const scene = game.scenes.find(scene => scene.id === sceneid);
            const navName = scene.navName || "";
            return {
                id: scene.id,
                name: (navName.length ? navName:scene.name),
                thumb: scene.thumb
            };
        });
        socket.register("taxiScenesUpdated", async () => {
            const instance = await SmartphoneWidget.getInstance();
            const app = instance.apps.get('taxiapp');
            if (app && instance.currentApp === 'taxiapp') {
                await app.render();
            }
        });
        return;
    }

    async render() {
        const blockTaxi = await Tagger.getByTag(game.settings.get(appId, "taxiBlocker"))[0];

        if (blockTaxi && this.currentView === 'map') {
            this.renderTaxiBlocked()
            return;
        }

        switch(this.currentView) {
            case 'map':
                this.renderTaxiView()
                break;
            case 'gm': 
                this.renderGMView();
                break;
            case 'travel': 
                this.renderTaxiTransit();
                break;
            default:
                this.updateContent(this.renderTaxiView());
                break;
        }
        return;
    }

    renderTaxiBlocked() {
        const content = `
            <div class="taxi-app">
                <div class="app-header">
                    ${game.user.isGM ? `<button id="taxi-app-gm"><i class="fas fa-cog"></i></button>`:``}
                    <h3>${this.getAppName(appId, "Taxi")}</h3>
                    <button id="taxi-app-refresh"><i class="fas fa-arrows-rotate"></i></button>
                </div>
                <div class="app-content">
                    <span class="no-service">
                        ☹️ <em>Taxi unavailable at this location.</em>
                    </span>
                </div>
            </div>
        `;
        this.updateContent(content);
    }

    renderTaxiTransit() {
        const content = `
            <div class="taxi-app">
                <div class="app-header">
                    ${game.user.isGM ? `<button id="taxi-app-gm"><i class="fas fa-cog"></i></button>`:``}
                    <h3>${this.getAppName(appId, "Taxi")}</h3>
                    <button id="taxi-app-refresh"><i class="fas fa-arrows-rotate"></i></button>
                </div>
                <div class="app-content">
                    <em>You are en route to your destination.</em>
                </div>
            </div>`;
        this.updateContent(content);

        const wait = setInterval(() => {
            if (this.destination === canvas.scene.id) {
                clearInterval(wait);
                this.destination = null;
                this.currentView = 'map';
                this.render();
            }
        }, 100);
    }

    async renderTaxiView() {
        const content = `
            <div class="taxi-app">
                <div class="app-header">
                    ${game.user.isGM ? `<button id="taxi-app-gm"><i class="fas fa-cog"></i></button>`:``}
                    <h3>${this.getAppName(appId, "Taxi")}</h3>
                    <button id="taxi-app-refresh"><i class="fas fa-arrows-rotate"></i></button>
                </div>
                <div class="app-content">
                    <div class="map-view">
                        <img src="modules/smartphone-taxi-app/assets/map.png" />
                    </div>
                    <select id="taxi-app-scene-list">
                        <option value="none">Select Destination</option>
                    </select>
                    <button id="taxi-app-travel">
                        <i class="fas fa-route"></i> Book Ride
                    </button>
                </div>
            </div>
        `;
        this.updateContent(content);

        const scenes = await TaxiApp.socket.executeAsGM("getSceneList");
        await scenes.sort().filter(sceneId => {
            return sceneId !== canvas.scene.id;
        }).map(async sceneId => {
            const scene = await TaxiApp.socket.executeAsGM("getSceneName", sceneId);
            window.document.getElementById("taxi-app-scene-list").insertAdjacentHTML('beforeend', `<option value="${scene.id}">${scene.name}</option>`);
        });
    }

    renderGMView() {
        const scenes = game.scenes.filter(scene => {
            return !game.settings.get(appId, "taxiScenes").includes(scene.id);
        }).map(scene => {
            const navName = scene.navName || "";
            return `<option data-value="${scene._id}" value="${(navName.length ? navName : scene.name)}"></option>`
        }).join(" ");

        const content = `
            <div class="taxi-app">
                <div class="app-header">
                    <button id="taxi-app-gm"><i class="fas fa-taxi"></i></button>
                    <h3>${this.getAppName(appId, "Taxi")} Manager</h3>
                    <button id="taxi-app-refresh"><i class="fas fa-arrows-rotate"></i></button>
                </div>
                <div class="app-content">
                    <h3>Remove Scenes</h3>
    
                    <input list="taxi-app-active-datalist" id="taxi-app-del-scene" placeholder="Search for Scene to delete" name="scene-to-delete" />
                    <button id="taxi-app-delete">
                        <i class="fas fa-trash"></i>
                        Remove Scene
                    </button>
                    <datalist id="taxi-app-active-datalist">
                    </datalist>

                    <h3>Add Scenes</h3>
                    <input list="taxi-app-scene-datalist" id="taxi-app-add-scene" placeholder="Search for Scene to add" name="scene-to-add" />
                    <button id="taxi-app-save">
                        <i class="fas fa-square-plus"></i>
                        Add Scene
                    </button>
                    <datalist id="taxi-app-scene-datalist">
                        ${scenes}
                    </datalist>
                </div>
            </div>
        `;
        this.updateContent(content);

        game.settings.get(appId, "taxiScenes").map(async sceneId => {
            const scene = await TaxiApp.socket.executeAsGM("getSceneName", sceneId);
            if (scene) {
                const navName = scene.navName || "";
                this.element.querySelector("#taxi-app-active-datalist").insertAdjacentHTML('beforeend', `<option data-value="${scene.id}" value="${(navName.length ? navName : scene.name)}"></option>`);
            }
        });
    }

    setupListeners() {
        super.removeAllListeners();
        if (!this.element) return;
        const refreshButton = this.element.querySelector("#taxi-app-refresh");
        if (refreshButton) {
            this.addListener(refreshButton, "click", (event) => {
                this.render();
            });
        }
        if (this.currentView === "map") {
            const travelButton = this.element.querySelector("#taxi-app-travel");
            const sceneSelector = this.element.querySelector("#taxi-app-scene-list");
            if (travelButton) {
                this.addListener(travelButton, 'click', async (event) => {
                    const scene = sceneSelector.value;
                    if (scene !== "none") {
                        const instance = await SmartphoneWidget.getInstance();
                        const actor = instance.currentActorId;
                        this.movePlayer(scene, actor);
                        this.destination = scene;
                        this.currentView = 'travel';
                        this.render();
                    }
                });
            }
            const gmButton = this.element.querySelector('#taxi-app-gm');
            if (gmButton) {
                this.addListener(gmButton, 'click', (event) => {
                    this.currentView = 'gm';
                    this.render();
                });
            }
        } else if (this.currentView === "gm") {
            const saveButton = this.element.querySelector("#taxi-app-save");
            const sceneSelector = this.element.querySelector("#taxi-app-add-scene");
            if (saveButton) {
                this.addListener(saveButton, "click", async (event) => {
                    const selected = sceneSelector.value;
                    const dataset = this.element.querySelector(`#taxi-app-scene-datalist [value="${selected}"]`); 
                    if (!dataset) {
                        const instance = await SmartphoneWidget.getInstance();
                        return instance.showToastNotification(`<strong>Error</strong>: No scene found!`);
                    }
                    const sceneToSave = dataset.getAttribute("data-value");
                    const savedScenes = game.settings.get(appId, "taxiScenes");
                    game.settings.set(appId, "taxiScenes", [...savedScenes, sceneToSave]);
                    this.render();
                });
            }
            const deleteButton = this.element.querySelector("#taxi-app-delete");
            const sceneDeleteSelector = this.element.querySelector("#taxi-app-del-scene");
            if (deleteButton) {
                this.addListener(deleteButton, "click", async (event) => {
                    const selected = sceneDeleteSelector.value;
                    const dataset = this.element.querySelector(`#taxi-app-active-datalist [value="${selected}"]`)
                    if (!dataset) {
                        const instance = await SmartphoneWidget.getInstance();
                        return instance.showToastNotification(`<strong>Error</strong>: No scene found!`);
                    }
                    const savedScenes = game.settings.get(appId, "taxiScenes");
                    const sceneToDelete = dataset.getAttribute("data-value");
                    const updatedScenes = savedScenes.filter(scene => scene !== sceneToDelete);
                    game.settings.set(appId, "taxiScenes", updatedScenes);
                    this.render();
                });
            }
            const gmButton = this.element.querySelector('#taxi-app-gm');
            if (gmButton) {
                this.addListener(gmButton, 'click', (event) => {
                    this.currentView = 'map';
                    this.render();
                });
            }
        }
        return;
    }

    movePlayer(scene, actor) {
        if (game.user.viewedScene === scene) {
            ui.notifications.error("You are already on that scene.");
            return;
        }
        TaxiApp.socket.executeAsGM("movePlayerToScene", game.user.id, scene, actor);
        return;
    }
}

Hooks.once('setup', () => {
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

    smartphoneApi = game.modules.get('smartphone-widget')?.api;

    if (!smartphoneApi) {
        ui.notifications.error("TaxiApp requires the 'Smartphone Widget' module to be active.");
        return;
    }

    smartphoneApi.registerApp({
        id: 'taxiapp',
        name: "Taxi",
        icon: 'fas fa-taxi',
        color: '#dbe728ff',
        category: 'utility',
        appClass: TaxiApp
    });
});

Hooks.once('ready', () => {
    const SmartphoneSocket = game.modules.get('smartphone-widget')?.api?.SmartphoneSocket;

    if (!SmartphoneSocket) {
        console.error("Taxi Addon | Smartphone Widget Core module is missing or API is not ready.");
        return;
    }

    const socket = new SmartphoneSocket(appId);
    TaxiApp.initialize(socket);
});

async function movePlayerToScene(userid, scene, actor) {
    const user = game.users.get(userid);
    const character = game.actors.get(actor).name;
    const tokens = await game.scenes.get(user.viewedScene).tokens.filter(token => token.actor && token.actor.name === character);

    try {
        if (tokens.length > 0) {
            const ids = tokens.map(token => token.id);
            await game.scenes.get(user.viewedScene).deleteEmbeddedDocuments("Token", ids);
        }
    } catch (e) {} finally {
        game.socket.emit("pullToScene", scene, user.id);
        setTimeout(() => {
            SpawnCharacter(character, userid, scene);
        }, 500);
    }
}

async function SpawnCharacter(character, userid, sceneId) {
    const spawners = await Tagger.getByTag(game.settings.get(appId, "taxiSpawner"), { sceneId: sceneId });
    if (!spawners || spawners.length === 0) {
        ui.notifications.error("There was no drop-off point configured for this scene.");
        return;
    }
    const spawner = (spawners.length === 1 ? spawners[0]:spawners[Math.floor(Math.random() * spawners.length)]);
    const tokens = await game.scenes.get(sceneId).tokens.filter(token => token.actor && token.actor.name === character);

    if (tokens.length > 0) {
        try {
            const ids = tokens.map(token => token.id);
            game.scenes.get(sceneId).deleteEmbeddedDocuments("Token", ids);
        } catch(e) {}
    }

    const actor = await game.actors.find(actor => actor.name === character);
    const token = await actor.getTokenDocument();
    const rX = (spawner.x + (Math.random() * spawner.width-(canvas.grid.size/2))).toNearest(canvas.grid.size);
    const rY = (spawner.y + (Math.random() * spawner.height-(canvas.grid.size/2))).toNearest(canvas.grid.size);

    await game.scenes.get(sceneId).createEmbeddedDocuments("Token", [{
        ...token.toObject(),
        x: Math.round(rX),
        y: Math.round(rY)
    }]);

    TaxiApp.socket.executeAsUser("panToSpot", userid, rX, rY);
    return;
}

async function panToSpot(x, y) {
    await canvas.animatePan({ x: Math.round(x), y: Math.round(y), scale: canvas.stage.scale.x });
    return;
}