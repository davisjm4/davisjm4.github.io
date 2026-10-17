// Learning-focused presentation metadata. This is deliberately separate from the verified API library.
// An assessed parameter is never seeded. Automatic values are application inputs or documented
// technical settings; hidden parameters are optional and omitted from the request entirely.
const runtime = { kind: "runtime" };
const fixed = (value, reason) => ({ kind: "fixed", value, reason });
const COMMON_FIELDS = {
  "spotify.get-album-tracks": ["items[].name", "items[].artists[].name", "items[].duration_ms", "items[].track_number", "total"],
  "spotify.get-artist": ["name", "images[].url", "genres", "followers"],
  "spotify.get-artist-albums": ["items[].name", "items[].release_date", "items[].artists[].name"],
  "spotify.get-track": ["name", "artists[].name", "album.images[].url", "duration_ms"],
  "spotify.search": ["tracks.items", "albums.items", "artists.items", "playlists.items"],
  "spotify.get-current-user-profile": ["id", "display_name", "images[].url"],
  "youtube.search-list": ["items[].id.videoId", "items[].snippet.title", "items[].snippet.thumbnails.default.url", "nextPageToken"],
  "youtube.videos-list": ["items[].snippet.title", "items[].contentDetails.duration", "items[].statistics.viewCount"],
  "youtube.channels-list": ["items[].snippet.title", "items[].statistics.subscriberCount", "items[].contentDetails.relatedPlaylists.uploads"],
  "youtube.playlistitems-list": ["items[].snippet.title", "items[].contentDetails.videoId", "items[].contentDetails.videoPublishedAt"],
  "maps.places-nearby-search": ["places[].id", "places[].displayName", "places[].formattedAddress", "places[].location", "places[].rating"],
  "maps.places-text-search": ["places[].id", "places[].displayName", "places[].formattedAddress", "places[].rating"],
  "maps.places-details": ["displayName", "formattedAddress", "photos[].name", "rating"],
};
export const PROJECT_PRESENTATION = {
  "spotify-album-spotlight": {
    "spotify.get-album": { assessed: ["market"], automatic: { id: runtime }, marketOptions: ["US", "GB", "CA"], fields: ["name", "images[].url", "release_date", "artists[].name", "tracks.items[].name", "tracks.items[].track_number", "tracks.items[].duration_ms", "tracks.total"] },
  },
  "spotify-my-playlists-browser": {
    "spotify.get-current-user-playlists": { automatic: { limit: fixed(20, "Initial playlist page size chosen by the application") }, fields: ["items[].id", "items[].name", "items[].images[].url", "items[].items.total", "items[].collaborative", "items[].owner.id"] },
    "spotify.get-playlist-items": { assessed: ["playlist_id"], automatic: { limit: fixed(50, "Song page size chosen by the application") }, fields: ["items[].added_at", "items[].item.name", "items[].item.artists[].name", "items[].item.album.images[].url", "items[].item.duration_ms"] },
    "spotify.get-playlist": { assessed: ["playlist_id"], fields: ["items.items[].added_at", "items.items[].item.name", "items.items[].item.artists[].name", "items.items[].item.album.images[].url", "items.items[].item.duration_ms"] },
  },
  "spotify-monthly-recap": {
    "spotify.get-user-top-items": { assessed: ["type", "time_range", "limit"], fields: ["items[].name", "items[].artists[].name", "items[].album.images[].url", "items[].popularity"] },
    "spotify.get-recently-played": { fields: ["items[].played_at", "items[].track.name", "items[].track.artists[].name"] },
  },
  "youtube-channel-hub": {
    "youtube.channels-list": { assessed: ["part"], automatic: { forHandle: runtime }, partOptions: ["snippet", "contentDetails", "statistics", "brandingSettings", "status"], fields: ["items[].id", "items[].snippet.title", "items[].snippet.thumbnails.default.url", "items[].statistics.subscriberCount", "items[].contentDetails.relatedPlaylists.uploads"] },
    "youtube.playlistitems-list": { assessed: ["part", "playlistId"], automatic: { maxResults: fixed(10, "The project asks for ten recent uploads") }, partOptions: ["snippet", "contentDetails", "status"], fields: ["items[].snippet.title", "items[].snippet.thumbnails.default.url", "items[].contentDetails.videoPublishedAt", "items[].contentDetails.videoId"] },
  },
  "youtube-video-compare": {
    "youtube.videos-list": { assessed: ["part"], automatic: { id: runtime }, partOptions: ["snippet", "contentDetails", "statistics", "status", "player"], fields: ["items[].snippet.title", "items[].snippet.channelTitle", "items[].contentDetails.duration", "items[].contentDetails.definition", "items[].statistics.viewCount", "items[].statistics.likeCount", "items[].statistics.commentCount"] },
  },
  "youtube-study-video-finder": {
    "youtube.search-list": { assessed: ["type", "videoDuration", "maxResults"], automatic: { part: fixed("snippet", "Only documented Search: list part"), q: runtime }, fields: ["items[].id.videoId", "items[].id.channelId", "items[].snippet.title", "items[].snippet.thumbnails.default.url", "items[].snippet.channelTitle", "nextPageToken"] },
    "youtube.videos-list": { assessed: ["part", "id"], partOptions: ["snippet", "contentDetails", "statistics", "status"], fields: ["items[].id", "items[].snippet.title", "items[].contentDetails.duration", "items[].statistics.viewCount"] },
  },
  "maps-lunch-spot-finder": {
    "maps.places-nearby-search": { assessed: ["X-Goog-FieldMask", "maxResultCount", "rankPreference", "locationRestriction"], automatic: { includedTypes: fixed(["restaurant"], "Restaurant category specified by the project"), "locationRestriction.circle.center": fixed({ latitude: 36.1699, longitude: -115.1398 }, "Device GPS supplied by the application") }, fieldOptions: ["places.id", "places.displayName", "places.formattedAddress", "places.location", "places.rating", "places.currentOpeningHours", "places.regularOpeningHours", "places.priceLevel", "places.photos"], fields: ["places[].id", "places[].displayName", "places[].formattedAddress", "places[].location", "places[].rating", "places[].currentOpeningHours.openNow", "places[].regularOpeningHours.openNow", "places[].priceLevel"] },
  },
  "maps-saved-place-card": {
    "maps.places-details": { assessed: ["X-Goog-FieldMask"], automatic: { placeId: runtime }, fieldOptions: ["displayName", "formattedAddress", "nationalPhoneNumber", "websiteUri", "regularOpeningHours", "currentOpeningHours", "photos", "rating", "googleMapsUri"], fields: ["displayName", "formattedAddress", "nationalPhoneNumber", "websiteUri", "regularOpeningHours.weekdayDescriptions", "currentOpeningHours.openNow", "photos[].name", "photos[].authorAttributions[].displayName", "rating"] },
    "maps.places-photo": { assessed: ["name"], automatic: { maxWidthPx: fixed(800, "Card image size chosen by the application") }, fields: ["name", "photoUri"] },
  },
  "maps-museum-walk-planner": {
    "maps.places-text-search": { assessed: ["X-Goog-FieldMask"], automatic: { textQuery: runtime, locationBias: fixed({ circle: { center: { latitude: 36.118, longitude: -115.172 }, radius: 5000 } }, "Hotel area supplied by the application") }, fieldOptions: ["places.id", "places.displayName", "places.formattedAddress", "places.rating", "places.location", "places.currentOpeningHours", "places.photos"], fields: ["places[].id", "places[].displayName", "places[].formattedAddress", "places[].rating", "places[].location"] },
    "maps.routes-compute-routes": { assessed: ["X-Goog-FieldMask", "origin", "destination", "travelMode"], automatic: { units: fixed("IMPERIAL", "The app displays distance in miles") }, fieldOptions: ["routes.distanceMeters", "routes.duration", "routes.localizedValues", "routes.warnings", "routes.polyline", "routes.legs"], fields: ["routes[].distanceMeters", "routes[].duration", "routes[].localizedValues.distance.text", "routes[].localizedValues.duration.text", "routes[].warnings"] },
    "maps.geocoding-geocode": { automatic: { address: fixed("4210 Example Blvd, Las Vegas, NV 89109", "Hotel address supplied in the project") }, fields: ["results[].geometry.location.lat", "results[].geometry.location.lng", "results[].formatted_address"] },
    "maps.directions-legacy": { fields: ["routes[].legs[].distance.text", "routes[].legs[].duration.text", "status"] },
  },
};

