# Engineering scenario catalog — VEX Component Challenge

## Actual content, not nominal targets

This release contains **75 independently authored playable cases across 66 reasoning families**. There are no cosmetic, answer-order, seeded, robot-name or background variants counted as additional cases. Nine repeated underlying mechanisms across modes share family IDs instead of being counted twice. The initial target of 100 families / 300 instances is **not reached**. The reviewed pool is deliberately reported at its actual size; expansion needs additional defensible engineering decisions and source review, not padded permutations.

| Mode | Cases |
|---|---:|
| choose | 25 |
| fix | 18 |
| solution | 20 |
| tools | 12 |

All four modes include Beginner, Intermediate and Advanced cases. Advanced cases add explicit access, dimensional, interface, engagement or multi-role constraints rather than only longer vocabulary. Narrow filters necessarily repeat; the generator must disclose fallback and preserve separate family/instance cooldown metrics.

## Structured content and catalog dependency

Every case has a stable ID and family, original mode/level/category, mechanical concept, background context, problem, constraints, candidate options with stable component IDs, one or more accepted option-ID sets, selected-option explanations, engineering explanation, official reference and review status. The module imports PARTS from the published Parts Sprint catalog. It does not duplicate the hardware catalog or rewrite Parts Sprint. All 44 referenced component IDs exist in that catalog. Tool or diagnostic options can reference the same component while proposing different actions; those are distinct actions, not duplicate choices.

Single-choice answer position is shuffled by the game engine; the authored first option is not a student-visible answer-position rule. Build a Solution grades the whole 2–3 role set, rejects missing/extra selections, and explicitly supplies existing components/fasteners/tools. Optional or alternative hardware is excluded by stated design constraints.

## Family-by-family editorial review

The following review is an **AI editorial and source-linked check**, not independent human certification or physical testing. Every representative family was checked for its required function, relevant constraints, distractor distinction and limits. For shared families, the table lists all reviewed case IDs. No claim is made that schema tests establish real-world mechanical correctness. Independent VEX educator review remains pending.

