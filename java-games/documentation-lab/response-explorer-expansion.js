/* A bounded, authored expansion of Response Explorer. Each family defines one
   reasoning model and three verified instantiations over existing API samples.
   This is content compilation, not random question generation. */
import { resolve, structuralOf, parsePath, formatConcrete } from "./response-explorer-engine.js?v=rx-expansion-v1";

const O = (id, title, difficulty, variants, hints, explanation) => ({ id, title, difficulty, variants, hints, explanation });
const V = (sampleId, prompt, target, wrong = "$") => ({ sampleId, prompt, target, wrong });

const FIND_MODELS = [
  O("fd-envelope-payload", "Separate the response wrapper from its payload", "beginner", [
    V("t1-user", "How many accounts follow this creator? Find the count inside the user information, not the request-status wrapper.", "$.data.user.follower_count", "$.error.code"),
    V("g2-details", "Which nested value gives the place's user-facing name, rather than its language setting?", "$.displayName.text", "$.displayName.languageCode"),
    V("o3-chat", "Where are the words returned for the assistant's reply? Follow the message content, not the response bookkeeping.", "$.choices[0].message.content", "$.usage.total_tokens"),
  ], ["Start with the response group that contains the resource or reply, not request bookkeeping.", "Follow one child at a time and compare what each sibling describes.", "The value you need is nested inside the resource content; the response status and usage counts describe the call."], "The application follows the response's nested structure to reach the value it will display. A nearby property may describe the API call instead of the resource."),
  O("fd-record-by-index", "Find a value inside one collection record", "intermediate", [
    V("y1-search", "The second search result has a video identifier inside its `id` object. Locate that identifier.", "$.items[1].id.videoId", "$.items[1].snippet.channelId"),
    V("d1-guilds", "The community list contains several servers. Find the displayed name of the second server.", "$[1].name", "$[0].name"),
    V("t2-page1", "The portfolio displays the second returned video. Find the title the creator gave it.", "$.data.videos[1].title", "$.data.videos[0].title"),
  ], ["First identify the collection, then count from index zero.", "Open the record at the requested position before looking for its display property.", "The second record is index 1; the first record is index 0."], "An array contains separate records. The index chooses one record, and the final property retrieves a value from that record."),
  O("fd-primitive-array-index", "Navigate an indexed list of values", "intermediate", [
    V("ofs-embeddings", "The embedding response contains one numeric component at each position. Locate the fourth component in the first vector.", "$.data[0].embedding[3]", "$.data[0].index"),
    V("d3-search", "A member's roles are stored as a list of identifiers. Find a role for the first returned member.", "$[0].roles[0]", "$[0].user.id"),
    V("t2-page2", "Find the duration value for the first video on the second page of this sample.", "$.data.videos[0].duration", "$.data.cursor"),
  ], ["Arrays use a numeric position; object properties use names.", "Move through the outer record list before opening the nested list.", "The fourth component is index 3 because indexing starts at zero."], "An array position selects one value. If the array is inside a record, navigate to that record first."),
  O("fd-nested-arrays", "Follow a path through more than one collection", "advanced", [
    V("s1-album-tracks", "Find the name of the first artist credited on the first track.", "$.items[0].artists[0].name", "$.items[0].name"),
    V("yx1-threads", "Find the displayed text of the first thread's top-level comment.", "$.items[0].snippet.topLevelComment.snippet.textDisplay", "$.items[0].snippet.videoId"),
    V("d7-pins", "Find the content of the first pinned message, rather than the time it was pinned.", "$.items[0].message.content", "$.items[0].pinned_at"),
  ], ["There is more than one collection or nested object on this route.", "Trace from the outer record to the inner resource before choosing a leaf.", "The target is inside the nested resource; a sibling timestamp or title is a different value."], "The complete path follows each parent, collection, and record in order. Skipping a level reaches a different value."),
  O("fd-repeated-identifiers", "Distinguish identifiers at different levels", "advanced", [
    V("s2-playlist-items", "The app needs the individual track's Spotify URI, not the playlist page's URL or the track's name.", "$.items[0].item.uri", "$.items[0].item.name"),
    V("y1-search", "For the first search result, find the video's ID—not the channel ID nested beside it.", "$.items[0].id.videoId", "$.items[0].snippet.channelId"),
    V("d5-callback", "Find the ID of the message represented by the returned resource, not the interaction that triggered it.", "$.resource.message.id", "$.interaction.id"),
  ], ["Several values can look like identifiers or links.", "Check which resource the application needs to act on.", "The needed identifier belongs to the video, track, or message itself—not its parent or the request."], "Nested responses can contain identifiers for several related resources. The path tells you which resource each identifier names."),
  O("fd-pagination-state", "Separate page controls from returned records", "intermediate", [
    V("y1-uploads", "Which value should the app pass back when it asks YouTube for the next page?", "$.nextPageToken", "$.pageInfo.totalResults"),
    V("t2-page1", "Which value marks where the next video-list page should continue?", "$.data.cursor", "$.data.videos[0].create_time"),
    V("s2-playlist-items", "Which value tells how many playlist items exist in total, rather than how many are shown on this page?", "$.total", "$.limit"),
  ], ["Look beside the collection for page-level information.", "A record's date or title describes one item; a paging marker belongs to the response page.", "Choose the page token, cursor, or total according to the question, not a field inside one record."], "Collection entries and paging information serve different purposes. Page controls usually sit beside the collection."),
  O("fd-nullable-value", "Recognize an explicitly empty value", "advanced", [
    V("d1-member", "The member has no server nickname. Locate the field whose value is explicitly null.", "$.nick", "$.avatar"),
    V("o8-incomplete", "This response has no API error. Find the field that explicitly records that absence.", "$.error", "$.incomplete_details.reason"),
    V("s2-get-playlist", "The playlist has no description. Locate the property whose value is null.", "$.description", "$.name"),
  ], ["A missing property and a property whose value is null are different.", "Find the property that is present in the response and inspect its value type.", "The target is the explicit `null` value; a nearby string or error reason is not null."], "A null value means the property exists but currently has no value. Applications should handle that case instead of treating it as a string."),
  O("fd-empty-collection", "Find a present but empty collection", "intermediate", [
    V("d5-callback", "Which property is an empty list of mentions in the returned message?", "$.resource.message.mentions", "$.resource.message.content"),
    V("o1-response", "Which property is an empty list attached to the reasoning output item?", "$.output[0].summary", "$.output[1].content"),
    V("d5-callback", "Which property is the empty list of attached files on the message?", "$.resource.message.attachments", "$.resource.message.embeds"),
  ], ["An empty list is still an array and still has a path.", "Expand the message or output item, then look for a property displayed as an empty collection.", "The target is the empty array itself, not a neighboring text field or another empty list."], "An empty array says the collection exists but contains no items. It is not the same as null or a missing property."),
  O("fd-match-record-then-navigate", "Identify the correct record before following its child", "advanced", [
    V("m8-details", "The review archive shows multiple reviews. Locate the text of the second review, not its rating or publication time.", "$.reviews[1].text.text", "$.reviews[1].rating"),
    V("d2-messages", "The catch-up screen needs the content of the second message in the response.", "$[1].content", "$[0].content"),
    V("yx1-replies", "Find the text of the first reply's comment, not the commenter's display name.", "$.items[0].snippet.textDisplay", "$.items[0].snippet.authorDisplayName"),
  ], ["Use the clue to select the record first.", "After the correct record is identified, follow its nested property path.", "A different record or a sibling property answers a different question."], "Finding a value in a collection takes two decisions: choose the intended record, then navigate to the needed child."),
  O("fd-status-boolean", "Find a status value with the right meaning", "intermediate", [
    V("o5-moderation", "Which Boolean tells the application whether this submission was flagged for review?", "$.results[0].flagged", "$.results[0].category_scores.harassment"),
    V("g1-nearby", "Which value says whether this place is open now, rather than describing its location?", "$.places[0].currentOpeningHours.openNow", "$.places[0].location.latitude"),
    V("s8-currently-playing", "Which Boolean tells whether playback is currently active?", "$.is_playing", "$.device.is_active"),
  ], ["Several nearby values can be Boolean or numeric but have different meanings.", "Follow the response branch that describes the requested state.", "Use the state of the post, place, or player—not a related device or score."], "A value's type alone is not enough: follow its parent structure to verify what state it describes."),
  O("fd-nested-location", "Navigate a location or route representation", "advanced", [
    V("g3-route", "Find the human-readable travel time for the first route, not its raw duration string.", "$.routes[0].localizedValues.duration.text", "$.routes[0].duration"),
    V("m6-matrix", "Find the duration returned for the third origin-destination result.", "$[2].duration", "$[2].destinationIndex"),
    V("g1-nearby", "Find the latitude for the first place's location.", "$.places[0].location.latitude", "$.places[0].location.longitude"),
  ], ["Start at the route or place record, then expand the nested location/display group.", "Some values have both a machine-oriented form and a display-oriented form.", "The requested value is at the end of the full nested path."], "Nested route and location objects keep related values together. The correct leaf depends on what the application must show or use."),
  O("fd-similar-metrics", "Choose among similar measurements", "intermediate", [
    V("yx3-batch", "Which count records how many comments the first video received?", "$.items[0].statistics.commentCount", "$.items[0].statistics.likeCount"),
    V("s3-recently-played", "Find the track's duration in milliseconds, not its track number.", "$.items[0].track.duration_ms", "$.items[0].track.track_number"),
    V("o5-moderation", "Find the score for the harassment category, not its true/false flag.", "$.results[0].category_scores.harassment", "$.results[0].categories.harassment"),
  ], ["The response groups several measurements together.", "Read the final property name and its parent group to distinguish the metric.", "A count, duration, or score is not interchangeable with a neighboring metric or Boolean flag."], "Similar metrics can have similar types. Their property names and parent groups explain what each measures."),
  O("fd-collection-vs-total", "Distinguish the collection from its summary", "beginner", [
    V("s2-my-playlists", "The screen must display each playlist. Locate the array of playlist records rather than the total count.", "$.items", "$.total"),
    V("y1-channel", "The channel card needs the returned channel records, not the result-count summary.", "$.items", "$.pageInfo.totalResults"),
    V("g1-nearby", "The map-list screen needs the place records themselves, not an individual place identifier.", "$.places", "$.places[0].id"),
  ], ["An array holds the records; a number or token summarizes the result page.", "Look at the node type shown in the tree.", "Choose the collection when the application needs to display multiple records."], "A result count describes how many records matched; the collection contains the records the application can display."),
  O("fd-polymorphic-output", "Find the content branch that contains the answer", "advanced", [
    V("o1-response", "The first output entry is a reasoning item. Find the text in the message entry that the app should display.", "$.output[1].content[0].text", "$.output[0].summary"),
    V("o8-response", "Find the assistant's written answer inside the response output, not the output-item type.", "$.output[1].content[0].text", "$.output[1].type"),
    V("o6-response", "Locate the response text generated for the flashcard prompt.", "$.output[1].content[0].text", "$.instructions"),
  ], ["Not every item in an output array has the same role.", "Use the item's type or role to locate the message content.", "The answer words are inside the message content; request instructions and reasoning summaries are different fields."], "Some APIs return heterogeneous arrays. Inspect the item type before deciding which child contains user-facing text."),
  O("fd-match-record-by-property", "Match a record by one property, then navigate to another", "advanced", [
    V("d2-messages", "Find the message authored by `clubhelper_bot`, then locate its content.", "$[1].content", "$[0].content"),
    V("m8-details", "Find the review with a rating of 4, then locate the review text.", "$.reviews[1].text.text", "$.reviews[0].text.text"),
    V("g1-nearby", "Find the place whose rating is 4.3, then locate its formatted address.", "$.places[1].formattedAddress", "$.places[0].formattedAddress"),
  ], ["First compare the identifying property across records.", "After locating the matching record, follow its child path to the requested information.", "The match is the record with the stated author or rating; then select its content or address."], "Some application tasks identify a record by its data rather than by its position. Match first, then navigate to the needed property."),
];

