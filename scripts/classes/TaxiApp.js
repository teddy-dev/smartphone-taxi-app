const appId = "smartphone-taxi-app";

import { BaseApp } from '../../../smartphone-widget/scripts/apps/BaseApp.js';
import { SmartphoneWidget } from '../../../smartphone-widget/scripts/smartphone-widget.js';
import { SignalManager } from '../../../smartphone-widget/scripts/core/SignalManager.js';
import { PlayerManager } from './PlayerManager.js';

export class TaxiApp extends BaseApp {
    static socket = null; 
    static smartphoneApi = null;

    constructor(widget) {
        super(widget);
        this.currentView = 'map';
        this.destination = null;
    }

    static initialize(socket) {
        this.socket = socket; 
        this.smartphoneApi = game.modules.get('smartphone-widget')?.api;
        
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
                        ☹️ <em>${game.i18n.localize("TAXIAPP.ui.errors.service")}</em>
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
                    <h3>${game.i18n.localize("TAXIAPP.ui.invite.header")}</h3>
                    <p>${game.i18n.format("TAXIAPP.ui.invite.message", { name: inviterName, scene: scene.navName.length ? scene.navName:scene.name })}</p>
                    <button id="taxi-app-accept" data-location="${sceneId}">
                        <i class="fas fa-route"></i> ${game.i18n.localize("TAXIAPP.ui.invite.accept")}
                    </button>
                    <button id="taxi-app-reject">
                        <i class="fas fa-route"></i> ${game.i18n.localize("TAXIAPP.ui.invite.reject")}
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
                        ☹️ <em>${game.i18n.localize("TAXIAPP.ui.errors.signal")}</em>
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
                        <em>${game.i18n.localize("TAXIAPP.ui.pickup.guide")}</em>
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
                    <em>${game.i18n.localize("TAXIAPP.ui.travel.enroute")}</em>
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
                        <img id="taxi-app-map" src="${game.settings.get(appId, "coverImage")}" />
                    </div>
                    <label style="display: inl; align-items: center; cursor: pointer; margin: 0; padding: 0;">
                        <input id="taxi-app-invite-players" style="background: transparent; margin: 0; padding: 0; width:1.5rem;" type="checkbox" />
                        ${game.i18n.localize("TAXIAPP.ui.main.invite")}
                    </label>
                    <select id="taxi-app-scene-list">
                        <option value="none">${game.i18n.localize("TAXIAPP.ui.main.select")}</option>
                    </select>
                    
                    <button id="taxi-app-travel">
                        <i class="fas fa-route"></i> ${game.i18n.localize("TAXIAPP.ui.main.book")}
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
                    <h3>${this.getAppName(appId, "Taxi")} ${game.i18n.localize("TAXIAPP.ui.gm.manager")}</h3>
                    <button id="taxi-app-refresh"><i class="fas fa-arrows-rotate"></i></button>
                </div>
                <div class="app-content">
                    <p><small>${game.i18n.localize("TAXIAPP.ui.gm.guide")}</small></p>
                    <input placeholder="${game.i18n.localize("TAXIAPP.ui.gm.search")}" id="taxi-app-search" />
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
                            smartphoneApi.selectChatRecipient(game.i18n.localize("TAXIAPP.ui.api.invite"), async (target) => {
                                const targetActor = game.actors.get(target);
                                if (targetActor) {
                                    TaxiApp.socket.executeAsGM("invitePlayerToScene", scene, targetActor.id, actor);
                                    const targetPhone = smartphoneApi.getPhoneForActor(target);

                                    smartphoneApi.sendSystemMessage(targetPhone.id, game.i18n.format("TAXIAPP.ui.api.message", { name: game.actors.get(actor).name }),  { senderAlias: "Ride Share" });
                                }
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
                    else if (useSceneThumbnail && event.srcElement.value !== 'none') map.src = scene.thumb || game.settings.get(appId, "coverImage");
                    else if (useSceneThumbnail && event.srcElement.value == 'none') map.src = game.settings.get(appId, "coverImage");
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