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

    static async SpawnCharacter (character, userid, sceneId) {
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

        this.socket.executeAsUser("panToSpot", userid, rX, rY);
        return;
    }
}