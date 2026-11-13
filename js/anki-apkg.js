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
function decodeProto(bytes) {
  const fields=[];let p=0;
  const varint=()=>{let v=0n,s=0n;while(p<bytes.length&&s<70n){const b=bytes[p++];v|=BigInt(b&127)<<s;if(!(b&128))return Number(v);s+=7n;}throw new Error('Protobuf inválido no pacote Anki.');};
  while(p<bytes.length){
    const tag=varint(),num=tag>>>3,wire=tag&7;
    if(wire===0){fields.push({num,wire,value:varint()});}
    else if(wire===1){if(p+8>bytes.length)throw new Error('Protobuf incompleto.');p+=8;}
    else if(wire===2){const len=varint();if(len<0||p+len>bytes.length)throw new Error('Protobuf incompleto.');fields.push({num,wire,value:bytes.subarray(p,p+len)});p+=len;}
    else if(wire===5){if(p+4>bytes.length)throw new Error('Protobuf incompleto.');p+=4;}
    else throw new Error('Formato protobuf não reconhecido.');
  }
  return fields;
}
function protoString(fields,num){const f=fields.filter(x=>x.num===num&&x.wire===2).at(-1);return f?new TextDecoder().decode(f.value):'';}
function modernMediaMap(bytes){
  const result={};let i=0;
  for(const entry of decodeProto(bytes).filter(x=>x.num===1&&x.wire===2)){
    const name=protoString(decodeProto(entry.value),1);
    if(name)result[String(i++)]=name;
  }
  return result;
}
async function openAnkiDatabase(zip) {
  const modern=zip.file('collection.anki21b');
  const legacy21=zip.file('collection.anki21');
  const dbFile=modern||legacy21||zip.file('collection.anki2');
  if(!dbFile)throw new Error('Este arquivo não contém um banco de coleção Anki reconhecido.');
  let bytes=new Uint8Array(await dbFile.async('uint8array'));
  if(modern){
    if(!window.fzstd?.decompress)throw new Error('Não foi possível carregar o descompactador do Anki. Atualize a página e tente novamente.');
    bytes=window.fzstd.decompress(bytes);
  }
  const SQLmod=await libraries(),db=new SQLmod.Database(bytes);
  if(modern){
    try{
      db.run("PRAGMA writable_schema=ON; UPDATE sqlite_master SET sql=replace(sql,'COLLATE unicase','COLLATE NOCASE') WHERE sql LIKE '%COLLATE unicase%'; PRAGMA writable_schema=OFF;");
      const version=db.exec('PRAGMA schema_version')[0]?.values?.[0]?.[0]||1;
      db.run('PRAGMA schema_version='+(Number(version)+1));
    }catch{}
  }
  return {db,modern};
}
export async function importApkg(file,targetDeckId=null) {
  const zip=await window.JSZip.loadAsync(file);
  const {db,modern}=await openAnkiDatabase(zip);
  const mediaFile=zip.file('media');
  let mediaMap={};
  if(mediaFile){
    let mediaBytes=new Uint8Array(await mediaFile.async('uint8array'));
    if(modern&&window.fzstd?.decompress&&mediaBytes.length>=4&&mediaBytes[0]===0x28&&mediaBytes[1]===0xB5&&mediaBytes[2]===0x2F&&mediaBytes[3]===0xFD)mediaBytes=window.fzstd.decompress(mediaBytes);
    try{mediaMap=modern?modernMediaMap(mediaBytes):JSON.parse(new TextDecoder().decode(mediaBytes));}
    catch{mediaMap={};}
  }
  const row=(sql,params=[])=>{const stmt=db.prepare(sql);stmt.bind(params);const out=[];while(stmt.step())out.push(stmt.getAsObject());stmt.free();return out;};
  try {
    let models={},decksJson={};
    if(modern){
      const ntRows=row('SELECT id,name,config FROM notetypes ORDER BY id');
      for(const nt of ntRows){
        const cfg=decodeProto(new Uint8Array(nt.config||[]));
        const kind=cfg.filter(x=>x.num===1&&x.wire===0).at(-1)?.value||0;
        models[nt.id]={id:nt.id,name:nt.name,type:Number(kind),flds:[],tmpls:[]};
      }
      const fieldRows=row('SELECT ntid,ord,name FROM fields ORDER BY ntid,ord');
      for(const fld of fieldRows)if(models[fld.ntid])models[fld.ntid].flds.push({name:fld.name,ord:fld.ord});
      const templateRows=row('SELECT ntid,ord,name,config FROM templates ORDER BY ntid,ord');
      for(const tpl of templateRows)if(models[tpl.ntid]){
        const cfg=decodeProto(new Uint8Array(tpl.config||[]));
        models[tpl.ntid].tmpls.push({name:tpl.name,ord:tpl.ord,qfmt:protoString(cfg,1),afmt:protoString(cfg,2)});
      }
      const deckRows=row('SELECT id,name,kind FROM decks ORDER BY id');
      for(const deck of deckRows){
        const path=String(deck.name||'Importado').split('\x1f').join('::');
        const kind=decodeProto(new Uint8Array(deck.kind||[]));
        const normal=kind.some(x=>x.num===1&&x.wire===2);
        decksJson[deck.id]={id:deck.id,name:path,dyn:normal?0:1};
      }
      for(const model of Object.values(models)){
        model.flds.sort((a,b)=>a.ord-b.ord);
        model.tmpls.sort((a,b)=>a.ord-b.ord);
      }
    }else{
      const meta=row('SELECT models,decks FROM col LIMIT 1')[0]||{};
      models=JSON.parse(meta.models||'{}');decksJson=JSON.parse(meta.decks||'{}');
    }
    const noteRows=row('SELECT id,mid,tags,flds FROM notes'),cardRows=row('SELECT nid,did,ord FROM cards');
    const available=await listDecks();
    let importRoot=targetDeckId?available.find(d=>d.id===targetDeckId):null;
    if(targetDeckId&&!importRoot)throw new Error('O baralho escolhido para receber a importação não existe mais.');
    if(!importRoot){
      importRoot=available.find(d=>!d.parent_id&&d.name==='Importados do Anki');
      if(!importRoot)importRoot=await createDeck('Importados do Anki');
    }
    const childCache=new Map();
    const ensureChild=async(parentId,name)=>{
      const key=parentId+'::'+name;
      if(childCache.has(key))return childCache.get(key);
      const current=await listDecks();
      let found=current.find(d=>(d.parent_id||null)===parentId&&d.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'));
      if(!found)found=await createDeck(name,'',parentId);
      childCache.set(key,found.id);return found.id;
    };
    const deckMap=new Map();
    for(const [rawId,deck] of Object.entries(decksJson)){
      if(deck.dyn)continue;
      const parts=String(deck.name||'Importado').split('::').map(x=>x.trim()).filter(Boolean);
      let parentId=importRoot.id;
      for(const part of parts)parentId=await ensureChild(parentId,part);
      deckMap.set(Number(rawId),parentId);
    }
    const cardsByNote=new Map();
    for(const card of cardRows){if(!cardsByNote.has(card.nid))cardsByNote.set(card.nid,[]);cardsByNote.get(card.nid).push(card);}
    let imported=0,skipped=0;
    for(const note of noteRows){
      const model=models[note.mid]||{},fields=String(note.flds||'').split('\x1f');
      const noteCards=cardsByNote.get(note.id)||[];
      if(!noteCards.length){skipped++;continue;}
      const modelFields=(model.flds||[]).slice().sort((a,b)=>a.ord-b.ord);
      let front=fields[modelFields[0]?.ord??0]||'',back=fields[modelFields[1]?.ord??1]||'';
      const extraFields=modelFields.slice(2).map(field=>{
        const value=fields[field.ord]||'';
        return value?'<br><strong>'+String(field.name||'Campo adicional').replace(/[<>]/g,'')+'</strong><br>'+value:'';
      }).join('');
      back+=extraFields;
      const tags=String(note.tags||'').trim().split(/\s+/).filter(Boolean),media=[];
      const replaceImages=async(value,field)=>{
        const regex=/<img[^>]+src=["']([^"']+)["'][^>]*>/gi;let match;
        while((match=regex.exec(value))){
          const filename=match[1],mapped=Object.entries(mediaMap).find(([key,name])=>name===filename),index=mapped?.[0]??mediaMap[filename];
          const entry=index!==undefined?zip.file(String(index)):zip.file(filename);
          if(!entry)continue;
          let bytes=await entry.async('uint8array');
          if(modern&&window.fzstd?.decompress&&bytes.length>=4&&bytes[0]===0x28&&bytes[1]===0xB5&&bytes[2]===0x2F&&bytes[3]===0xFD){
            try{bytes=window.fzstd.decompress(bytes);}catch{}
          }
          let binary='';for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
          const ext=filename.split('.').pop().toLowerCase();
          const mime=({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml'})[ext]||'application/octet-stream';
          media.push({id:'imp-'+note.id+'-'+media.length,name:filename,field,data:'data:'+mime+';base64,'+btoa(binary)});
        }
        return value.replace(/<img[^>]*>/gi,' ').replace(/<[^>]+>/g,'').trim();
      };
      front=await replaceImages(front,'front');back=await replaceImages(back,'back');
      const firstCard=noteCards[0],deckId=deckMap.get(firstCard.did)||importRoot.id;
      const isCloze=Number(model.type)===1;
      const isReverse=!isCloze&&noteCards.length>1&&((model.tmpls||[]).some(t=>String(t.qfmt||'').includes('{{Back}}')));
      const cardType=isCloze?'cloze':isReverse?'basic-reversed':'basic';
      try{
        await addNote({deckId,front,back,tags,cardType,media});
        imported++;
      }catch(error){skipped++;}
    }
    return {imported,skipped,baralhos:deckMap.size};
  } finally { db.close(); }
}