const STRUCTURE_MODELS = [
  O("st-root-collection", "Collection or single record?", "beginner", [
    { sampleId: "d1-guilds", mode: "single", path: "$", prompt: "The server list response begins with the collection itself. Select the structure that holds all returned servers." },
    { sampleId: "d2-messages", mode: "single", path: "$", prompt: "This endpoint returns a list of messages directly. Select the collection, not one message." },
    { sampleId: "m6-matrix", mode: "single", path: "$", prompt: "The route-matrix response is a root-level list. Select the structure that contains all route results." },
  ], ["Check the icon and type shown for the response root.", "A collection contains multiple entries; one entry is a separate object.", "Select the root array to represent the whole result set."], "A root-level array means the response itself is a collection. Its entries are individual records."),
  O("st-array-vs-record", "Separate the array from one record", "beginner", [
    { sampleId: "t2-page1", mode: "slots", prompt: "Assign the whole video collection and one video record from that collection to the two slots.", slots: [["collection", "The collection", "$.data.videos"], ["record", "One video record", "$.data.videos[0]"]] },
    { sampleId: "y1-search", mode: "slots", prompt: "Select the search-results array and then the first result object.", slots: [["collection", "The result collection", "$.items"], ["record", "One result", "$.items[0]"]] },
    { sampleId: "s4-followed", mode: "slots", prompt: "Choose the followed-artists collection and one artist record inside it.", slots: [["collection", "The artist collection", "$.artists.items"], ["record", "One artist", "$.artists.items[0]"]] },
  ], ["An array has brackets and contains entries.", "The entry is a child of the collection and has its own properties.", "Use different rows for the array and the record it contains."], "The collection and an individual item are different nodes. An application loops through the collection to build one UI element per record."),
  O("st-parent-child", "Trace a parent and nested child", "intermediate", [
    { sampleId: "g2-details", mode: "slots", prompt: "Show how the place-name object contains its actual display text.", slots: [["parent", "The name object", "$.displayName"], ["child", "The displayed text value", "$.displayName.text"]] },
    { sampleId: "d1-member", mode: "slots", prompt: "Identify the user object and then its global display name.", slots: [["parent", "The user object", "$.user"], ["child", "The global display name", "$.user.global_name"]] },
    { sampleId: "o3-chat", mode: "slots", prompt: "Navigate from the message object to the text the application can display.", slots: [["parent", "The assistant message object", "$.choices[0].message"], ["child", "The message text", "$.choices[0].message.content"]] },
  ], ["Objects group related properties.", "A nested property belongs to its immediate parent object.", "The child path extends the parent path by one property."], "The parent object organizes related values. A path must follow the parent-child relationship to reach one value."),
  O("st-object-array-path", "Navigate across object and array levels", "intermediate", [
    { sampleId: "s1-album-tracks", mode: "single", path: "$.items[0].artists", prompt: "Select the artist collection nested inside the first track." },
    { sampleId: "yx1-threads", mode: "single", path: "$.items[0].snippet.topLevelComment", prompt: "Select the top-level comment object nested in the first thread result." },
    { sampleId: "d7-pins", mode: "single", path: "$.items[0].message.author", prompt: "Select the author object inside the first pinned message." },
  ], ["The route alternates between a collection and objects.", "Expand the outer result, then follow the nested property to its group.", "Stop at the requested object; do not select one of its leaves."], "Object properties and array indexes are different navigation steps. The complete path preserves their order."),
  O("st-primitive-types", "Classify actual values by JSON type", "beginner", [
    { sampleId: "t4-status", mode: "classify", prompt: "Classify the status text, downloaded byte count, and error message by their JSON value types.", paths: [["status", "$.data.status"], ["bytes", "$.data.downloaded_bytes"], ["message", "$.error.message"]] },
    { sampleId: "g1-nearby", mode: "classify", prompt: "Classify the place rating, open-now flag, and formatted address by their JSON value types.", paths: [["rating", "$.places[0].rating"], ["open", "$.places[0].currentOpeningHours.openNow"], ["address", "$.places[0].formattedAddress"]] },
    { sampleId: "o5-moderation", mode: "classify", prompt: "Classify the flagged decision, category score, and model name by their JSON value types.", paths: [["flag", "$.results[0].flagged"], ["score", "$.results[0].category_scores.harassment"], ["model", "$.model"]] },
  ], ["Read the type label in the response tree, not just the displayed value.", "JSON distinguishes strings, numbers, booleans, null, arrays, and objects.", "The field's current value has one exact JSON type, even if the app later formats it differently."], "JSON types affect how code reads and uses a value: text, number, Boolean, null, object, and array are not interchangeable."),
  O("st-repeated-property", "The same property name can have different parents", "advanced", [
    { sampleId: "s2-my-playlists", mode: "single", path: "$.items[0].owner.id", prompt: "Select the owner ID inside the first playlist. Do not select the playlist's own ID." },
    { sampleId: "yx1-threads", mode: "single", path: "$.items[0].snippet.channelId", prompt: "Select the channel ID that belongs to the thread snippet, not another nested resource ID." },
    { sampleId: "d5-callback", mode: "single", path: "$.resource.message.author.id", prompt: "Select the author ID inside the returned message, not the interaction or message ID." },
  ], ["Several properties may share the word `id`.", "Follow the parent chain, not only the final property name.", "The path must identify the owner, channel, or author described in the task."], "A property name is only unique within its parent object. The full path tells which related resource the value identifies."),
  O("st-array-index", "An index selects one element", "intermediate", [
    { sampleId: "y1-search", mode: "single", path: "$.items[1]", prompt: "Select the second result object. Remember that its array index is one." },
    { sampleId: "d2-messages", mode: "single", path: "$[1]", prompt: "Select the second message record from this root-level array." },
    { sampleId: "m10-matrix", mode: "single", path: "$[2]", prompt: "Select the third matrix-result object from the root collection." },
  ], ["Array indexes start at zero.", "The first element is index 0, so the second is index 1.", "Select the record object at the requested position, not the whole array."], "An index identifies one element within an array. The element remains an object or value of its own."),
  O("st-empty-structures", "Empty structures still have a type", "intermediate", [
    { sampleId: "d5-callback", mode: "single", path: "$.resource.message.mentions", prompt: "Select the empty mentions array. It exists even though it has no entries." },
    { sampleId: "o1-response", mode: "single", path: "$.metadata", prompt: "Select the empty metadata object, not the null error field." },
    { sampleId: "d5-callback", mode: "slots", prompt: "Distinguish the empty attachments array from the empty embeds array.", slots: [["attachments", "An empty attachment list", "$.resource.message.attachments"], ["embeds", "An empty embed list", "$.resource.message.embeds"]] },
  ], ["An empty array and an empty object are still present nodes.", "Look at the type badge; the number of children is zero in both cases.", "Choose the exact empty structure named by the task."], "Empty arrays and objects are different structures. Empty does not mean missing or null."),
  O("st-response-envelope", "Response metadata and resource data have different roles", "intermediate", [
    { sampleId: "t4-status", mode: "slots", prompt: "Sort one post-status value and one request-status value into their correct branches.", slots: [["resource", "Information about the published post", "$.data.status"], ["request", "Information about the API call", "$.error.code"]] },
    { sampleId: "o1-response", mode: "slots", prompt: "Distinguish the assistant output from the response's usage summary.", slots: [["output", "Generated message content", "$.output[1].content[0].text"], ["usage", "Response usage summary", "$.usage.total_tokens"]] },
    { sampleId: "y1-search", mode: "slots", prompt: "Distinguish one returned video result from page-level result metadata.", slots: [["record", "A video result", "$.items[0]"], ["page", "Page result count", "$.pageInfo.totalResults"]] },
  ], ["Top-level groups often separate returned resources from request or paging metadata.", "Inspect the parent path of each value.", "The same response can describe both its data and the operation that produced it."], "A response can contain resource data, paging controls, request status, and usage totals. Their parent groups show their purpose."),
  O("st-array-of-primitives", "Array elements can be primitive values", "intermediate", [
    { sampleId: "ofs-embeddings", mode: "single", path: "$.data[0].embedding", prompt: "Select the numeric vector array for the first text input, not one numeric component." },
    { sampleId: "d3-search", mode: "single", path: "$[0].roles", prompt: "Select the list of role identifiers attached to the first member." },
    { sampleId: "t5-oembed", mode: "single", path: "$.html", prompt: "Select the string containing the embed markup, not the object that groups the response." },
  ], ["Arrays can contain objects or primitive values.", "Inspect a child to see whether each entry is a grouped record or a single value.", "Select the requested collection or primitive value at the correct level."], "A collection's elements may be simple values, while other collections contain objects with their own properties."),
  O("st-null-vs-missing", "Null and absent properties differ", "advanced", [
    { sampleId: "d1-member", mode: "classify", prompt: "Classify the null nickname and the present username. A null property is present but has no value.", paths: [["nickname", "$.nick"], ["username", "$.user.username"]] },
    { sampleId: "o8-incomplete", mode: "classify", prompt: "Classify the explicit null error and the nested incomplete reason.", paths: [["error", "$.error"], ["reason", "$.incomplete_details.reason"]] },
    { sampleId: "s2-get-playlist", mode: "classify", prompt: "Classify the null description and the non-null collaborative flag.", paths: [["description", "$.description"], ["collaborative", "$.collaborative"]] },
  ], ["Null is an explicit JSON value; a missing key has no tree row.", "Check whether the key exists and then inspect its value type.", "Do not treat null as the string `null` or as a missing property."], "An application can test whether a property exists separately from whether its value is null."),
  O("st-nested-collection", "A collection can be nested several levels down", "advanced", [
    { sampleId: "s3-recently-played", mode: "single", path: "$.items[0].track.artists", prompt: "Select the artist array nested inside the first recently played track." },
    { sampleId: "d5-callback", mode: "single", path: "$.resource.message.mentions", prompt: "Select the mentions array belonging to the returned message." },
    { sampleId: "o1-response", mode: "single", path: "$.output[1].content", prompt: "Select the content array inside the assistant message output item." },
  ], ["Trace every parent before choosing the nested collection.", "The collection is not at the response root; it belongs to one resource inside it.", "Select the array node itself, not one item or the surrounding object."], "The hierarchy locates which resource owns the nested collection. A repeated property or array name elsewhere may be unrelated."),
  O("st-object-property-value", "A property name is not the property's value", "beginner", [
    { sampleId: "g2-details", mode: "slots", prompt: "Identify the place's displayName property object and the text value inside it.", slots: [["group", "The grouped displayName property", "$.displayName"], ["value", "The actual place name text", "$.displayName.text"]] },
    { sampleId: "o3-chat", mode: "slots", prompt: "Identify the assistant message group and its content value.", slots: [["group", "The message object", "$.choices[0].message"], ["value", "The returned message content", "$.choices[0].message.content"]] },
    { sampleId: "d1-member", mode: "slots", prompt: "Identify the user property object and the user-facing name value.", slots: [["group", "The user object", "$.user"], ["value", "The global name value", "$.user.global_name"]] },
  ], ["A property can point to another object that contains values.", "The parent's type tells you it is a group, not display text.", "Follow the child property to reach the actual string value."], "Selecting the parent object gives a group of related fields. Selecting its child gives one value the app can display."),
  O("st-parallel-record-shapes", "Similar records share a structure", "advanced", [
    { sampleId: "t2-page1", mode: "single", path: "$.data.videos[0]", prompt: "Select one video record. The next video has the same set of child properties." },
    { sampleId: "s4-followed", mode: "single", path: "$.artists.items[1]", prompt: "Select the second artist object; it is one entry with the same record structure as its siblings." },
    { sampleId: "g1-nearby", mode: "single", path: "$.places[2]", prompt: "Select the third place object from the places collection." },
  ], ["Repeated array entries have sibling positions and a shared record shape.", "Use the index to choose one entry, then inspect its own fields.", "The requested record is one object, not the array that contains all of them."], "A collection stores repeated records with a similar structure. Indexing chooses an individual record without changing its shape."),
  O("st-primitive-collection", "Distinguish a primitive collection from its values", "intermediate", [
    { sampleId: "d3-search", mode: "slots", prompt: "Select the member's role collection and one role value inside it.", slots: [["collection", "The roles array", "$[0].roles"], ["value", "One role identifier", "$[0].roles[0]"]] },
    { sampleId: "ofs-embeddings", mode: "slots", prompt: "Select the embedding vector and one numeric component within the vector.", slots: [["collection", "The vector array", "$.data[0].embedding"], ["value", "One vector component", "$.data[0].embedding[3]"]] },
    { sampleId: "y2-videos", mode: "slots", prompt: "Select the first video's tag list and one tag string from the list.", slots: [["collection", "The tag array", "$.items[0].snippet.tags"], ["value", "One tag", "$.items[0].snippet.tags[0]"]] },
  ], ["An array can contain primitive values directly, without a record object between them.", "Select the array node for the collection and an indexed child for one value.", "The child is a primitive value inside the collection; it is not an object with named properties."], "Arrays may hold objects or primitive values. The tree shows whether an indexed child has its own properties or is itself a value."),
];

