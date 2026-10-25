# Compression instructional review corpus

60 authored context/fidelity contrasts; 120 representative source/approximation cases. Each has three resource profiles, yielding 360 compositions. Resource percentages are hypothetical trial results for the named item, not universal codec benchmarks. Developer implementation review; educator/classroom review pending.

## Resource profiles

- transfer: transfer allowance; exact allowance 82%, approximate-copy allowance 40%. Item-specific sizes vary by family.
- storage: storage allocation; exact allowance 91%, approximate-copy allowance 48%. Item-specific sizes vary by family.
- deadline: delivery deadline; exact allowance 76%, approximate-copy allowance 34%. Item-specific sizes vary by family.

## records-source-syntax — Text & structured data

A programming team prepares material for a remote code review.

- Item: **the editable source-code package**
- Scenario: A programming team prepares material for a remote code review. Compress the editable source-code package. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 64% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: A missing character could change syntax or program behavior. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (64% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a screenshot preview of the code-review screen**
- Scenario: A programming team prepares material for a remote code review. Compress a screenshot preview of the code-review screen. Minor visual detail loss is approved if the preview remains readable. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 64% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The preview is for orientation; reviewers obtain editable code separately. Lossy compression permits the approved information loss and fits this transfer allowance (23% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 64%, exceeding this item's 40% allowance.

## records-executable-integrity — Text & structured data

A developer distributes a small application and its demonstration.

- Item: **the runnable executable**
- Scenario: A developer distributes a small application and its demonstration. The available tested settings use 63% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the runnable executable. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Changing binary instructions can break execution or fail an integrity check. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (63% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a short demonstration recording**
- Scenario: A developer distributes a small application and its demonstration. The available tested settings use 63% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a short demonstration recording. Small picture and sound differences are acceptable while demonstrating the interface. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The demo is viewed, not executed as program instructions. Lossy compression permits the approved information loss and fits this transfer allowance (22% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 63%, exceeding this item's 40% allowance.

## records-configuration-flags — Text & structured data

A network team shares a server setup with another site.

- Item: **the configuration file**
- Scenario: A network team shares a server setup with another site. Compress the configuration file. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 62% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Altering a flag, address or number could change the server setup. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (62% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a visual overview of the setup dashboard**
- Scenario: A network team shares a server setup with another site. Compress a visual overview of the setup dashboard. Small losses in decorative visual detail are allowed; the preview only illustrates the layout. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 62% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The operational configuration is distributed separately from the illustration. Lossy compression permits the approved information loss and fits this transfer allowance (21% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 62%, exceeding this item's 40% allowance.

## records-transaction-cents — Text & structured data

An organization prepares financial data for two different uses.

- Item: **the transaction ledger**
- Scenario: An organization prepares financial data for two different uses. The available tested settings use 61% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the transaction ledger. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Losing a cent or transaction identifier could change account reconciliation. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (61% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **an approximate spending-summary dataset**
- Scenario: An organization prepares financial data for two different uses. The available tested settings use 61% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 40% of its original size. Compress an approximate spending-summary dataset. The overview may discard cent-level distinctions by rounding to whole dollars; it is not used for reconciliation. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The approved overview intentionally cannot reproduce the original cent amounts. Lossy compression permits the approved information loss and fits this transfer allowance (20% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 61%, exceeding this item's 40% allowance.

## records-database-relations — Text & structured data

A database team packages a system snapshot for review.

- Item: **the restorable database backup**
- Scenario: A database team packages a system snapshot for review. Compress the restorable database backup. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 60% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Missing keys or records could break relationships or prevent an exact restore. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (60% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a thumbnail of the database relationship diagram**
- Scenario: A database team packages a system snapshot for review. Compress a thumbnail of the database relationship diagram. Minor image detail loss is allowed in this navigation thumbnail. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 60% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: A thumbnail helps locate a diagram; it is not a substitute for the database. Lossy compression permits the approved information loss and fits this transfer allowance (23% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 60%, exceeding this item's 40% allowance.

## records-signed-document — Text & structured data

A records office prepares a signed document and a public preview.

- Item: **the original signed document file**
- Scenario: A records office prepares a signed document and a public preview. The available tested settings use 64% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original signed document file. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Changed bytes could invalidate a signature or alter the preserved document. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (64% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a cover-page preview image**
- Scenario: A records office prepares a signed document and a public preview. The available tested settings use 64% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a cover-page preview image. Small image differences are approved for the preview, which is not the legal record. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The signed original remains available through a separate archival process. Lossy compression permits the approved information loss and fits this transfer allowance (22% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 64%, exceeding this item's 40% allowance.

## records-clinical-waveform — Text & structured data

A training archive holds an instrument recording and a teaching illustration.

- Item: **the original numerical waveform recording**
- Scenario: A training archive holds an instrument recording and a teaching illustration. Compress the original numerical waveform recording. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 63% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Changing measured values would prevent later verification against the instrument output. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (63% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a non-diagnostic illustration of the waveform**
- Scenario: A training archive holds an instrument recording and a teaching illustration. Compress a non-diagnostic illustration of the waveform. Minor visual differences are accepted in this teaching illustration; no clinical decisions use it. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 63% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The illustration is separate from the retained measurement record. Lossy compression permits the approved information loss and fits this transfer allowance (21% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 63%, exceeding this item's 40% allowance.

## records-calibration-data — Text & structured data

A laboratory distributes calibration material.

- Item: **the original calibration measurements**
- Scenario: A laboratory distributes calibration material. The available tested settings use 62% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original calibration measurements. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Altering a measured coefficient could change a later calibration calculation. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (62% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a rough overview of historical calibration values**
- Scenario: A laboratory distributes calibration material. The available tested settings use 62% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a rough overview of historical calibration values. The overview may merge nearby readings into coarser bins; it will not be used to calibrate equipment. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The overview deliberately trades fine distinctions for a smaller summary representation. Lossy compression permits the approved information loss and fits this transfer allowance (20% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 62%, exceeding this item's 40% allowance.

## records-survey-responses — Text & structured data

A research group shares survey materials.

- Item: **the individual response records**
- Scenario: A research group shares survey materials. Compress the individual response records. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 61% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Discarding response details could change a recount or a reproducibility check. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (61% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **an image of a public survey infographic**
- Scenario: A research group shares survey materials. Compress an image of a public survey infographic. Small visual differences are approved for online viewing; the image is not used to recover individual responses. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 61% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The original records remain separate from the illustration. Lossy compression permits the approved information loss and fits this transfer allowance (23% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 61%, exceeding this item's 40% allowance.

## records-geographic-coordinates — Text & structured data

A mapping group distributes location data and an overview.

- Item: **the precise coordinate dataset**
- Scenario: A mapping group distributes location data and an overview. The available tested settings use 60% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the precise coordinate dataset. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Changed coordinates could alter later spatial calculations. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (60% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a coarse location dataset for a regional overview**
- Scenario: A mapping group distributes location data and an overview. The available tested settings use 60% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a coarse location dataset for a regional overview. Coordinates may be rounded to the approved regional precision; exact positions are not needed in this overview. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The overview discards fine location distinctions by design. Lossy compression permits the approved information loss and fits this transfer allowance (22% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 60%, exceeding this item's 40% allowance.

## records-game-save-state — Text & structured data

A game team shares saved progress and a view of it.

- Item: **the restorable save file**
- Scenario: A game team shares saved progress and a view of it. Compress the restorable save file. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 64% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Changing inventory counts or flags could produce a different game state. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (64% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a screenshot of the saved game's scene**
- Scenario: A game team shares saved progress and a view of it. Compress a screenshot of the saved game's scene. Small texture-detail loss is allowed in the shareable screenshot. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 64% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: Viewing progress does not require rebuilding the saved state from the picture. Lossy compression permits the approved information loss and fits this transfer allowance (21% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 64%, exceeding this item's 40% allowance.

## records-spreadsheet-formulas — Text & structured data

A team sends a spreadsheet and a presentation preview.

- Item: **the spreadsheet containing formulas and values**
- Scenario: A team sends a spreadsheet and a presentation preview. The available tested settings use 63% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the spreadsheet containing formulas and values. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Changing a formula or input could change calculated results. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (63% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a preview image of the presentation chart**
- Scenario: A team sends a spreadsheet and a presentation preview. The available tested settings use 63% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a preview image of the presentation chart. Minor visual loss is approved for the quick preview; calculations use the workbook separately. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The chart preview is for viewing rather than recomputing the workbook. Lossy compression permits the approved information loss and fits this transfer allowance (20% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 63%, exceeding this item's 40% allowance.

## records-multilingual-text — Text & structured data

A language project distributes text and visual samples.

- Item: **the original multilingual text file**
- Scenario: A language project distributes text and visual samples. Compress the original multilingual text file. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 62% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Missing character information could change meaning or prevent exact text recovery. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (62% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a sample image showing the page layout**
- Scenario: A language project distributes text and visual samples. Compress a sample image showing the page layout. Minor image-detail loss is approved; editing and text analysis use the original file. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 62% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The layout sample is a visual aid, not the authoritative text. Lossy compression permits the approved information loss and fits this transfer allowance (23% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 62%, exceeding this item's 40% allowance.

## records-training-labels — Text & structured data

A machine-learning team prepares review material.

- Item: **the dataset's labels and identifiers**
- Scenario: A machine-learning team prepares review material. The available tested settings use 61% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the dataset's labels and identifiers. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Changing labels or their association with examples could change model training. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (61% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **contact-sheet thumbnails for browsing examples**
- Scenario: A machine-learning team prepares review material. The available tested settings use 61% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 40% of its original size. Compress contact-sheet thumbnails for browsing examples. Small image differences are allowed in the browsing sheet; these thumbnails will not train the model. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The thumbnail sheet serves navigation, while training uses the retained dataset. Lossy compression permits the approved information loss and fits this transfer allowance (22% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 61%, exceeding this item's 40% allowance.

## records-version-patch — Text & structured data

A software maintainer prepares an update and a visual announcement.

- Item: **the patch data used to update installed files**
- Scenario: A software maintainer prepares an update and a visual announcement. Compress the patch data used to update installed files. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 60% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Lost patch bytes could produce incorrect program files. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (60% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **an animation illustrating the update's interface changes**
- Scenario: A software maintainer prepares an update and a visual announcement. Compress an animation illustrating the update's interface changes. Small visual differences are accepted in the announcement. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 60% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The animation explains the update; it is not the data that performs the update. Lossy compression permits the approved information loss and fits this transfer allowance (21% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 60%, exceeding this item's 40% allowance.

## images-photo-master — Images & visual assets

A photographer prepares a master and a viewing copy.

- Item: **the original photographic master file**
- Scenario: A photographer prepares a master and a viewing copy. The available tested settings use 64% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original photographic master file. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Discarding original image information would prevent exact later recovery. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (64% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a website preview of the photograph**
- Scenario: A photographer prepares a master and a viewing copy. The available tested settings use 64% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a website preview of the photograph. A small reduction in photographic detail is explicitly acceptable. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The preview is for viewing; exact master reconstruction is unnecessary for this copy. Lossy compression permits the approved information loss and fits this transfer allowance (20% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 64%, exceeding this item's 40% allowance.

## images-medical-image-purpose — Images & visual assets

An imaging collection provides exact source files and classroom examples.

- Item: **the original image file required by the collection's preservation policy**
- Scenario: An imaging collection provides exact source files and classroom examples. Compress the original image file required by the collection's preservation policy. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 63% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Changing any recorded image values would violate the exact-preservation requirement. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (63% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a non-diagnostic classroom thumbnail**
- Scenario: An imaging collection provides exact source files and classroom examples. Compress a non-diagnostic classroom thumbnail. Minor visual loss is approved for this thumbnail; it must not be used for diagnosis or measurement. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 63% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The thumbnail's purpose, rather than the medical subject alone, determines its fidelity requirement. Lossy compression permits the approved information loss and fits this transfer allowance (23% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 63%, exceeding this item's 40% allowance.

## images-remote-sensing — Images & visual assets

A remote-sensing team packages a capture and a news illustration.

- Item: **the original measured image values**
- Scenario: A remote-sensing team packages a capture and a news illustration. The available tested settings use 62% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original measured image values. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Changing recorded pixel measurements could affect later scientific analysis. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (62% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **an outreach image illustrating the captured region**
- Scenario: A remote-sensing team packages a capture and a news illustration. The available tested settings use 62% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 40% of its original size. Compress an outreach image illustrating the captured region. Minor visual detail loss is permitted for this public illustration, which is not used for analysis. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: An outreach illustration has a different fidelity goal from measured source data. Lossy compression permits the approved information loss and fits this transfer allowance (22% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 62%, exceeding this item's 40% allowance.

## images-texture-workflow — Images & visual assets

A game artist prepares editable texture sources and a small-device copy.

- Item: **the exact source texture file for later editing**
- Scenario: A game artist prepares editable texture sources and a small-device copy. Compress the exact source texture file for later editing. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 61% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Discarding source detail would prevent reconstruction of the artist's original data. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (61% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a mobile-game texture copy**
- Scenario: A game artist prepares editable texture sources and a small-device copy. Compress a mobile-game texture copy. The team approves small texture differences at the intended display size. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 61% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The distribution copy prioritizes download size over recovering the source texture exactly. Lossy compression permits the approved information loss and fits this transfer allowance (21% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 61%, exceeding this item's 40% allowance.

## images-background-role — Images & visual assets

A designer delivers image assets for two purposes.

- Item: **the reference image that must be compared pixel for pixel**
- Scenario: A designer delivers image assets for two purposes. The available tested settings use 60% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the reference image that must be compared pixel for pixel. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Lost pixel information would prevent the required exact comparison. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (60% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a decorative website background**
- Scenario: A designer delivers image assets for two purposes. The available tested settings use 60% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a decorative website background. Minor background detail loss is accepted because it is not carrying precise text or measurements. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: A decorative role allows the approved fidelity tradeoff. Lossy compression permits the approved information loss and fits this transfer allowance (20% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 60%, exceeding this item's 40% allowance.

## images-digitized-artwork — Images & visual assets

A museum prepares an artwork capture and an online viewing copy.

- Item: **the original digitized artwork file**
- Scenario: A museum prepares an artwork capture and an online viewing copy. Compress the original digitized artwork file. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 64% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: The preservation policy requires recovery of the captured data without alteration. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (64% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a gallery-page viewing image**
- Scenario: A museum prepares an artwork capture and an online viewing copy. Compress a gallery-page viewing image. Small image differences are acceptable in this fast-loading viewing copy. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 64% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The online copy is not expected to recreate the archived capture exactly. Lossy compression permits the approved information loss and fits this transfer allowance (23% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 64%, exceeding this item's 40% allowance.

## images-transparency-editing — Images & visual assets

An illustrator sends source artwork and a project preview.

- Item: **the editable artwork with exact transparency values**
- Scenario: An illustrator sends source artwork and a project preview. The available tested settings use 63% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the editable artwork with exact transparency values. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Discarding source values could change later compositing results. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (63% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a flattened visual preview**
- Scenario: An illustrator sends source artwork and a project preview. The available tested settings use 63% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a flattened visual preview. Minor picture-detail changes are allowed in the preview; later compositing uses the source separately. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The preview need not reproduce the original editable layers or channel values. Lossy compression permits the approved information loss and fits this transfer allowance (22% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 63%, exceeding this item's 40% allowance.

## images-diagram-legibility — Images & visual assets

A technical team distributes a reference diagram and a navigation image.

- Item: **the original diagram file required for exact recovery**
- Scenario: A technical team distributes a reference diagram and a navigation image. Compress the original diagram file required for exact recovery. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 62% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: The requested archive cannot omit labels, geometry or other source information. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (62% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a navigation thumbnail of the diagram**
- Scenario: A technical team distributes a reference diagram and a navigation image. Compress a navigation thumbnail of the diagram. Minor visual loss is approved because the thumbnail only helps users select the full diagram. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 62% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The full reference remains separate; the thumbnail is not used to read precise instructions. Lossy compression permits the approved information loss and fits this transfer allowance (21% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 62%, exceeding this item's 40% allowance.

## images-repeat-editing — Images & visual assets

A design studio stores an image for reuse and sends a review copy.

- Item: **the original image file that must survive repeated edit cycles unchanged**
- Scenario: A design studio stores an image for reuse and sends a review copy. The available tested settings use 61% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original image file that must survive repeated edit cycles unchanged. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Discarded information cannot be recovered for later edits, and repeated re-encoding can add loss. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (61% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a one-time approval preview**
- Scenario: A design studio stores an image for reuse and sends a review copy. The available tested settings use 61% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a one-time approval preview. Reviewers approve small visual differences and do not need to edit from this preview. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: This viewing copy does not need to retain the source's future editing flexibility. Lossy compression permits the approved information loss and fits this transfer allowance (20% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 61%, exceeding this item's 40% allowance.

## images-image-backup — Images & visual assets

A family creates a restorable photo backup and a browsing gallery.

- Item: **the original photo files in the backup**
- Scenario: A family creates a restorable photo backup and a browsing gallery. Compress the original photo files in the backup. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 60% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: A restore must return the original file data, not just similar-looking pictures. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (60% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **gallery thumbnails for finding photos**
- Scenario: A family creates a restorable photo backup and a browsing gallery. Compress gallery thumbnails for finding photos. Small visual differences are acceptable while browsing; originals are retrieved separately. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 60% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The thumbnails support selection rather than exact backup restoration. Lossy compression permits the approved information loss and fits this transfer allowance (23% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 60%, exceeding this item's 40% allowance.

## images-thumbnail-grid — Images & visual assets

A mobile catalog prepares source pictures and a product grid.

- Item: **the original product image file required for exact vendor return**
- Scenario: A mobile catalog prepares source pictures and a product grid. The available tested settings use 64% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original product image file required for exact vendor return. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Discarding information would prevent returning the vendor's original file. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (64% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **small product-grid images**
- Scenario: A mobile catalog prepares source pictures and a product grid. The available tested settings use 64% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 40% of its original size. Compress small product-grid images. Minor image detail loss is accepted at the grid's viewing size. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: Small browsing images can prioritize reduced transfer size over source-level fidelity. Lossy compression permits the approved information loss and fits this transfer allowance (22% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 64%, exceeding this item's 40% allowance.

## images-proof-comparison — Images & visual assets

A print team exchanges a reference file and a rough proof.

- Item: **the image file used for an exact digital comparison**
- Scenario: A print team exchanges a reference file and a rough proof. Compress the image file used for an exact digital comparison. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 63% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Changed image values would invalidate the required byte-for-byte comparison. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (63% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a rough on-screen proof**
- Scenario: A print team exchanges a reference file and a rough proof. Compress a rough on-screen proof. Small visual differences are allowed; this proof is not used for exact color or pixel verification. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 63% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The rough proof communicates overall composition rather than serving as the exact reference. Lossy compression permits the approved information loss and fits this transfer allowance (21% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 63%, exceeding this item's 40% allowance.

## images-panorama-preview — Images & visual assets

A tour producer packages panoramic image material.

- Item: **the original panorama data needed for exact restoration**
- Scenario: A tour producer packages panoramic image material. The available tested settings use 62% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original panorama data needed for exact restoration. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Discarded source details would make reconstruction differ from the preserved original. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (62% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a quick-loading panorama preview**
- Scenario: A tour producer packages panoramic image material. The available tested settings use 62% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a quick-loading panorama preview. The tour producer accepts a small loss of image detail in the preview. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The preview prioritizes responsive browsing over perfect source reconstruction. Lossy compression permits the approved information loss and fits this transfer allowance (20% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 62%, exceeding this item's 40% allowance.

## images-font-rendering-sample — Images & visual assets

A font developer distributes a font and a visual sample.

- Item: **the original font program file**
- Scenario: A font developer distributes a font and a visual sample. Compress the original font program file. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 61% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Changed instructions or character data could alter rendering behavior. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (61% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **an image showing sample text styles**
- Scenario: A font developer distributes a font and a visual sample. Compress an image showing sample text styles. Minor visual detail loss is accepted as long as the sample remains useful for browsing styles. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 61% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The sample is viewed; installing and rendering the font uses a separate file. Lossy compression permits the approved information loss and fits this transfer allowance (23% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 61%, exceeding this item's 40% allowance.

## images-measurement-overlay — Images & visual assets

A field team shares measured imagery and a briefing view.

- Item: **the original image and exact measurement-overlay data**
- Scenario: A field team shares measured imagery and a briefing view. The available tested settings use 60% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original image and exact measurement-overlay data. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Lost coordinates or pixel values could change later measurements. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (60% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a briefing image illustrating the measured area**
- Scenario: A field team shares measured imagery and a briefing view. The available tested settings use 60% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a briefing image illustrating the measured area. Minor image-detail loss is approved; this copy is not used to calculate measurements. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The briefing image communicates the broad situation rather than replacing source measurements. Lossy compression permits the approved information loss and fits this transfer allowance (22% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 60%, exceeding this item's 40% allowance.

## media-music-master — Audio & video

A musician prepares a recording master and a listening copy.

- Item: **the original numerical audio sample data**
- Scenario: A musician prepares a recording master and a listening copy. Compress the original numerical audio sample data. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 64% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Discarded sample information would prevent exact recovery of the recorded master. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (64% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a listener's streaming copy**
- Scenario: A musician prepares a recording master and a listening copy. Compress a listener's streaming copy. A small reduction in sound fidelity is explicitly acceptable. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 64% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The listening copy prioritizes transfer efficiency over recreating every original sample. Lossy compression permits the approved information loss and fits this transfer allowance (21% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 64%, exceeding this item's 40% allowance.

## media-film-master — Audio & video

A film archive prepares a preservation copy and a viewing preview.

- Item: **the original digitized video data**
- Scenario: A film archive prepares a preservation copy and a viewing preview. The available tested settings use 63% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original digitized video data. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: The archive requires exact recovery of the stored source, including all recorded frame information. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (63% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a short viewing preview**
- Scenario: A film archive prepares a preservation copy and a viewing preview. The available tested settings use 63% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a short viewing preview. Minor picture and sound differences are approved for preview viewing. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The preview is not the preservation master. Lossy compression permits the approved information loss and fits this transfer allowance (20% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 63%, exceeding this item's 40% allowance.

## media-video-call — Audio & video

A training system distributes a precise recording and a live view.

- Item: **the original captured session data required for exact replay analysis**
- Scenario: A training system distributes a precise recording and a live view. Compress the original captured session data required for exact replay analysis. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 62% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Changing captured information would violate the stipulated exact-reconstruction requirement. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (62% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a live video-call stream**
- Scenario: A training system distributes a precise recording and a live view. Compress a live video-call stream. Participants accept small picture and sound losses to keep the conversation usable. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 62% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The live communication goal values timely delivery over perfect reconstruction of every captured sample. Lossy compression permits the approved information loss and fits this transfer allowance (23% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 62%, exceeding this item's 40% allowance.

## media-audio-stems — Audio & video

A producer prepares audio stems and a reference mix.

- Item: **the recorded stem sample files needed for exact later processing**
- Scenario: A producer prepares audio stems and a reference mix. The available tested settings use 61% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the recorded stem sample files needed for exact later processing. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Discarding samples would prevent the requested recovery of the original stems. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (61% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a reference mix for a quick listen**
- Scenario: A producer prepares audio stems and a reference mix. The available tested settings use 61% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a reference mix for a quick listen. Minor sound differences are approved because this copy is not used for further mixing. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: A listening reference has a different fidelity goal from production sources. Lossy compression permits the approved information loss and fits this transfer allowance (22% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 61%, exceeding this item's 40% allowance.

## media-lecture-capture — Audio & video

An instructor distributes captured material and a viewing stream.

- Item: **the original recording files required for exact institutional preservation**
- Scenario: An instructor distributes captured material and a viewing stream. Compress the original recording files required for exact institutional preservation. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 60% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Losing captured data would violate the preservation requirement. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (60% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a student viewing stream**
- Scenario: An instructor distributes captured material and a viewing stream. Compress a student viewing stream. Small picture and sound quality reductions are accepted while keeping the lesson understandable. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 60% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The viewing stream prioritizes efficient delivery rather than exact master recovery. Lossy compression permits the approved information loss and fits this transfer allowance (21% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 60%, exceeding this item's 40% allowance.

## media-podcast-workflow — Audio & video

A podcast team prepares editing material and an offline episode copy.

- Item: **the original recorded audio samples for future editing**
- Scenario: A podcast team prepares editing material and an offline episode copy. The available tested settings use 64% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original recorded audio samples for future editing. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Discarded information would no longer be available for the requested exact reconstruction. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (64% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a phone listening copy**
- Scenario: A podcast team prepares editing material and an offline episode copy. The available tested settings use 64% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a phone listening copy. A small sound-quality reduction is acceptable for offline listening. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The phone copy prioritizes storage efficiency over preserving the editing source exactly. Lossy compression permits the approved information loss and fits this transfer allowance (20% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 64%, exceeding this item's 40% allowance.

## media-speech-analysis — Audio & video

A speech project shares analysis recordings and a demonstration.

- Item: **the original measured speech samples**
- Scenario: A speech project shares analysis recordings and a demonstration. Compress the original measured speech samples. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 63% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Changed sample values could alter a later reproducibility analysis. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (63% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a demonstration audio clip**
- Scenario: A speech project shares analysis recordings and a demonstration. Compress a demonstration audio clip. Minor sound differences are allowed; the demonstration is not used to measure speech features. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 63% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The demonstration illustrates the project without replacing the measurement data. Lossy compression permits the approved information loss and fits this transfer allowance (23% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 63%, exceeding this item's 40% allowance.

## media-instrument-transients — Audio & video

An instrument team distributes recorded source material and a listening preview.

- Item: **the original transient sample recording required for exact verification**
- Scenario: An instrument team distributes recorded source material and a listening preview. The available tested settings use 62% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original transient sample recording required for exact verification. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Removing recorded detail would prevent checking against the unchanged source samples. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (62% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a listening preview of the instrument**
- Scenario: An instrument team distributes recorded source material and a listening preview. The available tested settings use 62% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a listening preview of the instrument. Small sound-detail differences are approved for the preview. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The listening preview is not the file used for source verification. Lossy compression permits the approved information loss and fits this transfer allowance (22% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 62%, exceeding this item's 40% allowance.

## media-animation-source — Audio & video

An animation studio sends project sources and a small review movie.

- Item: **the project files containing exact animation settings and assets**
- Scenario: An animation studio sends project sources and a small review movie. Compress the project files containing exact animation settings and assets. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 61% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Altering project data could change the scene when it is reopened. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (61% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a review movie of the animation**
- Scenario: An animation studio sends project sources and a small review movie. Compress a review movie of the animation. Minor visual quality loss is approved for rapid review. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 61% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The review movie communicates motion; editing uses the source project separately. Lossy compression permits the approved information loss and fits this transfer allowance (21% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 61%, exceeding this item's 40% allowance.

## media-screen-recording — Audio & video

A software tester prepares evidence and a tutorial clip.

- Item: **the captured data required by an exact-comparison test**
- Scenario: A software tester prepares evidence and a tutorial clip. The available tested settings use 60% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the captured data required by an exact-comparison test. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: If the stored capture changes, the byte-for-byte evidence check cannot be reproduced. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (60% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a tutorial video showing the interface**
- Scenario: A software tester prepares evidence and a tutorial clip. The available tested settings use 60% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a tutorial video showing the interface. Some visual-detail loss is approved if the demonstrated actions remain understandable. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The tutorial is for instruction rather than exact evidence comparison. Lossy compression permits the approved information loss and fits this transfer allowance (20% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 60%, exceeding this item's 40% allowance.

## media-game-sound — Audio & video

A game developer prepares sound sources and a shipped listening asset.

- Item: **the original sound sample file needed for exact source recovery**
- Scenario: A game developer prepares sound sources and a shipped listening asset. Compress the original sound sample file needed for exact source recovery. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 64% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Lost sample information cannot be restored to the original sound source. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (64% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a sound effect for a mobile release**
- Scenario: A game developer prepares sound sources and a shipped listening asset. Compress a sound effect for a mobile release. The sound team accepts small audible or inaudible differences in the release asset. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 64% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The distribution asset values a smaller download over exact recovery of source samples. Lossy compression permits the approved information loss and fits this transfer allowance (23% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 64%, exceeding this item's 40% allowance.

## media-restoration-work — Audio & video

A restoration team packages source recordings and a progress sample.

- Item: **the unchanged source recording before restoration**
- Scenario: A restoration team packages source recordings and a progress sample. The available tested settings use 63% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the unchanged source recording before restoration. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Discarding source information would prevent returning to the original recorded data. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (63% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a progress sample for public listening**
- Scenario: A restoration team packages source recordings and a progress sample. The available tested settings use 63% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a progress sample for public listening. Minor sound differences are accepted; technical restoration decisions use the retained source separately. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The sample demonstrates progress without serving as the original evidence. Lossy compression permits the approved information loss and fits this transfer allowance (22% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 63%, exceeding this item's 40% allowance.

## media-performance-stream — Audio & video

A venue prepares an exact recording and a remote viewing feed.

- Item: **the captured performance samples required for exact preservation**
- Scenario: A venue prepares an exact recording and a remote viewing feed. Compress the captured performance samples required for exact preservation. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 62% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: The preservation copy must recover the captured data rather than merely sound and look similar. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (62% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a remote viewing stream**
- Scenario: A venue prepares an exact recording and a remote viewing feed. Compress a remote viewing stream. Small sound and image losses are accepted to support timely viewing. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 62% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The remote feed is a viewing product rather than the exact preservation copy. Lossy compression permits the approved information loss and fits this transfer allowance (21% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 62%, exceeding this item's 40% allowance.

## media-voice-message — Audio & video

A messaging system supports retained source recordings and small listening copies.

- Item: **the original message recording required by an exact-retention policy**
- Scenario: A messaging system supports retained source recordings and small listening copies. The available tested settings use 61% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original message recording required by an exact-retention policy. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Discarding original audio data would violate the retention requirement. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (61% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a short voice-message listening copy**
- Scenario: A messaging system supports retained source recordings and small listening copies. The available tested settings use 61% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a short voice-message listening copy. Listeners accept small sound-quality losses while retaining intelligibility. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The listening copy values efficient transfer rather than recovering every source sample. Lossy compression permits the approved information loss and fits this transfer allowance (20% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 61%, exceeding this item's 40% allowance.

## media-video-editing-proxy — Audio & video

An editor prepares source footage and a lightweight proxy.

- Item: **the original recorded video data**
- Scenario: An editor prepares source footage and a lightweight proxy. Compress the original recorded video data. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 60% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Discarded details would not be available when the original footage is reconstructed. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (60% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **an editing proxy used only to arrange a timeline**
- Scenario: An editor prepares source footage and a lightweight proxy. Compress an editing proxy used only to arrange a timeline. Small picture-detail loss is approved; final rendering uses the original footage separately. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 60% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The proxy supports workflow speed rather than serving as the final source. Lossy compression permits the approved information loss and fits this transfer allowance (23% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 60%, exceeding this item's 40% allowance.

## delivery-cloud-restore — Storage & bandwidth

A cloud service handles restorable files and an asset-browser preview.

- Item: **the original files that a restore must recover exactly**
- Scenario: A cloud service handles restorable files and an asset-browser preview. The available tested settings use 64% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original files that a restore must recover exactly. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: A merely similar reconstruction would not satisfy the backup contract. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (64% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **preview images in the cloud file browser**
- Scenario: A cloud service handles restorable files and an asset-browser preview. The available tested settings use 64% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 40% of its original size. Compress preview images in the cloud file browser. Small image-detail losses are allowed because the previews only help users locate files. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The browser previews are not the backup data used for restoration. Lossy compression permits the approved information loss and fits this transfer allowance (22% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 64%, exceeding this item's 40% allowance.

## delivery-mobile-cache — Storage & bandwidth

A field app stores work records and a visual browsing cache.

- Item: **the exact work-record database**
- Scenario: A field app stores work records and a visual browsing cache. Compress the exact work-record database. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 63% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Lost entries or changed values could prevent recovering the recorded work. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (63% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **cached image previews on the phone**
- Scenario: A field app stores work records and a visual browsing cache. Compress cached image previews on the phone. The user approves small visual losses to fit more previews on the device. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 63% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The cache improves browsing and is not the authoritative work record. Lossy compression permits the approved information loss and fits this transfer allowance (21% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 63%, exceeding this item's 40% allowance.

## delivery-email-attachment — Storage & bandwidth

A project team emails a working file and a visual cover preview.

- Item: **the original working document required for exact reconstruction**
- Scenario: A project team emails a working file and a visual cover preview. The available tested settings use 62% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original working document required for exact reconstruction. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Discarded characters or settings could change the reconstructed document. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (62% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a cover image for the email**
- Scenario: A project team emails a working file and a visual cover preview. The available tested settings use 62% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a cover image for the email. Minor image-detail loss is accepted in this non-authoritative preview. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The cover image illustrates the attachment rather than replacing it. Lossy compression permits the approved information loss and fits this transfer allowance (20% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 62%, exceeding this item's 40% allowance.

## delivery-low-bandwidth-report — Storage & bandwidth

A remote station sends measured data and a rough overview.

- Item: **the original measurement sequence required for exact reanalysis**
- Scenario: A remote station sends measured data and a rough overview. Compress the original measurement sequence required for exact reanalysis. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 61% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Losing measurement distinctions could change the later analysis. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (61% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **an approximate measurement feed for a broad trend display**
- Scenario: A remote station sends measured data and a rough overview. Compress an approximate measurement feed for a broad trend display. The display may discard fine numeric precision through approved coarser quantization. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 61% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The trend feed intentionally cannot reconstruct every original fine-grained reading. Lossy compression permits the approved information loss and fits this transfer allowance (23% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 61%, exceeding this item's 40% allowance.

## delivery-web-landing — Storage & bandwidth

A website distributes an exact downloadable resource and a hero image.

- Item: **the original downloadable resource whose bytes must be restored**
- Scenario: A website distributes an exact downloadable resource and a hero image. The available tested settings use 60% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original downloadable resource whose bytes must be restored. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Any discarded resource data would break the promised exact download. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (60% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **the decorative hero photograph**
- Scenario: A website distributes an exact downloadable resource and a hero image. The available tested settings use 60% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 40% of its original size. Compress the decorative hero photograph. Minor photographic detail loss is accepted to improve initial loading. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The hero image is viewed for appearance rather than used to recover precise source data. Lossy compression permits the approved information loss and fits this transfer allowance (22% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 60%, exceeding this item's 40% allowance.

## delivery-download-bundle — Storage & bandwidth

A game publisher delivers executable data and optional visual previews.

- Item: **the game executable and exact state data**
- Scenario: A game publisher delivers executable data and optional visual previews. Compress the game executable and exact state data. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 64% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Discarding instructions or state fields could change program behavior. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (64% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **preview videos on the download page**
- Scenario: A game publisher delivers executable data and optional visual previews. Compress preview videos on the download page. Minor video-detail losses are accepted for browsing. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 64% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The preview videos advertise gameplay but are not executed as the game. Lossy compression permits the approved information loss and fits this transfer allowance (21% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 64%, exceeding this item's 40% allowance.

## delivery-emergency-briefing — Storage & bandwidth

A response exercise shares operational records and an illustrative briefing picture.

- Item: **the exact operational record file**
- Scenario: A response exercise shares operational records and an illustrative briefing picture. The available tested settings use 63% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the exact operational record file. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Missing identifiers or altered recorded values would violate the stipulated record-preservation requirement. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (63% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a non-operational illustration for a training briefing**
- Scenario: A response exercise shares operational records and an illustrative briefing picture. The available tested settings use 63% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a non-operational illustration for a training briefing. Minor image differences are approved; the illustration is not used for operational decisions. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The training illustration has a viewing goal, not the role of an authoritative record. Lossy compression permits the approved information loss and fits this transfer allowance (20% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 63%, exceeding this item's 40% allowance.

## delivery-data-center-replica — Storage & bandwidth

A data center transfers a replica and a monitoring view.

- Item: **the replica's complete database records**
- Scenario: A data center transfers a replica and a monitoring view. Compress the replica's complete database records. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 62% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Missing data could prevent an exact failover restore. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (62% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a compressed view-only monitoring image**
- Scenario: A data center transfers a replica and a monitoring view. Compress a compressed view-only monitoring image. Minor visual-detail loss is accepted because monitoring calculations use the underlying data separately. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 62% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The image is a viewing product, not the replica being restored. Lossy compression permits the approved information loss and fits this transfer allowance (23% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 62%, exceeding this item's 40% allowance.

## delivery-camera-field-upload — Storage & bandwidth

A photographer sends field captures and small client previews.

- Item: **the original capture files required for exact return**
- Scenario: A photographer sends field captures and small client previews. The available tested settings use 61% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original capture files required for exact return. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Discarded source information would prevent returning the original captured data. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (61% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **field-upload preview images**
- Scenario: A photographer sends field captures and small client previews. The available tested settings use 61% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 40% of its original size. Compress field-upload preview images. Clients accept small photographic-detail loss for quick viewing. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The previews speed review; the original captures are delivered separately. Lossy compression permits the approved information loss and fits this transfer allowance (22% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 61%, exceeding this item's 40% allowance.

## delivery-scientific-sharing — Storage & bandwidth

A research team distributes experiment results and a conference illustration.

- Item: **the original dataset needed for exact reproducibility checks**
- Scenario: A research team distributes experiment results and a conference illustration. Compress the original dataset needed for exact reproducibility checks. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 60% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Discarding measurements could prevent the required reconstruction of the recorded experiment data. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (60% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a preview image of the experiment plot**
- Scenario: A research team distributes experiment results and a conference illustration. Compress a preview image of the experiment plot. Minor visual differences are approved; the image is not used for numerical analysis. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 60% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The plot preview explains a result without replacing the reproducibility dataset. Lossy compression permits the approved information loss and fits this transfer allowance (21% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 60%, exceeding this item's 40% allowance.

## delivery-storage-quota — Storage & bandwidth

A museum tablet holds exact catalog data and browsing photographs.

- Item: **the exact catalog records**
- Scenario: A museum tablet holds exact catalog data and browsing photographs. The available tested settings use 64% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the exact catalog records. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Changing identifiers or descriptions would prevent accurate recovery of the catalog. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (64% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **browsing photographs for the tablet**
- Scenario: A museum tablet holds exact catalog data and browsing photographs. The available tested settings use 64% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 40% of its original size. Compress browsing photographs for the tablet. A small reduction in image detail is explicitly accepted to fit the browsing collection. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The photographs are for viewing, not exact source reconstruction. Lossy compression permits the approved information loss and fits this transfer allowance (20% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 64%, exceeding this item's 40% allowance.

## delivery-satellite-link — Storage & bandwidth

A field project uses a constrained communication link.

- Item: **the exact command file sent to a remote system**
- Scenario: A field project uses a constrained communication link. Compress the exact command file sent to a remote system. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 63% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Discarding command information could change the requested operation. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (63% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a site-overview video for remote observers**
- Scenario: A field project uses a constrained communication link. Compress a site-overview video for remote observers. Some picture-detail loss is accepted so observers receive a timely overview. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 63% with all original information retained, or 23% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The overview is for viewing rather than controlling the remote system. Lossy compression permits the approved information loss and fits this transfer allowance (23% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 63%, exceeding this item's 40% allowance.

## delivery-archive-access-copy — Storage & bandwidth

An archive provides exact masters and online access copies.

- Item: **the original preserved digital files**
- Scenario: An archive provides exact masters and online access copies. The available tested settings use 62% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original preserved digital files. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: The archive's recovery promise cannot be met by a merely similar reconstruction. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (62% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **online viewing copies of illustrated pages**
- Scenario: An archive provides exact masters and online access copies. The available tested settings use 62% with all original information retained, or 22% after discarding some detail. The available transfer allowance is 40% of its original size. Compress online viewing copies of illustrated pages. Minor visual losses are approved; these copies are for browsing, not authoritative transcription. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The access copy prioritizes delivery while masters are maintained separately. Lossy compression permits the approved information loss and fits this transfer allowance (22% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 62%, exceeding this item's 40% allowance.

## delivery-meeting-network — Storage & bandwidth

A team shares an exact record package and a meeting stream.

- Item: **the original record package**
- Scenario: A team shares an exact record package and a meeting stream. Compress the original record package. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit. The available tested settings use 61% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 82% of its original size.
- Expected: **Lossless**
- Feedback: Lost data would prevent the promised exact reconstruction of the shared records. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (61% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a meeting's video stream**
- Scenario: A team shares an exact record package and a meeting stream. Compress a meeting's video stream. Participants accept small visual losses to keep the discussion timely. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority. The available tested settings use 61% with all original information retained, or 21% after discarding some detail. The available transfer allowance is 40% of its original size.
- Expected: **Lossy**
- Feedback: The stream serves communication rather than exact record preservation. Lossy compression permits the approved information loss and fits this transfer allowance (21% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 61%, exceeding this item's 40% allowance.

## delivery-downloadable-manual — Storage & bandwidth

A manufacturer provides a working reference file and a visual preview.

- Item: **the original manual file required for exact recovery**
- Scenario: A manufacturer provides a working reference file and a visual preview. The available tested settings use 60% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 82% of its original size. Compress the original manual file required for exact recovery. All original information has to be recovered, not a merely similar or summarized version. The recipient needs the original item reconstructed bit for bit.
- Expected: **Lossless**
- Feedback: Discarded file information would violate the request to reconstruct the original manual exactly. Lossless compression can reconstruct the original item exactly. It also fits the stated transfer allowance (60% within 82%). Lossy compression would discard original information and would not guarantee the required reconstruction.

- Item: **a preview of the manual's cover artwork**
- Scenario: A manufacturer provides a working reference file and a visual preview. The available tested settings use 60% with all original information retained, or 20% after discarding some detail. The available transfer allowance is 40% of its original size. Compress a preview of the manual's cover artwork. Minor picture-detail loss is accepted; users obtain precise instructions from the separate reference file. Exact reconstruction is unnecessary for this approved copy; the size limit is the priority.
- Expected: **Lossy**
- Feedback: The cover preview is a viewing aid rather than the technical reference itself. Lossy compression permits the approved information loss and fits this transfer allowance (20% within 40%). Lossless would restore every detail, but the available exact-restoring setting needs 60%, exceeding this item's 40% allowance.
