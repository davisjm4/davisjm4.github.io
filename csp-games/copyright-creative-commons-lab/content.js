// Authored reasoning families, not name substitutions. Each has one reviewed case.
// Choice 0 is the reviewed key here; the engine shuffles all four for students.
export const FAMILIES=[];
function f(topic,id,tier,sources,scene,prompt,answer,wrong,why,clarification,facts){FAMILIES.push({id,topic,tier,sources,scene,prompt,answer,wrong,why,clarification,facts});}
const b=(...a)=>f('basics',...a),p=(...a)=>f('public',...a);
b('automatic-protection','foundational',['basics'],'A student draws an original game character and saves the drawing. They have not registered it or added a copyright symbol.','What should a classmate assume before copying it into a public game?',
'Copyright can apply; check reuse permission.',[
['Copy it freely until the artist registers it.','Registration is not required for copyright to arise.'],
['Copy it freely because it has no copyright symbol.','A copyright symbol is not a prerequisite for protection.'],
['Publish it after adding your own copyright symbol.','A new notice does not transfer the artist’s rights.']],
'In the U.S., original creative expression is generally protected when fixed in a tangible form, including a saved digital drawing.','Registration and protection are different questions.');
b('copy-not-copyright','foundational',['basics'],'A student buys a downloadable comic. The purchase grants personal reading access, with no redistribution license. They want to upload its pages for everyone.','Which action is best supported by the purchase?',
'Read the copy; seek permission before uploading its pages.',[
['Upload the pages because buying transfers copyright.','Owning a copy does not itself transfer copyright.'],
['Upload the pages if the author is credited.','Credit does not supply the missing distribution permission.'],
['Upload the pages if downloads are free.','Free redistribution still involves the owner’s rights.']],
'The stated purchase permits reading, not public redistribution. A separate permission or applicable exception would be needed.','This question concerns uploading copies, not resale of a particular physical copy.');
b('credit-not-permission','foundational',['basics'],'A photographer’s portfolio says all rights reserved. A student wants to place a complete photo on a public club site and add a credit. No reuse permission or exception has been established.','What is the best next action?',
'Obtain permission or use a suitably licensed photo.',[
['Post it with credit because credit grants permission.','Attribution does not grant a copyright license.'],
['Post it because public websites invite copying.','Viewing access is different from reuse permission.'],
['Post it with a link instead of the photographer’s name.','A link alone does not authorize making a copy.']],
'Credit acknowledges the source but does not authorize this public copying.','An applicable exception could change a real case; none is established here.');
b('personal-license-scope','applied',['basics'],'A music download explicitly permits personal listening only. A student wants to include the entire recording as background in a publicly posted game trailer.','What should the student do before publishing?',
'Obtain suitable reuse rights or replace the recording.',[
['Publish because personal listening includes public trailers.','The stated license does not cover that new use.'],
['Publish because the trailer is a student project.','Student status does not expand this license.'],
['Publish because the recording was downloaded legally.','Lawful access does not establish public reuse rights.']],
'Permission for one use does not automatically authorize a different use such as combining and publicly sharing the recording.','No definitive fair-use ruling follows from these limited facts.');
b('idea-versus-expression','foundational',['basics'],'A student likes the idea of a maze game. They write their own code and draw all new art without copying another game’s expression. Consider copyright only.','Which action is best supported?',
'Use the general idea with independently created expression.',[
['Seek copyright permission for the idea of every maze.','Copyright does not protect an abstract idea itself.'],
['Copy the original artwork because the idea is free.','Unprotected ideas do not make the artwork unprotected.'],
['Copy the original source because the gameplay is familiar.','Source code can contain protected expression.']],
'Copyright protects original expression rather than the underlying idea or method.','This does not settle separate trademark, patent or contractual questions.');
b('permission-limits','applied',['basics'],'An artist gives written permission to use an icon in one classroom slideshow. The student now wants to distribute that icon in a public asset pack.','Which action respects the stated permission?',
'Request permission covering the public asset pack.',[
['Publish because permission for any use covers all uses.','The permission is limited to a stated use.'],
['Publish because the asset pack credits the artist.','Credit does not expand the permission.'],
['Publish because the asset pack is educational.','An educational label does not expand the agreement.']],
'The new distribution falls outside the express permission. Ask for a suitable grant or use another asset.','Do not assume a private permission is a public Creative Commons license.');
b('uploader-authority','nuanced',['faq'],'An account reposts a famous illustrator’s recent work and labels it CC BY 4.0. The illustrator’s own site does not offer that license, and the account gives no evidence of authority.','What is the best-supported action?',
'Verify authorization before relying on the repost’s license.',[
['Rely on any CC badge, regardless of who added it.','A label cannot grant rights the uploader lacks.'],
['Assume the illustrator lost copyright when it was reposted.','Unauthorized reposting does not transfer copyright.'],
['Treat the picture as public domain because licenses conflict.','Conflicting claims do not establish public-domain status.']],
'Only a rights holder or authorized person can grant the relevant permissions. The repost alone is insufficient evidence.','Creative Commons does not certify ownership of every labeled work.');
b('free-access-not-reuse','applied',['basics'],'A website lets anyone read a new illustrated story for free. It gives no copying license. A student plans to reproduce the complete story on another site.','What does the free access establish?',
'Reading access, not automatic republication permission.',[
['A right to republish the complete story with credit.','Credit does not create the missing permission.'],
['That the story has entered the public domain.','A zero price does not end copyright.'],
['A right to replace the author’s name when reposting.','Free access does not transfer authorship or rights.']],
'The price of access and the scope of reuse rights are separate.','Check for a suitable permission or applicable exception before republication.');
b('license-not-transfer','applied',['by','basics'],'A creator releases an original texture under CC BY 4.0. A student follows its terms and uses it in a game.','What should the student say about ownership?',
'The creator retains copyright and grants reuse rights.',[
['The student now owns copyright in the original texture.','Using a licensed work does not transfer ownership of it.'],
['The creator abandoned copyright by using CC BY.','CC BY is a license, not a public-domain dedication.'],
['Creative Commons now owns the original texture.','Creative Commons supplies tools; it does not take ownership.']],
'A public license grants specified permissions without transferring the underlying copyright.','The student can own their original contributions without owning the borrowed texture.');
b('permission-and-exception','nuanced',['faq','fair'],'A student’s proposed use is outside a photo’s license. A classmate says the license automatically eliminates fair use.','Which response best distinguishes the two?',
'Assess any applicable exception separately from license permission.',[
['Every use outside a license is automatically fair use.','Lack of license permission does not establish an exception.'],
['A restrictive license always cancels legal exceptions.','CC licenses do not remove applicable copyright exceptions.'],
['Credit converts an out-of-license use into fair use.','Credit alone does not determine fair use.']],
'A license and a legal exception are different possible grounds for use. Fair use requires a fact-specific analysis.','This distinction does not declare the student’s particular use lawful.');
p('verified-public-domain','foundational',['basics','faq'],'A reliable archive confirms that an original illustration is in the U.S. public domain. There are no separate protected additions or other rights at issue in this case.','What may a student generally do under copyright?',
'Copy, adapt and share without copyright permission.',[
['Ask the former copyright owner for every adaptation.','The stated public-domain work has no copyright restriction on that reuse.'],
['Use it only if the student does not make money.','Public-domain copyright status is not limited to noncommercial uses.'],
['Treat it as CC BY and require a license payment.','Public domain is not the CC BY license.']],
'Public-domain material can generally be reused without copyright permission.','Citing provenance remains good academic practice.');
p('free-is-not-domain','foundational',['basics'],'A creator offers a new wallpaper as a free download for personal use. A student wants to sell prints of it.','Which conclusion is supported?',
'Free downloading does not establish public-domain reuse rights.',[
['A zero price makes selling copies unrestricted.','Price does not establish copyright status.'],
['A download button automatically grants CC0 rights.','CC0 must not be inferred from a download button.'],
['Personal-use permission automatically includes resale.','The stated permission is narrower than resale.']],
'Free access, public-domain status and a reuse license are different.','Look for rights covering the intended use rather than inferring them from price.');
p('old-but-unknown','foundational',['basics'],'A scanned photograph looks old, but its date, creator and publication history are unknown. A student wants to publish it as a public-domain asset.','What is the best next action?',
'Research its status; appearance alone is insufficient.',[
['Declare it public domain because it looks old.','Age by appearance does not establish the relevant facts.'],
['Declare it public domain because it was scanned.','Digitization does not automatically establish public-domain status.'],
['Declare it CC BY because its creator is unknown.','Unknown authorship does not supply a license.']],
'Copyright duration depends on facts and legal rules, not merely an old appearance.','The game does not use a universal age cutoff.');
p('cc-versus-domain','foundational',['by','zero'],'One icon is validly offered under CC BY 4.0; another is validly dedicated with CC0 by its rights holder. No other rights are involved.','Which distinction should guide reuse?',
'CC BY has attribution conditions; CC0 has no attribution condition.',[
['Both require the same CC BY attribution conditions.','CC0 is a different legal tool from CC BY.'],
['Neither can be used in a commercial project.','Neither tool imposes a noncommercial restriction.'],
['Both become owned by the first student to download them.','Downloading does not transfer ownership of the original.']],
'CC BY licenses rights with conditions. CC0 attempts to waive copyright and related rights to the extent legally possible.','Credit can still be good practice for CC0 even when not a copyright condition.');
p('cc0-scope','applied',['zero'],'An artist validly applies CC0 to their own original sound effect. The file contains no third-party material or other rights issues. A student wants to edit and sell it in a game.','What does CC0 generally allow here?',
'Modify and reuse commercially without copyright permission.',[
['Only unchanged sharing with CC BY credit.','CC0 does not impose BY or ND conditions.'],
['Only school use with separate commercial permission.','CC0 does not impose an NC restriction.'],
['No reuse until Creative Commons approves the game.','Creative Commons does not approve individual uses.']],
'CC0 is a public-domain dedication tool with a fallback license, operating to the extent legally possible.','It is separate from the six standard CC licenses.');
p('other-persons-rights','nuanced',['zero'],'A CC0 photograph clearly shows an identifiable student. A company wants to use it in an advertisement implying that student endorses a product.','What should the company check?',
'Privacy, publicity and endorsement issues beyond copyright.',[
['Nothing, because CC0 clears every possible right.','CC0 does not remove other people’s privacy or publicity rights.'],
['Only whether the photographer received a credit.','A credit does not resolve the person’s rights.'],
['Only whether the advertisement uses fewer than ten words.','A word count does not settle these separate rights.']],
'A public-domain dedication does not clear every right related to a subject or a proposed use.','Copyright permission and endorsement permission are separate.');
p('protected-new-additions','applied',['basics'],'A public-domain novel is published in a new edition with original modern illustrations. A student wants to copy the novel and those illustrations into an app.','Which action is best supported?',
'Reuse the novel; check rights for the new illustrations.',[
['Copy everything because the novel is public domain.','New original additions can have separate protection.'],
['Assume the new illustrations restore copyright to the novel.','New additions do not recreate copyright in the public-domain text.'],
['Use the illustrations without permission if the publisher is credited.','Credit does not clear the separate illustration rights.']],
'Public-domain source material and newly protected contributions can coexist in one edition.','Identify which elements the status statement actually covers.');
p('domain-mark-not-waiver','applied',['faq','zero'],'An archive uses the Public Domain Mark for a work it identifies as free of known copyright restrictions. A student confuses this with the creator applying CC0.','Which explanation best distinguishes them?',
'The mark describes status; CC0 attempts a rights-holder dedication.',[
['The mark grants the same conditional license as CC BY.','The Public Domain Mark is not a CC BY license.'],
['CC0 requires every reuser to license adaptations as CC0.','CC0 does not impose ShareAlike.'],
['The mark guarantees that privacy and trademark rights are cleared.','A status mark is not a guarantee about all other rights.']],
'Public-domain identification and a tool used to waive rights serve different functions.','Verify provenance and scope rather than treating any symbol as a universal clearance.');
p('jurisdiction-status','nuanced',['faq','basics'],'An archive says a poem is public domain in one country. A student plans a U.S. publication, but no U.S. status information is given.','What is the best-supported next step?',
'Check U.S. status before publication.',[
['Assume public-domain status is identical everywhere.','Copyright rules and terms can vary by jurisdiction.'],
['Assume it must be CC0 because one country permits reuse.','Public-domain status does not imply a CC0 dedication.'],
['Assume the poem can never be reused in the U.S.','The available information does not establish that prohibition either.']],
'A status statement for one jurisdiction need not answer the status question in another.','This lab defaults to U.S. principles and does not calculate international terms.');
p('excluded-third-party','applied',['faq','zero'],'A collection’s CC0 notice explicitly excludes a cover photograph owned by a third party. A student wants that cover for a public website.','What should the student do?',
'Check the cover’s rights separately before copying it.',[
['Use the cover under CC0 because it is in the same download.','The notice explicitly excludes this item.'],
['Use it if the collection’s curator is credited.','Curator credit does not grant the cover owner’s rights.'],
['Assume every collection item is prohibited because one is excluded.','An exclusion does not cancel the stated rights for other items.']],
'A dedication or license covers only the material and rights within its scope.','Check explicit exclusions instead of extending a collection label to every element.');
const l=(...a)=>f('licenses',...a),a=(...a)=>f('attribution',...a);
l('by-commercial','foundational',['by'],'An original icon is offered by its creator under CC BY 4.0. A student wants to use it unchanged in a paid app; no other rights are involved.','Which action follows this license?',
'Use it commercially while meeting the attribution conditions.',[
['Use it only if the app is free.','CC BY does not impose an NC restriction.'],
['Use it commercially only after removing the license notice.','Required notices must not be removed.'],
['Use it without credit because the app charges money.','Commercial reuse does not remove attribution conditions.']],
'CC BY permits commercial sharing and adaptation when its conditions are followed.','A permission can be broad while still imposing obligations.',{license:'BY',share:true,adapt:false,commercial:true,credit:true,outcome:'permitted'});
l('sa-shared-adaptation','applied',['sa'],'A student edits a CC BY-SA 4.0 illustration into an adaptation and plans to share it publicly. They will provide appropriate credit and mark the edits.','Which licensing action best follows ShareAlike?',
'Share the adaptation under CC BY-SA 4.0.',[
['Share the adaptation as all rights reserved.','That does not meet the adaptation’s ShareAlike requirement.'],
['Share the adaptation under CC BY-ND 4.0.','Adding ND is not the same or a compatible adaptation license.'],
['Share the adaptation under CC BY-NC 4.0.','Adding NC and dropping SA does not satisfy this license.']],
'Shared adaptations must use the same license or a specifically compatible license as applicable. Using the same version is a valid choice here.','SA does not mean every unrelated work by the student needs that license.',{license:'BY-SA',share:true,adapt:true,commercial:false,credit:true,sameLicense:true,outcome:'permitted'});
l('nd-unchanged-sale','foundational',['nd'],'A creator offers an original poster under CC BY-ND 4.0. A student wants to sell unchanged copies with all required attribution and notices. No other rights are involved.','What does this license permit?',
'Selling unchanged copies while following its conditions.',[
['Only private viewing, with no redistribution at all.','ND still permits sharing unadapted material.'],
['Only free copies because ND means noncommercial.','ND and NC are different restrictions.'],
['Selling edited versions under the same ND license.','The license does not permit sharing adapted material.']],
'CC BY-ND allows commercial redistribution of unadapted material with attribution.','NoDerivatives restricts sharing adaptations; it is not a blanket ban on copying.',{license:'BY-ND',share:true,adapt:false,commercial:true,credit:true,outcome:'permitted'});
l('nc-direct-advertising','foundational',['nc'],'A business wants to use a CC BY-NC 4.0 photo in an advertisement primarily intended to increase its sales. It will credit the photographer. No exception is being claimed.','Which action is best supported?',
'Obtain separate permission for this commercial use.',[
['Use it because credit overrides NC.','Attribution does not remove the NC restriction.'],
['Use it because advertisements are publicly viewable.','Public access does not make a use noncommercial.'],
['Use it because the photo itself is free to download.','The download price does not establish permitted commercial use.']],
'This expressly sales-directed use does not satisfy the noncommercial restriction.','NC concerns the use; a user’s label alone is not decisive.',{license:'BY-NC',share:true,adapt:false,commercial:true,credit:true,outcome:'permission'});
l('ncsa-two-obligations','applied',['ncsa'],'A student adapts a CC BY-NC-SA 4.0 diagram for a freely shared, noncommercial study guide with no sales or advertising purpose. They will credit the creator and identify edits.','Which plan follows both named restrictions?',
'Share noncommercially under CC BY-NC-SA 4.0.',[
['Sell the adaptation under CC BY-NC-SA 4.0.','Keeping SA does not waive the NC condition.'],
['Share noncommercially as all rights reserved.','Following NC does not waive SA for a shared adaptation.'],
['Share commercially under CC BY 4.0.','This drops both restrictions relevant to the adaptation.']],
'NC limits the use; SA governs licensing of a shared adaptation. Both conditions apply.','One satisfied condition does not cancel the others.',{license:'BY-NC-SA',share:true,adapt:true,commercial:false,credit:true,sameLicense:true,outcome:'permitted'});
l('ncnd-combined','applied',['ncnd'],'A student wants to share an unchanged CC BY-NC-ND 4.0 poem on a personal, noncommercial reading page with no commercial purpose. Required credit and notices will be included.','Which plan is allowed under the stated license?',
'Share the unchanged poem noncommercially with attribution.',[
['Share a translated version on the same public page.','Translation is an adaptation, which this license does not authorize sharing.'],
['Sell the unchanged poem as a paid download.','Unchanged sharing must still satisfy NC.'],
['Share it without credit because both NC and ND are met.','BY remains a condition as well.']],
'The combination permits noncommercial sharing of unadapted material with attribution.','NC, ND and BY each do a different job.',{license:'BY-NC-ND',share:true,adapt:false,commercial:false,credit:true,outcome:'permitted'});
l('creator-chooses-license','foundational',['faq','by','sa','nd','nc'],'A student owns all rights in an original game sprite. They want others to be able to adapt it commercially, with credit, without requiring ShareAlike.','Which standard license best fits that stated goal?',
'CC BY 4.0.',[
['CC BY-NC 4.0.','NC would restrict the commercial uses the creator wants to permit.'],
['CC BY-ND 4.0.','ND would restrict sharing adaptations the creator wants to permit.'],
['CC BY-SA 4.0.','SA adds an adaptation licensing obligation the creator does not want.']],
'CC BY provides the requested reuse permissions with attribution, without NC, ND or SA.','Only someone with the relevant rights can grant them.');
l('nc-organization-not-test','nuanced',['faq','nc'],'A nonprofit school wants a CC BY-NC 4.0 photo for a project involving a sponsor. The facts do not explain whether the use is primarily directed toward commercial advantage or monetary compensation.','What is the best-supported conclusion?',
'More information about the use is needed to assess NC.',[
['It qualifies automatically because the user is a school.','Organizational status alone does not determine NC.'],
['It fails automatically because a sponsor is mentioned.','The sponsor label alone does not establish the purpose of this use.'],
['It qualifies automatically if the photographer is credited.','Credit addresses BY, not the commercial character of the use.']],
'NC focuses on the purpose and character of the use, not simply whether the user is a nonprofit or a school.','Clarify the actual use or seek separate permission rather than guessing.');
l('irrevocable-compliance','applied',['faq','by'],'A student obtained a texture under a valid CC BY 4.0 offer and continues to comply with every condition. Later the creator removes the CC badge and asks all compliant users to stop.','What is supported by the earlier license grant?',
'The compliant student may continue relying on that grant.',[
['Every existing license ends when the badge disappears.','A valid CC grant is not revoked merely by changing the website.'],
['The student must now remove all attribution.','Continuing reuse still requires compliance.'],
['The student now owns copyright because the badge disappeared.','A change in labeling does not transfer copyright.']],
'CC licenses are irrevocable for recipients who follow their terms. Preserve evidence of the valid grant.','This case explicitly assumes a valid authorized offer and continuing compliance.');
l('no-added-restrictions','nuanced',['by'],'A team redistributes a CC BY 4.0 image unchanged with attribution. Its download agreement would forbid recipients from making any further copies of that image.','Which action follows the CC license?',
'Remove the restriction on uses the image’s CC license permits.',[
['Keep the ban because attribution satisfies every condition.','BY also prohibits added legal restrictions on licensed freedoms.'],
['Keep the ban because the team hosts the download.','Hosting does not grant power to withdraw the license permissions.'],
['Replace the creator’s notice with a new all-rights-reserved notice.','A new notice does not remove the original CC grant.']],
'Reusers may not impose additional legal terms or effective technological measures that restrict the licensed permissions.','This addresses restrictions on the CC material, not ownership of unrelated original code.');
a('tasl-practical','foundational',['tasl','by'],'A source supplies the title “River Light,” creator Kai, a source link and CC BY 4.0. A student shares the image unchanged on a website.','Which credit is the best practical choice?',
'“River Light” — Kai; source link; CC BY 4.0 license link.',[
['“River Light” — image found somewhere online.','This omits the supplied creator, source and license information.'],
['Kai; a link to a search engine; no license listed.','A search page is not the supplied source, and the license is missing.'],
['CC BY 4.0; photographer and source intentionally omitted.','The supplied creator and source should be retained.']],
'Title, Author, Source and License (TASL) is a useful attribution practice; include the actual license link and supplied required information.','TASL is guidance, not an inflexible legal formula; version and medium matter.');
a('source-not-search','foundational',['tasl','by'],'A student’s CC BY 4.0 credit includes the supplied creator and license link but points only to a search-results page. The original source URL is available.','What should the student improve?',
'Use the original source link rather than the search-results link.',[
['Remove the creator because the search engine found the work.','Finding material does not make the search engine its creator.'],
['Replace the license link with the search engine’s logo.','The license should remain identifiable and accessible.'],
['Delete the source because a license link replaces it.','The license and the material’s source serve different purposes.']],
'Link to the licensed material when reasonably practicable using the supplied source information.','A discovery tool is not necessarily the source or author.');
a('unknown-creator','applied',['tasl','by'],'A trustworthy rights-holder page licenses an illustration under CC BY 4.0 but supplies no creator name or title. It does provide the work’s URL and license. No other attribution parties are designated.','What is the best attribution plan?',
'Retain available credits; do not invent a name.',[
['Invent an artist’s name to complete all four TASL fields.','Attribution should not fabricate missing information.'],
['Omit every credit because the creator field is absent.','Missing one field does not erase the available attribution information.'],
['Credit yourself as creator because the original is unnamed.','Unknown authorship does not make you the creator.']],
'Retain supplied required information and use reasonable available identification. TASL does not require inventing missing facts.','The scenario establishes authority to license; an unverified repost would raise a separate issue.');
a('no-title-four','foundational',['by','tasl'],'An original CC BY 4.0 photo has no supplied title. Its creator, source and license links are known. A student wants a practical website credit.','Which action is best?',
'Credit creator, source and license; invent no title.',[
['Invent a title and claim the creator supplied it.','Do not misrepresent missing source information.'],
['Treat the absent title as cancellation of the license.','A supplied title is not a prerequisite to the license grant.'],
['Omit the creator because the TASL list is incomplete.','Retain the supplied creator information.']],
'Include a title when supplied as good TASL practice. CC 4.0 does not independently require a title field the way earlier licenses did.','Version-specific requirements matter; four filled boxes are not the legal test.');
a('indicate-new-changes','applied',['by'],'A student recolors a CC BY 4.0 illustration and shares it. Their credit already contains the creator, source, license link and all supplied notices. It says nothing about the edit.','What should they add?',
'A clear note that the illustration was recolored.',[
['A statement that the original artist made the recoloring.','That would misattribute the student’s changes.'],
['A statement that editing removes the need for attribution.','Adapting a work does not erase BY conditions.'],
['Only the student’s name, replacing the original creator.','Credit for changes does not replace source attribution.']],
'CC 4.0 requires indicating that material was modified when sharing modified material.','Do not imply the original creator made or approved your changes.');
a('retain-prior-modifications','nuanced',['by'],'A CC BY 4.0 image comes with an existing note saying it was cropped by a previous adapter. A student changes its colors before sharing.','Which credit best handles the modification history?',
'Retain the crop note and add a note about the color changes.',[
['Replace the crop note with a claim that no earlier edits occurred.','CC 4.0 requires retaining an indication of previous modifications.'],
['Keep only the new color note and erase the supplied crop note.','A new edit does not eliminate the prior-modification indication.'],
['Credit the original creator but omit all modification notes.','Creator credit alone does not address modification indications.']],
'For CC 4.0, indicate your modifications and retain an indication of previous modifications.','A concise record is sufficient; this is not a demand for a complete editing diary.');
a('no-implied-endorsement','applied',['by'],'A game uses a CC BY 4.0 icon with complete attribution. The credits also say the icon’s creator officially endorses the game, although the creator never said this.','What should the team change?',
'Remove the unsupported endorsement claim while retaining attribution.',[
['Keep the claim because attribution implies approval.','A license does not imply endorsement.'],
['Remove all credit so the endorsement claim is less noticeable.','Removing required attribution creates another problem.'],
['Label the claim “CC BY” to make endorsement automatic.','A license label cannot establish the creator’s approval.']],
'Attribution must not suggest that the licensor endorses the user or use.','Permission to use an asset is different from permission to claim an endorsement.');
a('reasonable-medium','applied',['tasl','by'],'A short video uses several CC BY 4.0 images. All required credit information can be placed clearly in end credits and an accessible linked description.','Which approach is best supported?',
'Use accessible credits suited to the medium.',[
['Require full credits in every frame; all other layouts violate BY.','The license allows reasonable attribution suited to the medium, not this one rigid layout.'],
['Hide all credits in an unrelated private document.','Viewers need a reasonable way to access the credit information.'],
['Omit attribution because videos have limited space.','Space constraints do not cancel attribution conditions.']],
'Attribution can be provided in a reasonable manner appropriate to the medium and context.','A useful credit is accessible and identifies which work each credit covers.');
a('retain-supplied-notices','foundational',['by'],'A CC BY 4.0 download includes a creator name, copyright notice, license notice, disclaimer and source link. A student wants to remove everything except the creator’s name when sharing.','Which action follows the license most closely?',
'Retain the supplied required notices and source/license information.',[
['Keep only the creator because BY means a name alone.','CC 4.0 specifies more supplied information than just a name.'],
['Delete the disclaimer because the new use is educational.','Education does not cancel the retention conditions.'],
['Replace the original copyright notice with the student’s name.','Redistribution does not transfer copyright in the original.']],
'Appropriate credit includes supplied attribution parties and specified notices, along with license and source information as required.','TASL is a helpful starting point, not a substitute for all license conditions.');
a('version-title','nuanced',['by','tasl'],'A source expressly uses CC BY 3.0 and supplies a title. A student wants to omit it because a guide about CC 4.0 says titles are no longer a separate required field.','Which action is best supported?',
'Follow the stated 3.0 license and retain the supplied title.',[
['Apply 4.0 automatically because it is newer.','A reuser cannot simply replace the creator’s chosen license version.'],
['Omit the title because all CC versions have identical terms.','Attribution details differ across versions.'],
['Treat the source as public domain because its license is older.','An earlier license version is not a public-domain dedication.']],
'Earlier CC licenses require a supplied title; the 4.0 change does not rewrite a 3.0 grant.','This is the explicitly labeled version exception to the lab’s CC 4.0 default.');
const r=(...a)=>f('remix',...a),u=(...a)=>f('fair',...a);
r('nd-public-crop','foundational',['nd'],'A student crops and rearranges a CC BY-ND 4.0 illustration into a new composition; the scenario treats this as an adaptation. They want to publish the edited result. No exception is claimed.','Which action is best supported?',
'Get separate adaptation-sharing permission or use a different asset.',[
['Publish the adaptation after giving credit.','Credit does not override ND’s restriction on sharing adapted material.'],
['Publish it under CC BY-ND to cancel the original ND restriction.','Relabeling does not authorize sharing this adaptation.'],
['Publish it because every crop is automatically fair use.','A crop alone does not determine fair use.']],
'ND does not grant permission to share adapted material. The scenario explicitly establishes an adaptation rather than asking students to classify a borderline crop.','This is a license-permission question, not a ruling on an unstated exception.',{license:'BY-ND',share:true,adapt:true,commercial:false,credit:true,outcome:'permission'});
r('nd-private-adaptation','applied',['nd'],'A student privately makes an artistic adaptation of a CC BY-ND 4.0 image on their own device. They do not share it, and no other rights are at issue.','What does the 4.0 license allow?',
'Producing the private adaptation without sharing it.',[
['No private editing of any kind is ever allowed under ND.','The 4.0 license allows producing and reproducing adapted material, but not sharing it.'],
['Publishing the adaptation automatically because it was made privately.','Private creation does not authorize later public sharing.'],
['Removing all original notices before distributing the adaptation.','Neither notice removal nor distribution is authorized by these facts.']],
'CC BY-ND 4.0 distinguishes making an adaptation from sharing it.','Under NC-ND 4.0, private adaptation must also satisfy NC.',{license:'BY-ND',share:false,adapt:true,commercial:false,credit:true,outcome:'permitted'});
r('translation-is-adaptation','foundational',['faq','by'],'A student translates a CC BY 4.0 story into another language and plans to post the translation. The creator’s required information is available.','Which plan best respects the original work?',
'Credit and link the original and license, and identify the translation.',[
['Claim the translation has no connection to the original.','Translation is an adaptation of the source, not wholly unrelated authorship.'],
['Omit attribution because every word is in a different language.','Changing languages does not erase attribution obligations.'],
['Assume CC BY bans every publicly shared translation.','CC BY allows adaptations when its conditions are followed.']],
'Translation is a typical adaptation; CC BY permits sharing it with the applicable attribution and change notices.','The student may credit their translation contribution without replacing original credit.');
r('collection-not-adaptation','applied',['faq','sa'],'A gallery webpage places an unchanged CC BY-SA 4.0 image beside a separately created original essay. They remain separate works; the image is not adapted. Required image credit and license information are retained.','What does SA require for the separate essay in this case?',
'No automatic SA license for the separate essay.',[
['The essay must use SA merely because the image is nearby.','SA does not automatically relicense separate works in a collection.'],
['The essay’s license replaces the image’s license.','The unchanged image keeps its own license.'],
['The image cannot appear beside any differently licensed text.','A collection can retain distinct licenses for separate works.']],
'ShareAlike applies to shared adaptations, not automatically to every separate work collected alongside the original.','The scenario states the works remain separate to avoid a borderline adaptation question.');
r('compatible-by-sa','applied',['by','sa','faq'],'A student combines an original CC BY 4.0 illustration and a CC BY-SA 4.0 drawing into a single adaptation. Both creators authorized the licenses, and there are no other rights involved.','Which plan works with these stated licenses?',
'Share the adaptation under BY-SA 4.0, preserving both sources’ credits.',[
['Share the adaptation as all rights reserved with no credits.','This fails both attribution and ShareAlike obligations.'],
['Share under BY-NC-ND 4.0 because it is stricter.','Adding restrictions does not satisfy the BY-SA adaptation terms.'],
['Assume combining any two differently named CC licenses is impossible.','BY material can be incorporated into a BY-SA adaptation with compliance.']],
'BY allows adaptation; the BY-SA contribution requires the shared adaptation to use BY-SA or an applicable compatible license.','This conclusion is limited to the licenses and integrated adaptation expressly stated here.');
r('incompatible-nc-sa','nuanced',['nc','sa','faq'],'A team combines a CC BY-SA 4.0 drawing and CC BY-NC 4.0 art into one inseparable adaptation. They have no separate permissions and plan to share it under a single CC license.','What is the best next action?',
'Replace an incompatible input or obtain additional permissions.',[
['Use BY-SA and ignore the input’s NC restriction.','BY-SA cannot erase the NC condition on the source contribution.'],
['Use BY-NC-SA because adding NC always satisfies BY-SA.','BY-SA 4.0 does not permit adding that NC restriction to its adaptation.'],
['Use BY and satisfy everything with one combined credit.','Attribution alone does not resolve incompatible restrictions.']],
'The shared integrated adaptation cannot simply meet BY-SA by adding NC, nor drop NC from the other input.','Separate collections can be different; the facts here explicitly describe an inseparable adaptation.');
r('music-synchronized','nuanced',['nd','faq'],'A student synchronizes a CC BY-ND 4.0 song as background music to moving images in a publicly shared video. No separate permission or exception is claimed.','Which action is best supported by the CC terms?',
'Obtain permission or choose music allowing this shared adaptation.',[
['Publish because the audio file itself was not edited.','CC terms treat music synchronized with moving images as adapted material.'],
['Publish because videos do not count as sharing music.','The public video shares the synchronized music.'],
['Publish because credit removes ND.','Attribution does not waive ND.']],
'For CC licenses, synchronizing a musical work or sound recording with moving images produces adapted material. ND does not authorize sharing it.','A visually unchanged waveform does not settle whether a use is an adaptation.');
r('technical-format-change','foundational',['nd'],'A student converts a CC BY-ND 4.0 audio file to a different format solely for playback compatibility, with no creative alteration. They share it with all required attribution.','How do CC 4.0 terms treat this technical change?',
'Format conversion alone is not an adaptation.',[
['Every file-format change automatically violates ND.','CC 4.0 permits necessary technical modifications across media and formats.'],
['The conversion removes every attribution obligation.','Changing format does not remove attribution conditions.'],
['The conversion makes the recording public domain.','Technical changes do not end the original copyright.']],
'CC 4.0 permits technical modifications needed to exercise the licensed rights; those alone do not produce adapted material.','Creative edits or synchronization with video would raise a different question.');
r('own-versus-borrowed','foundational',['by','basics'],'A student adds original animation around a CC BY 4.0 illustration and shares the resulting adaptation. They want to state what they created and what came from the source.','Which plan best handles authorship?',
'Credit sources and changes; claim only original contributions.',[
['Claim the entire source illustration as original student work.','An adaptation does not transfer authorship of the borrowed expression.'],
['Remove the original license because new animation was added.','Source attribution and notices remain relevant.'],
['Give the original artist credit for all the new animation.','That would misattribute the student’s original contribution.']],
'Rights in new original contributions do not erase the rights or credit associated with source material.','Be precise about contributions rather than claiming all or none of the work.');
r('sa-private-then-publish','applied',['sa'],'A student privately adapts a CC BY-SA 4.0 image without distributing it. Later they decide to share the adaptation with the public.','When must the shared-adaptation licensing condition be addressed?',
'When sharing, use BY-SA 4.0 or an applicable compatible license.',[
['Immediately publish every private draft because SA requires disclosure.','SA does not require publication of private adaptations.'],
['Never, because the first draft was private.','Private creation does not exempt later sharing from SA.'],
['Only after charging money for the adaptation.','SA applies to sharing adaptations, including noncommercial sharing.']],
'SA is a condition on sharing adapted material; it does not compel publication of private drafts.','Attribution and other applicable conditions still matter when sharing.');
u('education-not-guarantee','foundational',['fair'],'A student wants to upload an entire recent film for a class project. The only justification offered is “It is for school”; no further purpose, amount rationale or market information is provided.','Can that fact alone establish fair use?',
'No; more facts and a context-specific analysis are needed.',[
['Yes; every educational use is automatically fair use.','Education is relevant but does not guarantee the outcome.'],
['Yes; a classroom connection removes all copyright.','Educational context does not end copyright.'],
['No; educational uses can never qualify as fair use.','Teaching is a recognized possible fair-use purpose.']],
'Fair use considers purpose, nature, amount/substantiality and market effect together.','The answer rejects automatic certainty; it does not declare this upload fair or unfair.');
u('seconds-not-safe-harbor','foundational',['fair'],'A student uses 20 seconds of a song in a public video. They give no details beyond the duration and say “Anything under 30 seconds is legal.”','Which response is best supported?',
'There is no automatic 30-second rule; analyze the actual use.',[
['Agree because duration alone guarantees fair use.','The Copyright Office identifies no fixed amount that guarantees fair use.'],
['Disagree because every use of any song is forbidden.','Licenses or applicable exceptions can permit some uses.'],
['Agree if the clip is also less than ten percent.','Combining two invented numeric thresholds does not establish fair use.']],
'Both quantity and qualitative importance matter along with the other factors.','A short clip can still contain an important part of a work.');
u('percentage-heart','applied',['fair'],'A review quotes a small percentage of a novel but includes its central climactic reveal. A classmate says the small percentage automatically settles fair use.','Which fact should the reviewer consider?',
'The qualitative importance of the excerpt as well as its size.',[
['Only the percentage, ignoring what the excerpt contains.','Substantiality includes qualitative importance, not just quantity.'],
['Only whether the author’s name appears in the review.','Credit alone does not determine the four-factor assessment.'],
['Only whether the review is written by a student.','Student status is not a numeric or categorical exemption.']],
'The amount factor includes whether the selection takes an important part of the original.','This observation identifies a consideration, not a final verdict.');
u('credit-not-fair-use','foundational',['fair'],'A blogger republishes a complete copyrighted essay with a prominent author credit. Their only fair-use argument is the credit; no other use facts are given.','Which conclusion is best supported?',
'Credit alone does not establish fair use; examine the use itself.',[
['The prominent credit guarantees fair use.','Attribution is not a substitute for a fair-use analysis.'],
['Omitting the credit would make fair use more likely automatically.','Changing credit does not supply an automatic fair-use rule.'],
['Every credited copy is public domain.','A credit does not change copyright status.']],
'Fair use concerns the particular use and statutory factors, not merely whether the source is named.','Academic citation and copyright permission answer different questions.');
u('nonprofit-not-guarantee','foundational',['fair'],'A community club shares a complete paid textbook online without charging readers. It claims that not making money by itself guarantees fair use.','Which response is best supported?',
'Noncommercial purpose matters, but amount and market effects also matter.',[
['No revenue means every copy is automatically fair use.','Noncommercial character is not the only factor.'],
['A club can never rely on any copyright exception.','The identity of a club does not eliminate possible exceptions.'],
['Giving the publisher a link automatically resolves market effects.','A link alone does not settle substitution for paid copies.']],
'A free distribution can still substitute for the original and affect its market.','The scenario rejects a guarantee rather than making a court-like final ruling.');
u('criticism-relevance','applied',['fair'],'A student closely analyzes a film’s editing and uses short relevant clips beside specific criticism of each clip. They ask which fact supports, without guaranteeing, a fair-use argument.','Which fact is most relevant to the stated purpose?',
'The clips are used as evidence for specific criticism.',[
['The clips play as unrelated decoration between paragraphs.','Decoration does not provide the same criticism-related purpose.'],
['The student calls the page “officially fair” in its title.','A self-assigned label is not evidence of fair use.'],
['The student changes the video player’s background color.','A cosmetic page change does not explain the clips’ critical purpose.']],
'Commentary or criticism can support fair use when the borrowed material serves that purpose. All factors still need consideration.','Relevant criticism is different from republishing entertainment with a new label.');
u('parody-target','applied',['fair'],'A student creates a parody that comments on a song itself and borrows recognizable elements to make that comment. A friend says the word “parody” guarantees permission.','Which response is best supported?',
'The commentary purpose is relevant, but all factors still need review.',[
['Any work labeled parody is automatically fair use.','Labels alone do not establish the legal outcome.'],
['A parody can never use recognizable elements of its target.','Recognizability can be relevant to the critical purpose.'],
['The amount borrowed can be ignored once parody is claimed.','Amount and substantiality remain part of the assessment.']],
'Parody may have a relevant critical purpose, but fair use remains fact-specific.','The game does not decide a real parody dispute from a single label.');
u('commercial-not-automatic-failure','nuanced',['fair'],'A paid magazine uses a short quotation in detailed criticism of a published article. A student says commercial publications can never qualify for fair use.','Which response is best supported?',
'Commerciality is relevant but does not automatically defeat fair use.',[
['Agree; earning money makes every unlicensed quotation unlawful.','Commercial uses are not categorically excluded from fair use.'],
['Disagree; criticism makes all four factors irrelevant.','A criticism purpose is relevant but not conclusive by itself.'],
['Disagree; a short quote always guarantees fair use.','No fixed short-quote rule guarantees the result.']],
'Purpose and commercial character are considered with the other factors, not as a single automatic veto.','This does not declare the magazine’s particular quotation fair.');
u('nature-and-unpublished','applied',['fair'],'A student compares quoting a published factual report with posting pages from an unpublished creative diary. Assume the proposed purpose and amount are otherwise comparable.','Which issue belongs in the fair-use analysis?',
'The work’s factual or creative nature and publication status.',[
['Only whether both files have the same extension.','File type does not determine the nature factor.'],
['Only whether the student adds the same credit line.','Credit does not replace assessment of the source work’s nature.'],
['Neither, because unpublished works have no copyright.','Unpublished original expression can be protected.']],
'The nature factor considers creativity versus factual content and whether a work is published.','No factor alone supplies the final outcome; unpublished status is not an absolute ban on fair use.');
u('transformative-market','nuanced',['fair'],'A site reposts complete high-resolution comics with only a color filter and calls them “transformative.” Readers can use the copies instead of buying the originals.','Which action best evaluates that claim?',
'Examine the actual new purpose, amount and potential market substitution.',[
['Accept the label because any visual change guarantees fair use.','Cosmetic change alone does not establish the purpose or full analysis.'],
['Ignore substitution because the site does not sell downloads.','A free substitute can still affect the original’s market.'],
['Count only how many colors were changed.','A color count is not the statutory fair-use analysis.']],
'A claimed new meaning or alteration is not a guaranteed result. The relationship to the original use, amount and market effects matters.','This asks what to examine, not students to issue a definitive legal ruling.');