const NEEDS_MODELS = [
  O("sn-profile-card", "Build a useful profile card", "beginner", [
    { sampleId: "t1-user", goal: "A creator profile card should show a creator's name, profile image, and audience size.", needs: [["The creator's display name", "$.data.user.display_name"], ["The profile picture URL", "$.data.user.avatar_url"], ["The number of followers", "$.data.user.follower_count"]], distractors: ["$.data.user.likes_count", "$.error.log_id"] },
    { sampleId: "s7-artist", goal: "A music-club artist card needs the artist name and a usable image for the card.", needs: [["The artist's name", "$.name"], ["The largest image URL", "$.images[0].url"]], distractors: ["$.id", "$.href"] },
    { sampleId: "d6-get-user", goal: "A classmate directory card shows a person's name and avatar, not internal account flags.", needs: [["The person's public display name", "$.global_name"], ["The avatar image reference", "$.avatar"]], distractors: ["$.public_flags", "$.discriminator"] },
  ], ["Identify the visible parts of the card before choosing fields.", "Use fields that supply display content; account metadata may not appear in the interface.", "The feature needs the creator or person's public name and image, plus the requested profile fact."], "The card is built from user-facing profile data. Internal identifiers and unrelated counters do not create a visible card element."),
  O("sn-event-card", "Build an event card from nested fields", "intermediate", [
    { sampleId: "g3-text-search", goal: "The field-trip app lists a place name, its address, and its rating on each result card.", needs: [["The place's displayed name", "$.places[0].displayName.text"], ["The address shown on the card", "$.places[0].formattedAddress"], ["The place rating", "$.places[0].rating"]], distractors: ["$.places[0].id", "$.places[0].displayName"] },
    { sampleId: "yx3-chart", goal: "The gaming club's video card shows each video's title, publication date, and channel name.", needs: [["The video title", "$.items[0].snippet.title"], ["When it was published", "$.items[0].snippet.publishedAt"], ["The publishing channel's display name", "$.items[0].snippet.channelTitle"]], distractors: ["$.etag", "$.nextPageToken"] },
    { sampleId: "s1-album", goal: "An album spotlight shows the album title, release date, and the largest cover image.", needs: [["The album's display title", "$.name"], ["The release date", "$.release_date"], ["The largest cover image URL", "$.images[0].url"]], distractors: ["$.id", "$.href"] },
  ], ["Each card element can come from a different nested branch.", "Follow the record into the child object that holds the display value.", "Select the title/name, date, and address or image actually requested by the card."], "Nested response objects group related information. The card needs particular leaves from those groups, not every field returned."),
  O("sn-leaderboard", "Select fields for a ranked list", "intermediate", [
    { sampleId: "yx3-chart", goal: "A club leaderboard shows each video's title, view total, and comment total.", needs: [["The video title", "$.items[0].snippet.title"], ["The number of views", "$.items[0].statistics.viewCount"], ["The number of comments", "$.items[0].statistics.commentCount"]], distractors: ["$.items[0].statistics.likeCount", "$.items[0].id"] },
    { sampleId: "s3-recently-played", goal: "A monthly recap lists each track's title, artist name, and duration.", needs: [["The track title", "$.items[0].track.name"], ["The artist name", "$.items[0].track.artists[0].name"], ["The track duration in milliseconds", "$.items[0].track.duration_ms"]], distractors: ["$.items[0].track.id", "$.items[0].played_at"] },
    { sampleId: "d2-messages", goal: "A study-hall feed shows the message, its author, and when it was sent.", needs: [["The message text", "$[0].content"], ["The author's display name", "$[0].author.global_name"], ["When the message was sent", "$[0].timestamp"]], distractors: ["$[0].author.id", "$[0].tts"] },
  ], ["A ranked row needs a label and the values that support the ranking or display.", "Do not confuse a score with a nearby count or identifier.", "Choose the exact metrics named by the feature and the label that tells students what each row represents."], "A list row usually combines a human-readable label with one or more values. Resource IDs help identify records but are not substitutes for displayed information."),
  O("sn-status-badge", "Show a status without exposing request plumbing", "beginner", [
    { sampleId: "t4-status", goal: "A creator dashboard shows the publishing status and how much of the video has uploaded.", needs: [["The post's current status", "$.data.status"], ["Uploaded bytes so far", "$.data.downloaded_bytes"]], distractors: ["$.error.code", "$.error.log_id"] },
    { sampleId: "o1-response", goal: "A writing tool shows whether the generated response completed and the assistant's answer text.", needs: [["Whether the response completed", "$.status"], ["The assistant's answer text", "$.output[1].content[0].text"]], distractors: ["$.id", "$.usage.total_tokens"] },
    { sampleId: "s8-currently-playing", goal: "The club's now-playing screen shows whether music is playing and the current track title.", needs: [["Whether playback is active", "$.is_playing"], ["The current track title", "$.item.name"]], distractors: ["$.device.is_active", "$.timestamp"] },
  ], ["A status badge needs the resource's state, not only whether the API call worked.", "Look for the state property in the response branch about the resource.", "Select the status or Boolean the UI will display and any related value the goal explicitly requests."], "Application status and API request status can coexist. A feature should read the state that answers its own requirement."),
  O("sn-chart-series", "Choose data that belongs in a chart", "intermediate", [
    { sampleId: "yx3-chart", goal: "A trend chart plots video titles against their view totals.", needs: [["The label for each plotted item", "$.items[0].snippet.title"], ["The numeric view total", "$.items[0].statistics.viewCount"]], distractors: ["$.items[0].etag", "$.pageInfo.totalResults"] },
    { sampleId: "m10-matrix", goal: "A transportation chart compares travel duration for each origin-destination result.", needs: [["The duration for each route result", "$[0].duration"], ["Which origin produced the result", "$[0].originIndex"], ["The route condition", "$[0].condition"]], distractors: ["$[0].localizedValues.duration.text", "$[0].status"] },
    { sampleId: "o5-moderation", goal: "A safety dashboard plots the harassment score and labels whether that category was detected.", needs: [["The harassment score", "$.results[0].category_scores.harassment"], ["Whether harassment was detected", "$.results[0].categories.harassment"]], distractors: ["$.results[0].flagged", "$.model"] },
  ], ["Charts need a measured value and enough information to interpret what it represents.", "For route or category data, inspect the nested result record.", "Choose the exact numeric measure and its label or state; metadata such as an ETag is not chart data."], "A chart should use data that supports its visual question. Labels, measures, and grouping fields have different roles."),
  O("sn-filtered-records", "Choose fields for a filtered list", "intermediate", [
    { sampleId: "d3-search", goal: "The volunteer desk lists each matched member's display name and whether the member has a nickname set.", needs: [["The member's public name", "$[0].user.global_name"], ["The nickname value used to detect a custom server name", "$[0].nick"]], distractors: ["$[0].user.id", "$[0].pending"] },
    { sampleId: "y1-search", goal: "A study-video list displays the matched video's title and its publication time.", needs: [["The result title", "$.items[0].snippet.title"], ["The publication time", "$.items[0].snippet.publishedAt"]], distractors: ["$.items[0].id.videoId", "$.pageInfo.resultsPerPage"] },
    { sampleId: "g1-nearby", goal: "The restaurant list shows the place name and whether it is currently open.", needs: [["The displayed place name", "$.places[0].displayName.text"], ["Whether the place is open now", "$.places[0].currentOpeningHours.openNow"]], distractors: ["$.places[0].id", "$.places[0].location.latitude"] },
  ], ["A filter or status condition is separate from the values shown in the row.", "Check the response type and parent branch for each condition.", "Select only fields the specified screen uses to present or distinguish its records."], "Filtering data can depend on a Boolean or optional value, while the interface may display a different field from the same record."),
  O("sn-identifier-vs-label", "Use display values rather than internal keys", "intermediate", [
    { sampleId: "d1-guilds", goal: "A server picker displays each community's name; it does not show internal server IDs.", needs: [["The displayed community name", "$[0].name"]], distractors: ["$[0].id", "$[0].permissions"] },
    { sampleId: "y1-search", goal: "A video result card shows the title and channel name, not API identifiers.", needs: [["The video title", "$.items[0].snippet.title"], ["The channel name", "$.items[0].snippet.channelTitle"]], distractors: ["$.items[0].id.videoId", "$.items[0].snippet.channelId"] },
    { sampleId: "s2-my-playlists", goal: "A playlist picker shows each playlist's name and owner name.", needs: [["The playlist's display name", "$.items[0].name"], ["The owner's display name", "$.items[0].owner.display_name"]], distractors: ["$.items[0].id", "$.items[0].owner.id"] },
  ], ["A UI label should be readable to the person using the app.", "IDs identify resources for software but may not be the text a person should see.", "Choose names for display; keep IDs only when the feature needs to identify or retrieve a resource."], "A display value helps people recognize an item. An identifier serves software relationships and should not be substituted for user-facing text."),
  O("sn-nested-contact", "Combine fields from related nested objects", "intermediate", [
    { sampleId: "s3-recently-played", goal: "A recently played row shows the track, artist, and album title.", needs: [["The track title", "$.items[0].track.name"], ["The artist name", "$.items[0].track.artists[0].name"], ["The album title", "$.items[0].track.album.name"]], distractors: ["$.items[0].track.id", "$.items[0].played_at"] },
    { sampleId: "yx1-threads", goal: "A class Q&A card shows the question text and identifies which video the question belongs to.", needs: [["The comment text", "$.items[0].snippet.topLevelComment.snippet.textDisplay"], ["The related video ID", "$.items[0].snippet.videoId"]], distractors: ["$.items[0].id", "$.items[0].snippet.channelId"] },
    { sampleId: "g2-details", goal: "A saved-place card shows the place name, address, and whether it is open now.", needs: [["The place name", "$.displayName.text"], ["The formatted address", "$.formattedAddress"], ["Whether the place is open now", "$.regularOpeningHours.openNow"]], distractors: ["$.nationalPhoneNumber", "$.websiteUri"] },
  ], ["One feature can combine values from several nested objects.", "Follow each path to its own record and check whether it serves a requested UI element.", "Select the related display values; an ID or timestamp is extra unless the requirement calls for it."], "Related information may be spread across nested objects. The application selects each relevant leaf and combines them in one interface element."),
  O("sn-optional-fallback", "Plan for an optional value", "advanced", [
    { sampleId: "d2-messages", goal: "A catch-up view shows the message author using a server nickname when present, otherwise the public name, plus the message text.", needs: [["The server nickname when available", "$[0].author.global_name"], ["The public username for a fallback", "$[0].author.username"], ["The message content", "$[0].content"]], distractors: ["$[0].edited_timestamp", "$[0].author.id"] },
    { sampleId: "d1-member", goal: "A server member card uses the server nickname when one is set, and otherwise displays the member's global name.", needs: [["The optional server nickname", "$.nick"], ["The fallback global name", "$.user.global_name"]], distractors: ["$.user.id", "$.avatar"] },
    { sampleId: "o8-incomplete", goal: "The answer panel shows generated text and checks whether the response was incomplete before presenting it as final.", needs: [["The response status", "$.status"], ["The incomplete reason when present", "$.incomplete_details.reason"], ["The output text", "$.output[1].content[0].text"]], distractors: ["$.model", "$.usage.total_tokens"] },
  ], ["Optional data can be absent, null, or present; the app needs enough information to handle the state.", "Look at both the value and its parent branch.", "Choose the requested display field and the status/fallback information the app needs for the stated behavior."], "Robust applications account for optional response data. They can provide a fallback or avoid displaying a missing value."),
  O("sn-pagination-list", "Build a list with a Load More control", "intermediate", [
    { sampleId: "t2-page1", goal: "The video grid displays the current videos and shows Load More only when another page is available.", needs: [["The current video collection", "$.data.videos"], ["Whether another page exists", "$.data.has_more"], ["The value to request the next page", "$.data.cursor"]], distractors: ["$.data.videos[0].create_time", "$.error.log_id"] },
    { sampleId: "y1-uploads", goal: "The channel's upload screen lists uploads and can request another page when YouTube provides a page token.", needs: [["The upload collection", "$.items"], ["The next-page token", "$.nextPageToken"]], distractors: ["$.pageInfo.totalResults", "$.items[0].snippet.publishedAt"] },
    { sampleId: "s2-playlist-items", goal: "The playlist browser shows its current track entries and how many tracks exist in total.", needs: [["The playlist item collection", "$.items"], ["The total number of playlist items", "$.total"]], distractors: ["$.limit", "$.next"] },
  ], ["A paged screen needs records plus the page state that controls continuation.", "Page-level tokens sit outside the individual record structure.", "Select the collection and only the continuation or total values required by this feature."], "A page of records is not the whole collection. Page state helps the application decide whether and how to retrieve more."),
  O("sn-response-vs-request", "Keep API call metadata out of the feature", "advanced", [
    { sampleId: "t4-status", goal: "The creator dashboard displays the post's status and upload progress, not request diagnostics.", needs: [["The post status", "$.data.status"], ["Upload progress in bytes", "$.data.downloaded_bytes"]], distractors: ["$.error.code", "$.error.log_id"] },
    { sampleId: "y3-videos", goal: "A study page shows a video's runtime and view count, not response cache metadata.", needs: [["The video duration", "$.items[0].contentDetails.duration"], ["The view count", "$.items[0].statistics.viewCount"]], distractors: ["$.etag", "$.items[0].etag"] },
    { sampleId: "o3-chat", goal: "A lecture recap displays the assistant's recap text, not token-use or call metadata.", needs: [["The generated recap", "$.choices[0].message.content"]], distractors: ["$.usage.total_tokens", "$.id"] },
  ], ["Ask whether a field describes the feature's resource or the API operation.", "Request IDs, cache tags, and usage totals may be useful for diagnostics but not for this interface.", "Select the resource information named in the application goal and leave call metadata out."], "APIs often return useful diagnostics along with resource data. The UI should use only fields that serve the requested feature."),
  O("sn-location-comparison", "Compare location results with route results", "advanced", [
    { sampleId: "m6-matrix", goal: "The venue board compares each route's travel time and distance and keeps track of the destination represented by each result.", needs: [["The route duration", "$[0].duration"], ["The route distance", "$[0].distanceMeters"], ["The destination index for the result", "$[0].destinationIndex"]], distractors: ["$[0].condition", "$[0].localizedValues.duration.text"] },
    { sampleId: "m9-route", goal: "The bus planner displays a route's readable duration and distance.", needs: [["The route duration for display", "$.routes[0].localizedValues.duration.text"], ["The route distance for display", "$.routes[0].localizedValues.distance.text"]], distractors: ["$.routes[0].duration", "$.routes[0].distanceMeters"] },
    { sampleId: "g3-route", goal: "The field-trip planner needs the route distance and human-readable travel time.", needs: [["The distance in meters", "$.routes[0].distanceMeters"], ["The displayed travel duration", "$.routes[0].localizedValues.duration.text"]], distractors: ["$.routes[0].localizedValues.staticDuration.text", "$.routes[0].duration"] },
  ], ["Route responses may include raw values and display-ready values.", "Read the path branch to distinguish duration, distance, and route indexes.", "Choose the fields that directly satisfy the display or comparison requirement."], "Different route properties support different uses. The app may use raw measurements for computation and localized values for display."),
  O("sn-identity-and-content", "Keep a resource reference with its display content", "intermediate", [
    { sampleId: "t3-query", goal: "A featured reel card shows the video title, cover, and an embed link that opens the selected video.", needs: [["Video title", "$.data.videos[0].title"], ["Cover image URL", "$.data.videos[0].cover_image_url"], ["Embeddable video link", "$.data.videos[0].embed_link"]], distractors: ["$.data.videos[0].id", "$.error.code"] },
    { sampleId: "yx2-source", goal: "A playlist-copy preview identifies each source video and shows when it was published.", needs: [["The video ID", "$.items[0].contentDetails.videoId"], ["The video's publication date", "$.items[0].contentDetails.videoPublishedAt"]], distractors: ["$.items[0].id", "$.pageInfo.totalResults"] },
    { sampleId: "s2-playlist-items", goal: "A playlist row shows the track title, artist, and track number on its album.", needs: [["The track title", "$.items[0].item.name"], ["The artist name", "$.items[0].item.artists[0].name"], ["The track number on the album", "$.items[0].item.track_number"]], distractors: ["$.items[0].item.id", "$.items[0].added_at"] },
  ], ["Some fields are for display and others help the application identify or navigate resources.", "Read each requirement as a UI element or software need.", "Include the fields that visibly support the preview; keep internal references only when the task asks for them."], "A resource identifier can be important to software even when it is not displayed. Choose based on the application's actual requirements."),
  O("sn-nested-groups", "Select multiple values from different response branches", "advanced", [
    { sampleId: "d5-callback", goal: "The hint bot's reply card shows the message text, the response-message ID used for follow-up, and whether the reply is ephemeral.", needs: [["The returned message content", "$.resource.message.content"], ["The response-message ID", "$.interaction.response_message_id"], ["Whether the response is ephemeral", "$.interaction.response_message_ephemeral"]], distractors: ["$.interaction.id", "$.resource.message.author.id"] },
    { sampleId: "o1-response", goal: "The quiz builder displays the assistant's answer and knows whether the response completed.", needs: [["The assistant's answer text", "$.output[1].content[0].text"], ["The response completion status", "$.status"]], distractors: ["$.instructions", "$.usage.input_tokens"] },
    { sampleId: "s8-currently-playing", goal: "The now-playing screen shows track name, artist, and playback progress.", needs: [["The current track name", "$.item.name"], ["The artist name", "$.item.artists[0].name"], ["The playback position", "$.progress_ms"]], distractors: ["$.device.volume_percent", "$.repeat_state"] },
  ], ["A feature can need data from separate branches in one response.", "Trace each requested piece independently, then consider whether it contributes to the same screen.", "Include all requested values and exclude technical or unrelated settings."], "Applications commonly combine values from separate response branches. The important question is whether each value supports the requirement."),
  O("sn-sort-list", "Select the data needed to order a list", "intermediate", [
    { sampleId: "y1-search", goal: "A study-video list displays titles from newest to oldest. The publication time controls the order, but the screen does not show timestamps.", needs: [["The video title shown in each row", "$.items[0].snippet.title"], ["The publication time used to order rows", "$.items[0].snippet.publishedAt"]], distractors: ["$.items[0].id.videoId", "$.pageInfo.totalResults"] },
    { sampleId: "d2-messages", goal: "A study-hall feed displays messages in time order. It shows each message and uses its sent time to place it correctly.", needs: [["The message content", "$[0].content"], ["The sent time used for ordering", "$[0].timestamp"]], distractors: ["$[0].author.id", "$[0].edited_timestamp"] },
    { sampleId: "s3-recently-played", goal: "A listening history shows each track with the time it was played, ordered from most recent to oldest.", needs: [["The track title", "$.items[0].track.name"], ["When the track was played", "$.items[0].played_at"]], distractors: ["$.items[0].track.id", "$.items[0].track.track_number"] },
  ], ["Some fields support how the application organizes information even when they are not displayed.", "Compare the feature's visible content with the value that determines ordering.", "The app needs the title or message for display and a timestamp to sort the records; an ID does not tell it when an item occurred."], "A field can be necessary for application behavior without appearing on screen. Sorting uses its ordering value while the interface displays different fields."),
];

