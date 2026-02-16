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
                        <img id="taxi-app-map" src="modules/smartphone-taxi-app/assets/map.png" />
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
        const scenes = game.scenes.map(scene => {
            const navName = scene.navName || "";
            const isActive = game.settings.get(appId, "taxiScenes").includes(scene.id);
            return `<div class="taxi-app-scene ${(isActive ? 'active':'inactive')}" data-value="${scene._id}">${(isActive ? `<i class="fa fa-circle-check"></i>`:`<i class="fa fa-circle-xmark"></i>`)} ${(navName.length ? navName : scene.name)}</div>`
        }).join(" ");

        const content = `
            <div class="taxi-app">
                <div class="app-header">
                    <button id="taxi-app-gm"><i class="fas fa-taxi"></i></button>
                    <h3>${this.getAppName(appId, "Taxi")} Manager</h3>
                    <button id="taxi-app-refresh"><i class="fas fa-arrows-rotate"></i></button>
                </div>
                <div class="app-content">
                    <p><small>Click to toggle a scene.</small></p>
                    <input placeholder="Search for Scenes" id="taxi-app-search" />
                    ${scenes}
                </div>
            </div>
        `;
        this.updateContent(content);
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
            if (sceneSelector) {
                this.addListener(sceneSelector, 'change', async(event) => {
                    const useSceneThumbnail = game.settings.get(appId, "useSceneThumbnail");

                    const map = this.element.querySelector("#taxi-app-map");
                    if (useSceneThumbnail && event.srcElement.value !== 'none') {
                        const scene = await TaxiApp.socket.executeAsGM("getSceneName", event.srcElement.value);
                        map.src = scene.thumb;
                    } else if (useSceneThumbnail && event.srcElement.value == 'none') {
                        map.src = "modules/smartphone-taxi-app/assets/map.png";
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
            const sceneDivs = this.element.querySelectorAll(".taxi-app-scene");

            sceneDivs.forEach(div => {
                this.addListener(div, 'click', (event) => {
                    const sceneToAddOrRemove = event.target.getAttribute("data-value");
                    const savedScenes = game.settings.get(appId, "taxiScenes");
                    if (event.target.classList.contains("active")) {

                        const updatedScenes = savedScenes.filter(scene => scene !== sceneToAddOrRemove);
                        game.settings.set(appId, "taxiScenes", updatedScenes);
                        event.target.classList.replace("active", "inactive");
                        event.target.querySelector("i").classList.replace("fa-circle-check", "fa-circle-xmark");
                    } else {
                        game.settings.set(appId, "taxiScenes", [...savedScenes, sceneToAddOrRemove]);
                        event.target.classList.replace("inactive", "active");
                        event.target.querySelector("i").classList.replace("fa-circle-xmark", "fa-circle-check");
                    }
                });
            })

            const search = this.element.querySelector("#taxi-app-search");
            if (search) {
                this.addListener(search, 'keyup', (event) => {
                    const toSearch = search.value.toLocaleLowerCase();
                    for (let i = 0; i < sceneDivs.length; i++) {
                        const div = sceneDivs[i];
                        const value = div.innerText;

                        if (value.toLocaleLowerCase().includes(toSearch)) {
                            div.style.display = "";
                        } else {
                            div.style.display = "none";
                        }
                    }
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

    game.settings.register(appId, "useSceneThumbnail", {
        name: "Use Scene Thumbnail",
        hint: "Use a thumbnail of the scene instead of static image", 
        scope: "world",
        config: true,
        type: Boolean,
        default: false
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