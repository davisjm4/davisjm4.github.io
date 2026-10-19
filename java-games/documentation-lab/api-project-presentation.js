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

// Curated source-field choices for audited hand-offs. This instructional metadata
// is separate from the verified API definitions; every path below must exist in
// the corresponding endpoint responseFields list.
export const RESPONSE_SOURCE_CHOICES = {
  "spotify-session-rewind-saver": {
    "spotify.get-recently-played": {
      uris: [
        { path: "items[].track.uri", label: "Each track's Spotify URI", explanation: "A Spotify URI can identify a track when adding it to a playlist." },
        { path: "items[].track.name", label: "Each track's display name", explanation: "Names help people recognize tracks but do not identify them to the API." },
        { path: "items[].track.id", label: "Each track's Spotify ID", explanation: "An ID identifies a track, but this setting expects Spotify URIs." },
        { path: "items[].played_at", label: "When each track was played", explanation: "This can preserve order, but it is not a track reference." },
      ],
    },
    "spotify.create-playlist": {
      playlist_id: [
        { path: "id", label: "The newly created playlist's ID", explanation: "This identifies the playlist for the next request." },
        { path: "uri", label: "The playlist's Spotify URI", explanation: "This identifies the playlist in Spotify's URI format." },
        { path: "name", label: "The playlist's display name", explanation: "A name is readable but does not identify the resource." },
      ],
    },
  },
  "youtube-study-mix-copier": {
    "youtube.playlistitems-list": {
      snippet: [
        { path: "items[].contentDetails.videoId", label: "Each playlist video's ID", explanation: "This identifies the video resource to place in the copied playlist." },
        { path: "items[].snippet.title", label: "Each video's title", explanation: "A title describes a video but is not its resource identifier." },
        { path: "items[].contentDetails.videoPublishedAt", label: "When each video was published", explanation: "A date is information about a video, not the video reference." },
      ],
    },
    "youtube.playlists-insert": {
      snippet: [
        { path: "id", label: "The new playlist's ID", explanation: "The item must be added to the playlist created by the earlier request." },
        { path: "snippet.title", label: "The new playlist's title", explanation: "The title names the playlist but does not identify it." },
        { path: "status.privacyStatus", label: "The playlist's privacy setting", explanation: "This describes who can view the playlist, not which playlist to update." },
      ],
    },
  },
  "youtube-book-review-leaderboard": {
    "youtube.search-list": {
      id: [
        { path: "items[].id.videoId", label: "Each matching video's ID", explanation: "The details request needs video identifiers for its lookup." },
        { path: "items[].id.channelId", label: "The channel that published each result", explanation: "This identifies a channel rather than the video." },
        { path: "items[].snippet.title", label: "Each result's title", explanation: "Titles describe results but are not video identifiers." },
        { path: "nextPageToken", label: "The token for another page of results", explanation: "This helps continue the search, not look up video details." },
      ],
    },
  },
  "discord-my-servers-dashboard": {
    "discord.get-current-user-guilds": {
      guild_id: [
        { path: "[].id", label: "The selected server's ID", explanation: "The next request needs to identify the server the student selected." },
        { path: "[].name", label: "The server's display name", explanation: "A name helps identify it to a person but is not its API ID." },
        { path: "[].icon", label: "The server's icon identifier", explanation: "This identifies an image asset, not the server." },
      ],
    },
  },
  "discord-event-volunteer-desk": {
    "discord.search-guild-members": {
      user_id: [
        { path: "[].user.id", label: "Each matching member's user ID", explanation: "The role request needs the selected person's identifier." },
        { path: "[].user.username", label: "Each member's username", explanation: "A username is readable account information, not the user ID." },
        { path: "[].nick", label: "Each member's server nickname", explanation: "A nickname is specific to the server and does not identify the user account." },
      ],
    },
  },
  "tiktok-club-recap-publisher": {
    "tiktok.direct-post-video-init": {
      publish_id: [
        { path: "data.publish_id", label: "The post's publishing ID", explanation: "The status request uses this identifier to check the submitted post." },
        { path: "data.upload_url", label: "The destination for uploading a video file", explanation: "This appears for the file-upload flow, not the URL-based flow in this project." },
        { path: "error.code", label: "The result code for the request", explanation: "This reports whether the request succeeded; it does not identify the post." },
      ],
    },
  },
  "openai-reading-packet-qa": {
    "openai.upload-file": {
      input: [
        { path: "id", label: "The uploaded packet's file ID", explanation: "The later request refers to the uploaded file using its ID." },
        { path: "filename", label: "The uploaded packet's filename", explanation: "A filename is useful to a person but is not the API's file reference." },
        { path: "purpose", label: "The file's intended purpose", explanation: "This describes how the file is used, not which file to read." },
      ],
    },
  },
  "openai-textbook-photo-flashcards": {
    "openai.upload-file": {
      input: [
        { path: "id", label: "The uploaded page image's file ID", explanation: "A later request can refer to the uploaded image by its file ID." },
        { path: "filename", label: "The uploaded image's filename", explanation: "A filename is descriptive but is not the API's file reference." },
        { path: "bytes", label: "The image file's size", explanation: "Size describes the file but does not identify it." },
      ],
    },
  },
};
export const PROJECT_PRESENTATION = {
  "spotify-session-rewind-saver": {
    "spotify.get-recently-played": { assessed: ["limit"], numericOptions: { limit: [10, 20, 30, 50] } },
    "spotify.create-playlist": { assessed: ["public"], automatic: { name: fixed("Study Session Rewind", "Playlist name specified by the project") } },
  },
  "discord-event-volunteer-desk": {
    "discord.search-guild-members": { assessed: ["limit"], numericOptions: { limit: [5, 10, 20] }, automatic: { guild_id: runtime, query: runtime } },
    "discord.add-guild-member-role": { automatic: { guild_id: runtime, role_id: runtime } },
  },
  "tiktok-club-recap-publisher": {
    "tiktok.direct-post-video-init": {
      assessed: ["post_info"],
      nestedChoices: { post_info: { "privacy_level": ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"] } },
      automatic: {
        "post_info.title": runtime,
        "post_info.brand_content_toggle": fixed(false, "The project does not describe a paid brand promotion"),
        "source_info.source": fixed("PULL_FROM_URL", "The public video URL uses TikTok's documented verified-domain flow"),
        "source_info.video_url": runtime,
      },
    },
  },
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
    "youtube.playlistitems-list": { assessed: ["part", "playlistId", "maxResults"], partOptions: ["snippet", "contentDetails", "status"], fields: ["items[].snippet.title", "items[].snippet.thumbnails.default.url", "items[].contentDetails.videoPublishedAt", "items[].contentDetails.videoId"] },
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
    "maps.routes-compute-routes": { assessed: ["X-Goog-FieldMask", "origin", "destination", "travelMode", "units"], originOptions: { address: { address: "4210 Example Blvd, Las Vegas, NV 89109" }, coordinates: { location: { latLng: { latitude: 36.118, longitude: -115.172 } } } }, fieldOptions: ["routes.distanceMeters", "routes.duration", "routes.localizedValues", "routes.warnings", "routes.polyline", "routes.legs"], fields: ["routes[].distanceMeters", "routes[].duration", "routes[].localizedValues.distance.text", "routes[].localizedValues.duration.text", "routes[].warnings"] },
    "maps.geocoding-geocode": { automatic: { address: fixed("4210 Example Blvd, Las Vegas, NV 89109", "Hotel address supplied in the project") }, fields: ["results[].geometry.location.lat", "results[].geometry.location.lng", "results[].formatted_address"] },
    "maps.directions-legacy": { fields: ["routes[].legs[].distance.text", "routes[].legs[].duration.text", "status"] },
  },
};

export function presentation(scenario, endpoint) {
  const config = PROJECT_PRESENTATION[scenario.id]?.[endpoint.id] || { assessed: [], automatic: {} };
  const sourceChoices = RESPONSE_SOURCE_CHOICES[scenario.id]?.[endpoint.id];
  const complete = sourceChoices ? { ...config, sourceChoices } : config;
  return complete.fields || !COMMON_FIELDS[endpoint.id] ? complete : { ...complete, fields: COMMON_FIELDS[endpoint.id] };
}
export function classification(scenario, endpoint) {
  const config = presentation(scenario, endpoint), assessed = [...(config.assessed || [])], automatic = Object.keys(config.automatic || {}).map((name) => name.split(".")[0]);
  const containsSource = (value) => {
    if (value && typeof value === "object") {
      if (Object.hasOwn(value, "$fromStep")) return true;
      return Object.values(value).some(containsSource);
    }
    if (Array.isArray(value)) return value.some(containsSource);
    return false;
  };
  for (const plan of scenario.acceptedPlans || []) for (const step of plan.steps || []) {
    if (step.endpointId !== endpoint.id) continue;
    for (const [name, value] of Object.entries(step.parameters || {})) if (containsSource(value) && !assessed.includes(name)) assessed.push(name);
  }
  return { assessed, automatic: [...new Set(automatic)], hidden: endpoint.parameters.map((p) => p.name).filter((name) => !assessed.includes(name) && !automatic.includes(name)) };
}
export function automaticParameters(scenario, endpoint) {
  const result = {};
  const acceptedValue = (path) => {
    for (const plan of scenario.acceptedPlans || []) for (const step of plan.steps || []) {
      if (step.endpointId !== endpoint.id) continue;
      let value = step.parameters;
      for (const key of path.split(".")) value = value?.[key];
      if (value !== undefined) return structuredClone(value);
    }
    return undefined;
  };
  for (const [root, fields] of Object.entries(presentation(scenario, endpoint).nestedChoices || {})) {
    const seed = acceptedValue(root);
    if (seed === undefined) continue;
    result[root] = seed;
    for (const path of Object.keys(fields)) {
      const keys = path.split("."); let node = result[root];
      for (const key of keys.slice(0, -1)) node = node[key] ||= {};
      node[keys.at(-1)] = "";
    }
  }
  for (const [path, spec] of Object.entries(presentation(scenario, endpoint).automatic || {})) {
    const value = spec.kind === "runtime" ? (path.includes(".") ? acceptedValue(path) || { $runtime: true } : { $runtime: true }) : structuredClone(spec.value);
    const keys = path.split("."); let node = result;
    for (const key of keys.slice(0, -1)) node = node[key] ||= {};
    node[keys.at(-1)] = value;
  }
  // Every required single-valued documented setting is technical, not a student decision.
  for (const p of endpoint.parameters) if (p.required && p.allowedValues?.length === 1 && !Object.hasOwn(result, p.name) && !(presentation(scenario, endpoint).assessed || []).includes(p.name)) result[p.name] = p.allowedValues[0];
  return result;
}
