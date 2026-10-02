# Optional data APIs

The current app remains local-first and makes no external data API calls. This brief answers the request to find practical APIs for future integrations.

| Provider                                                                                                                          | Useful data                                                                                                                                            | Access                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| [Sound Transit / OneBusAway](https://www.soundtransit.org/help-contacts/business-information/open-transit-data-otd/otd-downloads) | Seattle/Puget Sound schedules and real-time arrivals; includes Sound Transit's 1 Line, 2 Line, T Line and ST Express coverage                          | Open data; real-time API key requested from Sound Transit. Direct agency GTFS schedules are also downloadable.                  |
| [openrouteservice](https://openrouteservice.org/services/)                                                                        | Walking/driving routes and time-distance estimates                                                                                                     | [Free standard plan with limits](https://account.heigit.org/info/plans); [API key required](https://api.openrouteservice.org/). |
| [Google Routes](https://developers.google.com/maps/documentation/routes/transit-route)                                            | Transit routes with an `arrivalTime` query, alternatives, stops, and departure/arrival details; traffic-aware driving estimates through the Routes API | API key and billing setup; [pay-as-you-go pricing](https://developers.google.com/maps/documentation/routes/usage-and-billing).  |

**Recommended first experiment:** Sound Transit data plus openrouteservice. Start with actual agency schedules, retain user-entered uncertainty/buffers, and clearly timestamp imported data.

A useful no-key source is Sound Transit's [public JSON service-alert feed](https://s3.amazonaws.com/st-service-alerts-prod/alerts_pb.json), linked by the agency. It can supply disruption notices; it is not a route planner or live arrival predictor. Agency-specific GTFS downloads are preferable to the consolidated Puget Sound feed, which Sound Transit says will be decommissioned at the end of 2026.

Optional online imports should be explicit, show provider and retrieval time, validate their inputs, and preserve a usable offline snapshot. Route estimates and service predictions do not establish security-queue or whole-journey confidence. Keep those assumptions editable and clearly separate from imported observations.

No accounts, credentials, provider calls requiring a key, paid services, or live integrations were configured for this research. Official documentation and the publicly accessible alert feed were inspected.
