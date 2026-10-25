# Protocol and instructional review

Reviewed against the current College Board CSP Course and Exam Description and primary Internet specifications. Core AP scope: CSN-1.A networks, bandwidth and routing; CSN-1.B Internet interoperability/scalability; CSN-1.C packet communication/protocols; CSN-1.E fault tolerance; IOC-2.B security. Detailed QUIC/TLS names are supporting modern examples, not a claim that seven-layer memorization is required.

## Sources and boundaries

- https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-course-and-exam-description.pdf
- https://www.rfc-editor.org/rfc/rfc1122.html
- https://www.rfc-editor.org/rfc/rfc9293.html
- https://www.rfc-editor.org/rfc/rfc768
- https://www.rfc-editor.org/rfc/rfc9000.html
- https://www.rfc-editor.org/rfc/rfc9114.html
- https://www.rfc-editor.org/rfc/rfc8446.html
- https://www.rfc-editor.org/rfc/rfc9110.html
- https://www.rfc-editor.org/rfc/rfc1034

RFC 1122 supplies the four-role model; RFC 1034 supplies naming responsibilities; RFC 9293 describes TCP stream service; RFC 768 describes UDP datagrams; RFCs 9000 and 9114 qualify HTTP/3/QUIC; RFC 8446 supplies TLS security context; RFC 9110 supplies application semantics. DNS answers may be cached. DNS is an application service, not a mandatory intermediate packet layer. IP is best effort. TCP reliability is an endpoint service under operating assumptions, not a promise against arbitrary failure. UDP permits recovery above it. HTTPS is protected HTTP, not route choice.

Missing-step questions explicitly state cache, address, selected stack and connection state where relevant. Dependencies are not a universal chronological browsing script. Diagrams use simplified bidirectional links, neutral labels and clearly stated NAT/tunneling exclusions for endpoint examples. Packet arrival does not prove a route history. Local switches and inter-network routers are explicitly separate functional roles; real multifunction devices exist. Redundancy supports fault tolerance without promising perfection.

## Family review matrix

Each row is a different authored task; five variants provide context, node labels, link conditions, table entries or observed order. Variants are not counted as independent reasoning families.

