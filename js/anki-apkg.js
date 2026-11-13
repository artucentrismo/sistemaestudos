import { listDecks, listNotes, addNote, createDeck } from './anki-service.js';

const cleanName = value => String(value || '').replace(/[<>:"/\\|?*]/g, '-').trim() || 'Anki';
const nowId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);
function libraries() {
  if (!window.JSZip || !window.initSqlJs) throw new Error('As bibliotecas de pacotes Anki ainda não foram carregadas. Atualize a página e tente novamente.');
  return window.initSqlJs({ locateFile: file => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/' + file });
}
function mediaData(data) {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/i.exec(data || '');
  if (!match) return null;
  const binary = atob(match[2]), bytes = new Uint8Array(binary.length);
  for (let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[match[1]] || 'bin';
  return { bytes, ext };
}
function sqlEscape(value) { return String(value ?? '').replace(/'/g, "''"); }
function fieldHtml(text, media, field, mediaMap, zip, index) {
  let html = String(text || '').replace(/\u0000/g, '');
  for (const item of (media || []).filter(m => m.field === field)) {
    const parsed = mediaData(item.data);
    if (!parsed) continue;
    const filename = 'ciclo_' + index + '_' + mediaMap.count++ + '.' + parsed.ext;
    const mediaIndex=String(Object.keys(mediaMap.mapping).length);
    mediaMap.mapping[mediaIndex]=filename;
    zip.file(mediaIndex,parsed.bytes);
    html += '<br><img src="' + filename + '">';
  }
  return html;
}
function modelBasic(mid, name, reverse=false) {
  const templates = [{name:'Card 1',ord:0,qfmt:'{{Front}}',afmt:'{{FrontSide}}<hr id="answer">{{Back}}',did:null,bqfmt:'',bafmt:''}];
  if (reverse) templates.push({name:'Card 2',ord:1,qfmt:'{{Back}}',afmt:'{{FrontSide}}<hr id="answer">{{Front}}',did:null,bqfmt:'',bafmt:''});
  return {id:mid,name,type:0,mod:0,usn:-1,sortf:0,did:null,tmpls:templates,flds:[{name:'Front',ord:0,sticky:false,rtl:false,font:'Arial',size:20,description:''},{name:'Back',ord:1,sticky:false,rtl:false,font:'Arial',size:20,description:''}],css:' .card { font-family: Arial; font-size: 20px; text-align: center; color: black; background: white; }',latexPre:'',latexPost:'',req:reverse?[[0,'all',[0]],[1,'all',[1]]]:[[0,'any',[0]]],vers:[]};
}
function modelCloze(mid) {
  return {id:mid,name:'Cloze',type:1,mod:0,usn:-1,sortf:0,did:null,tmpls:[{name:'Cloze',ord:0,qfmt:'{{cloze:Text}}',afmt:'{{cloze:Text}}<hr id="answer">{{Back Extra}}',did:null,bqfmt:'',bafmt:''}],flds:[{name:'Text',ord:0,sticky:false,rtl:false,font:'Arial',size:20,description:''},{name:'Back Extra',ord:1,sticky:false,rtl:false,font:'Arial',size:20,description:''}],css:'.card { font-family: Arial; font-size: 20px; text-align: center; color: black; background: white; }',latexPre:'',latexPost:'',req:[[0,'all',[0]]],vers:[]};
}
export async function exportApkg(deckId=null) {
  const decks=await listDecks(), allNotes=await listNotes(deckId || null);
  if (!allNotes.length) throw new Error('Não há notas para exportar neste baralho.');
  const JSZip=window.JSZip, SQL=await libraries(), zip=new JSZip();
  const includedDecks=deckId?decks.filter(d=>{let p=d;while(p){if(p.id===deckId)return true;p=decks.find(x=>x.id===p.parent_id);}return false;}):decks;
  const deckIdMap=new Map(), deckJson={};
  for (const deck of includedDecks) {
    const numeric=deckIdMap.size+2;
    deckIdMap.set(deck.id,numeric);
    const parts=[deck.name];let p=decks.find(x=>x.id===deck.parent_id);
    while(p){parts.unshift(p.name);p=decks.find(x=>x.id===p.parent_id);}
    deckJson[numeric]={id:numeric,name:parts.join('::'),mod:Math.floor(Date.now()/1000),usn:-1,desc:deck.description||'',dyn:0,conf:1,extendNew:10,extendRev:50,collapsed:false,browserCollapsed:false,newToday:[0,0],revToday:[0,0],lrnToday:[0,0],timeToday:[0,0]};
  }
  if (!deckJson[1]) deckJson[1]={id:1,name:'Default',mod:0,usn:-1,desc:'',dyn:0,conf:1,extendNew:10,extendRev:50,collapsed:false,browserCollapsed:false,newToday:[0,0],revToday:[0,0],lrnToday:[0,0],timeToday:[0,0]};
  const defaultDeck=deckIdMap.get(deckId)||1;
  const db=new SQL.Database();
  db.run('CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null, dconf text not null, tags text not null);');
  db.run('CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);');
  db.run('CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null);');
  db.run('CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null);');
  db.run('CREATE INDEX ix_notes_usn on notes (usn); CREATE INDEX ix_cards_usn on cards (usn); CREATE INDEX ix_cards_nid on cards (nid); CREATE INDEX ix_cards_sched on cards (did, queue, due); CREATE INDEX ix_revlog_usn on revlog (usn); CREATE INDEX ix_revlog_cid on revlog (cid);');
  const basicId=1700000000001, reverseId=1700000000002, clozeId=1700000000003;
  const models={[basicId]:modelBasic(basicId,'Basic'),[reverseId]:modelBasic(reverseId,'Basic (and reversed card)',true),[clozeId]:modelCloze(clozeId)};
  const mediaMap={mapping:{},count:0};
  const add = db.prepare('INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  const addCard = db.prepare('INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const sec=Math.floor(Date.now()/1000);
  let cardTotal=0;
  for(let i=0;i<allNotes.length;i++){
    const note=allNotes[i], cards=note.cards||[], isCloze=cards.some(c=>c.card_type==='cloze'), isReverse=cards.some(c=>c.card_type==='reverse');
    const deckNumeric=deckIdMap.get(note.deck_id)||defaultDeck, tags=' '+(note.tags||[]).join(' ')+' ';
    if(note.occlusion && cards.some(c=>c.card_type==='image-occlusion')){
      const imageHtml=fieldHtml('',note.media,'front',mediaMap,zip,i).replace(/^<br>/,'');
      for(const card of cards.filter(c=>c.card_type==='image-occlusion')){
        const target=card.template_ordinal, masks=note.occlusion.masks||[];
        const frontMasks=masks.filter((m,j)=>note.occlusion.mode==='hide-all'||j===target);
        const backMasks=masks.filter((m,j)=>note.occlusion.mode==='hide-all'&&j!==target);
        const svg=list=>list.length?'<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">'+list.map(m=>'<rect x="'+(m.x*100)+'" y="'+(m.y*100)+'" width="'+(m.w*100)+'" height="'+(m.h*100)+'" fill="#18264b" stroke="white" stroke-width=".5"/>').join('')+'</svg>':'';
        const imageBlock='<div style="position:relative;display:inline-block;max-width:100%">'+imageHtml+svg(frontMasks)+'</div>';
        const answerBlock='<div style="position:relative;display:inline-block;max-width:100%">'+imageHtml+svg(backMasks)+'</div>';
        const front=(note.fields?.Front||'Oclusão de imagem')+'<br>'+imageBlock;
        const back=(note.fields?.Back||'')+'<br>'+answerBlock;
        const nid=nowId()+cardTotal;
        add.run([nid,'ciclo'+nid,basicId,sec,-1,tags,front+'\\x1f'+back,front.replace(/<[^>]*>/g,'').slice(0,255),0,0,'']);
        addCard.run([nowId()+cardTotal+1,nid,deckNumeric,0,sec,-1,0,0,0,0,2500,0,0,0,0,0,0,'']);
        cardTotal++;
      }
      continue;
    }
    const mid=isCloze?clozeId:isReverse?reverseId:basicId, nid=nowId()+i;
    const front=fieldHtml(note.fields?.Front,note.media,'front',mediaMap,zip,i), back=fieldHtml(note.fields?.Back,note.media,'back',mediaMap,zip,i);
    const flds=front+'\\x1f'+back;
    add.run([nid,'ciclo'+nid,mid,sec,-1,tags,flds,front.replace(/<[^>]*>/g,'').slice(0,255),0,0,'']);
    for(const card of cards){
      const ord=card.card_type==='reverse'?1:card.card_type==='cloze'?Math.max(0,(card.template_ordinal||1)-1):0;
      addCard.run([nowId()+cardTotal,nid,deckNumeric,ord,sec,-1,0,0,0,0,2500,0,0,0,0,0,0,'']);
      cardTotal++;
    }
  }
  const conf={nextPos:allNotes.length+1,estTimes:true,newSpread:0,timeLim:0,activeDecks:[defaultDeck],curDeck:defaultDeck,curModel:basicId,collapseTime:1200,addToCur:true};
  db.run('INSERT INTO col VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?)',[sec,sec*1000,sec,11,0,-1,0,JSON.stringify(conf),JSON.stringify(models),JSON.stringify(deckJson),JSON.stringify({1:{id:1,name:'Default',mod:0,usn:-1,maxTaken:60,timer:0,autoplay:true,replayq:true,new:{delays:[1,10],ints:[1,4],initialFactor:2500,order:1,perDay:20},rev:{perDay:200,ease4:1.3,ivlFct:1,maxIvl:36500,hardFactor:1.2},lapse:{delays:[10],mult:0,minInt:1,leechFails:8,leechAction:0}}}),JSON.stringify({})]);
  add.free();addCard.free();
  zip.file('collection.anki2',db.export());zip.file('media',JSON.stringify(mediaMap.mapping));
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
  db.close();
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=cleanName(deckId?decks.find(d=>d.id===deckId)?.name:'Ciclo')+'.apkg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  return {notes:allNotes.length,cards:cardTotal};
}
export async function importApkg(file,targetDeckId=null) {
  const SQL=await libraries(),zip=await window.JSZip.loadAsync(file);
  if(zip.file('collection.anki21b'))throw new Error('Este pacote usa o formato moderno compactado do Anki. No Anki, exporte novamente como .apkg e marque “Suporte a versões antigas do Anki” para importar aqui.');
  const dbFile=zip.file('collection.anki21')||zip.file('collection.anki2');
  if(!dbFile)throw new Error('Este arquivo não contém um banco de coleção Anki reconhecido.');
  const SQLmod=await SQL,db=new SQLmod.Database(new Uint8Array(await dbFile.async('uint8array')));
  const mediaFile=zip.file('media'),mediaMap=mediaFile?JSON.parse(await mediaFile.async('string')):{};
  const row=(sql,params=[])=>{const stmt=db.prepare(sql);stmt.bind(params);const out=[];while(stmt.step())out.push(stmt.getAsObject());stmt.free();return out;};
  const meta=row('SELECT models,decks FROM col LIMIT 1')[0]||{},models=JSON.parse(meta.models||'{}'),decksJson=JSON.parse(meta.decks||'{}');
  const noteRows=row('SELECT id,mid,tags,flds FROM notes'),cardRows=row('SELECT nid,did,ord FROM cards');
  const available=await listDecks();
  let target=targetDeckId;
  if(!target){let d=available.find(x=>!x.parent_id&&x.name==='Importados do Anki');if(!d)d=await createDeck('Importados do Anki');target=d.id;}
  const deckMap=new Map();
  for(const [id,d] of Object.entries(decksJson)){let found=available.find(x=>!x.parent_id&&x.name===d.name);if(!found){const name=String(d.name||'Importado').split('::').pop();found=await createDeck(name,'',target);}deckMap.set(Number(id),found.id);}
  const notesById=new Map(noteRows.map(n=>[n.id,n])),cardsByNote=new Map();
  for(const c of cardRows){if(!cardsByNote.has(c.nid))cardsByNote.set(c.nid,[]);cardsByNote.get(c.nid).push(c);}
  let imported=0,skipped=0;
  for(const n of noteRows){
    const model=models[n.mid]||{},fields=String(n.flds||'').split('\x1f'),isCloze=model.type===1;
    let front=fields[0]||'',back=fields[1]||'';const noteCards=cardsByNote.get(n.id)||[];
    const tags=String(n.tags||'').trim().split(/\s+/).filter(Boolean);
    const media=[];
    const replaceImages=async(value,field)=>{
      const regex=/<img[^>]+src=["']([^"']+)["'][^>]*>/gi;let match;
      while((match=regex.exec(value))){
        const filename=match[1],mapped=Object.entries(mediaMap).find(([k,v])=>v===filename),idx=mapped?.[0]??mediaMap[filename],entry=idx!==undefined?zip.file(String(idx)):zip.file(filename);
        if(!entry)continue;
        const bytes=await entry.async('uint8array');let binary='';for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
        const ext=filename.split('.').pop().toLowerCase(),mime=({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp'})[ext]||'application/octet-stream';
        media.push({id:'imp-'+imported+'-'+media.length,name:filename,field,data:'data:'+mime+';base64,'+btoa(binary)});
      }
      return value.replace(/<img[^>]*>/gi,' ').replace(/<[^>]+>/g,'').trim();
    };
    front=await replaceImages(front,'front');back=await replaceImages(back,'back');
    const did=noteCards[0]?.did,targetId=targetDeckId||deckMap.get(did)||target;
    try{await addNote({deckId:targetId,front,back,tags,cardType:isCloze?'cloze':noteCards.length>1?'basic-reversed':'basic',media});imported++;}
    catch{skipped++;}
  }
  db.close();
  return {imported,skipped};
}