| Family | Reviewed case IDs | Decision checked | Review result / boundary |
|---|---|---|---|
| support-through-frame | support-through-frame; missing-bearing | rotating shaft support; unsupported metal-hole contact | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| threaded-gap | threaded-gap; spacer-as-threaded-support | threaded structural separation; spacing versus attachment | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| unthreaded-shaft-gap | unthreaded-shaft-gap | unthreaded shaft spacing | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| positive-axial-retention | positive-axial-retention; axial-slip-check | adjustable shaft retention; axial slip versus power | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| broad-mount | broad-mount | broad flat mounting | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| joint-reinforcement | joint-reinforcement | right-angle joint reinforcement | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| motion-between-square-hubs | motion-between-square-hubs | square-shaft torque transfer | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| lateral-rollers | lateral-rollers | sideways passive rolling | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| side-slip-resistance | side-slip-resistance | sideways traction | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| object-intake | object-intake | object intake contact | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| offset-shaft-support | offset-shaft-support | offset bearing support | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| high-strength-bearing-fit | high-strength-bearing-fit | high-strength shaft support | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| high-strength-shaft-fit | high-strength-shaft-fit; shaft-size-mismatch | high-strength torque path; dimensional system mismatch | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| slotted-positioning | slotted-positioning | slotted mounting adjustment | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| thin-interface | thin-interface | thin interface spacing | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| nylon-thread-lock | nylon-thread-lock | nylon-insert thread retention | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| toothed-washer-lock | toothed-washer-lock | toothed-washer retention | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| nut-capture | nut-capture; nut-retainer-wrong-footprint | captured nut positioning; retainer footprint mismatch | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| plastic-thread-receiver | plastic-thread-receiver | plastic thread-forming connection | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| chain-transmission | chain-transmission | motion transfer across spaced shafts | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| sprocket-interface | sprocket-interface | chain engagement | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| direct-gear-mesh | direct-gear-mesh | direct tooth-to-tooth transmission | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| compatible-hub-adapter | compatible-hub-adapter | documented square-hub adaptation | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| split-collar | split-collar | split-clamp retention | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| nonfree-high-strength-gap | nonfree-high-strength-gap | high-strength keyed spacing | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| wheel-frame-rub | wheel-frame-rub | rotating-part clearance | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| t15-structural-screw | wrong-tip-slipping; t15-structural-screw | tool interface mismatch; specified screw interface | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| wrench-two-side-task | nut-spins-with-screw; wrench-two-side-task | reaction torque at nut; two-sided fastening | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| support-axis-alignment | support-axis-alignment | misaligned bearing axes | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| collar-pressed-bearing | collar-pressed-bearing | overconstrained axial stack | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| gear-side-interference | gear-side-interference | gear side-face clearance | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| chain-sprocket-plane | chain-sprocket-plane | chain alignment | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| loose-corner-brace | loose-corner-brace | joint movement versus material flex | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| blind-hole-length-choice | screw-bottoms-in-hole; blind-hole-length-choice | blind-hole depth; screw seating and depth | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| through-joint-protrusion | screw-no-thread-reach; through-joint-protrusion | insufficient screw reach; engagement and moving-part clearance | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| thread-wont-start | thread-wont-start | thread compatibility diagnostic | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| supported-gear-tilt | supported-gear-tilt | shaft support under gear load | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| drive-wheel-slip-interface | drive-wheel-slip-interface | torque coupling versus axial retention | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| t8-collar-setscrew | t8-collar-setscrew | specified set-screw interface | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| wrench-small-standoff | wrench-small-standoff | standoff reaction tool | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| wrench-large-nylock | wrench-large-nylock | Nylock reaction tool | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| hex-socket-separation | hex-socket-separation | hex versus star socket | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| standoff-wrench-length | standoff-wrench-length | wrench interface versus standoff length | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| driver-access-constraint | driver-access-constraint | tool access versus matching tip | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| universal-joint-set-screw | universal-joint-set-screw | joint set-screw interface | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| washer-spacer-stack | washer-spacer-stack | measured gap stack | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| support-and-retain | support-and-retain | support plus axial retention | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| gap-and-attachment | gap-and-attachment | threaded gap plus screw drive | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| wheel-gap-retain | wheel-gap-retain | wheel spacing plus axial retention | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| screw-nut-tools | screw-nut-tools | drive plus reaction | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| chain-bridge | chain-bridge | sprockets plus chain | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| brace-and-drive-tool | brace-and-drive-tool | corner brace installation | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| high-strength-motion-path | high-strength-motion-path | matching high-strength support system | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| offset-and-lock | offset-and-lock | offset support with adjustable retention | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| thin-interface-and-gap | thin-interface-and-gap | two measured spacing roles | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| nylock-joint-install | nylock-joint-install | nylon locking joint installation | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| keps-joint-install | keps-joint-install | toothed washer joint installation | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| one-post-capture-install | one-post-capture-install | captured nut plus screw driving | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| retention-with-adjustment-tool | retention-with-adjustment-tool | axial retention and set-screw tool | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| slotted-bracket-install | slotted-bracket-install | adjustable mounting plus drive tool | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| gear-support-interface | gear-support-interface | gear interface plus shaft support | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| sprocket-offset-stack | sprocket-offset-stack | chain alignment plus retained position | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| high-strength-nonfree-spacing | high-strength-nonfree-spacing | high-strength support and keyed separation | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| split-clamp-with-offset-support | split-clamp-with-offset-support | offset support plus split-clamp constraint | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| structural-threaded-brace | structural-threaded-brace | corner stability plus threaded separation | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |
| supported-torque-coupling | supported-torque-coupling | torque coupling with shaft support | Explicit functional/assembly constraints and distractor explanations reviewed; source-linked, educator review pending. |

## Technical review boundaries

- T15 normal V5 #8-32 Star Drive screws and T8 Star Drive set screws are distinguished using named fastener interfaces, not picture size. Universal Joint and Star Drive shaft-collar T8 uses follow the VEX Tools article.
- Wrench-end cases follow VEX's smaller end for #8-32 standoffs and larger end for #8-32 Nylock nuts. Standoff length is explicitly distinguished from hex interface size.
- Internal-hex screws require the matching specified hex key; no unprovided key size is guessed. The correct action is to obtain the specified tool.
- Screw-length and washer-stack numbers are explicitly supplied instructional measurements. They are not claims that the standard VEX kit includes screws of every listed metric length. Required engagement, depth, clearance and bore compatibility are stated.
- Shaft and bearing cases explicitly distinguish 1/8-inch standard and 1/4-inch high-strength systems. No undocumented adapter, force-fit or universal hub compatibility is implied.
- Gear/chain cases assume verified compatible tooth/chain systems and geometry; the game does not certify arbitrary gears or simulate gear dynamics.
- Mechanical troubleshooting asks for the best supported next check when causes are uncertain. When a correction is selected, the observations and constrained build context make the omission/interference known. Mechanical inspection is performed with power off. More motor torque is not presented as a cure for misalignment or rubbing.
- Spacer, washer, standoff, bearing, shaft coupling and axial-retention roles are kept distinct. Extra retention is not accepted as a replacement for missing torque coupling.
- Support/structure choices are scoped to documented functions and verified mounting geometry, not universal strength guarantees.
- No claimed one-to-one STEM Lab standard mapping is made. These are supplementary V5 building concepts; physical build proficiency and engineering notebook evidence require separate classroom assessment.

