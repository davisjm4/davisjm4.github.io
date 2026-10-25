// 64 reviewed text families with five operational clues each.
export const FAMILIES=[
  {
    "id": "unserved-last-link",
    "mode": "barrier",
    "topic": "access",
    "barrier": "infrastructure",
    "context": "rural",
    "scene": "Residents have usable computers and can pay the quoted service price, but their homes cannot connect to a provider.",
    "prompt": "What is the primary barrier established by the network facts?",
    "answer": "Infrastructure",
    "wrong": [
      "Affordability",
      "Digital literacy",
      "Device suitability"
    ],
    "why": "The missing network connection prevents service at these homes even though payment and usable devices are in place.",
    "contrast": "Lower prices would help a cost barrier, but do not create the absent connection.",
    "details": [
      "No line or usable wireless coverage reaches the homes.",
      "The main network ends before the residential road.",
      "An installation survey finds no connection path to the homes.",
      "A neighborhood cabinet exists, but the final connections have not been built.",
      "The provider’s network does not yet extend to the occupied buildings."
    ],
    "solution": null
  },
  {
    "id": "recurring-cost",
    "mode": "barrier",
    "topic": "devices",
    "barrier": "affordability",
    "context": "school",
    "scene": "A student can use the required laptop and the home is in a provider’s service area.",
    "prompt": "Which barrier most directly explains the remaining access gap?",
    "answer": "Affordability",
    "wrong": [
      "Infrastructure",
      "Digital literacy",
      "Device availability"
    ],
    "why": "The service exists and the device is ready; the stated payment requirement prevents a sustainable home connection.",
    "contrast": "A coverage map describes availability, not whether the recurring bill is manageable.",
    "details": [
      "The lowest monthly price exceeds the household’s available service budget.",
      "The temporary discount ends before the school year, making the regular bill unaffordable.",
      "Required fees push the advertised price beyond the household’s budget.",
      "The family can cover installation but not the ongoing subscription.",
      "Paying the quoted bill would displace an essential household expense."
    ],
    "solution": null
  },
  {
    "id": "shared-device-window",
    "mode": "barrier",
    "topic": "devices",
    "barrier": "availability",
    "context": "learning",
    "scene": "A household has reliable, affordable Internet and people know how to use their learning platforms.",
    "prompt": "What is the immediate obstacle to simultaneous participation?",
    "answer": "Device availability",
    "wrong": [
      "Connection reliability",
      "Digital literacy",
      "Language access"
    ],
    "why": "The required people cannot each access a working device during the same session. Household ownership is not the same as timely availability.",
    "contrast": "More bandwidth would not add a second usable device.",
    "details": [
      "Two required live classes overlap, but only one working computer is available.",
      "The only working laptop is needed for a household member’s work during class.",
      "The shared tablet is unavailable for the full assessment window.",
      "A second device is awaiting replacement while required sessions overlap.",
      "The household’s device loan is returned before the evening class begins."
    ],
    "solution": null
  },
  {
    "id": "phone-task-mismatch",
    "mode": "barrier",
    "topic": "devices",
    "barrier": "suitability",
    "context": "mobile",
    "scene": "An applicant has a working smartphone, a stable connection and experience using online services.",
    "prompt": "Which barrier is specifically demonstrated by this task?",
    "answer": "Device suitability",
    "wrong": [
      "Device availability",
      "Affordability",
      "Digital literacy"
    ],
    "why": "The existing device cannot perform the required application workflow. Owning a connected phone does not establish suitability for every task.",
    "contrast": "This is not evidence that the applicant lacks skills; the stated feature is unsupported.",
    "details": [
      "The employer’s required assessment runs only on a supported desktop system.",
      "The required application software cannot be installed on the phone.",
      "The mobile form cannot attach the required portfolio format, although the file is available.",
      "The required editing workspace does not support the phone’s browser.",
      "The application requires a desktop tool that is not provided in a mobile version."
    ],
    "solution": null
  },
  {
    "id": "session-drops",
    "mode": "barrier",
    "topic": "access",
    "barrier": "reliability",
    "context": "telehealth",
    "scene": "A patient has a suitable device, understands the appointment system and has enough data capacity when the connection works.",
    "prompt": "Which barrier most directly interrupts the video appointment?",
    "answer": "Connection reliability",
    "wrong": [
      "Bandwidth",
      "Language access",
      "Device suitability"
    ],
    "why": "Repeated disconnections prevent a sustained session; adequate capacity during a brief test does not establish reliability.",
    "contrast": "A faster plan does not by itself repair the stated outages.",
    "details": [
      "The connection repeatedly disconnects during the appointment.",
      "The link loses service several times in a typical appointment period.",
      "Unscheduled outages break the live session despite acceptable connected speeds.",
      "The network frequently needs to reconnect before the visit ends.",
      "A test visit is interrupted by recurring loss of connectivity."
    ],
    "solution": null
  },
  {
    "id": "upstream-capacity",
    "mode": "barrier",
    "topic": "access",
    "barrier": "bandwidth",
    "context": "work",
    "scene": "A worker’s computer and connection remain connected. The job requires timely transfer of large work files.",
    "prompt": "Which limitation is established by the transfer evidence?",
    "answer": "Bandwidth",
    "wrong": [
      "Connection reliability",
      "Digital literacy",
      "Device availability"
    ],
    "why": "The task exceeds available upload or shared data capacity, even though the connection remains active.",
    "contrast": "A stable connection can still have insufficient capacity for a particular task.",
    "details": [
      "The measured upload capacity is below the job’s stated transfer requirement.",
      "Other required household transfers use most of the shared capacity.",
      "The upload link is full throughout the transfer window, producing long queues.",
      "Download tests are fast, but the much smaller upload capacity misses the work requirement.",
      "The available connection can carry small messages but not the required file volume in time."
    ],
    "solution": null
  },
  {
    "id": "task-guidance",
    "mode": "barrier",
    "topic": "skills",
    "barrier": "literacy",
    "context": "government",
    "scene": "Residents have suitable devices, affordable reliable service and a form in a language they understand.",
    "prompt": "Which barrier is demonstrated by the observed task difficulty?",
    "answer": "Digital literacy",
    "wrong": [
      "Infrastructure",
      "Language access",
      "Device availability"
    ],
    "why": "Observed difficulty with the required steps supports task-specific instruction and practice; the hardware and language are already usable.",
    "contrast": "The conclusion comes from the demonstrated task, not a demographic assumption.",
    "details": [
      "Practice sessions show that participants need instruction in attaching a file.",
      "Participants can read the form but have not learned how to submit and confirm it.",
      "Observed users need guided practice saving a copy of their completed application.",
      "Participants request instruction in navigating the portal’s account and document steps.",
      "A task demonstration shows confusion about finding the saved file needed for submission."
    ],
    "solution": null
  },
  {
    "id": "input-method-barrier",
    "mode": "barrier",
    "topic": "skills",
    "barrier": "accessibility",
    "context": "banking",
    "scene": "A person has the necessary device, connection and account knowledge. Their supported input method cannot complete an essential banking task.",
    "prompt": "Which barrier is directly demonstrated?",
    "answer": "Accessibility",
    "wrong": [
      "Affordability",
      "Connection reliability",
      "Language access"
    ],
    "why": "The interface blocks an intended access method even though the person has the other resources needed.",
    "contrast": "Training cannot substitute for an interface control that does not support the required method.",
    "details": [
      "A required confirmation control cannot be reached using the keyboard.",
      "The screen reader receives no label for an essential account control.",
      "The confirmation dialog traps focus away from its required action.",
      "Essential error instructions are supplied only as an unlabeled image.",
      "The transaction step ignores the person’s supported assistive input."
    ],
    "solution": null
  },
  {
    "id": "instructions-language",
    "mode": "barrier",
    "topic": "skills",
    "barrier": "language",
    "context": "language",
    "scene": "A student has suitable equipment, reliable service and experience completing the same type of form.",
    "prompt": "What is the specific obstacle described here?",
    "answer": "Language access",
    "wrong": [
      "Digital literacy",
      "Device suitability",
      "Infrastructure"
    ],
    "why": "The problem is understanding the service’s instructions in the supplied language, not a demonstrated lack of digital skills.",
    "contrast": "A person can have strong technical skills while needing information in another language.",
    "details": [
      "The enrollment instructions are offered only in a language the student does not understand.",
      "The help channel cannot explain the form in a language the student uses.",
      "The translated landing page leads to essential instructions that remain untranslated.",
      "The final confirmation gives crucial directions only in an unfamiliar language.",
      "The available language version omits the required document instructions."
    ],
    "solution": null
  },
  {
    "id": "repair-and-recovery",
    "mode": "barrier",
    "topic": "impacts",
    "barrier": "support",
    "context": "business",
    "scene": "A small business previously used its online service successfully with existing equipment and connectivity.",
    "prompt": "Which barrier now prevents restoration of that access?",
    "answer": "Technical support",
    "wrong": [
      "Digital literacy",
      "Bandwidth",
      "Language access"
    ],
    "why": "The stated need is repair or account recovery, not initial ownership or a general inference about skills.",
    "contrast": "A new skills course does not necessarily repair a failed component or restore an authorized account.",
    "details": [
      "A failed router needs repair, but no maintenance help is available before orders are due.",
      "The approved account-recovery process has no reachable assistance channel.",
      "A supported software update fails and the service offers no troubleshooting route.",
      "Replacement equipment is present, but authorized setup assistance cannot be reached.",
      "A broken required service configuration remains unresolved in the support queue."
    ],
    "solution": null
  },
  {
    "id": "reachable-terminal",
    "mode": "barrier",
    "topic": "impacts",
    "barrier": "physical",
    "context": "library",
    "scene": "A library provides usable computers and free reliable Internet. A resident can use both once at the site.",
    "prompt": "Which barrier limits the resident’s benefit from this provision?",
    "answer": "Physical access",
    "wrong": [
      "Bandwidth",
      "Digital literacy",
      "Device suitability"
    ],
    "why": "The site’s resources are useful only when the resident can reach them at a usable time.",
    "contrast": "Resources being free does not establish that the location or hours are reachable.",
    "details": [
      "The only branch is beyond the resident’s available transportation route.",
      "The branch closes before the resident can leave work.",
      "The resident’s available transport stops before the scheduled access period.",
      "The round trip cannot fit inside the required application window.",
      "The access room is available only during the resident’s required work hours."
    ],
    "solution": null
  },
  {
    "id": "data-budget",
    "mode": "barrier",
    "topic": "impacts",
    "barrier": "affordability",
    "context": "urban",
    "scene": "A learner has a suitable mobile device, knows the platform and receives a strong signal.",
    "prompt": "Which barrier explains losing access near the end of the month?",
    "answer": "Affordability",
    "wrong": [
      "Infrastructure",
      "Digital literacy",
      "Device suitability"
    ],
    "why": "The required data volume costs more than the learner can sustain; signal availability is not the limiting fact.",
    "contrast": "A strong signal does not make additional data free.",
    "details": [
      "Required course video uses the paid allowance, and the learner cannot buy the needed extra data.",
      "The low-cost plan’s included data runs out before required lessons end.",
      "Additional lesson access incurs charges beyond the learner’s available budget.",
      "The only affordable plan covers less data than the required learning materials use.",
      "Paying for the remaining required video would exceed the monthly connectivity budget."
    ],
    "solution": null
  },
  {
    "id": "training-without-hardware",
    "mode": "barrier",
    "topic": "solutions",
    "barrier": "availability",
    "context": "training",
    "scene": "A center offers useful digital-skills instruction and attendees can follow the lesson.",
    "prompt": "Which remaining barrier prevents practice between sessions?",
    "answer": "Device availability",
    "wrong": [
      "Digital literacy",
      "Language access",
      "Connection reliability"
    ],
    "why": "The training helps skills, but a working device still needs to be available for practice.",
    "contrast": "A completed lesson does not supply hardware for later use.",
    "details": [
      "The only practice computers remain at the center after class.",
      "Attendees have no working device available during the required practice period.",
      "The class loan ends before the practice assignment begins.",
      "The center’s computers cannot be taken home and no other devices are available.",
      "The shared practice device is booked during all available practice times."
    ],
    "solution": null
  },
  {
    "id": "router-not-service",
    "mode": "barrier",
    "topic": "solutions",
    "barrier": "infrastructure",
    "context": "rural",
    "scene": "A community distributes working Wi-Fi routers, and residents know how to connect devices to them.",
    "prompt": "What primary barrier remains for reaching online services?",
    "answer": "Infrastructure",
    "wrong": [
      "Digital literacy",
      "Device suitability",
      "Language access"
    ],
    "why": "A router can create a local wireless network without an upstream path to the Internet.",
    "contrast": "Installing more local access points does not create an absent upstream connection.",
    "details": [
      "There is no upstream Internet connection to attach the routers to.",
      "No provider line or usable backhaul reaches the routers.",
      "The local Wi-Fi signal is present, but no external network path has been built.",
      "The routers join devices locally while the connection to a provider is still missing.",
      "The planned network connection beyond the community has not been installed."
    ],
    "solution": null
  },
  {
    "id": "captions-remaining",
    "mode": "barrier",
    "topic": "solutions",
    "barrier": "accessibility",
    "context": "assistive",
    "scene": "A learning service supplies devices and affordable connections. A participant needs text equivalents for essential spoken material.",
    "prompt": "Which barrier remains after the device and connection program?",
    "answer": "Accessibility",
    "wrong": [
      "Affordability",
      "Infrastructure",
      "Device availability"
    ],
    "why": "The participant still needs access to the information itself. Equipment and a connection do not provide missing text equivalents.",
    "contrast": "A stronger connection will deliver the same inaccessible information more quickly.",
    "details": [
      "Essential spoken instructions have no captions or transcript.",
      "The assessment’s required audio directions have no usable text version.",
      "The supplied captions omit the steps needed to complete the task.",
      "A required live discussion has no supported text access option.",
      "The replay offers audio controls but no equivalent of the essential speech."
    ],
    "solution": null
  },
  {
    "id": "usable-service-hours",
    "mode": "barrier",
    "topic": "solutions",
    "barrier": "service",
    "context": "center",
    "scene": "A community has devices and connectivity and can use the booking system. The organization offers assistance only through a staffed remote service.",
    "prompt": "Which barrier is established by the offered service schedule?",
    "answer": "Service availability",
    "wrong": [
      "Device suitability",
      "Bandwidth",
      "Digital literacy"
    ],
    "why": "The required service is not offered during a time the intended users can use it; owning connected devices does not create that channel.",
    "contrast": "Faster access does not change the organization’s service hours.",
    "details": [
      "No assistance session is offered outside the users’ required work hours.",
      "All offered booking slots conflict with a documented essential commitment.",
      "The service has removed its evening channel without an alternative at a usable time.",
      "The only staffed channel is closed during the users’ available access period.",
      "The organization has no service appointment within the required application deadline."
    ],
    "solution": null
  },
  {
    "id": "lesson-live-capacity",
    "mode": "impact",
    "topic": "access",
    "barrier": "bandwidth",
    "context": "learning",
    "scene": "A class requires live participation. Students have suitable devices and can operate the platform, but the shared connection cannot carry all required streams.",
    "prompt": "Which risk follows most directly from the capacity limit?",
    "answer": "Some students may miss parts of the live lesson.",
    "wrong": [
      "Some students may need help logging in.",
      "Some students may lack the required application version.",
      "Some students may need a different language version."
    ],
    "why": "Limited shared capacity can interrupt live participation even when devices and skills are adequate.",
    "contrast": "The scenario establishes a capacity problem, not missing login skills or a language need.",
    "details": [
      "Required sessions occur at the same time.",
      "Other essential household traffic overlaps the lesson.",
      "The available upload rate cannot sustain required participation.",
      "The course requires a video stream that exceeds the available capacity.",
      "The bottleneck lasts throughout the interactive lesson period."
    ],
    "solution": null
  },
  {
    "id": "outage-application",
    "mode": "impact",
    "topic": "access",
    "barrier": "reliability",
    "context": "jobs",
    "scene": "An applicant has the correct files and knows the application process. The connection repeatedly drops before the online submission finishes.",
    "prompt": "Which consequence is most directly supported?",
    "answer": "A completed application may not reach the employer in time.",
    "wrong": [
      "A submitted application may use the wrong document format.",
      "The applicant may need coaching in writing a resume.",
      "The employer may need a different language version of the form."
    ],
    "why": "The interruption threatens submission and confirmation before the deadline, not the applicant’s qualifications.",
    "contrast": "A resume workshop addresses a different need; the prepared application is being interrupted during transfer.",
    "details": [
      "The deadline occurs before the next dependable access period.",
      "The form does not save an interrupted upload.",
      "The applicant must restart after each disconnection.",
      "The confirmation page is never reached during repeated attempts.",
      "The final required file upload cannot survive a dropped session."
    ],
    "solution": null
  },
  {
    "id": "unreached-warnings",
    "mode": "impact",
    "topic": "access",
    "barrier": "infrastructure",
    "context": "emergency",
    "scene": "An agency moves an important warning to an online-only channel. The affected homes have no usable Internet path, even though residents can read the message when it is provided.",
    "prompt": "Which risk follows directly from the delivery change?",
    "answer": "Some residents may not receive the warning through that channel.",
    "wrong": [
      "Some residents may be unable to understand the warning language.",
      "Some residents may lack skills to evaluate the warning’s source.",
      "Some residents may receive a lower-resolution version of the message."
    ],
    "why": "An online-only delivery path can exclude people without a network route. The scenario gives no evidence of a language or skill problem.",
    "contrast": "Message readability is not the same as receiving the message.",
    "details": [
      "The warning is published only in the web portal.",
      "The previously available phone alert is discontinued.",
      "The agency stops providing the local non-Internet notice channel.",
      "The new notice requires a working online connection at the time of release.",
      "No alternative delivery method is included in the new plan."
    ],
    "solution": null
  },
  {
    "id": "assessment-on-phone",
    "mode": "impact",
    "topic": "devices",
    "barrier": "suitability",
    "context": "college",
    "scene": "A student has reliable mobile Internet and can complete ordinary online tasks, but a required college assessment needs a desktop-only application.",
    "prompt": "Which consequence is most directly supported?",
    "answer": "Phone ownership alone may not enable this assessment.",
    "wrong": [
      "The student may need general training in using a browser.",
      "The student may need a higher data allowance for a supported app.",
      "The assessment may require translating instructions into another language."
    ],
    "why": "The stated obstacle is unsupported required software on the available device, not whether the phone connects at all.",
    "contrast": "More mobile data does not install unsupported desktop software.",
    "details": [
      "The application has no supported mobile version.",
      "The required assessment tool cannot run in the phone browser.",
      "The assessment requires a desktop environment unavailable on the phone.",
      "The student’s phone meets ordinary communication needs but not the specified software requirement.",
      "A working desktop access option is not currently provided."
    ],
    "solution": null
  },
  {
    "id": "subscription-work-window",
    "mode": "impact",
    "topic": "devices",
    "barrier": "affordability",
    "context": "work",
    "scene": "A remote worker has suitable equipment and the necessary skills, but cannot sustain the service plan required for home work.",
    "prompt": "Which work-related risk follows most directly?",
    "answer": "Scheduled work access may be interrupted when paid service lapses.",
    "wrong": [
      "Work access may be blocked by an unsupported operating system.",
      "Scheduled tasks may need translation to be understood.",
      "A supported task may need keyboard-accessibility repairs."
    ],
    "why": "A recurring cost barrier can disrupt continued work access despite readiness in other respects.",
    "contrast": "Device replacement does not directly meet the service bill.",
    "details": [
      "The temporary price reduction ends before the work contract.",
      "Required monthly charges exceed the available connectivity budget.",
      "The worker can pay installation but not the recurring rate.",
      "The minimum available plan includes fees beyond the sustainable budget.",
      "The prepaid service cannot be renewed for the next required work period."
    ],
    "solution": null
  },
  {
    "id": "shared-equipment-practice",
    "mode": "impact",
    "topic": "devices",
    "barrier": "availability",
    "context": "training",
    "scene": "A skills program teaches useful tasks, but attendees cannot obtain a working practice device during the time between sessions.",
    "prompt": "Which limitation is most directly supported?",
    "answer": "Participants may have fewer opportunities to practice the new skills.",
    "wrong": [
      "Participants may have difficulty understanding the course language.",
      "Participants may need a faster upload plan on available equipment.",
      "Participants may need repairs to a particular website control."
    ],
    "why": "Skills can be taught without equal opportunities to use them afterward. Lack of practice equipment limits effective participation.",
    "contrast": "The training’s existence is not evidence that practice hardware is available.",
    "details": [
      "All center devices remain at the site overnight.",
      "The loan ends before the between-session activity begins.",
      "The only shared device is occupied during the practice window.",
      "The available practice slots all overlap required work.",
      "No working device is provided for the required take-home task."
    ],
    "solution": null
  },
  {
    "id": "portal-help-gap",
    "mode": "impact",
    "topic": "skills",
    "barrier": "literacy",
    "context": "health",
    "scene": "A patient has suitable equipment, reliable affordable service and understandable instructions, but a task demonstration shows they need help with the portal workflow.",
    "prompt": "Which risk follows most directly if the workflow becomes the only route?",
    "answer": "Portal-only enrollment may delay the person’s access to the service.",
    "wrong": [
      "The person may need a new network connection to the building.",
      "The service may need a higher-capacity upload link.",
      "The person may need instructions in a different language."
    ],
    "why": "An observed task-specific skills gap can impede the enrollment process even when the technical resources are available.",
    "contrast": "The observation supports assistance with the task, not an assumption about all users in a demographic group.",
    "details": [
      "The person has not learned the required attachment step.",
      "The person needs guided practice confirming submission.",
      "The person cannot yet locate the saved form during the demonstrated task.",
      "The account-navigation step is unfamiliar during the observed task.",
      "The person requests instruction in saving and returning to the application."
    ],
    "solution": null
  },
  {
    "id": "inaccessible-payment",
    "mode": "impact",
    "topic": "skills",
    "barrier": "accessibility",
    "context": "banking",
    "scene": "A banking site requires a control that the customer’s supported assistive input cannot operate. Their device, connection and account knowledge are sufficient.",
    "prompt": "Which consequence is most directly supported?",
    "answer": "The customer may be unable to complete the required transaction independently.",
    "wrong": [
      "The customer may need to purchase a faster service plan.",
      "The customer may need a general lesson on account security.",
      "The customer may need a different language for the instructions."
    ],
    "why": "A required inaccessible interaction can block an otherwise prepared user from completing the service task.",
    "contrast": "This is evidence about the interface, not evidence that the person lacks knowledge.",
    "details": [
      "The final confirmation is mouse-only.",
      "The transaction dialog cannot be reached from the keyboard.",
      "A required control has no usable assistive-technology label.",
      "Focus is trapped before the essential confirmation step.",
      "The essential verification message has no accessible equivalent."
    ],
    "solution": null
  },
  {
    "id": "language-service-message",
    "mode": "impact",
    "topic": "skills",
    "barrier": "language",
    "context": "language",
    "scene": "A resident regularly uses digital tools, but essential government-service instructions are offered only in a language they do not understand.",
    "prompt": "Which risk is most directly supported?",
    "answer": "Important application requirements may be misunderstood or missed.",
    "wrong": [
      "The resident may need instruction in connecting a device to Wi-Fi.",
      "The network may need more upload capacity for the form.",
      "The device may lack the application’s required operating system."
    ],
    "why": "Unusable language can impede understanding of requirements without implying low technical ability.",
    "contrast": "A general computer course does not supply the missing language access.",
    "details": [
      "The document checklist has no usable language version.",
      "The correction notice is untranslated.",
      "The support channel cannot explain the required steps in an understood language.",
      "The final submission instructions appear only in the unfamiliar language.",
      "The available translation omits the explanation of a required document."
    ],
    "solution": null
  },
  {
    "id": "business-repair-delay",
    "mode": "impact",
    "topic": "impacts",
    "barrier": "support",
    "context": "business",
    "scene": "A small business has used its online ordering system successfully. A repair or authorized recovery is now needed, but timely assistance is unavailable.",
    "prompt": "Which consequence follows most directly?",
    "answer": "Online order processing may be delayed while access is restored.",
    "wrong": [
      "The staff may need introductory training in all computer tasks.",
      "Customers may need to translate the shop’s product descriptions.",
      "The business may need an Internet line extended to its building."
    ],
    "why": "Existing usable resources can become unusable without maintenance or recovery support. The stated problem is restoration.",
    "contrast": "Past successful use is compatible with needing technical help after a failure.",
    "details": [
      "The required configuration fault remains in the support queue.",
      "A broken router cannot be repaired before the order window.",
      "The recovery request has no reachable authorized contact.",
      "Replacement equipment is available but setup help is not.",
      "A failed supported update has not received troubleshooting assistance."
    ],
    "solution": null
  },
  {
    "id": "digital-ticket-only",
    "mode": "impact",
    "topic": "impacts",
    "barrier": "service",
    "context": "transit",
    "scene": "A transit agency replaces its functioning non-app ticket channel with app-only sales. Some riders do not have usable access to that app.",
    "prompt": "Which consequence is most directly supported?",
    "answer": "Some riders may lose a usable way to obtain tickets.",
    "wrong": [
      "Some riders may need help changing the app’s display language.",
      "Some riders may need account recovery on an otherwise usable app.",
      "Some riders may need a faster app connection rather than an alternative purchase route."
    ],
    "why": "Removing a usable alternative can exclude riders whose app access has not been established.",
    "contrast": "A service design change does not demonstrate that the underlying need or preference disappeared.",
    "details": [
      "The cash counter is removed without another supported option.",
      "The phone booking channel is discontinued.",
      "The new policy provides no assisted purchase alternative.",
      "The ticket machine route is removed before app access is checked.",
      "No replacement channel is offered for riders excluded by the app requirement."
    ],
    "solution": null
  },
  {
    "id": "far-shared-access",
    "mode": "impact",
    "topic": "impacts",
    "barrier": "physical",
    "context": "library",
    "scene": "A library offers free connected computers, but an applicant cannot reach the facility during the required application period.",
    "prompt": "Which effect follows most directly from the access conditions?",
    "answer": "The free computers may not provide timely access for this applicant.",
    "wrong": [
      "The applicant may lack interest in the advertised opportunity.",
      "The free connection may require more data capacity at home.",
      "The library may need to replace the application’s language version."
    ],
    "why": "Public provision helps only when people can reach and use it at the required time.",
    "contrast": "Nonuse caused by travel or hours is not evidence of disinterest.",
    "details": [
      "Opening hours overlap the applicant’s required shift.",
      "No available transport reaches the branch before it closes.",
      "The round trip exceeds the submission window.",
      "The accessible transport route does not operate during the offered session.",
      "The only appointment is after the employer’s deadline."
    ],
    "solution": null
  },
  {
    "id": "offline-study-option",
    "mode": "impact",
    "topic": "solutions",
    "barrier": "bandwidth",
    "context": "school",
    "scene": "A course replaces mandatory large live downloads with small materials that can be downloaded once and used offline. Students still need a device and an initial connection.",
    "prompt": "Which benefit is directly supported, without claiming complete access?",
    "answer": "The change can reduce repeated data demand for study.",
    "wrong": [
      "The change can supply a working device to every learner.",
      "The change can remove the need for any initial transfer.",
      "The change can ensure that every learner understands the material."
    ],
    "why": "Offline-compatible materials can reduce recurring transfer needs while leaving initial access and other barriers to address.",
    "contrast": "A delivery-format change does not itself supply hardware or teach the material.",
    "details": [
      "Practice can continue after the initial download.",
      "The readings do not require a continuous video stream.",
      "The small lesson package can be reused without downloading it again.",
      "The required exercises can be saved for later offline use.",
      "Only the final small response needs a later upload."
    ],
    "solution": "offline"
  },
  {
    "id": "community-partner-reach",
    "mode": "impact",
    "topic": "solutions",
    "barrier": "physical",
    "context": "center",
    "scene": "A program makes the same usable connected equipment available through nearby partner sites in addition to its central office. The partners have confirmed capacity and usable hours.",
    "prompt": "Which potential improvement is most directly supported?",
    "answer": "Some users can obtain access with a shorter or more workable trip.",
    "wrong": [
      "The added sites establish that recurring home-service costs are now affordable.",
      "The partners establish that every required task can now be completed on a phone.",
      "The confirmed location agreements establish that site-accessibility testing is unnecessary."
    ],
    "why": "Additional workable locations can reduce a travel or scheduling burden, without eliminating all other access needs.",
    "contrast": "A public site does not itself create home service or guarantee accessible design.",
    "details": [
      "A partner opens during a previously unserved evening period.",
      "A partner is reachable on an available transport route.",
      "The new site fits within the users’ application travel window.",
      "A partner offers confirmed slots closer to affected users.",
      "The local partner supplies the same supported task access with usable transport connections."
    ],
    "solution": "partnership"
  },
  {
    "id": "maintenance-after-gift",
    "mode": "impact",
    "topic": "solutions",
    "barrier": "support",
    "context": "urban",
    "scene": "A program supplies suitable devices, but has no repair, replacement or technical-help plan after handoff. Participants already know how to use the required services.",
    "prompt": "Which ongoing access risk most directly follows?",
    "answer": "A later failure may leave a supplied device unusable for required tasks.",
    "wrong": [
      "A completed handoff establishes continuing usability without a repair plan.",
      "Supplying the device also establishes that recurring service charges are covered.",
      "Device ownership establishes that every required service supports the user’s access method."
    ],
    "why": "A one-time handoff can improve availability while leaving long-term maintenance and recovery needs unresolved.",
    "contrast": "The documented risk is continuity after a failure, not a stereotype about the participants’ skills.",
    "details": [
      "The required component has no repair coverage.",
      "No authorized recovery support is included for service accounts.",
      "The program has no replacement route for a failed device.",
      "Supported configuration failures have no assistance channel.",
      "Devices are supplied without access to needed maintenance help."
    ],
    "solution": "support"
  },
  {
    "id": "channels-for-participation",
    "mode": "impact",
    "topic": "solutions",
    "barrier": "service",
    "context": "government",
    "scene": "A public consultation keeps an online response route and adds a usable phone and in-person route. Both alternatives accept the same input before the same deadline.",
    "prompt": "Which improvement is directly supported?",
    "answer": "People lacking usable online access have additional ways to participate.",
    "wrong": [
      "The added routes establish equal participation rates for every group.",
      "The added routes establish that the consultation’s responses represent all residents.",
      "The added routes demonstrate that every remaining interaction barrier has been removed."
    ],
    "why": "Equivalent alternative channels can expand opportunities to contribute; participation levels and representativeness still need evidence.",
    "contrast": "Providing an opportunity is different from measuring who actually uses it.",
    "details": [
      "Phone responses enter the same review process.",
      "In-person responses meet the same submission rules.",
      "The alternatives are offered during usable service hours.",
      "The non-web routes are publicized in understandable instructions.",
      "Staff can accept the same required material through the alternate channels."
    ],
    "solution": "channels"
  },
  {
    "id": "build-unserved-path",
    "mode": "solution",
    "topic": "access",
    "barrier": "infrastructure",
    "context": "rural",
    "scene": "A community has equipment, willing subscribers and no usable provider path. Its funded objective is a sustainable home connection; the site survey rules out current hotspot coverage.",
    "prompt": "Which action most directly addresses that infrastructure objective?",
    "answer": "Build a verified network connection to the unserved homes.",
    "wrong": [
      "Discount a service the homes cannot yet reach.",
      "Offer general skills classes using the existing offline devices.",
      "Install local Wi-Fi routers without connecting an upstream link."
    ],
    "why": "The absent network path must be established before a subscription or local router can provide home Internet.",
    "contrast": "A discount does not create coverage where the service cannot be delivered.",
    "details": [
      "The approved plan includes a feasible last-mile route.",
      "The survey identifies a feasible backhaul and household connection route.",
      "Funding and permission for the proposed connection have been confirmed.",
      "The construction proposal includes the missing upstream connection.",
      "The network plan verifies service delivery to the affected buildings."
    ],
    "solution": "infrastructure"
  },
  {
    "id": "repair-unreliable-link",
    "mode": "solution",
    "topic": "access",
    "barrier": "reliability",
    "context": "telehealth",
    "scene": "A clinic’s remote-visit link has adequate capacity but recurrent faults interrupt sessions. Qualified technical staff can repair the identified fault.",
    "prompt": "Which action most directly restores dependable sessions?",
    "answer": "Repair and test the connection fault with technical assistance.",
    "wrong": [
      "Buy more devices with the same faulty connection.",
      "Teach the appointment workflow without repairing the link.",
      "Upgrade the already adequate capacity without repairing the fault."
    ],
    "why": "A verified fault needs repair and sustained-session testing. Extra devices or task training do not remove that fault.",
    "contrast": "Capacity and reliability are different; the scenario already establishes sufficient capacity.",
    "details": [
      "The fault is a failing connection component.",
      "Diagnostics identify a damaged local network connection.",
      "A supported configuration fault has been reproduced.",
      "The technician has isolated the source of repeated disconnections.",
      "The repair team can test the link across the required appointment duration."
    ],
    "solution": "support"
  },
  {
    "id": "fit-task-to-capacity",
    "mode": "solution",
    "topic": "access",
    "barrier": "bandwidth",
    "context": "learning",
    "scene": "A course has a fixed low-capacity connection and usable devices. Its objective is independent reading and short responses; live video is not essential and small offline packages are supported.",
    "prompt": "Which change most directly reduces the required ongoing data load?",
    "answer": "Offer small downloadable materials and offline-compatible practice.",
    "wrong": [
      "Require all learners to use higher-resolution live streams.",
      "Lend additional devices without changing the required video load.",
      "Repeat login training while keeping the same stream requirement."
    ],
    "why": "Changing the delivery format can meet this stated learning objective with fewer repeated transfers.",
    "contrast": "More devices do not increase the available shared capacity; live video is explicitly unnecessary here.",
    "details": [
      "Students can download the package during a short connection window.",
      "The task can be completed after disconnecting.",
      "The response can be submitted as a small later transfer.",
      "The materials can be reused without repeated downloads.",
      "The supported package contains the same required reading content."
    ],
    "solution": "offline"
  },
  {
    "id": "sustainable-home-plan",
    "mode": "solution",
    "topic": "devices",
    "barrier": "affordability",
    "context": "school",
    "scene": "Students already have working school laptops and available home coverage. The objective is sustained home connectivity through the school year.",
    "prompt": "Which action most directly addresses the stated remaining barrier?",
    "answer": "Arrange a verified affordable service option for the required period.",
    "wrong": [
      "Purchase another laptop for each already-equipped student.",
      "Expand public computer appointments outside the required home-use periods.",
      "Provide platform lessons without addressing the recurring bill."
    ],
    "why": "The obstacle is the recurring cost of an available service. The option must be affordable and deliverable for the actual period of need.",
    "contrast": "Public access can help other goals but does not provide this required home connection.",
    "details": [
      "A confirmed eligible service program fits the family’s budget.",
      "A negotiated plan covers the school year at a sustainable total cost.",
      "The service offer includes required fees within the available budget.",
      "The proposed assistance continues beyond the temporary introductory discount.",
      "Eligibility, local coverage and continuing monthly charges have been checked."
    ],
    "solution": "affordable"
  },
  {
    "id": "loans-at-needed-time",
    "mode": "solution",
    "topic": "devices",
    "barrier": "availability",
    "context": "college",
    "scene": "Students have usable service and relevant skills, but required simultaneous tasks exceed the number of available working devices. Compatible loans can cover the full task period.",
    "prompt": "Which response most directly addresses availability?",
    "answer": "Lend compatible devices for the overlapping required work periods.",
    "wrong": [
      "Upgrade the shared connection while keeping the same device count.",
      "Offer another general skills session without practice devices.",
      "Extend a public room’s hours outside the required task window."
    ],
    "why": "The existing connection and skills do not supply enough devices during the overlap. Timely lending addresses that specific gap.",
    "contrast": "A device counts as available only if it can be used during the required period.",
    "details": [
      "The loan lasts through both overlapping assessment sessions.",
      "The checkout schedule covers the required evening tasks.",
      "The loan pool has enough tested devices for the affected overlap.",
      "Students can collect the loan before the task begins.",
      "The loan terms allow use for the entire required activity."
    ],
    "solution": "lending"
  },
  {
    "id": "supported-public-workstation",
    "mode": "solution",
    "topic": "devices",
    "barrier": "suitability",
    "context": "jobs",
    "scene": "An applicant’s connected phone cannot run the required assessment. The goal is completing this desktop-only task before the deadline; a nearby public site has verified compatible computers and an available appointment.",
    "prompt": "Which option most directly meets that immediate goal?",
    "answer": "Reserve the compatible public workstation before the deadline.",
    "wrong": [
      "Purchase extra mobile data for the unsupported phone app.",
      "Take general browser lessons without access to the required software.",
      "Wait for a possible mobile version after the assessment deadline."
    ],
    "why": "A verified compatible workstation supplies the missing task capability within the stated time.",
    "contrast": "Additional data does not make unsupported software run on the phone.",
    "details": [
      "The appointment covers the full assessment duration.",
      "The site confirms that the required tool is installed.",
      "The supported input and document-upload functions have been tested.",
      "The workstation slot is reachable during the applicant’s available hours.",
      "The site has confirmed access under the assessment’s stated rules."
    ],
    "solution": "public"
  },
  {
    "id": "guided-specific-task",
    "mode": "solution",
    "topic": "skills",
    "barrier": "literacy",
    "context": "government",
    "scene": "Residents have working devices, affordable reliable service and understandable instructions. Observed practice identifies a task-specific learning need.",
    "prompt": "Which response most directly addresses that observed need?",
    "answer": "Provide guided practice on the demonstrated service task.",
    "wrong": [
      "Distribute additional routers for an already working connection.",
      "Buy faster service without changing task instruction.",
      "Replace suitable devices without helping with the workflow."
    ],
    "why": "Guided task practice addresses the observed skills gap rather than assuming a resource problem.",
    "contrast": "The recommendation is based on demonstrated need, not age, income or geographic location.",
    "details": [
      "Participants need practice attaching a saved document.",
      "Participants request help confirming a submitted form.",
      "The observed difficulty is finding a downloaded file.",
      "Participants need instruction saving and resuming a draft.",
      "The practice session identifies an unfamiliar account-navigation step."
    ],
    "solution": "training"
  },
  {
    "id": "repair-required-interface",
    "mode": "solution",
    "topic": "skills",
    "barrier": "accessibility",
    "context": "assistive",
    "scene": "An essential service’s required control does not support the user’s intended access method. The device, network and user knowledge are sufficient.",
    "prompt": "Which change most directly removes the documented barrier?",
    "answer": "Repair and test the required interaction with the affected access method.",
    "wrong": [
      "Increase network speed while keeping the same blocked control.",
      "Offer general computer training without changing the interface.",
      "Buy a replacement for the already compatible device."
    ],
    "why": "The essential interaction needs accessible design and verification with the relevant method.",
    "contrast": "A person’s skills cannot make an unsupported control respond to the required input.",
    "details": [
      "The control cannot be reached using a keyboard.",
      "The essential field lacks a screen-reader label.",
      "Focus cannot leave the verification dialog.",
      "The required text is only supplied as an inaccessible image.",
      "The service ignores the supported assistive input at confirmation."
    ],
    "solution": "accessible"
  },
  {
    "id": "usable-language-help",
    "mode": "solution",
    "topic": "skills",
    "barrier": "language",
    "context": "language",
    "scene": "A capable user has adequate technology, but essential service instructions are not understandable in the supplied language.",
    "prompt": "Which response most directly supports completing this service?",
    "answer": "Provide verified instructions and help in a usable language.",
    "wrong": [
      "Provide a faster connection to the same instructions.",
      "Replace a suitable device with a similar model.",
      "Offer basic device lessons without addressing the instructions’ language."
    ],
    "why": "Language support addresses the stated information barrier without assuming the user lacks technical skill.",
    "contrast": "The required language access must cover essential steps, not just a translated welcome page.",
    "details": [
      "The required document checklist is untranslated.",
      "The support channel cannot explain the form in an understood language.",
      "The correction instructions have no usable language version.",
      "The translated start page leads to untranslated final steps.",
      "The deadline and confirmation instructions are only in an unfamiliar language."
    ],
    "solution": "language"
  },
  {
    "id": "restore-existing-access",
    "mode": "solution",
    "topic": "impacts",
    "barrier": "support",
    "context": "business",
    "scene": "A business has suitable equipment and has already used the service successfully. An authorized recovery or repair now blocks required transactions.",
    "prompt": "Which response most directly restores access?",
    "answer": "Provide timely authorized technical help for the specific failure.",
    "wrong": [
      "Enroll all staff in a general introductory computer course.",
      "Order additional service capacity without diagnosing the failure.",
      "Translate an already understood workflow instead of repairing access."
    ],
    "why": "The evidence calls for restoring a previously functioning setup, not inferring a general skills deficit.",
    "contrast": "Technical support and digital literacy can complement each other, but they address different established needs.",
    "details": [
      "The approved account recovery needs a reachable support contact.",
      "The required configuration fault has been reproduced.",
      "A supported update failed before the transaction window.",
      "A diagnosed component can be repaired by qualified staff.",
      "Replacement equipment needs authorized setup assistance."
    ],
    "solution": "support"
  },
  {
    "id": "reachable-partner-sites",
    "mode": "solution",
    "topic": "impacts",
    "barrier": "physical",
    "context": "center",
    "scene": "A central access site is unusable for some residents because of travel and hours. Nearby partner organizations have tested equipment, staff capacity and compatible schedules.",
    "prompt": "Which response most directly improves reachable shared access?",
    "answer": "Offer equivalent access through the verified nearby partners.",
    "wrong": [
      "Advertise the unchanged central site more often.",
      "Increase central-site speed without changing travel or hours.",
      "Provide home-service discounts where home coverage is absent."
    ],
    "why": "Confirmed local partnerships can reduce a documented travel or scheduling barrier for this shared-service goal.",
    "contrast": "The proposal must have real capacity and usable hours; merely naming partners is insufficient.",
    "details": [
      "A partner opens during the previously unserved evening window.",
      "The partner is on an available transport route.",
      "Confirmed local appointments fit within the required travel window.",
      "The partner can accept the same required documents.",
      "The accessible local site has reserved slots for the affected task."
    ],
    "solution": "partnership"
  },
  {
    "id": "warnings-without-internet",
    "mode": "solution",
    "topic": "impacts",
    "barrier": "infrastructure",
    "context": "emergency",
    "scene": "An agency must provide an urgent notice to homes without usable Internet. A tested non-Internet alert route can reach those homes before the deadline.",
    "prompt": "Which response most directly meets the immediate delivery objective?",
    "answer": "Use the verified non-Internet alert route alongside the web notice.",
    "wrong": [
      "Send a larger file through the same unreachable web-only route.",
      "Offer device training after the alert deadline.",
      "Supply local routers without an upstream connection."
    ],
    "why": "A verified alternative delivery route can meet the immediate need while longer-term connectivity work continues.",
    "contrast": "Network construction can address future access but is not the available immediate delivery mechanism.",
    "details": [
      "The existing phone system has confirmed reach to the homes.",
      "A tested local broadcast channel is available for the notice.",
      "The verified delivery plan reaches the homes without an Internet subscription.",
      "An established non-web contact route can deliver the message in time.",
      "The alternative alert system has been tested with the affected recipients."
    ],
    "solution": "alternative"
  },
  {
    "id": "equivalent-service-channels",
    "mode": "solution",
    "topic": "solutions",
    "barrier": "service",
    "context": "transit",
    "scene": "Some riders cannot use the app-only purchase route. The agency can operate an equivalent staffed phone channel within the same purchase deadlines.",
    "prompt": "Which action most directly restores a usable purchase option?",
    "answer": "Maintain the equivalent phone route alongside app sales.",
    "wrong": [
      "Publish a more detailed guide to the still-unusable app.",
      "Count app purchases as proof that all riders can use it.",
      "Redesign the app’s display while leaving the purchase-channel requirement unchanged."
    ],
    "why": "A verified alternative service channel lets excluded riders complete the same required transaction.",
    "contrast": "A clearer guide cannot by itself make unavailable app access usable.",
    "details": [
      "Phone purchases use the same fares and confirmation rules.",
      "The staffed channel operates during the riders’ available purchase period.",
      "Required booking information can be supplied by phone.",
      "The agency confirms capacity before adding the phone route.",
      "Riders can obtain the same valid ticket before travel."
    ],
    "solution": "channels"
  },
  {
    "id": "initial-transfer-access",
    "mode": "solution",
    "topic": "solutions",
    "barrier": "bandwidth",
    "context": "mobile",
    "scene": "A learner’s phone supports small offline course packages, but the required first download exceeds the affordable mobile allowance. A reachable public connection is verified and the material can be saved for later use.",
    "prompt": "Which option most directly enables this download-and-study plan?",
    "answer": "Use the verified public connection for the supported offline package.",
    "wrong": [
      "Repeat the large transfer over the unaffordable mobile allowance.",
      "Require a continuous high-resolution stream instead of saving materials.",
      "Offer device-navigation lessons while leaving the initial transfer unavailable."
    ],
    "why": "A reachable transfer opportunity plus reusable offline material meets this specific task without claiming permanent home connectivity.",
    "contrast": "Offline compatibility still requires a way to obtain the material initially.",
    "details": [
      "The public connection permits downloading the lesson package.",
      "The site’s hours fit the learner’s available access period.",
      "The package remains usable after the phone disconnects.",
      "The required readings can be saved during the verified visit.",
      "The course accepts a small later response instead of a continuous connection."
    ],
    "solution": "offline"
  },
  {
    "id": "home-goal-not-center",
    "mode": "solution",
    "topic": "solutions",
    "barrier": "affordability",
    "context": "work",
    "scene": "A worker needs a reliable home connection during fixed remote shifts. Suitable equipment and local coverage exist; the recurring plan is beyond the available budget. A sustainable eligible service offer has been verified.",
    "prompt": "Which proposal most directly meets this home-access objective?",
    "answer": "Arrange the verified affordable home-service plan.",
    "wrong": [
      "Open a public lab only outside the required shift hours.",
      "Lend a second suitable device without funding connectivity.",
      "Offer a workshop on a task the worker already performs."
    ],
    "why": "The verified plan addresses the recurring cost at the required location and times.",
    "contrast": "Public access can be useful, but this proposed lab does not meet the explicit home-shift requirement.",
    "details": [
      "The offer covers all required work months.",
      "Total monthly fees are within the verified budget.",
      "Eligibility and the home address’s coverage are confirmed.",
      "The quoted regular price remains sustainable after introductory discounts.",
      "The plan’s capacity and reliability meet the stated work needs."
    ],
    "solution": "affordable"
  },
  {
    "id": "remote-support-channel",
    "mode": "solution",
    "topic": "solutions",
    "barrier": "support",
    "context": "health",
    "scene": "Patients have usable devices and connections, but the only technical help requires an impractical trip. Staff can securely provide the required authorized assistance by phone.",
    "prompt": "Which response most directly improves usable technical support?",
    "answer": "Offer the verified remote help channel at usable times.",
    "wrong": [
      "Send additional devices without troubleshooting the actual issue.",
      "Publish general troubleshooting tips without a reachable assistance channel.",
      "Keep the distant help desk as the sole assistance route."
    ],
    "why": "A usable assistance channel can restore support without the travel barrier, provided authorized recovery and access protections remain in place.",
    "contrast": "The goal is appropriate technical help, not collecting patients’ private account credentials through an informal channel.",
    "details": [
      "The phone staff have the authority needed for the supported recovery.",
      "The help hours overlap the patients’ available period.",
      "The service has verified that the fault can be handled remotely.",
      "The authorized workflow includes the required identity checks.",
      "Staff can complete the supported repair process without an in-person visit."
    ],
    "solution": "support"
  },
  {
    "id": "wifi-and-travel",
    "mode": "tradeoff",
    "topic": "access",
    "barrier": "physical",
    "context": "library",
    "scene": "A city offers free public Wi-Fi and suitable computers at a staffed location, but some intended users cannot reach it during the hours they need.",
    "prompt": "Which assessment best matches both the improvement and the remaining limitation?",
    "answer": "Free site access helps, but travel and hours can still limit use.",
    "wrong": [
      "Free access establishes that all users can reach a usable visit.",
      "Free access helps, but a general skills deficit is established for the affected users.",
      "Free access helps, but unsuitable site computers are the stated reason users cannot participate."
    ],
    "why": "The provision reduces some cost and equipment barriers without resolving when and where people can reach it.",
    "contrast": "An intervention can be useful even when it does not meet every access need.",
    "details": [
      "The only available bus arrives after closing.",
      "Some required work shifts overlap all open hours.",
      "The round trip exceeds the time available for the online task.",
      "The facility is outside the users’ available transport area.",
      "The appointment needed for the task is not offered before its deadline."
    ],
    "solution": "public"
  },
  {
    "id": "hotspot-and-coverage",
    "mode": "tradeoff",
    "topic": "access",
    "barrier": "infrastructure",
    "context": "rural",
    "scene": "A hotspot program covers service charges and provides tested compatible devices. Some intended homes are outside usable cellular coverage.",
    "prompt": "Which assessment best captures this limit?",
    "answer": "Hotspots can help covered homes while leaving an unserved-area gap.",
    "wrong": [
      "Prepayment establishes that all intended homes can connect.",
      "Hotspots help, but the program’s unpaid service charges are the documented remaining barrier.",
      "Hotspots help, but checking a paid allowance can substitute for checking the network’s reach."
    ],
    "why": "The radio connection still needs a usable network path; paying charges and supplying hardware do not create coverage.",
    "contrast": "The program’s usefulness where covered does not establish reach in unserved locations.",
    "details": [
      "A home survey finds no usable provider signal.",
      "The provider’s tested coverage ends before some homes.",
      "The lending trial cannot establish a connection at the unserved addresses.",
      "The available network has no usable route from those buildings.",
      "The coverage check identifies a gap beyond the nearest serving site."
    ],
    "solution": "affordable"
  },
  {
    "id": "speed-not-continuity",
    "mode": "tradeoff",
    "topic": "access",
    "barrier": "reliability",
    "context": "telehealth",
    "scene": "A provider offers a higher data-capacity plan. The clinic’s remote-visit failures are traced to recurring connection faults, not lack of capacity.",
    "prompt": "Which assessment is best supported?",
    "answer": "More capacity may help transfers without fixing the identified outages.",
    "wrong": [
      "A brief speed test establishes repaired faults.",
      "More capacity helps, but task-navigation training is the established remaining need.",
      "More capacity helps, but missing device compatibility is the diagnosed cause of these disconnections."
    ],
    "why": "Capacity and continuity are separate properties. Repair and sustained-session testing remain relevant to the established fault.",
    "contrast": "A higher speed alone does not prove a fault has been repaired.",
    "details": [
      "The connection component still disconnects unexpectedly.",
      "The same reproduced fault remains after the advertised speed change.",
      "Sessions lose connectivity despite enough connected capacity.",
      "The higher plan does not include repair of the diagnosed component.",
      "The connection still needs to re-establish itself during visits."
    ],
    "solution": "support"
  },
  {
    "id": "discount-after-pilot",
    "mode": "tradeoff",
    "topic": "devices",
    "barrier": "affordability",
    "context": "school",
    "scene": "A service subsidy provides usable home connections during a pilot. The school needs access for the full year, and the continuing price has not been covered.",
    "prompt": "Which limitation belongs in the evaluation?",
    "answer": "The pilot improves access, but ongoing affordability still needs a plan.",
    "wrong": [
      "Current use establishes sustainable later bills.",
      "The pilot helps, and current use is sufficient evidence that later monthly costs are sustainable.",
      "The pilot helps, but provider coverage is the remaining unmeasured requirement described here."
    ],
    "why": "Temporary access can be valuable while leaving a recurring-cost gap after the intervention ends.",
    "contrast": "Short-term participation does not establish long-term affordability.",
    "details": [
      "The regular price returns before the school year ends.",
      "The benefit expires before the required assessment period.",
      "Required continuing fees are outside the subsidy.",
      "The renewal price is beyond the families’ documented budget.",
      "The offer funds installation but not all required monthly charges."
    ],
    "solution": "affordable"
  },
  {
    "id": "loan-needs-fit",
    "mode": "tradeoff",
    "topic": "devices",
    "barrier": "suitability",
    "context": "jobs",
    "scene": "A lending program supplies working connected devices. A required job assessment uses a particular supported desktop environment that has not been verified on those devices.",
    "prompt": "Which evaluation is most appropriate?",
    "answer": "The loans improve availability; compatibility with this task still needs checking.",
    "wrong": [
      "Successful browsing establishes assessment compatibility.",
      "Recurring network costs are the documented remaining gap.",
      "Loan counts substitute for required-software checks."
    ],
    "why": "Availability and suitability must both be checked. A working device can still lack the task’s required capabilities.",
    "contrast": "Counting loaned devices does not test the assessment workflow.",
    "details": [
      "The required assessment tool is not in the current test checklist.",
      "The program has only tested ordinary web browsing.",
      "The required desktop application has not been installed and checked.",
      "The supported operating-system requirement has not been compared with the loans.",
      "The essential upload and input functions remain untested."
    ],
    "solution": "lending"
  },
  {
    "id": "gift-needs-maintenance",
    "mode": "tradeoff",
    "topic": "devices",
    "barrier": "support",
    "context": "urban",
    "scene": "A program supplies suitable computers but budgets only for initial delivery. Continued service use depends on the computers staying usable.",
    "prompt": "Which tradeoff or limitation is relevant?",
    "answer": "Initial access improves, but repair and recovery still need support.",
    "wrong": [
      "A working handoff establishes continuing usability.",
      "Initial access improves, but general skills training is the established unmet need for these recipients.",
      "Initial access improves, and working hardware establishes that continuing service costs are covered."
    ],
    "why": "Delivery improves availability; ongoing faults, maintenance and authorized recovery can still interrupt meaningful use.",
    "contrast": "This limitation does not imply that the recipients lack digital skills.",
    "details": [
      "No repair funding is included.",
      "A replacement route for failed devices is absent.",
      "Supported configuration faults have no assistance channel.",
      "Authorized recovery help is not part of the program.",
      "The maintenance period ends before required use does."
    ],
    "solution": "support"
  },
  {
    "id": "training-and-practice",
    "mode": "tradeoff",
    "topic": "skills",
    "barrier": "availability",
    "context": "training",
    "scene": "A center teaches the required digital tasks with accessible instruction. The planned take-home practice needs equipment that some attendees cannot obtain.",
    "prompt": "Which statement accurately describes the remaining limitation?",
    "answer": "Instruction can improve skills while missing practice devices still limit use.",
    "wrong": [
      "Attendance establishes equipment availability for later practice.",
      "Instruction improves skills, but a missing network line is the documented barrier between sessions.",
      "Instruction improves skills, but the lesson’s language is the stated obstacle to practicing afterward."
    ],
    "why": "Learning opportunities and equipment availability are related but separate; both matter for using the new skill.",
    "contrast": "A training program can help without resolving its participants’ hardware access.",
    "details": [
      "The center’s devices cannot be checked out after class.",
      "The household’s only device is occupied during practice.",
      "Loan equipment is returned before the practice period.",
      "No working device is available between sessions.",
      "The only practice device is not bookable during the required window."
    ],
    "solution": "training"
  },
  {
    "id": "accessible-design-and-connection",
    "mode": "tradeoff",
    "topic": "skills",
    "barrier": "accessibility",
    "context": "assistive",
    "scene": "A service repairs its keyboard and screen-reader workflow. Intended users also include people without a sustainable Internet connection.",
    "prompt": "Which assessment avoids treating one repair as a complete solution?",
    "answer": "The interface repair improves accessibility; connectivity barriers can remain.",
    "wrong": [
      "Keyboard success establishes affordable home connectivity.",
      "The repair improves interaction, but the described remaining problem is understanding the task language.",
      "The repair improves interaction, and supported input supplies evidence that all users can connect."
    ],
    "why": "Accessible design addresses interaction barriers; connection costs and availability still require their own evidence and response.",
    "contrast": "The remaining connection gap does not make the accessibility improvement useless.",
    "details": [
      "Some homes are outside the provider’s current service area.",
      "The available plan exceeds some users’ documented budgets.",
      "The remote access period has recurring network outages.",
      "Some users have only a limited paid data allowance.",
      "The required service window lacks a reliable connection for some users."
    ],
    "solution": "accessible"
  },
  {
    "id": "translation-and-task-usability",
    "mode": "tradeoff",
    "topic": "skills",
    "barrier": "language",
    "context": "language",
    "scene": "A service translates essential instructions accurately. The team has not tested whether the required controls work with the intended users’ supported access methods.",
    "prompt": "Which assessment is best supported?",
    "answer": "Translation improves language access; interaction usability still needs testing.",
    "wrong": [
      "Reviewed wording establishes that all controls are accessible.",
      "Translation improves language access, but recurring network prices are the limitation under review.",
      "Translation improves language access, and a language review supplies the missing input-method test."
    ],
    "why": "Language access can improve understanding without proving the entire interaction is usable.",
    "contrast": "Language and accessibility are distinct dimensions; neither substitutes for checking the other.",
    "details": [
      "Keyboard completion has not been tested.",
      "The final confirmation has not been checked with assistive input.",
      "Screen-reader labels are outside the current test plan.",
      "The essential error-recovery workflow has not been evaluated.",
      "The test did not include the supported access methods used by affected participants."
    ],
    "solution": "language"
  },
  {
    "id": "offline-still-needs-transfer",
    "mode": "tradeoff",
    "topic": "impacts",
    "barrier": "bandwidth",
    "context": "mobile",
    "scene": "A course makes materials reusable offline, reducing repeated transfers. It still requires an initial download and a later response upload.",
    "prompt": "Which limit remains relevant?",
    "answer": "Offline study helps, but usable transfer opportunities are still needed.",
    "wrong": [
      "Offline reuse establishes a usable first download opportunity.",
      "Offline study reduces transfers, but the stated remaining gap is learning to operate the device.",
      "Offline study reduces transfers, and saving files supplies the required later submission opportunity."
    ],
    "why": "The new format reduces continuous and repeated demand but does not create the first and final access opportunities.",
    "contrast": "Offline compatibility is not equivalent to requiring no connection at any point.",
    "details": [
      "The first package exceeds the current mobile allowance.",
      "No initial transfer site is reachable during the available period.",
      "The final upload is due before the next dependable connection window.",
      "The device must obtain the package before disconnecting.",
      "The service still needs a small submitted response before the deadline."
    ],
    "solution": "offline"
  },
  {
    "id": "public-hours-and-shifts",
    "mode": "tradeoff",
    "topic": "impacts",
    "barrier": "physical",
    "context": "work",
    "scene": "A public lab adds suitable computers and reliable Internet. Its opening hours still conflict with the affected workers’ required shifts.",
    "prompt": "Which limitation most directly affects their benefit?",
    "answer": "Added equipment helps capacity, but these workers still need reachable hours.",
    "wrong": [
      "Computer count establishes reachable hours for these workers.",
      "Added equipment helps, but device incompatibility is the stated obstacle for these workers.",
      "Added equipment helps, but understanding the form’s language is the documented barrier to attendance."
    ],
    "why": "The provision has technical capacity, but the required time window still excludes the described workers.",
    "contrast": "Low use under conflicting hours does not establish a lack of interest or digital skill.",
    "details": [
      "The lab closes before the shift ends.",
      "The available booking slots overlap required work.",
      "The last bus leaves before the lab’s access session.",
      "The required remote task occurs only when the lab is closed.",
      "The commute from work prevents arrival during the offered slots."
    ],
    "solution": "public"
  },
  {
    "id": "app-only-service-change",
    "mode": "tradeoff",
    "topic": "impacts",
    "barrier": "service",
    "context": "government",
    "scene": "An agency’s app can make a common task convenient for connected users. Its proposal removes equivalent assisted routes without checking who can use the app.",
    "prompt": "Which tradeoff should the agency evaluate?",
    "answer": "App convenience may improve while some people lose a usable service route.",
    "wrong": [
      "Current app use establishes access for all former-channel users.",
      "The app can be convenient, but low bandwidth is the established cause of every excluded user’s problem.",
      "The app can be convenient, and an efficient purchase flow establishes that every intended person can use it."
    ],
    "why": "Efficiency for current app users does not establish that every person can complete the essential service through it.",
    "contrast": "A multi-channel approach can preserve access while adoption and barriers are evaluated.",
    "details": [
      "The staffed phone route would be discontinued.",
      "The assisted counter would be removed.",
      "No equivalent non-app route is included.",
      "The app requirement starts before the user-access evaluation.",
      "The proposal has no fallback for people unable to use the app."
    ],
    "solution": "channels"
  },
  {
    "id": "partner-capacity-check",
    "mode": "tradeoff",
    "topic": "solutions",
    "barrier": "availability",
    "context": "center",
    "scene": "A program proposes new partner access sites to reduce travel burdens. The sites’ staff and device capacity have not been confirmed for the expected demand.",
    "prompt": "Which evaluation best matches this proposal?",
    "answer": "Local sites could improve reach, but usable capacity must be verified.",
    "wrong": [
      "Nearby addresses establish sufficient service slots.",
      "Local sites could improve reach, but the plan establishes a general skills deficit among intended users.",
      "Local sites could improve reach, and a signed partnership alone establishes compatibility for the task."
    ],
    "why": "A proposed partnership needs operational evidence about usable slots, equipment and support, not just a list of addresses.",
    "contrast": "Potential reach and actual service capacity are different measures.",
    "details": [
      "The proposal does not confirm device bookings.",
      "Expected demand exceeds the unverified slot estimate.",
      "Staff availability has not been checked during proposed hours.",
      "The sites have not confirmed compatible task equipment.",
      "The plan has not established how many users can be served at the required time."
    ],
    "solution": "partnership"
  },
  {
    "id": "support-and-equipment-budget",
    "mode": "tradeoff",
    "topic": "solutions",
    "barrier": "support",
    "context": "business",
    "scene": "A program can add devices or repair a diagnosed failure in existing suitable equipment. Its explicit immediate goal is restoring the affected businesses’ current service access.",
    "prompt": "Which priority best fits the stated goal?",
    "answer": "Target the diagnosed failure now; additional equipment serves a different need.",
    "wrong": [
      "A higher equipment count establishes that the fault is fixed.",
      "Prioritize general skills lessons over the diagnosed repair.",
      "Discount an unrelated service instead of repairing access."
    ],
    "why": "The explicit immediate goal and diagnosed fault establish why restoration support is the relevant priority in this case.",
    "contrast": "This is not a universal rule against new devices; a different established need could justify them.",
    "details": [
      "The supported repair can restore the current working setup.",
      "Qualified staff have reproduced the relevant configuration failure.",
      "The existing devices meet the transaction requirements once repaired.",
      "An authorized recovery route can restore the blocked account.",
      "Replacement hardware alone would leave the same service configuration unresolved."
    ],
    "solution": "support"
  },
  {
    "id": "infrastructure-and-affordability",
    "mode": "tradeoff",
    "topic": "solutions",
    "barrier": "infrastructure",
    "context": "rural",
    "scene": "A funded network extension will reach previously unserved homes. The regular service price and residents’ ability to sustain it have not yet been evaluated.",
    "prompt": "Which assessment is best supported?",
    "answer": "Coverage can improve while recurring-cost barriers remain unresolved.",
    "wrong": [
      "Reaching homes establishes affordable subscriptions.",
      "Coverage improves, but computer training is the established remaining gap under this cost evaluation.",
      "Coverage improves, and construction spending measures households’ ability to cover recurring charges."
    ],
    "why": "Infrastructure can address availability without determining affordable, meaningful use afterward.",
    "contrast": "Neither expected adoption nor affordability should be inferred solely from construction.",
    "details": [
      "The monthly price will be set after construction.",
      "The plan does not assess total subscription fees.",
      "No recurring-cost assistance has been evaluated.",
      "The published estimate covers construction rather than household bills.",
      "The project’s coverage target does not measure household affordability."
    ],
    "solution": "infrastructure"
  },
  {
    "id": "training-not-interest",
    "mode": "tradeoff",
    "topic": "solutions",
    "barrier": "literacy",
    "context": "college",
    "scene": "A college offers practical technology training but schedules it when some intended learners cannot attend. Their reasons for nonattendance have not been measured.",
    "prompt": "Which conclusion best respects the limits of this intervention?",
    "answer": "Training may help attendees; nonattendance alone does not show lack of interest.",
    "wrong": [
      "An offered class establishes that everyone had a usable learning opportunity.",
      "Nonattendance establishes that the excluded learners prefer not to use technology.",
      "Course availability alone establishes equal skills after the program."
    ],
    "why": "An offered opportunity is not necessarily a reachable one. Attendance data alone do not establish motivation or equal outcomes.",
    "contrast": "The program can be useful while still needing scheduling, access and outcome evaluation.",
    "details": [
      "The only session overlaps a required placement.",
      "The class is held after the last available transport route.",
      "The registration deadline precedes publication of usable access information.",
      "No session is offered during an available study period.",
      "A required simultaneous commitment prevents attendance at the only class."
    ],
    "solution": "training"
  }
];
