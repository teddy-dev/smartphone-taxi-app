export class TaxiZoneBehavior extends foundry.data.regionBehaviors.RegionBehaviorType {
    static LOCALIZATION_PREFIXES = ["TAXIAPP.TaxiZone"];
    static defineSchema() { return {} }
    static events = {
        tokenEnter: this.#onTokenEnter
    };

    static async #onTokenEnter(event) {
        const token = event.data.token;
        const region = this.region;

        console.log(`${token.name} entered ${region.name}`);
    }
}