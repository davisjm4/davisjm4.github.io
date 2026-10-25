export const MODES={role:'Identify the Role',missing:"What's Missing?",next:'Next Step',misconception:'Diagnose the Misconception',diagram:'Read the Network'};
export const TOPICS={roles:'Protocol Roles',communication:'Internet Communication',routing:'Routing and Packets',reliability:'Reliability and Fault Tolerance',diagrams:'Network Diagrams'};
export const CONCEPTS={dns:'DNS',ip:'IP addressing & forwarding',router:'Routers & routing tables',switch:'Local switching',tcp:'TCP reliability & ordering',udp:'UDP datagrams',http:'HTTP requests & responses',https:'HTTPS & TLS',quic:'HTTP/3 & QUIC',link:'Link / network access',packet:'Packet switching',capacity:'Bandwidth & latency',redundancy:'Redundancy & fault tolerance',layers:'Layer responsibilities',endpoints:'Sources, destinations & clients',congestion:'Congestion & loss'};
export const PROTOCOLS={
 DNS:{layer:'Application',role:'Resolve names to records such as IP addresses.'},
 HTTP:{layer:'Application',role:'Define web resource request and response semantics.'},
 TCP:{layer:'Transport',role:'Provide a reliable ordered byte stream between endpoints.'},
 UDP:{layer:'Transport',role:'Provide datagrams without built-in delivery or ordering guarantees.'},
 IP:{layer:'Internet',role:'Address and forward packets across interconnected networks.'},
 Ethernet:{layer:'Link / Network Access',role:'Carry local-link frames over a wired network technology.'},
 'Wi-Fi':{layer:'Link / Network Access',role:'Carry local-link frames using a wireless network technology.'}
};
export const PROFILES=[
 {context:'A browser retrieves a library document.',client:'laptop',server:'library service',resource:'catalog page',domain:'catalog.example',link:'Wi-Fi'},
 {context:'A mobile app retrieves a museum guide.',client:'phone',server:'museum service',resource:'exhibit description',domain:'guide.example',link:'Wi-Fi'},
 {context:'A laboratory client exchanges measurement records.',client:'workstation',server:'research service',resource:'measurement record',domain:'records.example',link:'Ethernet'},
 {context:'A classroom tool requests a lesson resource.',client:'tablet',server:'lesson service',resource:'lesson document',domain:'lessons.example',link:'Wi-Fi'},
 {context:'An office application accesses a remote report.',client:'desktop',server:'report service',resource:'report document',domain:'reports.example',link:'Ethernet'}
];
export function graph(variant=0,kind='diamond',failed=false){const letters=['A','B','C','D','E','F','G','H','J'],shift=variant%5,nodes=Array.from({length:4},(_,i)=>letters[(i+shift)%letters.length]),coords=kind==='chain'?[[30,95],[120,95],[210,95],[300,95]]:[[30,95],[165,25],[165,165],[300,95]],edges=kind==='chain'?[[0,1],[1,2],[2,3]]:[[0,1],[1,3],[0,2],[2,3]];if(kind!=='chain'&&variant%2)edges.push([1,2]);const blocked=failed?[edges[variant%2]]:[];return {nodes,coords,edges,blocked,source:0,destination:3};}
export const edgeKey=e=>[...e].sort((a,b)=>a-b).join('-');
export function validPath(g,path){return path.length>=2&&path[0]===g.source&&path.at(-1)===g.destination&&new Set(path).size===path.length&&path.every((n,i)=>i===0||g.edges.some(e=>edgeKey(e)===edgeKey([path[i-1],n]))&&!g.blocked.some(e=>edgeKey(e)===edgeKey([path[i-1],n])));}
export function paths(g){const result=[];function walk(path){const last=path.at(-1);if(last===g.destination){result.push(path);return;}for(let n=0;n<g.nodes.length;n++)if(!path.includes(n)&&g.edges.some(e=>edgeKey(e)===edgeKey([last,n]))&&!g.blocked.some(e=>edgeKey(e)===edgeKey([last,n])))walk([...path,n]);}walk([g.source]);return result;}
export const pathText=(g,p)=>p.map(n=>g.nodes[n]).join(' → ');
export function graphText(g){return `Nodes: ${g.nodes.join(', ')}. Connections: ${g.edges.map(e=>e.map(n=>g.nodes[n]).join('–')).join(', ')}. ${g.blocked.length?'Unavailable: '+g.blocked.map(e=>e.map(n=>g.nodes[n]).join('–')).join(', ')+'.':'All shown connections are available.'} Message starts at ${g.nodes[g.source]} and is addressed to ${g.nodes[g.destination]}.`;}
