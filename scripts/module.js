const appId = "smartphone-taxi-app";

import { TaxiApp } from './classes/TaxiApp.js';
import { TaxiZoneBehavior } from './classes/TaxiZoneBehavior.js';
import { PlayerManager } from './classes/PlayerManager.js';
import { registerSettings } from './settings.js';

let smartphoneApi;

Hooks.once('setup', () => {
    registerSettings();

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
        console.error("Taxi App | Smartphone Widget Core module is missing or API is not ready.");
        return;
    }

    const socket = new SmartphoneSocket(appId);
    TaxiApp.initialize(socket);
    PlayerManager.initialize(socket);
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
                <input type="text" id="${appId}-file" name="flags.${appId}.scene-cover" value="${app.document.getFlag(appId, 'scene-cover') || ''}" placeholder="path/to/file.ext" />
                <button type="button" class="file-picker" data-type="file" data-target="${appId}-file">
                    <i class="fas fa-file-import fa-fw icon"></i>
                </button>
            </div>
            <p class="hint">
                (Optional) The image to display when a user selects this scene in the Taxi App.
            </p>
        </div>
    </fieldset>`;

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