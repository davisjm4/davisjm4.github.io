// Scoped to a pseudonymous profile + class. No names, email addresses or credentials are cached.
export function createPathwayClient({storage,scope,load,submitEvidence,notify=()=>{}}){
  const key='cs-games:pathway:v1:'+scope;let state={published:null,pending:null,outbox:[]},active=false;
  try{const saved=JSON.parse(storage.getItem(key));if(saved&&Array.isArray(saved.outbox))state=saved;}catch{}
  const save=()=>{try{storage.setItem(key,JSON.stringify(state));}catch{notify('Offline pathway storage is unavailable. Keep this session open.');}};
  function adopt(){if(state.pending&&!active){const previous=state.published;state.published=state.pending;state.pending=null;save();if(previous&&previous.revision!==state.published.revision)notify('Your class learning pathway has been updated to revision '+state.published.revision+'. Your learning evidence is preserved.');}}
  let stopPolling=()=>{};
  const client={get current(){return state.published;},get pending(){return state.pending;},get queued(){return state.outbox.length;},setActive(value){active=!!value;if(!active)adopt();},
    queueEvidence(e){if(!e.id)throw new Error('Evidence requires a stable idempotency ID.');if(!state.outbox.some(x=>x.id===e.id)){state.outbox.push(e);save();}},
    async sync(){try{const data=await load();const p=data.pathway||data;if(!p.pathwayId||!Number.isInteger(p.revision))throw new Error('Invalid pathway response.');if(state.published&&p.pathwayId!==state.published.pathwayId)throw new Error('Class pathway identity changed; reload enrollment.');if(!state.published||p.revision>=state.published.revision){state.pending=p;adopt();}if(submitEvidence)for(const e of [...state.outbox]){const result=await submitEvidence(e);if(result?.id!==e.id||!result.accepted)throw new Error('Evidence was not acknowledged.');state.outbox=state.outbox.filter(x=>x.id!==e.id);save();}return {online:true,current:state.published,pending:state.pending};}
      catch(e){notify('Using the latest cached pathway. '+e.message);return {online:false,current:state.published,pending:state.pending};}},
    start({intervalMs=60000,eventTarget=globalThis}={}){stopPolling();const sync=()=>client.sync();const timer=setInterval(sync,Math.max(10000,intervalMs));eventTarget.addEventListener?.('online',sync);eventTarget.addEventListener?.('focus',sync);stopPolling=()=>{clearInterval(timer);eventTarget.removeEventListener?.('online',sync);eventTarget.removeEventListener?.('focus',sync);};sync();return stopPolling;},
    stop(){stopPolling();},
    clear(){stopPolling();storage.removeItem(key);state={published:null,pending:null,outbox:[]};}
  };
  return client;
}