| Family | Mode | Concept | Decisive distinction |
| --- | --- | --- | --- |
| resolve-name | Identify the Role | DNS | Name lookup is not packet forwarding. |
| address-network | Identify the Role | IP addressing & forwarding | Network addressing is not reliable transport. |
| forward-device | Identify the Role | Routers & routing tables | A forwarding device is distinct from endpoints. |
| ordered-stream | Identify the Role | TCP reliability & ordering | Endpoint ordering and recovery are transport functions. |
| independent-datagrams | Identify the Role | UDP datagrams | Datagram service does not imply application unreliability. |
| web-semantics | Identify the Role | HTTP requests & responses | Application semantics differ from transport. |
| secured-web | Identify the Role | HTTPS & TLS | Secured HTTP is not a routing service. |
| channel-security | Identify the Role | HTTPS & TLS | Channel security differs from resource semantics. |
| udp-based-streams | Identify the Role | HTTP/3 & QUIC | Higher protocols can add reliability above datagrams. |
| wired-link | Identify the Role | Link / network access | A wired local technology is not end-to-end transport. |
| wireless-link | Identify the Role | Link / network access | A wireless link is only part of the Internet path. |
| local-switch | Identify the Role | Local switching | Local frame forwarding differs from inter-network routing. |
| data-unit | Identify the Role | Packet switching | The unit carried differs from the device carrying it. |
| capacity-rate | Identify the Role | Bandwidth & latency | Carrying capacity and delay are different quantities. |
| delay-time | Identify the Role | Bandwidth & latency | A long wait can coexist with high capacity. |
| forwarding-information | Identify the Role | Routers & routing tables | A forwarding table guides a next-hop choice. |
| missing-name-on-cache-miss | What's Missing? | DNS | Resolve only when an address is needed. |
| missing-cached-address | What's Missing? | DNS | A valid cached result changes the needed action. |
| missing-tcp-connection | What's Missing? | TCP reliability & ordering | A specified new TCP-based exchange needs a connection. |
| missing-tls-channel | What's Missing? | HTTPS & TLS | Securing a stated TCP web stack is a separate function. |
| missing-http3-transport | What's Missing? | HTTP/3 & QUIC | HTTP/3 has a different transport arrangement. |
| missing-http-request | What's Missing? | HTTP requests & responses | The client asks for a resource once communication is ready. |
| missing-http-response | What's Missing? | HTTP requests & responses | A server responds to a received request. |
| missing-table-lookup | What's Missing? | Routers & routing tables | Forwarding depends on next-hop information. |
| missing-loss-recovery | What's Missing? | TCP reliability & ordering | Missing stream data require endpoint recovery. |
| missing-stream-order | What's Missing? | TCP reliability & ordering | Arrival order and delivered stream order differ. |
| missing-udp-policy | What's Missing? | UDP datagrams | Application policy supplies any needed datagram recovery. |
| missing-packet-division | What's Missing? | Packet switching | A stream is carried in packetized units. |
| missing-local-link | What's Missing? | Link / network access | Every hop needs local-link communication. |
| missing-response-direction | What's Missing? | Sources, destinations & clients | A reply reverses the endpoint roles. |
| missing-failure-alternative | What's Missing? | Redundancy & fault tolerance | A failed link can make an available alternative useful. |
| missing-layer-role | What's Missing? | Layer responsibilities | Addressing and local delivery are distinct roles. |
| next-uncached-name | Next Step | DNS | A needed uncached address motivates lookup. |
| next-reuse-address | Next Step | DNS | Available cached information avoids a compulsory new query. |
| next-forwarding-entry | Next Step | Routers & routing tables | A stated forwarding table determines the next hop. |
| next-route-after-failure | Next Step | Redundancy & fault tolerance | A failed edge rules out a route using it. |
| next-tcp-loss | Next Step | TCP reliability & ordering | Recovery belongs to the specified reliable transport. |
| next-tcp-buffer | Next Step | TCP reliability & ordering | Out-of-order arrival does not require out-of-order delivery. |
| next-udp-missing-update | Next Step | UDP datagrams | The application chooses what a missing datagram means. |
| next-web-request-ready | Next Step | HTTP requests & responses | A ready channel does not choose a resource for the client. |
| next-server-response | Next Step | HTTP requests & responses | The server handles the request semantics. |
| next-invalid-trust | Next Step | HTTPS & TLS | Failed identity validation is not proof of an authenticated peer. |
| next-local-hop | Next Step | Link / network access | Next-hop delivery uses a local-link technology. |
| next-switch-frame | Next Step | Local switching | A conventional LAN switch forwards locally. |
| next-capacity-bottleneck | Next Step | Bandwidth & latency | A data-rate bottleneck is distinct from name resolution. |
| next-measure-delay | Next Step | Bandwidth & latency | A response delay calls for latency measurement. |
| next-quic-stream | Next Step | HTTP/3 & QUIC | A chosen HTTP/3 stack uses QUIC features above UDP. |
| next-application-order | Next Step | TCP reliability & ordering | The provided stream order is not raw arrival order. |
| dns-not-a-layer | Diagnose the Misconception | DNS | DNS is not a mandatory routing layer. |
| ip-not-reliable | Diagnose the Misconception | IP addressing & forwarding | Best-effort forwarding does not promise a stream. |
| web-not-always-tcp | Diagnose the Misconception | HTTP/3 & QUIC | Web semantics do not force one transport for every version. |
| udp-can-have-higher-recovery | Diagnose the Misconception | UDP datagrams | A datagram transport does not forbid recovery above it. |
| https-not-routing | Diagnose the Misconception | HTTPS & TLS | Protection of HTTP is distinct from route choice. |
| domain-not-address | Diagnose the Misconception | DNS | A readable name and a network address have different roles. |
| tcp-not-page-renderer | Diagnose the Misconception | TCP reliability & ordering | Byte-stream transport is not browser interpretation. |
| switching-not-arrival-order | Diagnose the Misconception | Packet switching | Packet switching does not guarantee network arrival order. |
| wifi-not-global-internet | Diagnose the Misconception | Link / network access | A local wireless link is not the whole Internet. |
| routers-not-transport-endpoints | Diagnose the Misconception | Routers & routing tables | Forwarders do not generally deliver application streams. |
| redundancy-not-perfection | Diagnose the Misconception | Redundancy & fault tolerance | Extra paths support resilience, not perfect service. |
| bandwidth-not-latency | Diagnose the Misconception | Bandwidth & latency | Capacity and waiting time can vary independently. |
| quic-adds-services | Diagnose the Misconception | HTTP/3 & QUIC | UDP-based transport can have reliable streams above it. |
| reply-address-roles | Diagnose the Misconception | Sources, destinations & clients | Response sender and request sender are different roles. |
| congestion-loss | Diagnose the Misconception | Congestion & loss | Busy shared links can queue or drop traffic. |
| application-semantics | Diagnose the Misconception | HTTP requests & responses | Carrying bytes and interpreting a request are distinct. |
| diagram-dns-application | Read the Network | Layer responsibilities | A naming service belongs with application services. |
| diagram-tcp-transport | Read the Network | Layer responsibilities | Reliable stream service operates between endpoints. |
| diagram-ip-internet | Read the Network | Layer responsibilities | Addressing and forwarding identify the Internet role. |
| diagram-request-source | Read the Network | Sources, destinations & clients | The source field identifies the request sender. |
| diagram-request-destination | Read the Network | Sources, destinations & clients | The destination is not an intermediate next hop. |
| diagram-response-source | Read the Network | Sources, destinations & clients | A reply has the opposite endpoint direction. |
| diagram-http3-components | Read the Network | HTTP/3 & QUIC | QUIC features are not guarantees of UDP alone. |
| diagram-valid-simple-path | Read the Network | Packet switching | A listed path must use displayed connections and correct endpoints. |
| diagram-routing-table | Read the Network | Routers & routing tables | A table selects a next hop, not a full application route. |
| diagram-first-hop-after-failure | Read the Network | Redundancy & fault tolerance | An available first hop must begin a usable path. |
| diagram-add-alternative | Read the Network | Redundancy & fault tolerance | Extra capacity and an extra route are different changes. |
| diagram-critical-bridge | Read the Network | Redundancy & fault tolerance | One bridge can remain despite redundancy elsewhere. |
| diagram-arrival-inference | Read the Network | Packet switching | A changed arrival order does not establish a route history. |
| diagram-router-job | Read the Network | Routers & routing tables | The job, not an icon’s appearance, identifies the router. |
| diagram-switch-job | Read the Network | Local switching | Local forwarding is not remote application processing. |
| diagram-local-technology | Read the Network | Layer responsibilities | Link technology supports adjacent-device communication. |

## Review limits

All 400 instances pass structural contracts; independent graph/table/address checks validate the diagram mathematics and the role catalog checks validate protocol/layer mappings. Choice length and position distributions are reported, not used as proof of semantic correctness. False claims appear only as explicitly quoted misconceptions to evaluate. Initial review found two usable first hops in one cross-linked topology; that family now uses a diamond without the cross-link and the independent oracle requires exactly one defensible listed first hop.

This is implementation/source review, not independent educator certification. Classroom review should assess distractor plausibility, reading load and diagram comprehension.
