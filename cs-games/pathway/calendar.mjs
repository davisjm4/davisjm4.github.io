export const DAY_TYPES = ['New Instruction','Guided Practice','Study / Review','Mixed Practice','Quiz / Testing','Semester / Final Exam','No Class'];
export const dateOK = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export function dates(start,end) {
  if (!dateOK(start)||!dateOK(end)||end<start||(Date.parse(end)-Date.parse(start))/86400000>1100) throw new Error('Choose a valid date range of at most three years.');
  const list=[]; for(let d=new Date(start+'T12:00:00Z');d.toISOString().slice(0,10)<=end;d.setUTCDate(d.getUTCDate()+1)) list.push(d.toISOString().slice(0,10)); return list;
}
export function parseCSV(text) {
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<=text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(!quoted&&(c===','||c==='\n'||c===undefined)){row.push(field.replace(/\r$/,''));field='';if(c!==','){if(row.some(Boolean))rows.push(row);row=[];}}else if(c!==undefined)field+=c;}
  if(quoted)throw new Error('Unclosed CSV quote.'); return rows;
}
const csvDate = s => /^\d{8}$/.test(s||'') ? s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8) : s;
function classify(label,type) {
  if(DAY_TYPES.includes(type))return {dayType:type,uncertain:false};
  if(/holiday|no school|school closed|closure|professional development|staff development|\bPD day\b/i.test(label))return {dayType:'No Class',uncertain:false};
  if(/early release|shortened/i.test(label))return {dayType:'New Instruction',uncertain:true};
  return {dayType:'New Instruction',uncertain:true};
}
export function importCalendar(text,format) {
  if(text.length>1000000)throw new Error('Calendar import is too large.');const events=[];
  if(format==='csv'){
    const [header,...rows]=parseCSV(text);if(!header)throw new Error('CSV needs a header.');const h=header.map(x=>x.trim().toLowerCase());
    for(const r of rows){const get=k=>r[h.indexOf(k)]||'';const start=get('date')||get('start');if(!start)throw new Error('CSV requires date or start.');
      events.push({start,end:get('end')||start,label:get('label')||get('summary'),type:get('type'),minutes:get('minutes'),schoolDay:get('schoolday'),rotation:get('rotation'),nonRotation:get('nonrotation')});}
  }else if(format==='ics'){
    const lines=text.replace(/\r?\n[ \t]/g,'').split(/\r?\n/);let e;
    for(const line of lines){if(line==='BEGIN:VEVENT')e={};else if(line==='END:VEVENT'&&e){
      if(e.RRULE)throw new Error('Recurring ICS events require expansion to individual dates before import. Export a date-limited calendar or use CSV.');
      if(!e.DTSTART||e.DTSTART.length!==8||(e.DTEND&&e.DTEND.length!==8))throw new Error('Import school dates as all-day ICS events. Timed events need manual classification through CSV.');
      const start=csvDate(e.DTSTART);let end=e.DTEND?csvDate(e.DTEND):start;
      if(e.DTEND){const d=new Date(end+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);end=d.toISOString().slice(0,10);}
      events.push({start,end,label:(e.SUMMARY||'Imported date').replace(/\\n/g,' ').replace(/\\([,;\\])/g,'$1')});e=null;
    }else if(e){const i=line.indexOf(':');if(i>0)e[line.slice(0,i).split(';')[0]]=line.slice(i+1);}}
  }else throw new Error('Use CSV or ICS.');
  const result=[];for(const e of events){for(const date of dates(csvDate(e.start),csvDate(e.end))){
    const c=classify(e.label,e.type);let minutes=e.minutes===''||e.minutes==null?null:Number(e.minutes);
    if(minutes!==null&&(!Number.isFinite(minutes)||minutes<0||minutes>1440))throw new Error('Invalid calendar minutes.');
    result.push({date,label:e.label||'Imported school date',...c,schoolDay:e.schoolDay==='true'?true:e.schoolDay==='false'?false:c.dayType!=='No Class',
      minutes,rotation:e.rotation||null,nonRotation:e.nonRotation==='true',confirmed:!c.uncertain});}}
  if(!result.length)throw new Error('No calendar dates were found.');
  return result;
}
export function applyImport(calendar,preview) {
  if(preview.some(e=>e.uncertain&&!e.confirmed))throw new Error('Confirm each uncertain calendar classification first.');
  const by=new Map((calendar.overrides||[]).map(e=>[e.date,e]));for(const e of preview)by.set(e.date,{...by.get(e.date),...e});
  return {...calendar,overrides:[...by.values()].sort((a,b)=>a.date.localeCompare(b.date))};
}
export function meetings(calendar) {
  const {start,end,weekdays=[1,2,3,4,5],minutes=80,rotation=['A','B'],classRotations=[],rotationOffset=0,overrides=[]}=calendar;
  if(!Array.isArray(weekdays)||weekdays.some(x=>!Number.isInteger(x)||x<0||x>6)||!Number.isFinite(minutes)||minutes<1||minutes>1440||!Array.isArray(rotation)||rotation.length>30||!Number.isInteger(rotationOffset))throw new Error('Invalid class schedule.');
  const by=new Map(overrides.map(x=>[x.date,x]));let tick=rotationOffset;const list=[];
  for(const date of dates(start,end)){
    const o=by.get(date)||{},weekday=new Date(date+'T12:00:00Z').getUTCDay();
    const schoolDay=o.schoolDay??(weekday>0&&weekday<6);const type=o.dayType||'New Instruction';
    if(!DAY_TYPES.includes(type))throw new Error('Unknown instructional day type.');
    const rotates=schoolDay&&type!=='No Class'&&!o.nonRotation;
    if(rotates&&o.rotation&&rotation.includes(o.rotation))tick=rotation.indexOf(o.rotation);
    const cycle=o.rotation||(rotation.length?rotation[((tick%rotation.length)+rotation.length)%rotation.length]:null);
    const classMeets=schoolDay&&type!=='No Class'&&weekdays.includes(weekday)&&(o.meets??(!classRotations.length||classRotations.includes(cycle)));
    const duration=classMeets?Number(o.minutes??minutes):0;
    if(!Number.isFinite(duration)||duration<0||duration>1440)throw new Error('Invalid class meeting duration.');
    list.push({date,schoolDay,rotation:cycle,meets:classMeets,minutes:duration,dayType:classMeets?type:'No Class',label:o.label||'',protected:!['New Instruction','Guided Practice'].includes(type)});
    if(rotates)tick++;
  }return list;
}
export function bulkDates(calendar,start,end,patch){const by=new Map((calendar.overrides||[]).map(x=>[x.date,x]));for(const date of dates(start,end)){const previous=by.get(date);const protectedAssessment=['Quiz / Testing','Semester / Final Exam'].includes(previous?.dayType)&&['Study / Review','Mixed Practice','Guided Practice'].includes(patch.dayType);by.set(date,{...previous,...patch,date,...(protectedAssessment&&!patch.replaceAssessments?{dayType:previous.dayType,assessmentNodeIds:previous.assessmentNodeIds}: {})});}return {...calendar,overrides:[...by.values()]};}
