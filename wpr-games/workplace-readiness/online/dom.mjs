export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key,value] of Object.entries(props)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2),value);
    else if (key === 'text') node.textContent = value;
    else if (key === 'class') node.className = value;
    else if (value !== false && value != null) node.setAttribute(key, value === true ? '' : value);
  }
  node.append(...children.flat().filter(x=>x != null && x !== false));
  return node;
}
export function download(name, contents, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contents], {type}));
  const a = el('a',{href:url,download:name});
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export const button = (text,click,cls='btn') => el('button',{type:'button',class:cls,text,onclick:click});
export const pct = (n,c) => n ? Math.round(100*c/n)+'%' : '—';
export function table(headers, rows, caption) {
  return el('div',{class:'wpr-table-scroll'},el('table',{},
    el('caption',{text:caption}),el('thead',{},el('tr',{},headers.map(h=>el('th',{scope:'col',text:h})))),
    el('tbody',{},rows.map(row=>el('tr',{},row.map((cell,i)=>el(i?'td':'th',i?{}:{scope:'row'},cell)))))));
}
export function options(values) {
  return values.map(([value,text])=>el('option',{value,text}));
}
export async function copy(value, status) {
  try { await navigator.clipboard.writeText(value); status.textContent = 'Link copied.'; }
  catch { status.replaceChildren(el('a',{href:value,text:value})); }
}