## Auditable case list

| Case ID | Family | Mode | Level | Category | Source |
|---|---|---|---|---|---|
| support-through-frame | support-through-frame | choose | Beginner | motion | https://kb.vex.com/hc/en-us/articles/360055893891-V5-Workcell-Kit-Storage-Bin-1-STEM-Labs-Hardware |
| threaded-gap | threaded-gap | choose | Beginner | spacing | https://kb.vex.com/hc/en-us/articles/360055893891-V5-Workcell-Kit-Storage-Bin-1-STEM-Labs-Hardware |
| unthreaded-shaft-gap | unthreaded-shaft-gap | choose | Beginner | spacing | https://kb.vex.com/hc/en-us/articles/360035952811-Using-V5-Washers-and-Spacers |
| positive-axial-retention | positive-axial-retention | choose | Beginner | motion | https://kb.vex.com/hc/en-us/articles/360055893891-V5-Workcell-Kit-Storage-Bin-1-STEM-Labs-Hardware |
| broad-mount | broad-mount | choose | Beginner | structure | https://kb.vex.com/hc/en-us/articles/360055475332-V5-Workcell-Kit-Storage-Bin-3-Competition-Hardware |
| joint-reinforcement | joint-reinforcement | choose | Beginner | structure | https://kb.vex.com/hc/en-us/articles/360055893871-V5-Workcell-Kit-Storage-Bin-2-Electronics-and-Tools |
| motion-between-square-hubs | motion-between-square-hubs | choose | Beginner | motion | https://kb.vex.com/hc/en-us/articles/360035591372-Using-V5-Shafts |
| lateral-rollers | lateral-rollers | choose | Beginner | wheels | https://kb.vex.com/hc/en-us/articles/38888566734612-Understanding-VEX-V5-Wheels |
| side-slip-resistance | side-slip-resistance | choose | Beginner | wheels | https://kb.vex.com/hc/en-us/articles/38888566734612-Understanding-VEX-V5-Wheels |
| object-intake | object-intake | choose | Beginner | wheels | https://kb.vex.com/hc/en-us/articles/360035952811-Using-V5-Washers-and-Spacers |
| offset-shaft-support | offset-shaft-support | choose | Intermediate | motion | https://kb.vex.com/hc/en-us/articles/360035591372-Using-V5-Shafts |
| high-strength-bearing-fit | high-strength-bearing-fit | choose | Intermediate | motion | https://kb.vex.com/hc/en-us/articles/360035591372-Using-V5-Shafts |
| high-strength-shaft-fit | high-strength-shaft-fit | choose | Intermediate | motion | https://kb.vex.com/hc/en-us/articles/360035591372-Using-V5-Shafts |
| slotted-positioning | slotted-positioning | choose | Intermediate | structure | https://kb.vex.com/hc/en-us/articles/360055475332-V5-Workcell-Kit-Storage-Bin-3-Competition-Hardware |
| thin-interface | thin-interface | choose | Intermediate | spacing | https://kb.vex.com/hc/en-us/articles/360035952811-Using-V5-Washers-and-Spacers |
| nylon-thread-lock | nylon-thread-lock | choose | Intermediate | fasteners | https://kb.vex.com/hc/en-us/articles/360055893891-V5-Workcell-Kit-Storage-Bin-1-STEM-Labs-Hardware |
| toothed-washer-lock | toothed-washer-lock | choose | Intermediate | fasteners | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| nut-capture | nut-capture | choose | Intermediate | fasteners | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| plastic-thread-receiver | plastic-thread-receiver | choose | Intermediate | fasteners | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| chain-transmission | chain-transmission | choose | Intermediate | transmission | https://kb.vex.com/hc/en-us/articles/6339264416020-Overview-of-V5-Chains-and-Sprockets |
| sprocket-interface | sprocket-interface | choose | Intermediate | transmission | https://kb.vex.com/hc/en-us/articles/6339264416020-Overview-of-V5-Chains-and-Sprockets |
| direct-gear-mesh | direct-gear-mesh | choose | Intermediate | transmission | https://kb.vex.com/hc/en-us/articles/360055893891-V5-Workcell-Kit-Storage-Bin-1-STEM-Labs-Hardware |
| compatible-hub-adapter | compatible-hub-adapter | choose | Advanced | transmission | https://kb.vex.com/hc/en-us/articles/360055893891-V5-Workcell-Kit-Storage-Bin-1-STEM-Labs-Hardware |
| split-collar | split-collar | choose | Advanced | motion | https://kb.vex.com/hc/en-us/articles/360035591372-Using-V5-Shafts |
| nonfree-high-strength-gap | nonfree-high-strength-gap | choose | Advanced | spacing | https://kb.vex.com/hc/en-us/articles/360035952811-Using-V5-Washers-and-Spacers |
| axial-slip-check | positive-axial-retention | fix | Beginner | motion | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| wheel-frame-rub | wheel-frame-rub | fix | Beginner | spacing | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| wrong-tip-slipping | t15-structural-screw | fix | Beginner | tools | https://kb.vex.com/hc/en-us/articles/13078845924884-Understanding-and-Using-V5-Tools |
| nut-spins-with-screw | wrench-two-side-task | fix | Beginner | tools | https://kb.vex.com/hc/en-us/articles/13078845924884-Understanding-and-Using-V5-Tools |
| missing-bearing | support-through-frame | fix | Beginner | motion | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| spacer-as-threaded-support | threaded-gap | fix | Beginner | spacing | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| support-axis-alignment | support-axis-alignment | fix | Intermediate | motion | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| collar-pressed-bearing | collar-pressed-bearing | fix | Intermediate | motion | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| gear-side-interference | gear-side-interference | fix | Intermediate | transmission | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| chain-sprocket-plane | chain-sprocket-plane | fix | Intermediate | transmission | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| loose-corner-brace | loose-corner-brace | fix | Intermediate | structure | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| screw-bottoms-in-hole | blind-hole-length-choice | fix | Intermediate | fasteners | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| screw-no-thread-reach | through-joint-protrusion | fix | Intermediate | fasteners | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| nut-retainer-wrong-footprint | nut-capture | fix | Intermediate | fasteners | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| shaft-size-mismatch | high-strength-shaft-fit | fix | Advanced | motion | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| thread-wont-start | thread-wont-start | fix | Advanced | fasteners | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| supported-gear-tilt | supported-gear-tilt | fix | Advanced | transmission | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| drive-wheel-slip-interface | drive-wheel-slip-interface | fix | Advanced | motion | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| t15-structural-screw | t15-structural-screw | tools | Beginner | tools | https://kb.vex.com/hc/en-us/articles/13078845924884-Understanding-and-Using-V5-Tools |
| t8-collar-setscrew | t8-collar-setscrew | tools | Beginner | tools | https://kb.vex.com/hc/en-us/articles/13078845924884-Understanding-and-Using-V5-Tools |
| wrench-small-standoff | wrench-small-standoff | tools | Beginner | tools | https://kb.vex.com/hc/en-us/articles/13078845924884-Understanding-and-Using-V5-Tools |
| wrench-large-nylock | wrench-large-nylock | tools | Beginner | tools | https://kb.vex.com/hc/en-us/articles/13078845924884-Understanding-and-Using-V5-Tools |
| wrench-two-side-task | wrench-two-side-task | tools | Intermediate | tools | https://kb.vex.com/hc/en-us/articles/13078845924884-Understanding-and-Using-V5-Tools |
| hex-socket-separation | hex-socket-separation | tools | Intermediate | tools | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| blind-hole-length-choice | blind-hole-length-choice | tools | Intermediate | fasteners | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| through-joint-protrusion | through-joint-protrusion | tools | Intermediate | fasteners | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| standoff-wrench-length | standoff-wrench-length | tools | Intermediate | tools | https://kb.vex.com/hc/en-us/articles/13078845924884-Understanding-and-Using-V5-Tools |
| driver-access-constraint | driver-access-constraint | tools | Advanced | tools | https://kb.vex.com/hc/en-us/articles/13078845924884-Understanding-and-Using-V5-Tools |
| universal-joint-set-screw | universal-joint-set-screw | tools | Advanced | tools | https://kb.vex.com/hc/en-us/articles/13078845924884-Understanding-and-Using-V5-Tools |
| washer-spacer-stack | washer-spacer-stack | tools | Advanced | spacing | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| support-and-retain | support-and-retain | solution | Beginner | motion | https://kb.vex.com/hc/en-us/articles/360055893891-V5-Workcell-Kit-Storage-Bin-1-STEM-Labs-Hardware |
| gap-and-attachment | gap-and-attachment | solution | Beginner | spacing | https://kb.vex.com/hc/en-us/articles/360055893891-V5-Workcell-Kit-Storage-Bin-1-STEM-Labs-Hardware |
| wheel-gap-retain | wheel-gap-retain | solution | Beginner | spacing | https://kb.vex.com/hc/en-us/articles/360035952811-Using-V5-Washers-and-Spacers |
| screw-nut-tools | screw-nut-tools | solution | Beginner | tools | https://kb.vex.com/hc/en-us/articles/13078845924884-Understanding-and-Using-V5-Tools |
| chain-bridge | chain-bridge | solution | Beginner | transmission | https://kb.vex.com/hc/en-us/articles/6339264416020-Overview-of-V5-Chains-and-Sprockets |
| brace-and-drive-tool | brace-and-drive-tool | solution | Beginner | structure | https://kb.vex.com/hc/en-us/articles/360055893871-V5-Workcell-Kit-Storage-Bin-2-Electronics-and-Tools |
| high-strength-motion-path | high-strength-motion-path | solution | Intermediate | motion | https://kb.vex.com/hc/en-us/articles/360035591372-Using-V5-Shafts |
| offset-and-lock | offset-and-lock | solution | Intermediate | motion | https://kb.vex.com/hc/en-us/articles/360035591372-Using-V5-Shafts |
| thin-interface-and-gap | thin-interface-and-gap | solution | Intermediate | spacing | https://kb.vex.com/hc/en-us/articles/360035952811-Using-V5-Washers-and-Spacers |
| nylock-joint-install | nylock-joint-install | solution | Intermediate | fasteners | https://kb.vex.com/hc/en-us/articles/13078845924884-Understanding-and-Using-V5-Tools |
| keps-joint-install | keps-joint-install | solution | Intermediate | fasteners | https://kb.vex.com/hc/en-us/articles/13078845924884-Understanding-and-Using-V5-Tools |
| one-post-capture-install | one-post-capture-install | solution | Intermediate | fasteners | https://kb.vex.com/hc/en-us/articles/360035952791-Using-V5-Fasteners |
| retention-with-adjustment-tool | retention-with-adjustment-tool | solution | Intermediate | motion | https://kb.vex.com/hc/en-us/articles/13078845924884-Understanding-and-Using-V5-Tools |
| slotted-bracket-install | slotted-bracket-install | solution | Intermediate | structure | https://kb.vex.com/hc/en-us/articles/360055475332-V5-Workcell-Kit-Storage-Bin-3-Competition-Hardware |
| gear-support-interface | gear-support-interface | solution | Advanced | transmission | https://kb.vex.com/hc/en-us/articles/360055893891-V5-Workcell-Kit-Storage-Bin-1-STEM-Labs-Hardware |
| sprocket-offset-stack | sprocket-offset-stack | solution | Advanced | transmission | https://kb.vex.com/hc/en-us/articles/360035952811-Using-V5-Washers-and-Spacers |
| high-strength-nonfree-spacing | high-strength-nonfree-spacing | solution | Advanced | motion | https://kb.vex.com/hc/en-us/articles/360035591372-Using-V5-Shafts |
| split-clamp-with-offset-support | split-clamp-with-offset-support | solution | Advanced | motion | https://kb.vex.com/hc/en-us/articles/360035591372-Using-V5-Shafts |
| structural-threaded-brace | structural-threaded-brace | solution | Advanced | structure | https://kb.vex.com/hc/en-us/articles/360055893871-V5-Workcell-Kit-Storage-Bin-2-Electronics-and-Tools |
| supported-torque-coupling | supported-torque-coupling | solution | Advanced | motion | https://kb.vex.com/hc/en-us/articles/360035591372-Using-V5-Shafts |

## Review follow-up

An independent VEX educator should inspect every family, verify classroom hardware/tool versions, and test transfer before using the activity as evidence of assembly mastery. Practice accuracy is not a claim that a student can safely build or diagnose every physical mechanism.
