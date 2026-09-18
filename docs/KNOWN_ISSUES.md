# Known Issues

- **Memory Limits during Slicing**: Complex models may cause the Slicer Service to consume significant RAM, potentially OOM-killing the container on limited deployment environments (e.g., free Render tier).
- **Zustand Persistence**: Only `cart` and `settings` are persisted. If the user refreshes, `quotes` and `orders` require a network roundtrip to Firebase, which may cause a brief loading flicker.
- *TODO: Needs verification on exact error handling behavior when the Bambu Studio CLI fails gracefully vs hard crash.*