function typeOf(value) { return value === null ? "null" : Array.isArray(value) ? "array" : typeof value === "object" ? "object" : typeof value; }
function resolveConcrete(path, body) { try { return resolve(path, body)[0]?.value; } catch { return undefined; } }
function structural(path) { return structuralOf(path); }
function ancestors(paths) {
  const set = new Set();
  for (const raw of paths) {
    const path = structural(raw), parts = path.split(/(?=\.)|(?=\[)/).filter(Boolean);
    let current = "";
    for (let i = 0; i < parts.length - 1; i++) { current += parts[i]; set.add(current || "$"); }
  }
  return [...set];
}
function common(model, variant, owner, format, index) {
  const paths = variant.paths?.map((item) => Array.isArray(item) ? item[1] : item) || variant.slots?.map(([, , path]) => path) || [variant.target, variant.wrong].filter(Boolean);
  const arrayShow = {};
  for (const path of paths) {
    let tokens;
    try { tokens = parsePath(path); } catch { continue; }
    tokens.forEach((token, tokenIndex) => {
      if (typeof token !== "number") return;
      const arrayPath = structuralOf(formatConcrete(tokens.slice(0, tokenIndex)));
      arrayShow[arrayPath] = Math.max(arrayShow[arrayPath] || 0, token + 1);
    });
  }
  return {
    id: `rx-${format}-model-${String(model.id).slice(3)}-v${index + 1}`,
    providerId: owner.providerId, scenarioId: owner.id, sampleId: variant.sampleId, relatedSamples: [],
    format, difficulty: model.difficulty, reasoningFamily: model.id, reasoningModelId: model.id, variantId: `${model.id}-v${index + 1}`,
    title: model.title, context: { applicationGoal: variant.goal || owner.goal },
    instruction: variant.prompt, display: { expand: ancestors(paths), arrayShow, arrayShowDefault: 3, expandElements: "first", defaultExpandDepth: 2 },
    hints: model.hints, explanation: { text: model.explanation }, fieldNotes: [],
    endpointId: variant.endpointId || owner.availableEndpointIds?.[0] || owner.id,
    authoring: { status: "validated", source: "bounded-response-explorer-model-library", modelId: model.id, variantId: `${model.id}-v${index + 1}` },
  };
}
function indexedAcceptance(path) {
  return { path: structural(path), concretePath: path, match: /\[\d+\]/.test(path) ? "concrete" : "structural", kind: "primary", label: "target" };
}
function generateFind(model, variant, owner, index) {
  const ch = common(model, variant, owner, "find-data", index);
  ch.instruction = variant.prompt;
  ch.context.applicationGoal = variant.goal || owner.goal;
  ch.grading = {
    targetConcept: variant.need || "the value described by the application requirement",
    accepted: [indexedAcceptance(variant.target)], parentAcceptable: false,
    rejected: variant.wrong ? [{ path: structural(variant.wrong), misconceptionId: "plausible-neighbor", feedback: "That nearby value serves a different purpose. Follow the resource and property named in the requirement." }] : [],
  };
  ch.answer = { mode: "single", acceptedPaths: [variant.target] };
  ch.expectedValue = resolveConcrete(variant.target, variant.body);
  return ch;
}
function makeTypeCategories(variants, body) {
  const types = [...new Set(variants.map(([, path]) => typeOf(resolveConcrete(path, body))))];
  const labels = { object: "Object", array: "Array", string: "String", number: "Number", boolean: "Boolean", null: "Null" };
  const descriptions = { object: "A group of named properties.", array: "An ordered collection of values.", string: "Text in quotation marks.", number: "A numeric value.", boolean: "True or false.", null: "An explicit value indicating no value." };
  return [...new Set([...types, "object", "array", "string", "number", "boolean", "null"])].slice(0, 6).map((id) => ({ id, label: labels[id], description: descriptions[id] }));
}
function generateStructure(model, variant, owner, index) {
  const ch = common(model, variant, owner, "understand-structure", index);
  ch.answer = { mode: variant.mode };
  if (variant.mode === "single") {
    ch.answer.acceptedPaths = [variant.path];
    ch.grading = { targetConcept: model.title.toLowerCase(), accepted: [indexedAcceptance(variant.path)], parentAcceptable: false };
    ch.display.expand = ancestors([variant.path]);
  } else if (variant.mode === "slots") {
    ch.answer.slots = variant.slots.map(([id, label]) => ({ id, label }));
    ch.grading = { targetConcept: model.title.toLowerCase(), slots: variant.slots.map(([id, label, path]) => ({ id, label, accepted: [indexedAcceptance(path)], parentAcceptable: false })) };
    ch.display.expand = ancestors(variant.slots.map(([, , path]) => path));
  } else {
    const body = variant.body;
    const items = variant.paths.map(([id, path]) => ({ id, path }));
    const categories = makeTypeCategories(variant.paths, body);
    ch.answer = { mode: "classify", items, categories };
    ch.grading = { targetConcept: model.title.toLowerCase(), assignments: items.map((item) => {
      const correct = typeOf(resolveConcrete(item.path, body));
      const wrong = Object.fromEntries(categories.filter((category) => category.id !== correct).map((category) => [category.id, `This node is a ${category.id}; the response tree shows how it is organized.`]));
      return { item: item.id, correct, misconceptionId: "json-type-confusion", wrong };
    }) };
  }
  return ch;
}
function generateNeeds(model, variant, owner, index) {
  const paths = [...variant.needs.map(([, path]) => path), ...variant.distractors];
  const ch = common(model, { ...variant, paths }, owner, "select-needs", index);
  ch.instruction = variant.prompt || model.instruction || "Select the response values this application feature needs.";
  ch.answer = { mode: "set", extrasPolicy: "minimal", minimal: { maxExtras: 0 } };
  ch.grading = {
    targetConcept: variant.targetConcept || model.title.toLowerCase(),
    requirements: variant.needs.map(([label, path], n) => ({ id: `need-${n + 1}`, label, necessity: "necessary", accepted: [{ path: structural(path), nodeType: typeOf(resolveConcrete(path, variant.body)), kind: "primary" }] })),
    optionalAllowed: variant.optional || [],
    distractors: variant.distractors.map((path, n) => ({ path: structural(path), class: "plausible-unnecessary", misconceptionId: "unneeded-response-data", feedback: variant.distractorFeedback?.[n] || "This value is in the response, but the described feature does not use it." })),
  };
  ch.answer.requirements = ch.grading.requirements.map((item) => ({ id: item.id, label: item.label }));
  ch.answer.acceptedPaths = variant.needs.map(([, path]) => path);
  return ch;
}

export function generateResponseExplorerExpansion({ sampleMap, ownerBySample }) {
  const output = [];
  const emit = (models, format, fn) => models.forEach((model) => model.variants.forEach((variant, index) => {
    const body = sampleMap.get(variant.sampleId), owner = ownerBySample.get(variant.sampleId);
    if (!body || !owner) throw new Error(`Missing runtime source for ${variant.sampleId} (${model.id})`);
    variant.body = body;
    const challenge = fn(model, variant, owner, index);
    for (const path of challenge.answer.acceptedPaths || []) if (resolveConcrete(path, body) === undefined) throw new Error(`${challenge.id}: unresolved answer path ${path}`);
    if (challenge.answer.slots) for (const slot of challenge.grading.slots) for (const accepted of slot.accepted) if (resolveConcrete(accepted.concretePath, body) === undefined) throw new Error(`${challenge.id}: unresolved slot path ${accepted.concretePath}`);
    if (challenge.answer.items) for (const item of challenge.answer.items) if (resolveConcrete(item.path, body) === undefined) throw new Error(`${challenge.id}: unresolved classification path ${item.path}`);
    for (const requirement of challenge.grading.requirements || []) for (const accepted of requirement.accepted) if (resolveConcrete(accepted.path, body) === undefined) throw new Error(`${challenge.id}: unresolved required field ${accepted.path}`);
    for (const rejected of challenge.grading.rejected || []) if (resolveConcrete(rejected.path, body) === undefined) throw new Error(`${challenge.id}: unresolved distractor path ${rejected.path}`);
    for (const distractor of challenge.grading.distractors || []) if (resolveConcrete(distractor.path, body) === undefined) throw new Error(`${challenge.id}: unresolved distractor path ${distractor.path}`);
    output.push(challenge);
  }));
  emit(FIND_MODELS, "find-data", generateFind);
  emit(STRUCTURE_MODELS, "understand-structure", generateStructure);
  emit(NEEDS_MODELS, "select-needs", generateNeeds);
  return output;
}

export function expansionModels() { return { findData: FIND_MODELS, understandStructure: STRUCTURE_MODELS, selectNeeds: NEEDS_MODELS }; }
