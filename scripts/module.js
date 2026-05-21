const appId = "smartphone-taxi-app";

import { BaseApp } from '../../smartphone-widget/scripts/apps/BaseApp.js';
import { SmartphoneWidget } from '../../smartphone-widget/scripts/smartphone-widget.js';
import { SignalManager } from "../../smartphone-widget/scripts/core/SignalManager.js";

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
        socket.register("invitePlayerToScene", async (sceneid, actorid, host) => {
            const actor = game.actors.get(actorid);
            if (!actor) return;
            actor.setFlag(appId, "invite", {
                scene: sceneid,
                host: host
            });

        });
        socket.register("getSceneList", async () => {
            const scenes = await game.settings.get(appId, "taxiScenes");
            return scenes;
        });
        socket.register("getSceneName", async (sceneid) => {
            const scene = game.scenes.find(scene => scene.id === sceneid);
            const navName = scene.navName || "";
            const hasCover = ((scene.flags[appId]) ? (scene.flags[appId]['scene-cover']):false);

            return {
                id: scene.id,
                name: (navName.length ? navName:scene.name),
                thumb: scene.thumb,
                cover: (hasCover ? scene.flags[appId]['scene-cover']:null)
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

        /*const requirePickupZone = game.settings.get(appId, "requirePickupZonee");
        if (requirePickupZone) {
            const pickup = await Tagger.getByTag(game.settings.get(appId, "taxiSpawner"));
            pickup.forEach(tile => {});
        }*/

        if (!SignalManager.hasSignal() && 
            !SignalManager.isWeakSignal() && 
            game.settings.get(appId, "useSignalSystem") &&
            this.currentView !== 'gm') {
            this.renderTaxiNoSignal();
            return;
        }

        const instance = await SmartphoneWidget.getInstance();
        const actorid = instance.currentActorId;
        const actor = game.actors.get(actorid);

        if (actor.flags[appId]?.invite !== undefined) {
            const invite = actor.getFlag(appId, "invite");
            this.currentView = "invite";
            this.renderInvite(invite.host, invite.scene);
            return;
        }

        switch(this.currentView) {
            case 'map':
            case 'invite':
                this.renderTaxiView()
                break;
            case 'gm': 
                this.renderGMView();
                break;
            case 'travel': 
                this.renderTaxiTransit();
                break;
            case 'pickup':
                this.renderTaxiPickup();
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

    renderInvite(inviter, sceneId) {
        const inviterName  = game.actors.get(inviter).name;
        const scene = game.scenes.get(sceneId);
        const content = `
            <div class="taxi-app">
                <div class="app-header">
                    ${game.user.isGM ? `<button id="taxi-app-gm"><i class="fas fa-cog"></i></button>`:``}
                    <h3>${this.getAppName(appId, "Taxi")}</h3>
                    <button id="taxi-app-refresh"><i class="fas fa-arrows-rotate"></i></button>
                </div>
                <div class="app-content">
                    <h3>Ride Share Request!</h3>
                    <p>${inviterName} has invited you to travel together to ${scene.navName.length ? scene.navName:scene.name}!</p>
                    <button id="taxi-app-accept" data-location="${sceneId}">
                        <i class="fas fa-route"></i> Accept
                    </button>
                    <button id="taxi-app-reject">
                        <i class="fas fa-route"></i> Decline
                    </button>
                </div>
            </div>
        `;
        this.updateContent(content);
    }

    renderTaxiNoSignal() {
        const content = `
            <div class="taxi-app">
                <div class="app-header">
                    ${game.user.isGM ? `<button id="taxi-app-gm"><i class="fas fa-cog"></i></button>`:``}
                    <h3>${this.getAppName(appId, "Taxi")}</h3>
                    <button id="taxi-app-refresh"><i class="fas fa-arrows-rotate"></i></button>
                </div>
                <div class="app-content">
                    <span class="no-service">
                        ☹️ <em>You do not have signal!</em>
                    </span>
                </div>
            </div>
        `;
        this.updateContent(content);
    }

    renderTaxiPickup() {
        const content = `
            <div class="taxi-app">
                <div class="app-header">
                    ${game.user.isGM ? `<button id="taxi-app-gm"><i class="fas fa-cog"></i></button>`:``}
                    <h3>${this.getAppName(appId, "Taxi")}</h3>
                    <button id="taxi-app-refresh"><i class="fas fa-arrows-rotate"></i></button>
                </div>
                <div class="app-content">
                    <span class="no-service">
                        <em>Please head to a pickup location.</em>
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
                    <label style="display: inl; align-items: center; cursor: pointer; margin: 0; padding: 0;">
                        <input id="taxi-app-invite-players" style="background: transparent; margin: 0; padding: 0; width:1.5rem;" type="checkbox" />
                        Ride Share
                    </label>
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
            const invitePlayers = this.element.querySelector("#taxi-app-invite-players");
            if (travelButton) {
                this.addListener(travelButton, 'click', async (event) => {
                    const scene = sceneSelector.value;
                    if (scene !== "none") {
                        const instance = await SmartphoneWidget.getInstance();
                        const actor = instance.currentActorId;
                        if (invitePlayers.checked) {
                            smartphoneApi.selectChatRecipient("Select Recipient", async (target) => {
                                const targetActor = game.actors.get(target);
                                if (targetActor) TaxiApp.socket.executeAsGM("invitePlayerToScene", scene, targetActor.id, actor);
                                this.processMovementRequest(scene, actor);
                            });
                        } else this.processMovementRequest(scene, actor);
                    }
                });
            }
            if (sceneSelector) {
                this.addListener(sceneSelector, 'change', async(event) => {
                    const useSceneThumbnail = game.settings.get(appId, "useSceneThumbnail");
                    const scene = await TaxiApp.socket.executeAsGM("getSceneName", event.srcElement.value);
                    const map = this.element.querySelector("#taxi-app-map");

                    if ( event.srcElement.value !== 'none' && scene.cover !== null) map.src = scene.cover;
                    else if (useSceneThumbnail && event.srcElement.value !== 'none') map.src = scene.thumb;
                    else if (useSceneThumbnail && event.srcElement.value == 'none') map.src = "modules/smartphone-taxi-app/assets/map.png";
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
                        if (div.innerText.toLocaleLowerCase().includes(toSearch)) div.style.display = "";
                        else div.style.display = "none";
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
        } else if (this.currentView === 'invite') {
            const travelButton = this.element.querySelector("#taxi-app-accept");
            const denyTravelButton = this.element.querySelector("#taxi-app-reject");
            if (travelButton) {
                this.addListener(travelButton, 'click', async (event) => {
                    const instance = await SmartphoneWidget.getInstance();
                    const actor = instance.currentActorId;
                    const scene = travelButton.getAttribute("data-location");
                    game.actors.get(actor).unsetFlag(appId, "invite");
                    this.processMovementRequest(scene, actor);
                });
                
            } 
            if (denyTravelButton) {
                this.addListener(denyTravelButton, 'click', async (event) => {
                    const instance = await SmartphoneWidget.getInstance();
                    const actor = instance.currentActorId;
                    game.actors.get(actor).unsetFlag(appId, "invite");
                    this.currentView = 'map';
                    this.render();
                });
            }   
        }
        return;
    }

    processMovementRequest(scene, actor) {
        this.movePlayer(scene, actor);
        this.destination = scene;
        this.currentView = 'travel';
        setTimeout(() => {
            this.render();
        }, 250);
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

class TaxiZoneBehavior extends foundry.data.regionBehaviors.RegionBehaviorType {
    static LOCALIZATION_PREFIXES = ["TAXIAPP.TaxiZone"];
    static defineSchema() { return {} }
    static events = {};
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

    game.settings.register(appId, "useSignalSystem", {
        name: "Use Signal System",
        hint: "Use Smartphone Signal to block access to taxi.",
        scope: "world",
        config: true, 
        type: Boolean,
        default :true
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

Hooks.once("init", () => {
    CONFIG.RegionBehavior.dataModels[`${appId}.taxiZone`] = TaxiZoneBehavior;
    CONFIG.RegionBehavior.typeIcons[`${appId}.taxiZone`] = "fa-solid fa-taxi";
    CONFIG.RegionBehavior.typeLabels[`${appId}.taxiZone`] = "TAXIAPP.TaxiZone.label";
});

Hooks.on('renderSceneConfig', (app, html, data) => {
    const input = `
    <fieldset>
        <legend>Taxi App</legend>
        <div class="form-group">
            <label for="${appId}-file">Cover Image</label>
            <div class="form-fields">
                <input type="text" id="${appId}-file" name="flags.${appId}.scene-cover" 
                    value="${app.document.getFlag(appId, 'scene-cover') || ''}" placeholder="path/to/file.ext" />
                <button type="button" class="file-picker" data-type="file" 
                        data-target="${appId}-file">
                <i class="fas fa-file-import fa-fw icon"></i>
                </button>
            </div>
            <p class="hint">(Optional) The image to display when a user selects this scene in the Taxi App.</p>
        </div>
    </fieldset>
    `;

    const root = html instanceof HTMLElement ? html : html?.[0];
    const target = root.querySelector('[data-application-part="misc"] > fieldset:last-of-type');
    if (target) target.insertAdjacentHTML('afterend', input);

    const fileButton = root.querySelector(`button[data-target="${appId}-file"]`);
    if (fileButton) {
        fileButton.addEventListener('click', async (event) => {
            const fp = new FilePicker({
                type: 'file',
                callback: (path) => {
                    root.querySelector(`#${appId}-file`).value = path;
                }
            });
            fp.browse();
        });
    }
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
        game.socket.emit("pullToScene", scene, user.id, { level : scene.initialLevel });
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
    if (game.settings.get(appId, "autoPanAfterSwitch")) {
        await canvas.animatePan({ x: Math.round(x), y: Math.round(y), scale: canvas.stage.scale.x });
    }
    return;
}