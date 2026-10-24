// Reads an .ics file and renders it as a list. The .ics is the only data source.
function parseICS(text){
  const lines=text.replace(/\r\n/g,'\n').replace(/\n[ \t]/g,'').split('\n');
  const events=[];let cur=null;
  const un=s=>s.replace(/\\n/gi,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\');
  for(const line of lines){
    if(line==='BEGIN:VEVENT'){cur={};continue}
    if(line==='END:VEVENT'){if(cur)events.push(cur);cur=null;continue}
    if(!cur)continue;
    const i=line.indexOf(':');if(i<0)continue;
    const key=line.slice(0,i).split(';')[0].toUpperCase();cur[key]=un(line.slice(i+1));
  }
  const d=s=>{if(!s)return null;const m=s.match(/^(\d{4})(\d{2})(\d{2})/);return m?new Date(+m[1],+m[2]-1,+m[3]):null};
  return events.map(e=>{
    const start=d(e.DTSTART);let end=d(e.DTEND)||start;
    if(e.DTEND&&/^\d{8}$/.test(e.DTEND)){end=new Date(end);end.setDate(end.getDate()-1)} // DTEND is exclusive for all-day events
    return {title:e.SUMMARY||'',start,end,location:e.LOCATION||'',url:e.URL||'',category:e.CATEGORIES||'',description:e.DESCRIPTION||''};
  }).filter(e=>e.start).sort((a,b)=>a.start-b.start);
}
const LOCALE='el-GR';
function fmtRange(s,e){
  const o={day:'numeric',month:'short'};
  if(!e||+s===+e)return s.toLocaleDateString(LOCALE,o);
  if(s.getMonth()===e.getMonth()&&s.getFullYear()===e.getFullYear())return s.getDate()+'–'+e.toLocaleDateString(LOCALE,o);
  return s.toLocaleDateString(LOCALE,o)+' – '+e.toLocaleDateString(LOCALE,o);
}
function esc(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function renderCalendar(icsFile,target){
  const el=document.getElementById(target);
  const abs=new URL(icsFile,location.href).href;
  document.getElementById('subscribe').href=abs.replace(/^https?:/,'webcal:');
  document.getElementById('gcal').href='https://calendar.google.com/calendar/r?cid='+encodeURIComponent(abs.replace(/^https?:/,'webcal:'));
  document.getElementById('download').href=icsFile;
  document.getElementById('copy').onclick=async()=>{try{await navigator.clipboard.writeText(abs);document.getElementById('copy').textContent='Αντιγράφηκε ✓'}catch(e){prompt('URL:',abs)}};
  let events;
  try{const r=await fetch(icsFile,{cache:'no-cache'});events=parseICS(await r.text())}
  catch(e){el.textContent='Δεν φορτώθηκε το ημερολόγιο.';return}
  const today=new Date();today.setHours(0,0,0,0);
  const showPast=document.getElementById('showPast');
  const draw=()=>{
    const list=events.filter(e=>showPast.checked||(e.end||e.start)>=today);
    if(!list.length){el.innerHTML='<p class="sub">Δεν υπάρχουν προσεχή συνέδρια.</p>';return}
    let html='',lastMonth='';
    for(const e of list){
      const m=e.start.toLocaleDateString(LOCALE,{month:'long',year:'numeric'});
      if(m!==lastMonth){html+=`<h2 class="month">${esc(m)}</h2>`;lastMonth=m}
      const past=(e.end||e.start)<today;
      const notes=e.description.split('\n').filter(l=>l.trim()&&l.trim()!==e.url&&!l.startsWith('Source:')).join(' ');
      html+=`<div class="ev${past?' past':''}"><div class="date">${esc(fmtRange(e.start,e.end))}<small>${e.start.getFullYear()}</small></div><div>
        <p class="title">${e.url?`<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.title)}</a>`:esc(e.title)}${e.category?`<span class="tag">${esc(e.category)}</span>`:''}</p>
        <div class="meta">📍 ${esc(e.location)}</div>${notes?`<div class="notes">${esc(notes)}</div>`:''}</div></div>`;
    }
    el.innerHTML=html;
  };
  showPast.onchange=draw;draw();
}
