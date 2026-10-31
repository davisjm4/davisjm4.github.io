# Hardware reference audit — VEX Component Challenge

Reference check date: October 31, 2026. This is an AI-assisted source review, not independent VEX educator certification.

## Catalog reuse and provenance

The existing `../parts-sprint/catalog.js` is the hardware source of truth. Its 56 records provide stable IDs, canonical names, aliases, categories, descriptions/functions, mounting context, source URLs, image paths, image-source URLs, educational attribution and hashes. Scenario options refer to these IDs. Component Challenge should import these records rather than maintain a second copy. The catalog's `confusion` text is often a repeated description/function, so it must not be treated as a documented compatibility matrix or a comprehensive list of look-alikes.

Existing local images and the Parts Sprint asset manifest retain their original provenance. This build does not require new manufacturer photographs or unstable image hotlinks. Image paths resolve to Parts Sprint's locally stored assets; technical reference links may open the official article. A photograph without scale does not establish an exact dimension, thread or fit.

Read the existing [asset conditions](../../parts-sprint/assets/ATTRIBUTION.md) and [manifest](../../parts-sprint/assets/manifest.json) before reusing any photograph. Images remain © VEX Robotics. The published educational-use notice allows educational reproduction with attribution and prohibits monetary gain without explicit consent. This is conditional educational use, not a Creative Commons or unrestricted commercial license. DevCat Studios is not endorsed by VEX Robotics. No change in rights is implied by sharing catalog records between two activities.

## Verified technical anchors

### Official tools reference

[Understanding and Using V5 Tools](https://kb.vex.com/hc/en-us/articles/13078845924884-Understanding-and-Using-V5-Tools)

The specified interface determines tool choice: V5 #8-32 Star Drive screws use T15 tools; the smaller Star Drive set screws in shaft collars and universal joints use T8 tools. A wrench holds a compatible nut or standoff while its screw is driven. The smaller wrench end fits low-profile #8-32 nuts and standoffs; the larger end fits #8-32 Nylock, hex and Keps nuts. Scenarios must explicitly state the head/interface rather than ask for size guesses from a photograph.

### Official fastener reference

[Using V5 Fasteners](https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners)

The article distinguishes threaded fastening, rigid separation and nut retention. Standoffs have #8-32 threaded ends; a loose spacer is not a substitute for that connection. A hex-nut retainer captures the nut, but its locating posts still need a compatible hole pattern. Nylock and Keps nuts resist loosening by different mechanisms. Fastener length, engagement and nearby clearance must be supplied or checked rather than assumed. Nut bars form threads in plastic; they are not prethreaded metal nuts. The article also distinguishes a screw pivot from a rigidly clamped joint.

These points establish limited scenario rules, not universal claims that one component is always best. This build does not reproduce competition legality statements from the article; current competition rules require their own verification.

## Curriculum relationship

The official [V5 STEM Labs index](https://education.vex.com/stemlabs/v5) lists engineering work such as Design by Request and mechanism study such as Mechanical Advantage. Component Challenge is supplemental practice in selecting hardware, explaining constraints and diagnosing mechanisms. Its questions are original classroom exercises, not official VEX assessment items. A broad conceptual connection is not a claim of item-by-item official alignment. Robo Rally planning and physical testing remain separate tasks.

## Required interpretation limits

A catalog record can verify a component's general function while leaving a particular assembly's compatibility unresolved. For shaft families, wheel hubs, inserts, bearing size, mounting holes and threads, scenarios must state compatibility or provide the needed measurements. Geometry, loads, materials, wear, tolerances and available parts can change a real engineering decision. “Best next inspection” is preferable to a certain diagnosis where several causes remain possible.

Representative content and automated audits are recorded separately. An independent robotics educator has not reviewed or certified every family. Classroom verification must include the actual parts and assemblies students use.
