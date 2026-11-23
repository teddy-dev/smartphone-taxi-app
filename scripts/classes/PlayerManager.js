const appId = "smartphone-taxi-app";

export class PlayerManager {
    static socket;
    
    static initialize(socket) {
        this.socket = socket; 
        socket.register("movePlayerToScene", async (userid, scene, actor) => {
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
                    this.SpawnCharacter(character, userid, scene);
                }, 500);
            }
        });
        socket.register("panToSpot", async (x, y) => {
            if (game.settings.get(appId, "autoPanAfterSwitch")) {
                await canvas.animatePan({ x: Math.round(x), y: Math.round(y), scale: canvas.stage.scale.x });
            }
            return;
        });
    }

    static async _cleanUpTokens (character, sceneId) {
        const tokens = await game.scenes.get(sceneId).tokens.filter(token => token.actor && token.actor.name === character);
        if (tokens.length > 0) {
            try {
                const ids = tokens.map(token => token.id);
                game.scenes.get(sceneId).deleteEmbeddedDocuments("Token", ids);
            } catch(e) {}
        }
    }

    static async SpawnCharacter (character, userid, sceneId) {
        const spawners = await Tagger.getByTag(game.settings.get(appId, "taxiSpawner"), { sceneId: sceneId });
        if (spawners && spawners.length > 0) return this.useLegacySpawner(character, userid, sceneId, spawners);
        
        const scene = game.scenes.get(sceneId);
        if (!scene) return ui.notifications.error("The requested scene was not found.");

        const regionSpawners = scene.regions.filter(region => region.behaviors.some(behavior => behavior.type === `${appId}.taxiZone`));

        if (regionSpawners.length === 0) return ui.notifications.error("No spawner set on this scene.");

        const region = ( regionSpawners.length === 1 ? regionSpawners[0]:regionSpawners[Math.floor(Math.random() * regionSpawners.length)]);
        const placeable = canvas.regions.placeables.find(r => r.document === region);
        const point = placeable.polygonTree.sampleInterior();

        this._cleanUpTokens(character, sceneId);

        const actor = await game.actors.find(actor => actor.name === character);
        const token = await actor.getTokenDocument();

        await game.scenes.get(sceneId).createEmbeddedDocuments("Token", [{
            ...token.toObject(),
            x: (point.x).toNearest(canvas.grid.size),
            y: (point.y).toNearest(canvas.grid.size)
        }]);

        this.socket.executeAsUser("panToSpot", userid, point.x, point.y);
        return;
    }

    static async useLegacySpawner(character, userid, sceneId, spawners) {
        const spawner = (spawners.length === 1 ? spawners[0]:spawners[Math.floor(Math.random() * spawners.length)]);
        this._cleanUpTokens(character, sceneId);

        const actor = await game.actors.find(actor => actor.name === character);
        const token = await actor.getTokenDocument();

        const rX = spawner.x + (Math.random() * spawner.width);
        const rY = spawner.y + (Math.random() * spawner.height);

        await game.scenes.get(sceneId).createEmbeddedDocuments("Token", [{
            ...token.toObject(),
            x: (rX).toNearest(canvas.grid.size),
            y: (rY).toNearest(canvas.grid.size)
        }]);

        this.socket.executeAsUser("panToSpot", userid, rX,rY);
        return;
    }
}