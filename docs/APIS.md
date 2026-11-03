# Optional data APIs

The app makes no external data API calls. These are candidates for a future import experiment, subject to the [roadmap's evidence requirement](../ROADMAP.md#first-release-and-evidence).

- [Sound Transit agency feeds](https://www.soundtransit.org/help-contacts/business-information/open-transit-data-otd/otd-downloads): schedules, trip updates, vehicle positions and service alerts for the Seattle/Puget Sound example. Start with individual agency GTFS schedules; the consolidated regional feed is scheduled for decommissioning at the end of 2026. The agency also links a [public JSON alert feed](https://s3.amazonaws.com/st-service-alerts-prod/alerts_pb.json). Alerts describe disruptions, not complete routes or whole-journey predictions.
- [openrouteservice backend documentation](https://giscience.github.io/openrouteservice/): a walking/driving route-estimate candidate. The [hosted API](https://api.openrouteservice.org/) requires an API key; check current access limits before choosing it.
- [Google Routes transit documentation](https://developers.google.com/maps/documentation/routes/transit-route): arrival-time queries and transit details. [Billing and authentication](https://developers.google.com/maps/documentation/routes/usage-and-billing) are required; assess cost and provider terms before integrating.

If an experiment is warranted, start with agency schedules plus walking/driving estimates. Imports should be explicit, validate inputs, show provider, retrieval time and stale state, and preserve a usable offline snapshot. Keep user-entered uncertainty and buffers editable: route estimates do not establish security-queue or whole-journey confidence.