export function presentation(scenario, endpoint) {
  const existing = PROJECT_PRESENTATION[scenario.id]?.[endpoint.id];
  if (existing) return existing.fields || !COMMON_FIELDS[endpoint.id] ? existing : { ...existing, fields: COMMON_FIELDS[endpoint.id] };
  return derivedPresentation(scenario, endpoint);
}
export function classification(scenario, endpoint) {
  const config = presentation(scenario, endpoint), assessed = config.assessed || [], automatic = Object.keys(config.automatic || {}).map((name) => name.split(".")[0]);
  return { assessed, automatic: [...new Set(automatic)], hidden: endpoint.parameters.map((p) => p.name).filter((name) => !assessed.includes(name) && !automatic.includes(name)) };
}
export function automaticParameters(scenario, endpoint) {
  return automaticParametersForOccurrence(scenario, endpoint, 0);
}
export function automaticParametersForOccurrence(scenario, endpoint, occurrence = 0) {
  const result = {};
  const config = presentation(scenario, endpoint);
  const matchingSteps = scenario.acceptedPlans.flatMap((plan) => plan.steps.filter((step) => step.endpointId === endpoint.id));
  const templateStep = matchingSteps[occurrence] || matchingSteps[0];
  const assessed = new Set(config.assessed || []);
  for (const [path, spec] of Object.entries(config.automatic || {})) {
    const value = spec.kind === "runtime" ? { $runtime: true } : structuredClone(spec.value);
    const keys = path.split("."); let node = result;
    for (const key of keys.slice(0, -1)) node = node[key] ||= {};
    node[keys.at(-1)] = value;
  }
  for (const [name, value] of Object.entries(templateStep?.parameters || {})) {
    const assessment = templateStep.assessment?.[name];
    if (assessed.has(name) && assessment?.mode !== "notAssessed") continue;
    if (containsRuntime(value)) result[name] = replaceRuntimeMarkers(value);
    else if (containsStepReference(value)) continue;
    else if (!Object.hasOwn(result, name)) result[name] = structuredClone(value);
  }
  // Every required single-valued documented setting is technical, not a student decision.
  for (const p of endpoint.parameters) if (p.required && p.allowedValues?.length === 1 && !Object.hasOwn(result, p.name) && !assessed.has(p.name)) result[p.name] = p.allowedValues[0];
  return result;
}

