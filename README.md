# Taxi App for Smartphone Widget
A simple Taxi App for GlitchSmith's Smartphone Widget module that allows your players to be able to freely travel to certain scenes via an app.

![Preview Image](https://i.imgur.com/1nnY6gu.png)

This module requires [Smartphone Widget](https://foundryvtt.com/packages/smartphone-widget) module from [The Glitch Smith](https://www.patreon.com/cw/glitchsmith) as this is a custom-built app for the usable Smartphone Widget they created. 

## Other Required Plugins
[Tagger](https://foundryvtt.com/packages/tagger)  
[Socketlib](https://foundryvtt.com/packages/socketlib)

## Usage
- Enable the app by opening the Smartphone Widget, selecting **Settings** -> **App Store Settings** and then enabling **Taxi**.
- Create a tile on a destination scene with the tag `TaxiDropOff`. If there are multiple, a random dropoff will be selected.
- Open the Taxi App, and click the cogwheel at the top left (You must be a GM!). You may add and remove scenes here that players may travel to.
- Players can now open the Taxi App, and use the dropdown to select a scene and use **Book Ride** to travel.

## Notes
- A GM must be connected for the app to function. They do not need to be on source or destination scenes.
- The teleported actor is whoever owns the phone. GMs or players with multiple should ensure they have the intended actor's phone as their active phone.
- You can add a tile with the tag `NoTaxi` to block the Taxi App from working on the scene. This will ensure players cannot taxi off of the scene.
- This is still in testing, I am still figuring things out.

## Installing
Use the manifest url to add the app:
```
https://raw.githubusercontent.com/teddy-dev/smartphone-taxi-app/refs/heads/main/module.json
```

## Support
Support and updates available on my [Discord](https://discord.gg/SUgbgG8).
