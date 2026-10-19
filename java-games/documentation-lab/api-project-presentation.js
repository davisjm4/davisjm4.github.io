// Learning-focused presentation metadata. This is deliberately separate from the verified API library.
// An assessed parameter is never seeded. Automatic values are application inputs or documented
// technical settings; hidden parameters are optional and omitted from the request entirely.
const runtime = { kind: "runtime" };
const supplied = (reason) => ({ kind: "runtime", reason });
const fixed = (value, reason) => ({ kind: "fixed", value, reason });
const accepted = (reason) => ({ kind: "accepted", reason });
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

// Instructional difficulty is maintained as presentation metadata; API research,
// accepted plans, and grading data remain untouched.
const BEGINNER_SCENARIOS = new Set([
  "spotify-monthly-recap", "spotify-concert-alert-wall", "spotify-club-now-playing",
  "youtube-gaming-trend-wall", "youtube-media-club-playlist-shelf",
  "maps-class-dinner-checklist", "maps-late-start-bus-check",
  "discord-study-hall-catch-up", "discord-pinned-resources-board", "discord-club-channel-directory",
  "openai-flashcard-similarity-index",
]);
const ADVANCED_SCENARIOS = new Set([
  "spotify-session-rewind-saver", "youtube-video-compare",
  "maps-museum-walk-planner", "maps-venue-distance-board",
  "tiktok-club-recap-publisher", "openai-discussion-board-safety",
]);
const INTERMEDIATE_SCENARIOS = new Set([
  "spotify-album-spotlight", "spotify-my-playlists-browser",
  "youtube-channel-hub", "youtube-study-video-finder", "youtube-subscription-swap",
  "maps-lunch-spot-finder", "maps-saved-place-card", "maps-trip-destination-picker",
  "discord-my-servers-dashboard", "discord-event-volunteer-desk", "discord-weekly-club-announcements",
  "tiktok-creator-portfolio-header", "tiktok-featured-reel-showcase", "tiktok-spotlight-embed-choice",
  "openai-reading-quiz-builder", "openai-reading-packet-qa", "openai-lecture-recap", "openai-private-essay-feedback", "openai-lab-photo-explainer",
]);
export const SCENARIO_DIFFICULTY = Object.freeze(Object.fromEntries([
  ...[...BEGINNER_SCENARIOS].map((id) => [id, "beginner"]),
  ...[...INTERMEDIATE_SCENARIOS].map((id) => [id, "intermediate"]),
  ...[...ADVANCED_SCENARIOS].map((id) => [id, "advanced"]),
]));
export function scenarioDifficulty(scenario) {
  return SCENARIO_DIFFICULTY[scenario?.id] || "intermediate";
}

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
        { path: "id", label: "The uploaded page image's file ID", explanation: "A later request can refer to the image by its file ID." },
        { path: "filename", label: "The uploaded image's filename", explanation: "A filename describes the file but does not identify it to the API." },
        { path: "bytes", label: "The image file's size", explanation: "Size describes the file but is not the reference used by the later request." },
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
  "openai-reading-quiz-builder": {
    "openai.create-response": { automatic: {
      model: fixed("gpt-6-astra", "The app uses a model documented for Structured Outputs."),
      instructions: accepted("The app supplies the instruction to create four quiz questions in the required format."),
      input: accepted("The passage is supplied from the text the student pasted into the app."),
      text: accepted("The app supplies the JSON schema its screen needs; students do not construct the schema."),
    } },
    "openai.create-chat-completion": { automatic: {
      model: fixed("gpt-6-astra", "The app uses a model documented for Structured Outputs."),
      messages: accepted("The app places its quiz-generation instruction and the student's passage into the conversation."),
      response_format: accepted("The app supplies the JSON schema its screen needs; students do not construct the schema."),
    } },
  },
  "openai-reading-packet-qa": {
    "openai.upload-file": { automatic: {
      file: accepted("The teacher's selected reading packet is supplied as a simulated file."),
      purpose: fixed("user_data", "The reusable reading packet is uploaded for model input."),
    } },
    "openai.create-response": { automatic: {
      model: fixed("gpt-6-astra", "The app uses a model that accepts PDF input."),
      input: accepted("The app combines the teacher's question with the file ID returned by the upload step."),
    } },
  },
  "openai-lecture-recap": {
    "openai.create-transcription": { automatic: {
      file: accepted("The teacher's uploaded lecture recording is supplied as a simulated file."),
      model: fixed("gpt-transcribe", "The app selects the documented transcription model for recorded speech."),
      response_format: fixed("json", "The app requests the transcript in a format with a text field for the next step."),
    } },
    "openai.create-response": { automatic: {
      model: fixed("gpt-6-astra", "The app selects a text-generation model for the recap."),
      instructions: accepted("The app supplies its five-bullet recap instruction."),
      input: accepted("The transcript from the transcription step becomes the recap input."),
    } },
    "openai.create-chat-completion": { automatic: {
      model: fixed("gpt-6-astra", "The app selects a text-generation model for the recap."),
      messages: accepted("The app places its recap instruction and the transcript from the earlier step into the conversation."),
    } },
  },
  "openai-private-essay-feedback": {
    "openai.create-response": { automatic: {
      model: fixed("gpt-6-astra", "The app uses a model that accepts PDF input."),
      instructions: accepted("The app supplies its feedback instructions; student writing stays in the simulated application input."),
      input: accepted("The student's selected essay is represented as simulated inline file data."),
      store: fixed(false, "The app follows the project's data-retention requirement."),
    } },
    "openai.create-chat-completion": { automatic: {
      model: fixed("gpt-6-astra", "The app uses a model that accepts PDF input."),
      messages: accepted("The app supplies feedback instructions and the simulated essay file input."),
      store: fixed(false, "The app follows the project's data-retention requirement."),
    } },
  },
  "openai-discussion-board-safety": {
    "openai.create-moderation": { automatic: {
      model: fixed("omni-moderation-latest", "The app uses the documented moderation operation for its text-and-image safety check."),
      input: accepted("The student's post text and optional image are supplied as simulated board content."),
    } },
    "openai.create-response": { automatic: {
      model: fixed("gpt-6-astra", "The app uses a model documented for image input and Structured Outputs."),
      instructions: accepted("The app supplies its classification instruction for the separate response-based approach."),
      input: accepted("The simulated post text and image are provided to the response operation."),
      text: accepted("The app supplies the structured flags its board workflow reads."),
    } },
    "openai.create-chat-completion": { automatic: {
      model: fixed("gpt-6-astra", "The app uses a model documented for image input and Structured Outputs."),
      messages: accepted("The app supplies its classification instruction and simulated post content."),
      response_format: accepted("The app supplies the structured flags its board workflow reads."),
    } },
  },
  "openai-lab-photo-explainer": {
    "openai.create-response": { automatic: {
      model: fixed("gpt-6-astra", "The app selects a model documented for image input."),
      instructions: accepted("The app supplies its tutoring instruction; the student supplies a question and lab photo."),
      input: accepted("The app combines the student's question with the simulated lab photo."),
    } },
    "openai.create-chat-completion": { automatic: {
      model: fixed("gpt-6-astra", "The app selects a model documented for image input."),
      messages: accepted("The app supplies its tutoring instruction, the student's question, and the simulated lab photo."),
    } },
  },
  "openai-flashcard-similarity-index": {
    "openai.create-embeddings": { automatic: {
      input: supplied("The app supplies all card texts from the saved deck as one batch."),
      model: fixed("text-embedding-3-small", "The app selects a documented embedding model; students do not need to memorize model IDs."),
    } },
  },
  "spotify-session-rewind-saver": {
    "spotify.get-recently-played": { assessed: ["limit"], numericOptions: { limit: [10, 20, 30, 50] } },
    "spotify.create-playlist": { assessed: ["public"], automatic: { name: fixed("Study Session Rewind", "Playlist name specified by the project") } },
  },
  "spotify-concert-alert-wall": {
    "spotify.get-followed-artists": { automatic: {
      type: fixed("artist", "The screen lists followed artists, not other resource types"),
      limit: fixed(50, "The project specifies a first page of up to 50 artists"),
    } },
  },
  "spotify-club-now-playing": {
    "spotify.get-currently-playing": { automatic: { additional_types: fixed("track,episode", "The screen supports both songs and podcast episodes") } },
    "spotify.get-playback-state": { automatic: { additional_types: fixed("track,episode", "The device picker supports both songs and podcast episodes") } },
  },
  "discord-event-volunteer-desk": {
    "discord.search-guild-members": { assessed: ["limit"], numericOptions: { limit: [5, 10, 20] }, automatic: { guild_id: runtime, query: runtime } },
    "discord.add-guild-member-role": { automatic: { guild_id: runtime, role_id: runtime } },
  },
  "discord-study-hall-catch-up": {
    "discord.get-channel-messages": { automatic: { limit: fixed(100, "The project displays a batch of up to 100 unread messages") } },
  },
  "discord-weekly-club-announcements": {
    "discord.create-message": { automatic: { embeds: accepted("The app builds the configured announcement card from the officer's update") } },
    "discord.execute-webhook": { automatic: {
      wait: fixed(true, "The app needs the created message response so it can save its ID"),
      embeds: accepted("The app builds the configured announcement card from the officer's update"),
    } },
  },
  "discord-pinned-resources-board": {
    "discord.get-channel-pins": { automatic: { limit: fixed(20, "The panel displays the 20 most recently pinned messages") } },
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
  "tiktok-creator-portfolio-header": {
    "tiktok.get-user-info": {
      assessed: ["fields"],
      multiPrompt: { fields: "Which creator information should the app request?" },
      multiOptions: { fields: [
        { value: "open_id", label: "TikTok account ID", description: "Identifies the signed-in account within this app." },
        { value: "union_id", label: "Developer-wide account ID", description: "Identifies the account across apps from the same developer." },
        { value: "display_name", label: "Creator's profile name", description: "The name displayed at the top of the portfolio." },
        { value: "avatar_url", label: "Profile image URL", description: "The standard-size image address for the creator's profile picture." },
        { value: "follower_count", label: "Followers", description: "The number of accounts following this creator." },
        { value: "following_count", label: "Following", description: "The number of accounts this creator follows." },
        { value: "likes_count", label: "Likes received", description: "The total likes received across the creator's videos." },
        { value: "video_count", label: "Public video count", description: "The number of videos the creator has publicly posted." },
      ] },
    },
  },
  "tiktok-featured-reel-showcase": {
    "tiktok.query-videos": {
      assessed: ["fields"],
      multiPrompt: { fields: "Which video information should the showcase request?" },
      multiOptions: { fields: [
        { value: "id", label: "Video identifier", description: "Helps the app match returned records to its saved selections." },
        { value: "cover_image_url", label: "Cover image address", description: "The current CDN address for the video's cover image; these links expire." },
        { value: "title", label: "Video title", description: "The title attached to the video." },
        { value: "like_count", label: "Likes", description: "The current number of likes on the video." },
        { value: "embed_link", label: "Embedded-player link", description: "A link that can open the video in an embedded view." },
        { value: "view_count", label: "Views", description: "The number of times the video has been viewed." },
        { value: "share_count", label: "Shares", description: "The number of times the video has been shared." },
      ] },
      automatic: { filters: fixed({ video_ids: { $runtime: "featuredVideoIds" } }, "The app looks up the video IDs the creator previously selected (up to six).") },
    },
  },
  "tiktok-spotlight-embed-choice": {
    "tiktok.oembed": {
      automatic: { url: fixed({ $runtime: "spotlightShareUrl" }, "The app uses the share link saved when the creator chose the spotlight video.") },
    },
    "tiktok.query-videos": {
      assessed: ["fields"],
      multiPrompt: { fields: "If using Query Videos, which information should the page request?" },
      multiOptions: { fields: [
        { value: "id", label: "Video identifier", description: "The ID of the video returned by the lookup." },
        { value: "embed_html", label: "Player markup", description: "HTML that can place the video player on the page." },
        { value: "title", label: "Video title", description: "The title associated with the selected video." },
        { value: "cover_image_url", label: "Cover image address", description: "The video's cover image URL; this link expires after six hours." },
        { value: "share_url", label: "Share link", description: "The link someone can use to share the video." },
        { value: "duration", label: "Video length", description: "The video's duration in seconds." },
        { value: "view_count", label: "Views", description: "The number of times the video has been viewed." },
      ] },
      automatic: { filters: fixed({ video_ids: [{ $runtime: "spotlightVideoId" }] }, "The app uses the video ID saved when the creator selected the spotlight.") },
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
  "youtube-gaming-trend-wall": {
    "youtube.videos-list": { assessed: ["part"], automatic: { chart: fixed("mostPopular", "The project asks for what is popular right now"), regionCode: fixed("US", "The project follows the United States chart"), videoCategoryId: runtime }, partOptions: ["snippet", "statistics", "contentDetails", "status"], fields: ["items[].snippet.title", "items[].snippet.channelTitle", "items[].snippet.thumbnails.default.url", "items[].statistics.viewCount"] },
  },
  "youtube-subscription-swap": {
    "youtube.subscriptions-list": { assessed: ["mine", "channelId"], automatic: { part: fixed("snippet", "The shelves display each subscribed channel's name and picture"), order: fixed("alphabetical", "Both shelves are specified to be alphabetical"), maxResults: fixed(50, "The project specifies up to 50 channels per shelf") } },
  },
  "youtube-media-club-playlist-shelf": {
    "youtube.playlists-list": { assessed: ["part"], automatic: { channelId: runtime, maxResults: fixed(25, "The shelf displays up to 25 playlists as specified") }, partOptions: ["snippet", "contentDetails", "status", "player"], fields: ["items[].snippet.title", "items[].snippet.thumbnails.default.url", "items[].contentDetails.itemCount", "items[].id"] },
  },
  "maps-lunch-spot-finder": {
    "maps.places-nearby-search": { assessed: ["X-Goog-FieldMask", "maxResultCount", "rankPreference", "locationRestriction"], automatic: { includedTypes: fixed(["restaurant"], "Restaurant category specified by the project"), "locationRestriction.circle.center": fixed({ latitude: 36.1699, longitude: -115.1398 }, "Device GPS supplied by the application") }, fieldOptions: ["places.id", "places.displayName", "places.formattedAddress", "places.location", "places.rating", "places.currentOpeningHours", "places.regularOpeningHours", "places.priceLevel", "places.photos"], fields: ["places[].id", "places[].displayName", "places[].formattedAddress", "places[].location", "places[].rating", "places[].currentOpeningHours.openNow", "places[].regularOpeningHours.openNow", "places[].priceLevel"] },
  },
  "maps-class-dinner-checklist": {
    "maps.places-details": { assessed: ["X-Goog-FieldMask"], automatic: { placeId: supplied("The app uses the restaurant selected on the map") }, fieldOptions: ["displayName", "businessStatus", "priceLevel", "servesVegetarianFood", "rating", "userRatingCount", "formattedAddress", "currentOpeningHours", "regularOpeningHours"], fields: ["displayName", "businessStatus", "priceLevel", "servesVegetarianFood", "rating", "userRatingCount", "formattedAddress", "currentOpeningHours.openNow", "regularOpeningHours.openNow"] },
  },
  "maps-trip-destination-picker": {
    "maps.places-autocomplete": { assessed: ["includedRegionCodes"], automatic: { input: supplied("The app searches with the partial text currently typed in the destination box"), sessionToken: supplied("The app creates and reuses a session token while the student types"), locationBias: fixed({ circle: { center: { $runtime: true }, radius: 50000 } }, "The app biases suggestions toward the school's configured location") }, arrayOptions: { includedRegionCodes: [{ value: ["us"], label: "United States only", description: "Restricts suggestions to places in the United States." }, { value: ["ca"], label: "Canada only", description: "Restricts suggestions to places in Canada." }, { value: [], label: "No country restriction", description: "Allows suggestions from any region." }] } },
    "maps.places-details": { assessed: ["X-Goog-FieldMask"], automatic: { placeId: supplied("The app uses the place suggestion selected by the student"), sessionToken: supplied("The app reuses the autocomplete session token to finish the search session") }, fieldOptions: ["displayName", "formattedAddress", "location", "websiteUri", "rating", "googleMapsUri", "currentOpeningHours"], fields: ["displayName", "formattedAddress", "location", "websiteUri", "rating", "googleMapsUri", "currentOpeningHours.openNow"] },
  },
  "maps-venue-distance-board": {
    "maps.routes-compute-route-matrix": { automatic: { "X-Goog-FieldMask": fixed("destinationIndex,status,condition,distanceMeters,duration,localizedValues", "The board needs to match each result to a venue, handle missing routes, and display distance and time"), origins: supplied("The school and three adviser-selected venue locations are configured by the app"), destinations: supplied("The three adviser-selected venues are supplied by the app"), travelMode: fixed("WALK", "The project compares walking routes"), units: fixed("IMPERIAL", "The board displays distances in miles") }, fields: ["[].destinationIndex", "[].status", "[].condition", "[].distanceMeters", "[].duration", "[].localizedValues.distance.text", "[].localizedValues.duration.text"] },
    "maps.routes-compute-routes": { automatic: { "X-Goog-FieldMask": fixed("routes.distanceMeters,routes.duration,routes.localizedValues", "The board displays each route's distance and time, without drawing route lines or directions"), origin: supplied("The school location is configured in the app"), destination: supplied("The venue is selected from the club's configured options"), travelMode: fixed("WALK", "The project compares walking routes"), units: fixed("IMPERIAL", "The board displays distances in miles") }, fields: ["routes[].distanceMeters", "routes[].duration", "routes[].localizedValues.distance.text", "routes[].localizedValues.duration.text"] },
  },
  "maps-late-start-bus-check": {
    "maps.routes-compute-route-matrix": { assessed: ["transitPreferences"], automatic: { "X-Goog-FieldMask": fixed("originIndex,status,condition,duration,localizedValues", "The app matches results to pickup points, detects unavailable routes, and displays travel time"), origins: supplied("The three pickup-point locations are configured in the app"), destinations: supplied("The school's location is configured in the app"), travelMode: fixed("TRANSIT", "The app uses transit routing for the bus schedule"), arrivalTime: supplied("The app computes 9:20 AM on the next late-start Wednesday") }, valueChoices: { transitPreferences: [{ value: { allowedTravelModes: ["BUS"] }, label: "City bus routes", explanation: "Only use the bus service covered by student passes." }, { value: { allowedTravelModes: ["BUS", "SUBWAY"] }, label: "Bus and subway routes", explanation: "Include subway connections as well as buses." }, { value: { allowedTravelModes: ["BUS", "TRAIN"] }, label: "Bus and train routes", explanation: "Include train connections as well as buses." }, { value: { allowedTravelModes: ["RAIL"] }, label: "Rail routes", explanation: "The documented RAIL value includes subway, train, and light rail." }] }, fields: ["[].originIndex", "[].status", "[].condition", "[].duration", "[].localizedValues.duration.text"] },
  },
  "maps-saved-place-card": {
    "maps.places-details": { assessed: ["X-Goog-FieldMask"], automatic: { placeId: runtime }, fieldOptions: ["displayName", "formattedAddress", "nationalPhoneNumber", "websiteUri", "regularOpeningHours", "currentOpeningHours", "photos", "rating", "googleMapsUri"], fields: ["displayName", "formattedAddress", "nationalPhoneNumber", "websiteUri", "regularOpeningHours.weekdayDescriptions", "currentOpeningHours.openNow", "photos[].name", "photos[].authorAttributions[].displayName", "rating"] },
    "maps.places-photo": { assessed: ["name"], automatic: { maxWidthPx: fixed(800, "Card image size chosen by the application"), skipHttpRedirect: fixed(true, "The app reads the photo response directly rather than following a browser redirect") }, fields: ["name", "photoUri"] },
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
  const symbolicize = (value) => {
    if (Array.isArray(value)) return value.map(symbolicize);
    if (value && typeof value === "object") {
      if (Object.hasOwn(value, "$runtime")) return { $runtime: true };
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, symbolicize(child)]));
    }
    return value;
  };
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
    const value = spec.kind === "runtime" ? (path.includes(".") ? acceptedValue(path) || { $runtime: true } : { $runtime: true })
      : spec.kind === "accepted" ? symbolicize(acceptedValue(path))
        : structuredClone(spec.value);
    if (value === undefined) continue;
    const keys = path.split("."); let node = result;
    for (const key of keys.slice(0, -1)) node = node[key] ||= {};
    node[keys.at(-1)] = value;
  }
  // Every required single-valued documented setting is technical, not a student decision.
  for (const p of endpoint.parameters) if (p.required && p.allowedValues?.length === 1 && !Object.hasOwn(result, p.name) && !(presentation(scenario, endpoint).assessed || []).includes(p.name)) result[p.name] = p.allowedValues[0];
  return result;
}