const containsRuntime = (value) => {
  if (value && typeof value === "object") return Object.hasOwn(value, "$runtime") || Object.values(value).some(containsRuntime);
  return Array.isArray(value) ? value.some(containsRuntime) : false;
};
const containsStepReference = (value) => {
  if (value && typeof value === "object") return Object.hasOwn(value, "$fromStep") || Object.values(value).some(containsStepReference);
  return Array.isArray(value) ? value.some(containsStepReference) : false;
};
const replaceRuntimeMarkers = (value) => {
  if (Array.isArray(value)) return value.map(replaceRuntimeMarkers);
  if (value && typeof value === "object") {
    if (Object.hasOwn(value, "$runtime")) return { $runtime: true };
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replaceRuntimeMarkers(child)]));
  }
  return value;
};

/* New scenarios carry their assessment decisions in the verified plan itself.
   Deriving presentation metadata here keeps the researched library unchanged and
   gives the shared renderer a focused, reusable student-facing view. */
function derivedPresentation(scenario, endpoint) {
  const steps = scenario.acceptedPlans.flatMap((plan) => plan.steps.filter((step) => step.endpointId === endpoint.id));
  const assessed = new Set(), automatic = {}, fieldOptions = new Set(), choiceOptions = {}, multiOptions = {};
  const valuesByName = new Map();
  for (const step of steps) {
    for (const [name, value] of Object.entries(step.parameters || {})) {
      const assessment = step.assessment?.[name];
      const values = valuesByName.get(name) || [];
      values.push({ value, assessment });
      valuesByName.set(name, values);
      if (assessment && assessment.mode !== "notAssessed") assessed.add(name);
      else if (containsStepReference(value)) assessed.add(name);
    }
  }
  for (const parameter of endpoint.parameters) {
    const values = valuesByName.get(parameter.name) || [];
    const assessment = values.map((entry) => entry.assessment).find(Boolean);
    const distinct = new Set(values.filter((entry) => !containsRuntime(entry.value) && !containsStepReference(entry.value)).map((entry) => JSON.stringify(entry.value)));
    if (assessment?.mode === "includesAll") {
      const requested = (assessment.values || []).flatMap((value) => Array.isArray(value) ? value : [value]);
      multiOptions[parameter.name] = [...new Set([...(parameter.allowedValues || []), ...requested])];
    } else if (assessment?.mode === "oneOf") {
      choiceOptions[parameter.name] = assessment.values || [];
    }
    if (assessment?.mode === "notAssessed" && values.length === steps.length) {
      const sample = values.find((entry) => entry.value !== undefined)?.value;
      if (sample !== undefined && !containsStepReference(sample)) automatic[parameter.name] = containsRuntime(sample) ? { kind: "runtime" } : { kind: "fixed", value: replaceRuntimeMarkers(sample), reason: assessment.note || "Handled by the application" };
    } else if (assessed.has(parameter.name)) {
      if (parameter.name === "X-Goog-FieldMask" || parameter.name.toLowerCase() === "fields") {
        for (const entry of values) for (const field of String(entry.value || "").split(",").map((item) => item.trim()).filter(Boolean)) fieldOptions.add(field);
      }
    } else if (values.length > 0 && values.length === steps.length && distinct.size <= 1) {
      const sample = values[0].value;
      if (containsRuntime(sample)) automatic[parameter.name] = { kind: "runtime" };
      else if (!containsStepReference(sample)) automatic[parameter.name] = { kind: "fixed", value: structuredClone(sample), reason: "Required documented setting supplied by the application" };
    } else if (values.length === steps.length && values.every((entry) => containsRuntime(entry.value))) {
      automatic[parameter.name] = { kind: "runtime" };
    }
  }
  const fields = new Set();
  for (const step of steps) for (const [name, value] of Object.entries(step.parameters || {})) if (name === "X-Goog-FieldMask" || name.toLowerCase() === "fields") String(value || "").split(",").map((item) => item.trim()).filter(Boolean).forEach((field) => fields.add(field));
  return { assessed: [...assessed], automatic, fields: fields.size ? [...fields] : undefined, fieldOptions: fieldOptions.size ? [...fieldOptions] : undefined, choiceOptions: Object.keys(choiceOptions).length ? choiceOptions : undefined, multiOptions: Object.keys(multiOptions).length ? multiOptions : undefined };
}
