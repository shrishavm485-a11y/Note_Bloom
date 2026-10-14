'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY='notebloom.v1';
const SAMPLE='network is connection between devices lan local area network small area wan large geographical area router forwards packets ip address identifies device dns converts domain name to ip tcp reliable udp faster';
const QUOTES=['Small notes, done daily, beat big notes, done never.','Explain it simply and you know it.','Review tomorrow what you wrote today.'];
const DEF_FOLDERS=['College','Programming','Mathematics','Computer Science','Revision','Personal'];
let db=load(), cur=null, hist=[], hi=-1, saveTimer=null;

function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&Array.isArray(d.notes))return d}catch(e){}return{notes:[],folders:[...DEF_FOLDERS],dark:false}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(db));return true}catch(e){return false}}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function words(s){return(s.trim().match(/\S+/g)||[]).length}

/* ---------- Beautify engine (deterministic) ---------- */
const VERBS='is|are|means|refers to|identifies|converts|forwards|connects|stores|uses|provides|allows|transmits|contains|represents|defines|describes|helps|makes|sends|receives|controls|manages|ensures|enables|translates|routes|carries|requires'.split('|');
const VRE=new RegExp('^('+VERBS.join('|')+')$','i');
function splitSegments(text){
  const out=[];
  text.replace(/\r/g,'').split(/\n+/).forEach(line=>{
    line=line.trim(); if(!line)return;
    if(/^(#{1,6}\s|[-*•]\s|\d+[.)]\s|>\s|\|)/.test(line)){out.push({raw:line,structured:true});return}
    line.split(/(?<=[.!?;])\s+/).forEach(s=>{
      s=s.trim(); if(!s)return;
      const w=s.split(/\s+/);
      if(w.length>14&&!/[.,;:]/.test(s.slice(0,-1))) splitRunOn(w).forEach(p=>out.push({raw:p}));
      else out.push({raw:s});
    });
  });
  return out;
}
function splitRunOn(w){ // break unpunctuated text before likely subjects of definition verbs
  const cuts=[0];
  for(let i=1;i<w.length;i++){
    if(VRE.test(w[i])&&i>=1){
      let st=i-1; if(i>=2&&/^(address|name|system|protocol|server|layer|rate|number|code|table|key|memory|network|model)$/i.test(w[i-1])&&!VRE.test(w[i-2])&&!/^(the|a|an|of|to|and)$/i.test(w[i-2])&&i-2>cuts[cuts.length-1]+2)st=i-2;
      if(st>cuts[cuts.length-1]+2)cuts.push(st);
    }
  }
  return cuts.map((c,k)=>w.slice(c,cuts[k+1]).join(' ')).filter(Boolean);
}
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function parse(text){
  const items=[];
  splitSegments(text).forEach(sg=>{
    const r=sg.raw;
    if(sg.structured){items.push({kind:'raw',text:r});return}
    const w=r.split(/\s+/);
    const vi=w.findIndex((x,i)=>i>0&&i<=4&&VRE.test(x));
    let clean=cap(r.replace(/\s+/g,' ').replace(/\s+([,.;:!?])/g,'$1'));
    if(!/[.!?:]$/.test(clean))clean+='.';
    if(vi>0){items.push({kind:'def',term:w.slice(0,vi).join(' '),body:clean,review:w.length>24})}
    else items.push({kind:'fact',body:clean,review:w.length>24});
  });
  return items;
}
function bold(t,term){return term?t.replace(new RegExp('\\b'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i'),m=>'**'+m+'**'):t}
function beautify(o){
  const E=o.emoji,items=parse(o.text),defs=items.filter(i=>i.kind==='def'),facts=items.filter(i=>i.kind==='fact'),raws=items.filter(i=>i.kind==='raw');
  const title=o.title||(defs[0]?cap(defs[0].term):'My Notes');
  const L=[];const e=x=>E?x+' ':'';
  const meta=[o.subject&&'Subject: '+o.subject,o.topic&&'Topic: '+o.topic].filter(Boolean).join(' | ');
  L.push('# '+e('📒')+title);if(meta)L.push('*'+meta+'*');L.push('');
  const flag=i=>i.review?' ⚠️ *Review: unclear or long passage, kept as written.*':'';
  const defLine=i=>'- '+bold(i.body.replace(/\.$/,'.'),i.term)+flag(i);
  const factLine=i=>'- '+i.body+flag(i);
  if(raws.length){raws.forEach(r=>L.push(r.text));L.push('')}
  const st=o.style;
  if(st==='flash'){
    L.push('## '+e('🃏')+'Flashcards','');
    defs.forEach((d,n)=>{L.push('**Q'+(n+1)+'. What does "'+d.term+'" mean or do?**','',d.body,'')});
    facts.forEach((f,n)=>{L.push('**Card '+(defs.length+n+1)+'**','',f.body,'')});
  }else if(st==='cornell'){
    L.push('## '+e('❓')+'Cue questions','');
    defs.forEach(d=>L.push('- What is **'+d.term+'**?'));
    L.push('','## '+e('📝')+'Notes','');
    items.filter(i=>i.kind!=='raw').forEach(i=>L.push(i.kind==='def'?defLine(i):factLine(i)));
  }else if(st==='exam'){
    if(defs.length){L.push('## '+e('📖')+'Definitions','');defs.forEach(d=>L.push(defLine(d)));L.push('')}
    if(facts.length){L.push('## '+e('📌')+'Key points','');facts.forEach(f=>L.push(factLine(f)));L.push('')}
    L.push('## '+e('❓')+'Likely questions','');
    defs.forEach(d=>L.push('- [ ] Define '+d.term+'.'));
    L.push('- [ ] Revise the key points above.');
  }else{
    const hl=st==='colorful';
    if(defs.length){L.push('## '+e('🔑')+'Key terms','');defs.forEach(d=>L.push(hl?'> '+bold(d.body,d.term).replace(/\*\*(.+?)\*\*/,'==$1==')+flag(d):defLine(d)));L.push('')}
    if(facts.length){L.push('## '+e('📌')+'Details','');facts.forEach(f=>L.push(factLine(f)));L.push('')}
  }
  if(o.summary&&st!=='flash'&&items.length){
    L.push('','## '+e('✨')+'Summary','');
    L.push('> '+(defs.length?'This note covers '+defs.length+' term'+(defs.length>1?'s':'')+': '+defs.map(d=>d.term).join(', ')+'.':'This note contains '+items.length+' point'+(items.length>1?'s':'')+'.'));
  }
  if(o.takeaways&&defs.length&&st!=='flash'){
    L.push('','## '+e('✅')+'Key takeaways','');defs.forEach(d=>L.push('- [ ] Remember: '+d.term));
  }
  return L.join('\n').replace(/\n{3,}/g,'\n\n').trim()+'\n';
}

/* ---------- Markdown rendering (escaped first, safe) ---------- */
function inline(s){
  s=esc(s);
  s=s.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/(^|[^*])\*([^*]+)\*/g,'$1<em>$2</em>').replace(/==(.+?)==/g,'<mark>$1</mark>');
  s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return s;
}
function render(md){
  const lines=md.split('\n'),o=[];let list=null;
  const close=()=>{if(list){o.push('</'+list+'>');list=null}};
  for(let i=0;i<lines.length;i++){
    const l=lines[i];let m;
    if(m=l.match(/^(#{1,3})\s+(.*)/)){close();o.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`)}
    else if(m=l.match(/^[-*]\s+\[( |x)\]\s+(.*)/i)){if(list!=='ul'){close();o.push('<ul style="list-style:none;padding-left:0">');list='ul'}o.push(`<li><input type="checkbox" disabled ${m[1]!==' '?'checked':''}> ${inline(m[2])}</li>`)}
    else if(m=l.match(/^[-*•]\s+(.*)/)){if(list!=='ul'){close();o.push('<ul>');list='ul'}o.push('<li>'+inline(m[1])+'</li>')}
    else if(m=l.match(/^\d+[.)]\s+(.*)/)){if(list!=='ol'){close();o.push('<ol>');list='ol'}o.push('<li>'+inline(m[1])+'</li>')}
    else if(m=l.match(/^>\s?(.*)/)){close();o.push('<blockquote>'+inline(m[1])+'</blockquote>')}
    else if(/^\|/.test(l)){close();const rows=[];while(i<lines.length&&/^\|/.test(lines[i])){if(!/^\|[\s:|-]+\|?$/.test(lines[i]))rows.push(lines[i].split('|').slice(1,-1).map(c=>inline(c.trim())));i++}i--;o.push('<table>'+rows.map((r,k)=>'<tr>'+r.map(c=>k?'<td>'+c+'</td>':'<th>'+c+'</th>').join('')+'</tr>').join('')+'</table>')}
    else if(/^---+$/.test(l)){close();o.push('<hr>')}
    else if(l.trim()===''){close()}
    else{close();o.push('<p>'+inline(l)+'</p>')}
  }
  close();return o.join('\n');
}
const plain=md=>md.replace(/^#{1,6}\s+/gm,'').replace(/\*\*|==|`/g,'').replace(/^>\s?/gm,'').replace(/\[( |x)\]/gi,'☐').replace(/\*([^*]+)\*/g,'$1');

/* ---------- Navigation ---------- */
function go(v){
  if(cur&&cur.dirty&&v!=='create')flushSave();
  $$('.view').forEach(x=>x.hidden=x.id!=='v-'+v);
  $$('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
  if(v==='home')renderHome();if(v==='notes')renderNotes();if(v==='settings')renderFolders();
  window.scrollTo(0,0);
}
$$('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.view));

/* ---------- Home ---------- */
function card(n){
  const d=document.createElement('div');d.className='item';
  d.innerHTML=`<h3>${esc(n.title||'Untitled')}</h3><p>${esc(n.subject||'No subject')} · ${new Date(n.updated).toLocaleDateString()}</p><p>${esc(plain(n.md).replace(/\s+/g,' ').slice(0,90))}</p><div class="row"></div>`;
  const r=d.querySelector('.row');
  const btn=(t,f)=>{const b=document.createElement('button');b.className='btn small';b.textContent=t;b.onclick=f;r.appendChild(b)};
  if(n.trashed){btn('Restore',()=>{n.trashed=false;persist();renderNotes()});btn('Delete forever',()=>{if(confirm('Permanently delete this note? This cannot be undone.')){db.notes=db.notes.filter(x=>x!==n);persist();renderNotes()}})}
  else{btn('Open',()=>openNote(n));btn(n.fav?'★':'☆',()=>{n.fav=!n.fav;persist();rerender()});
    btn('Duplicate',()=>{db.notes.push({...n,id:uid(),title:n.title+' (copy)',created:Date.now(),updated:Date.now()});persist();rerender()});
    btn('Move',()=>{const f=prompt('Folder name (blank = none). Available: '+db.folders.join(', '),n.folder||'');if(f===null)return;if(f&&!db.folders.includes(f))return toast('Folder not found');n.folder=f;persist();rerender()});
    btn('Trash',()=>{n.trashed=true;persist();rerender();toast('Moved to Trash')})}
  return d;
}
const rerender=()=>{renderHome();renderNotes()};
function fill(el,arr,msg){el.innerHTML='';if(!arr.length){el.innerHTML='<div class="empty">'+msg+'</div>';return}arr.forEach(n=>el.appendChild(card(n)))}
function renderHome(){
  const live=db.notes.filter(n=>!n.trashed);
  $('#greet').textContent=(new Date().getHours()<12?'Good morning':new Date().getHours()<18?'Good afternoon':'Good evening')+'. Today is '+new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})+'.';
  $('#count').textContent=live.length;$('#quote').textContent=QUOTES[new Date().getDate()%QUOTES.length];
  fill($('#recent'),[...live].sort((a,b)=>b.updated-a.updated).slice(0,4),'No notes yet. Paste some text above to make your first one.');
  fill($('#favs'),live.filter(n=>n.fav),'Star a note to find it here.');
}
$('#homeGo').onclick=()=>{go('create');$('#input').value=$('#homeText').value;stats()};
$('#daily').onclick=()=>{const d=new Date().toLocaleDateString();newDraft();$('#title').value='Daily study note, '+d;$('#input').value='Today I studied:\n- ';go('create');stats()};

/* ---------- Notes list ---------- */
function renderNotes(){
  const sel=$('#fFolder'),keep=sel.value||'All Notes';
  sel.innerHTML=['All Notes',...db.folders,'Trash'].map(f=>`<option>${esc(f)}</option>`).join('');sel.value=[...sel.options].some(o=>o.value===keep)?keep:'All Notes';
  const f=sel.value,q=$('#q').value.toLowerCase();
  let a=db.notes.filter(n=>f==='Trash'?n.trashed:!n.trashed&&(f==='All Notes'||n.folder===f));
  if($('#onlyFav').checked)a=a.filter(n=>n.fav);
  if(q)a=a.filter(n=>(n.title+' '+n.md+' '+(n.subject||'')).toLowerCase().includes(q));
  const s=$('#sort').value;
  a.sort((x,y)=>s==='alpha'?x.title.localeCompare(y.title):s==='oldest'?x.created-y.created:s==='created'?y.created-x.created:y.updated-x.updated);
  fill($('#noteList'),a,q?'No notes match your search.':'Nothing here yet.');
}
['q','fFolder','sort','onlyFav'].forEach(id=>$('#'+id).addEventListener('input',renderNotes));

/* ---------- Editor ---------- */
function stats(){const t=$('#input').value;$('#stats').textContent=words(t)+' words · '+t.length+' characters · ~'+Math.max(1,Math.ceil(words(t)/200))+' min read'}
$('#input').oninput=stats;
function newDraft(){cur=null;hist=[];hi=-1;['title','subject','topic','input'].forEach(i=>$('#'+i).value='');$('#out').hidden=true}
function opts(){return{text:$('#input').value,title:$('#title').value.trim(),subject:$('#subject').value.trim(),topic:$('#topic').value.trim(),style:$('#style').value,emoji:$('#emoji').checked,summary:$('#summary').checked,takeaways:$('#takeaways').checked}}
$('#beautify').onclick=()=>{
  const o=opts();if(!o.text.trim())return toast('Add some text first');
  if(o.text.length>200000)return toast('Text is too long (200,000 character limit)');
  const md=beautify(o);
  if(!cur)cur={id:uid(),created:Date.now(),fav:false,folder:'',tags:[],dirty:false,input:o.text};
  cur.input=cur.input||o.text;setMd(md,true);$('#out').hidden=false;
  const dup=db.notes.find(n=>!n.trashed&&n.id!==cur.id&&n.title&&n.title.toLowerCase()===title().toLowerCase());
  if(dup)toast('A note with a similar title already exists');
  show('preview');$('#out').scrollIntoView({behavior:'smooth'});
};
const title=()=>(($('#source').value.match(/^#\s+(.*)/m)||[])[1]||'Untitled').replace(/^[^\w]+/u,'').trim()||'Untitled';
function setMd(md,push){$('#source').value=md;if(push){hist=hist.slice(0,hi+1);hist.push(md);hi=hist.length-1}refresh();markDirty()}
function refresh(){const p=$('#preview');p.innerHTML=render($('#source').value);p.style.setProperty('--fs',$('#fsize').value+'px');p.className='doc '+$('#layout').value}
['fsize','layout'].forEach(i=>$('#'+i).addEventListener('change',refresh));
$('#source').oninput=()=>{refresh();markDirty();clearTimeout($('#source')._t);$('#source')._t=setTimeout(()=>{hist=hist.slice(0,hi+1);hist.push($('#source').value);hi=hist.length-1},500)};
$('#undo').onclick=()=>{if(hi>0){hi--;$('#source').value=hist[hi];refresh();markDirty()}};
$('#redo').onclick=()=>{if(hi<hist.length-1){hi++;$('#source').value=hist[hi];refresh();markDirty()}};
function show(t){$$('.tab').forEach(b=>b.classList.toggle('on',b.dataset.t===t));$('#preview').hidden=t!=='preview';$('#source').hidden=t!=='source'}
$$('.tab').forEach(b=>b.onclick=()=>show(b.dataset.t));
function status(s){$('#saveState').textContent=s}
function markDirty(){if(!cur)return;cur.dirty=true;status('Saving...');clearTimeout(saveTimer);saveTimer=setTimeout(flushSave,700)}
function flushSave(){
  if(!cur||!$('#source').value)return;clearTimeout(saveTimer);
  const o=opts(),i=db.notes.findIndex(n=>n.id===cur.id);
  const n={id:cur.id,created:cur.created,fav:cur.fav,folder:cur.folder,tags:cur.tags,trashed:false,title:title(),subject:o.subject,topic:o.topic,input:cur.input,md:$('#source').value,style:o.style,updated:Date.now()};
  if(i>=0)db.notes[i]=n;else db.notes.push(n);
  if(persist()){cur.dirty=false;status('Saved')}else status('Save failed (storage full or blocked)');
}
$('#save').onclick=()=>{flushSave();toast('Saved')};
function openNote(n){go('create');cur={id:n.id,created:n.created,fav:n.fav,folder:n.folder,tags:n.tags||[],input:n.input,dirty:false};
  $('#title').value=n.title;$('#subject').value=n.subject||'';$('#topic').value=n.topic||'';$('#input').value=n.input||'';$('#style').value=n.style||'aesthetic';
  hist=[n.md];hi=0;$('#out').hidden=false;$('#source').value=n.md;refresh();show('preview');status('Saved');stats()}
$('#restore').onclick=()=>{if(cur&&cur.input&&confirm('Put the original text back into the input box? Your current notes stay as they are until you press Beautify.')){$('#input').value=cur.input;stats();toast('Original restored to input')}};
$('#sample').onclick=()=>{$('#input').value=SAMPLE;stats()};
$('#clear').onclick=()=>{if(!$('#input').value||confirm('Clear the input text?')){$('#input').value='';stats()}};
$('#paste').onclick=async()=>{try{$('#input').value+=await navigator.clipboard.readText();stats()}catch(e){toast('Paste not allowed here. Use long-press > Paste.')}};
$('#importTxt').onclick=()=>$('#file').click();
$('#file').onchange=e=>{const f=e.target.files[0];if(!f)return;if(!/\.(txt|md)$/i.test(f.name)||f.size>1e6){toast('Choose a .txt or .md file under 1 MB');return}
  const r=new FileReader();r.onload=()=>{$('#input').value=String(r.result);stats()};r.readAsText(f);e.target.value=''};

/* ---------- Export ---------- */
function dl(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
const fname=()=>title().replace(/[^\w-]+/g,'_').slice(0,40)||'note';
$('#dlTxt').onclick=()=>dl(fname()+'.txt',plain($('#source').value),'text/plain');
$('#dlMd').onclick=()=>dl(fname()+'.md',$('#source').value,'text/markdown');
$('#dlHtml').onclick=()=>dl(fname()+'.html','<!doctype html><meta charset="utf-8"><title>'+esc(title())+'</title><style>body{font:17px/1.7 system-ui;max-width:720px;margin:2rem auto;padding:0 1rem}blockquote{background:#C9F2D0;border-left:8px solid #202020;margin:1rem 0;padding:.5rem 1rem}mark{background:#FFE89A}h2{background:#DCCBFF;display:inline-block;padding:0 .6rem;border-radius:10px}</style>'+render($('#source').value),'text/html');
$('#print').onclick=()=>{show('preview');window.print()};
$('#copyPlain').onclick=()=>navigator.clipboard.writeText(plain($('#source').value)).then(()=>toast('Plain text copied'),()=>toast('Copy blocked by browser'));
$('#copyRich').onclick=async()=>{const h=render($('#source').value);try{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([h],{type:'text/html'}),'text/plain':new Blob([plain($('#source').value)],{type:'text/plain'})})]);toast('Copied with formatting')}catch(e){navigator.clipboard.writeText($('#source').value).then(()=>toast('Copied as Markdown'),()=>toast('Copy blocked by browser'))}};

/* ---------- Settings ---------- */
function applyTheme(){document.documentElement.dataset.theme=db.dark?'dark':'light';$('#dark').checked=!!db.dark}
$('#dark').onchange=e=>{db.dark=e.target.checked;persist();applyTheme()};
function renderFolders(){const b=$('#folderList');b.innerHTML='';db.folders.forEach(f=>{const r=document.createElement('div');r.className='row between';r.innerHTML='<span>📁 '+esc(f)+'</span>';const s=document.createElement('span');
  const rn=document.createElement('button');rn.className='btn small';rn.textContent='Rename';rn.onclick=()=>{const v=(prompt('New name',f)||'').trim();if(!v||db.folders.includes(v))return;db.folders[db.folders.indexOf(f)]=v;db.notes.forEach(n=>{if(n.folder===f)n.folder=v});persist();renderFolders()};
  const dl_=document.createElement('button');dl_.className='btn small';dl_.textContent='Delete';dl_.onclick=()=>{if(confirm('Delete folder "'+f+'"? Its notes are kept, just unfiled.')){db.folders=db.folders.filter(x=>x!==f);db.notes.forEach(n=>{if(n.folder===f)n.folder=''});persist();renderFolders()}};
  s.append(rn,dl_);r.append(s);b.append(r)})}
$('#addFolder').onclick=()=>{const v=$('#newFolder').value.trim();if(!v)return toast('Enter a folder name');if(db.folders.includes(v))return toast('That folder exists');db.folders.push(v);$('#newFolder').value='';persist();renderFolders()};
$('#expAll').onclick=()=>dl('notebloom-backup.json',JSON.stringify({app:'notebloom',version:1,notes:db.notes,folders:db.folders},null,2),'application/json');
$('#impAll').onclick=()=>$('#jsonFile').click();
$('#jsonFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{
  try{const d=JSON.parse(r.result);if(d.app!=='notebloom'||!Array.isArray(d.notes))throw 0;
    const ok=d.notes.filter(n=>n&&typeof n.id==='string'&&typeof n.md==='string'&&typeof n.title==='string');
    ok.forEach(n=>{if(!db.notes.some(x=>x.id===n.id))db.notes.push({created:Date.now(),updated:Date.now(),tags:[],...n})});
    (Array.isArray(d.folders)?d.folders:[]).forEach(x=>{if(typeof x==='string'&&!db.folders.includes(x))db.folders.push(x)});
    persist();toast('Imported '+ok.length+' notes')}catch(err){toast('That file is not a valid NoteBloom backup')}};
  r.readAsText(f);e.target.value=''};

/* ---------- Shortcuts & safety ---------- */
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='s'&&cur){e.preventDefault();flushSave();toast('Saved')}});
window.addEventListener('beforeunload',e=>{if(cur&&cur.dirty){flushSave();if(cur.dirty){e.preventDefault();e.returnValue=''}}});
applyTheme();renderHome();stats();
