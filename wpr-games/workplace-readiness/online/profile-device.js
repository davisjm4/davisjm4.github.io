/* Keep guest storage separate from the active profile. Recovery credentials are never stored here. */
(function (root) {
  'use strict';
  if (root.CSGamesProfileDevice) {
    if (root.WRG) root.WRG.profileDevice=root.CSGamesProfileDevice;
    return;
  }
  const activeKey='wrg.profile.active.v1';
  const profileId=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  function active() {
    try {
      const p=JSON.parse(root.localStorage.getItem(activeKey));
      return p && profileId.test(p.id) && /^[0-9a-f]{64}$/.test(p.token) && Number.isSafeInteger(p.expires) ? p : null;
    } catch { return null; }
  }
  const identity=active();
  const prefix=identity?'wrg.profile.'+identity.id+'.':'';
  const key=name=>prefix+name;
  const isCurrent=()=>{
    const current=active();
    return identity?.id===current?.id && identity?.token===current?.token;
  };
  function signIn({id,token,expires,classId,courseId}) {
    root.localStorage.setItem(activeKey,JSON.stringify({id,token,expires,classId,courseId}));
  }
  function clear() {
    if (!identity || !isCurrent()) return;
    for (const k of Object.keys(root.localStorage)) if (k.startsWith(prefix)) root.localStorage.removeItem(k);
    root.localStorage.removeItem(activeKey);
  }
  root.CSGamesProfileDevice={identity,key,isCurrent,signIn,clear};
  if (root.WRG) root.WRG.profileDevice=root.CSGamesProfileDevice;
  root.addEventListener?.('storage',event=>{
    if (event.key===activeKey || event.key===null) root.location.reload();
  });
}(globalThis));
