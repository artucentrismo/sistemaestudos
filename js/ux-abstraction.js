/* Ciclo — camada de abstração UX.
 * Preserva motor, módulos e dados; simplifica apresentação e navegação.
 */
(function(){
"use strict";
var style=document.createElement("style");
style.textContent=[
":root{--bg:#F7F8FA;--cd:#FFFFFF;--tx:#1D2939;--mu:#667085;--ac:#0F2744;--ln:#E4E7EC;--g:#2E7D5B;--rd:#C65353;--surface2:#F2F4F7;--info:#4E7A99;--warning:#D9A441}",
":root[data-theme=light]{--bg:#F7F8FA;--cd:#FFFFFF;--tx:#1D2939;--mu:#667085;--ac:#0F2744;--ln:#E4E7EC;--g:#2E7D5B;--rd:#C65353;--surface2:#F2F4F7}",
":root[data-theme=dark]{--bg:#0B1220;--cd:#131C2B;--tx:#F3F5F7;--mu:#A8B2C1;--ac:#C7D8EB;--ln:#293548;--g:#55A985;--rd:#E17A78;--surface2:#1A2638}",
".next-action-card{background:#0F2744;color:#fff;border-radius:22px;padding:24px;margin:18px 0;box-shadow:0 12px 30px rgba(15,39,68,.16)}",
":root[data-theme=dark] .next-action-card{background:#152B45}",
".quick-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0}",
".quick-stats .tile{background:var(--cd);border:1px solid var(--ln);box-shadow:none}",
".home-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}",
".home-actions button{background:var(--bg);border:1px solid var(--ln);border-radius:14px;padding:14px;text-align:left;color:var(--tx);cursor:pointer;min-width:0}",
".home-actions b,.home-actions span{display:block}.home-actions b{font-size:14px}.home-actions span{font-size:12px;color:var(--mu);margin-top:6px;line-height:1.4}",
".home-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:4px 2px 18px}",
".resume-card{border:1px solid var(--info)}",
"@media(max-width:600px){.quick-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.home-actions{grid-template-columns:1fr}.next-action-card{padding:20px}}"
].join("\n");
document.head.appendChild(style);
var originalHome=window.home, originalProg=window.prog, originalRender=window.render;
var originalSave=window.save, originalStart=window.start, originalStep=window.stp, originalSess=window.sess;
var originalSetK=window.setK, originalGo=window.go, originalAdv=window.adv;
function persistDraft(){
 try{if(!window.ss)return;localStorage.setItem("ciclo-session-draft-v1",JSON.stringify({subjectIndex:window.S.cur,state:window.ss,savedAt:Date.now()}))}catch(e){}
}
function clearDraft(){try{localStorage.removeItem("ciclo-session-draft-v1")}catch(e){}}
function daysAgo(date){if(!date)return null;return Math.max(0,Math.floor((new Date(window.dk(new Date())+"T12:00:00")-new Date(date+"T12:00:00"))/86400000))}
function recommendation(){
 var out=[];
 (window.S.subs||[]).forEach(function(subject,si){
  var indices=window.CicloLearning?window.CicloLearning.selectBlocks(window.S,subject,2):(subject.t.length?[subject.ptr%subject.t.length]:[]);
  indices.forEach(function(bi){
   var m=window.CicloLearning?window.CicloLearning.metrics(window.S,subject,subject.t[bi]):null;
   var score=0,reason="Próxima etapa do seu ciclo";
   if(m){
    if(m.stuck){score+=100;reason="Este caderno precisa de uma retomada cuidadosa."}
    if(m.masteryScore<50){score+=55;reason="Seu desempenho indica que vale reforçar este assunto."}
    if(m.lastStudyDate){var days=daysAgo(m.lastStudyDate)||0;score+=Math.min(days,14)*2;if(days>=7)reason="Está há "+days+" dias sem revisar este assunto."}
    if(m.masteryScore>=80)score-=35;
    score+=Math.max(0,100-m.masteryScore)*.15;
   }else score+=10;
   out.push({si:si,bi:bi,subject:subject,block:subject.t[bi],metrics:m,score:score,reason:reason});
  });
 });
 out.sort(function(a,b){return b.score-a.score||a.si-b.si||a.bi-b.bi});
 return out[0]||null;
}
window.home=function(){
 var S=window.S,dt=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
 var today=window.dk(new Date()),minutes=window.minsOn(today),questions=window.qs(function(l){return l.d===today}).t;
 if(!S.subs.length)return '<div class="up">SEU ESPAÇO DE ESTUDOS</div><h1>'+(S.profileName?'Olá, '+window.esc(S.profileName):'Vamos começar?')+'</h1><p class="mu">O Ciclo organiza seus estudos e indica o próximo passo. Você só precisa começar.</p><div class="card"><h2 style="margin-top:0">Prepare seu primeiro ciclo</h2><p class="mu sm">Adicione suas matérias e os assuntos que deseja estudar. Você poderá ajustar tudo depois.</p><button class="btn" onclick="go(\'cfg\')">Organizar meus estudos</button></div>';
 var rec=recommendation(),maturity=window.CicloLearning?window.CicloLearning.maturity(S):null;
 var html='<div class="up">'+dt+'</div><h1>'+(S.profileName?'Olá, '+window.esc(S.profileName)+' 👋':'Seu espaço de estudos')+'</h1>'+(S.profileGoal?'<div class="mu sm">'+window.esc(S.profileGoal)+'</div>':'');
 if(window.ss)html+='<section class="card resume-card"><div class="up">SESSÃO EM ANDAMENTO</div><h2 style="margin:8px 0">Continue de onde parou</h2><p class="mu sm">Seus registros ainda estão em rascunho e não foram adicionados ao histórico.</p><button class="btn" onclick="resumeStudy()">Retomar sessão</button></section>';
 html+='<section class="next-action-card"><div class="up" style="color:rgba(255,255,255,.72)">SUA PRÓXIMA AÇÃO</div>';
 if(rec){
  html+='<h2 style="font-size:25px;margin:10px 0 4px;color:#fff">'+window.esc(rec.subject.n)+'</h2><div style="font-size:17px;font-weight:650">'+window.esc((rec.block||[]).join(" · "))+'</div><p style="color:rgba(255,255,255,.82);line-height:1.5;margin:10px 0">'+window.esc(rec.reason)+'</p><div style="color:rgba(255,255,255,.75);font-size:13px">'+window.fm(rec.subject.min)+' estimados</div><button class="btn" style="background:#fff;color:#0F2744;width:100%;margin-top:16px" onclick="startRecommended('+rec.si+','+rec.bi+')">Começar agora</button>';
 }else html+='<h2 style="color:#fff">Seu ciclo está pronto para continuar</h2><p style="color:rgba(255,255,255,.8)">Adicione blocos para receber uma recomendação de estudo.</p><button class="btn" style="background:#fff;color:#0F2744" onclick="go(\'ciclo\')">Ver meu ciclo</button>';
 html+='</section><div class="quick-stats"><div class="tile"><span class="up">TEMPO HOJE</span><b>'+window.fm(minutes)+'</b>'+(window.gOn()?'<span class="mu sm">Meta: '+window.fm(S.goal)+'</span>':'')+'</div><div class="tile"><span class="up">QUESTÕES HOJE</span><b>'+questions+'</b><span class="mu sm">registradas</span></div><div class="tile"><span class="up">SEQUÊNCIA</span><b>'+window.streak()+' dias</b><span class="mu sm">de estudo</span></div></div>';
 if(window.gOn())html+='<section class="card"><div style="display:flex;justify-content:space-between;gap:10px"><b>Meta diária</b><span class="mu sm">'+Math.min(100,Math.round(minutes/Math.max(1,S.goal)*100))+'%</span></div><div class="bar"><i style="width:'+Math.min(100,minutes/Math.max(1,S.goal)*100)+'%"></i></div></section>';
 var due=0;try{var data=JSON.parse(localStorage.getItem("ciclo-anki-local-v1")||"null");if(data&&Array.isArray(data.cards))due=data.cards.filter(function(c){return c.due&&c.due<=today}).length}catch(e){}
 html+='<section class="card"><div class="up">OUTRAS OPÇÕES</div><div class="home-actions"><button onclick="go(\'ciclo\')"><b>↻ Ciclo</b><span>Ver matérias e cadernos</span></button><button onclick="go(\'cards\')"><b>▤ Anki</b><span>'+(due?due+' cartões para revisar':'Abrir seus flashcards')+'</span></button><button onclick="go(\'red\')"><b>✎ Redação</b><span>Registrar uma produção</span></button></div></section>';
 if(maturity&&maturity.score!==null)html+='<section class="card"><div class="up">SUA EVOLUÇÃO</div><div style="font-size:23px;font-weight:800;margin:6px 0">'+window.esc(maturity.level)+'</div><div class="mu sm">Sua maturidade de estudos está em evolução. Consulte os relatórios para entender os detalhes.</div><button class="lk" onclick="go(\'prog\')">Ver relatórios →</button></section>';
 html+='<div class="home-footer"><span class="mu sm">Nível '+window.lvl(window.xpT())+' · '+window.xpT()+' XP</span><span class="mu sm">🛡️ '+((S.game||{}).shields||0)+' escudos</span><button class="lk" onclick="go(\'prog\')">Conquistas e evolução</button></div>';
 return html;
};
window.startRecommended=function(si,bi){if(Number.isInteger(si))window.S.cur=si;if(Number.isInteger(bi)&&window.S.subs[si])window.S.subs[si].ptr=bi;window.start()};
window.resumeStudy=function(){if(!window.ss)return;window.tab="sess";if(window.ss.timer)window.ss.timer.running=false;window.render()};
window.sess=function(){return originalSess().replace(/ss=null;go\('home'\)/,"timerPause();persistDraft();go('home')")};
window.prog=function(){return '<h1>Relatórios</h1><p class="mu sm">Uma visão organizada da sua evolução, frequência e aprendizagem.</p>'+originalProg()};
window.save=function(){originalSave();persistDraft()};
window.start=function(){originalStart();persistDraft()};
window.stp=function(f,i,v){originalStep(f,i,v);persistDraft()};
window.setK=function(i){originalSetK(i);persistDraft()};
window.go=function(t){if(t!=="sess"&&window.ss){if(window.timerPause)window.timerPause();persistDraft()}originalGo(t)};
window.adv=function(skip){originalAdv(skip);if(!window.ss)clearDraft()};
window.restoreLocal=function(){
 var input=document.createElement("input");input.type="file";input.accept=".json,application/json";
 input.onchange=function(){
  var file=input.files&&input.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(){
   try{
    var data=JSON.parse(reader.result);
    if(data.format!=="ciclo-local-backup-v1"||!data.state||!Array.isArray(data.state.subs)||!Array.isArray(data.state.log))throw new Error("Arquivo não reconhecido como backup do Ciclo.");
    if(!confirm("Este backup substituirá os dados atuais deste navegador. Deseja continuar?"))return;
    if(confirm("Deseja baixar um backup dos dados atuais antes da substituição?"))window.backupLocal();
    localStorage.setItem("ciclo-v3",JSON.stringify(data.state));
    if(data.anki)localStorage.setItem("ciclo-anki-local-v1",data.anki);else localStorage.removeItem("ciclo-anki-local-v1");
    clearDraft();location.reload();
   }catch(e){alert(e.message||"Não foi possível importar o backup.")}
  };
  reader.readAsText(file);
 };
 input.click();
};
var originalTimerStart=window.timerStart, originalTimerPause=window.timerPause;
var idleLastActivity=Date.now(), idlePromptTimer=null, idleSaveTimer=null, idlePromptVisible=false;
function noteActivity(){idleLastActivity=Date.now()}
["pointerdown","keydown","touchstart","wheel"].forEach(function(ev){document.addEventListener(ev,noteActivity,{passive:true})});
function removeIdlePrompt(){var el=document.getElementById("ciclo-idle-prompt");if(el)el.remove();idlePromptVisible=false;if(idlePromptTimer){clearTimeout(idlePromptTimer);idlePromptTimer=null}}
window.continueAfterIdle=function(){removeIdlePrompt();noteActivity();if(window.ss&&window.ss.timer&&!window.ss.timer.running)originalTimerStart();persistDraft()};
window.pauseAfterIdle=function(){removeIdlePrompt();if(window.ss)originalTimerPause();persistDraft()};
window.timerPause=function(){originalTimerPause();persistDraft()};
window.timerStart=function(){
 originalTimerStart();noteActivity();
 if(idleSaveTimer)clearInterval(idleSaveTimer);
 idleSaveTimer=setInterval(function(){
  if(!window.ss||!window.ss.timer||!window.ss.timer.running)return;
  persistDraft();
  if(!idlePromptVisible&&Date.now()-idleLastActivity>=600000){
   idlePromptVisible=true;
   var root=document.getElementById("app");
   if(root){var banner=document.createElement("section");banner.id="ciclo-idle-prompt";banner.className="card";banner.style.cssText="position:fixed;z-index:1000;left:16px;right:16px;bottom:95px;max-width:560px;margin:0 auto;border:2px solid var(--warning);box-shadow:0 12px 34px rgba(0,0,0,.22)";banner.innerHTML='<b>Você ainda está estudando?</b><p class="mu sm">O cronômetro será pausado em 60 segundos se não houver resposta.</p><div style="display:flex;gap:8px"><button class="btn" style="flex:1;margin:0" onclick="continueAfterIdle()">Sim, continuar</button><button class="btn s" style="flex:1;margin:0" onclick="pauseAfterIdle()">Pausar</button></div>';root.appendChild(banner)}
   idlePromptTimer=setTimeout(function(){removeIdlePrompt();if(window.ss)originalTimerPause();persistDraft()},60000);
  }
 },15000);
};
window.render=function(){originalRender();var nav=document.getElementById("nav");if(nav)nav.innerHTML=nav.innerHTML.replace("Progresso","Relatórios")};
try{
 var raw=localStorage.getItem("ciclo-session-draft-v1");
 if(raw){
  var draft=JSON.parse(raw);
  if(draft&&draft.state&&Date.now()-draft.savedAt<86400000&&window.S.subs[draft.subjectIndex]){
   if(confirm("Existe uma sessão de estudo não finalizada. Deseja continuar de onde parou?")){
    window.S.cur=draft.subjectIndex;window.ss=draft.state;if(window.ss.timer)window.ss.timer.running=false;window.tab="sess";
   }else clearDraft();
  }else clearDraft();
 }
}catch(e){clearDraft()}
window.render();
})();

/* Ciclo 2.0 — experiência aprovada: orientação primeiro, complexidade sob demanda. */
(function(){
"use strict";
var oldHome=window.home,oldCycle=window.ciclo,oldProg=window.prog,oldRed=window.red,oldCards=window.cards,oldSess=window.sess,oldRender=window.render,oldCfg=window.cfg;
var css=document.createElement("style");
css.textContent=`
:root{--bg:#F7F8FA;--cd:#fff;--tx:#1D2939;--mu:#667085;--ac:#0F2744;--ln:#E4E7EC;--g:#2E7D5B;--rd:#C65353;--surface2:#F2F4F7;--info:#4E7A99;--warning:#D9A441}
:root[data-theme=dark]{--bg:#0B1220;--cd:#131C2B;--tx:#F3F5F7;--mu:#A8B2C1;--ac:#C7D8EB;--ln:#293548;--g:#55A985;--rd:#E17A78;--surface2:#1A2638;--info:#82AFCB}
body{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:16px}
h1,h2{font-family:Manrope,Inter,system-ui,sans-serif;letter-spacing:-.025em}
#app{max-width:1120px;margin:0 auto;padding:30px 36px 100px}
#nav{position:fixed;z-index:900;left:0;top:0;bottom:0;width:236px;display:flex!important;flex-direction:column;justify-content:flex-start;align-items:stretch;gap:6px;padding:26px 14px;background:var(--cd);border-right:1px solid var(--ln);backdrop-filter:none}
#nav:before{content:"CICLO";display:block;font:800 20px Manrope,Inter,sans-serif;letter-spacing:.12em;color:var(--ac);padding:8px 14px 28px}
#nav button{display:flex;align-items:center;gap:13px;max-width:none;width:100%;min-height:48px;text-align:left;padding:10px 14px;border-radius:12px;font-size:15px;color:var(--mu)}
#nav button b{display:inline-grid;place-items:center;width:24px;font-size:19px}
#nav button.a{background:color-mix(in srgb,var(--ac) 9%,var(--cd));color:var(--ac);font-weight:750}
#nav .more-menu{position:absolute;left:12px;right:12px;bottom:18px;background:var(--cd);border:1px solid var(--ln);border-radius:14px;padding:8px;box-shadow:0 12px 30px #0002}
#nav .more-menu button{font-size:14px}
.next-action-card{border-radius:20px;padding:30px;min-height:310px;display:flex;flex-direction:column;justify-content:center;box-shadow:none;margin:20px 0}
.home-layout{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(250px,1fr);gap:18px;align-items:start}
.home-primary{min-width:0}.home-secondary{display:grid;gap:12px}
.home-support{background:var(--cd);border:1px solid var(--ln);border-radius:16px;padding:17px}
.home-support h3{font:700 15px Manrope,Inter,sans-serif;margin:0 0 10px}
.home-support .bar{margin-top:9px}
.home-priorities{display:flex;flex-direction:column;gap:8px}
.home-priority{display:flex;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--ln);font-size:14px}
.home-priority:first-child{border-top:0}
.home-priority span:first-child{color:var(--warning);font-weight:800}
.next-action-card .up{color:#D7E2EE!important}
.next-action-card h2{font-size:clamp(26px,3vw,36px)!important;margin:12px 0 6px!important;color:#fff!important}
.next-action-card .next-topic{font-size:19px;font-weight:650}
.next-action-card .btn{max-width:330px;min-height:52px;background:#fff!important;color:#0F2744!important}
.next-action-card .next-alt{display:inline-block;margin-top:12px;color:#E6EEF5;background:none;border:0;text-align:left;text-decoration:underline;padding:8px 0;font:inherit}
.gps-current{border:1px solid var(--ln);border-left:4px solid var(--ac);border-radius:16px;padding:18px;background:var(--cd);margin:16px 0}
.gps-list{background:var(--cd);border:1px solid var(--ln);border-radius:16px;padding:8px 18px}
.gps-item{display:flex;align-items:center;gap:14px;padding:15px 0;border-top:1px solid var(--ln)}
.gps-item:first-child{border-top:0}.gps-number{width:30px;height:30px;display:grid;place-items:center;border-radius:50%;background:var(--surface2);color:var(--mu);font-weight:700}
.gps-item.current .gps-number{background:var(--ac);color:#fff}
.gps-item .gps-copy{flex:1;min-width:0}.gps-item small{display:block;color:var(--mu);margin-top:4px}
.report-state{padding:22px;border:1px solid var(--ln);border-radius:18px;background:var(--cd);margin:18px 0}
.report-state strong{display:block;font:750 24px Manrope,Inter,sans-serif;margin:7px 0}
.report-columns{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.report-box{background:var(--cd);border:1px solid var(--ln);border-radius:16px;padding:18px}
.report-box h3{font:700 16px Manrope,Inter,sans-serif;margin:0 0 12px}
.report-line{padding:9px 0;border-top:1px solid var(--ln);font-size:14px}
.report-line:first-of-type{border-top:0}
.report-advanced{margin-top:18px;border:1px solid var(--ln);border-radius:16px;background:var(--cd);padding:16px}
.report-advanced summary{cursor:pointer;font-weight:750;color:var(--ac);padding:4px}
.study-v2-head{text-align:center;margin:4px auto 18px;max-width:720px}
.study-v2-head h1{margin:8px 0}.study-v2-timer{max-width:560px;margin:0 auto 14px;text-align:center}
.study-v2-timer .study-timer-display{font-size:clamp(42px,8vw,66px);font-variant-numeric:tabular-nums}
.study-v2-counts{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.study-v2-count{border:1px solid var(--ln);border-radius:16px;background:var(--cd);padding:18px;text-align:center}
.study-v2-count b{display:block;font-size:32px;font-variant-numeric:tabular-nums}
.study-v2-count .study-stepper{display:flex;justify-content:center;gap:10px;margin-top:12px}
.study-v2-count button{width:48px;height:48px;border-radius:13px;border:1px solid var(--ln);background:var(--surface2);color:var(--tx);font-size:24px}
.study-v2-count button.add{background:var(--ac);color:#fff;border-color:var(--ac)}
.study-v2-actions{max-width:560px;margin:18px auto;display:grid;gap:9px}
.study-v2-actions button{min-height:50px}
button,a,summary,input,select,textarea{outline-offset:3px}
:focus-visible{outline:3px solid var(--info)!important;outline-offset:3px!important}
button{min-height:44px;cursor:pointer}
input,select,textarea{font-size:16px}
.card,.tile{border:1px solid var(--ln);box-shadow:none;border-radius:16px}
@media(min-width:701px){body{padding-left:236px}#app{padding-top:34px}.tabs{display:none!important}}
@media(max-width:700px){
 body{padding-left:0}#app{padding:20px 16px 112px}
 #nav{top:auto;left:0;right:0;bottom:0;width:auto;height:auto;flex-direction:row;justify-content:space-around;gap:2px;padding:7px 8px calc(7px + env(safe-area-inset-bottom));border-right:0;border-top:1px solid var(--ln);background:color-mix(in srgb,var(--cd) 94%,transparent);backdrop-filter:blur(18px)}
 #nav:before{display:none}
 #nav button{flex:1;min-width:0;max-width:none;min-height:54px;display:flex;flex-direction:column;justify-content:center;gap:2px;text-align:center;padding:5px 2px;font-size:11px;border-radius:10px}
 #nav button b{font-size:19px;width:auto}
 #nav .more-menu{bottom:76px;left:auto;right:10px;width:190px;box-shadow:0 12px 30px #0003}
 .home-layout{grid-template-columns:1fr;gap:12px}
 .next-action-card{min-height:calc(100svh - 260px);padding:22px;margin:14px 0}
 .home-secondary{grid-template-columns:1fr 1fr}
 .home-secondary .home-priorities-card{grid-column:1/-1}
 .report-columns{grid-template-columns:1fr}
 .study-v2-count{padding:13px 8px}.study-v2-count button{width:44px;height:44px}
}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;
document.head.appendChild(css);
function e(v){return window.esc(String(v==null?"":v))}
function topic(block){return Array.isArray(block)?block.join(" · "):String(block||"")}
function getMetrics(subject,block){return window.CicloLearning?window.CicloLearning.metrics(window.S,subject,block):null}
function allItems(){return window.CicloLearning?window.CicloLearning.all(window.S):[]}
function day(){return window.dk(new Date())}
function reviewDue(){var n=null;try{var summary=JSON.parse(localStorage.getItem("ciclo-anki-summary-v1")||"null");if(summary&&Number.isFinite(summary.due))n=summary.due;else{var d=JSON.parse(localStorage.getItem("ciclo-anki-local-v1")||"null");if(d&&Array.isArray(d.cards))n=d.cards.filter(function(c){return c.due&&c.due<=day()}).length}}catch(_){}return n}
function candidates(){
 var list=[],S=window.S,now=day(),due=reviewDue(),examDays=null;
 if(S.examDate){var diff=Math.floor((new Date(S.examDate+"T12:00:00")-new Date(now+"T12:00:00"))/86400000);examDays=Math.max(0,diff)}
 (S.subs||[]).forEach(function(s,si){
  var indices=window.CicloLearning?window.CicloLearning.selectBlocks(S,s,2):(s.t.length?[s.ptr||0]:[]);
  indices.forEach(function(bi){
   var m=getMetrics(s,s.t[bi]),days=m&&m.lastStudyDate?Math.min(30,Math.max(0,Math.floor((new Date(now+"T12:00:00")-new Date(m.lastStudyDate+"T12:00:00"))/86400000))):null;
   var q=m&&m.totalQuestions?m.totalQuestions:null,errors=q!==null?m.totalWrong/Math.max(1,q)*100:null;
   var factors={due:due===null?null:(due>0?100:0),mastery:m&&q!==null?Math.max(0,100-m.masteryScore):null,errors:errors,contact:days===null?null:Math.min(100,days/14*100),importance:typeof s.importance==="number"?Math.max(0,Math.min(100,s.importance)):null,exam:examDays===null?null:Math.max(0,100-examDays/120*100)};
   var weights=examDays===null?{due:30,mastery:25,errors:20,contact:15,importance:5,exam:5}:{exam:30,due:25,mastery:20,errors:15,contact:10};
   var numerator=0,denominator=0;Object.keys(weights).forEach(function(k){if(factors[k]!==null){numerator+=factors[k]*weights[k];denominator+=weights[k]}});
   var score=denominator?numerator/denominator:10,reason="Próxima etapa do seu ciclo",strategy="";
   if(days!==null&&days>=7)reason="Já faz "+days+" dias desde seu último contato com este assunto.";
   if(m&&m.stuck){score+=12;reason="Este assunto precisa de uma retomada com outra estratégia."}
   if(m&&q!==null&&m.masteryScore>=80)score-=12;
   if(m&&q!==null){
    var logs=(window.S.log||[]).filter(function(l){return l.n===s.n&&l.b===topic(s.t[bi])});
    var loggedQ=logs.reduce(function(a,l){return a+(Number(l.ac)||0)+(Number(l.er)||0)},0),err=logs.reduce(function(a,l){return a+(Number(l.er)||0)},0),min=logs.reduce(function(a,l){return a+(Number(l.m)||0)},0);
    if(min>=30&&loggedQ<10&&m.improvementScore<5){strategy="Priorize questões práticas para testar o que já estudou.";reason="Você investiu tempo neste assunto; agora vale praticar com questões."}
    else if(loggedQ>=20&&err/Math.max(1,loggedQ)>.35){strategy="Retome a explicação e os fundamentos antes de continuar praticando.";reason="Alguns erros estão se repetindo. Reforce a teoria antes de novas questões."}
    else if(m.retention&&m.retention.score<75){strategy="Faça uma revisão curta e transforme os erros em cartões.";reason="A memória deste assunto precisa de reforço após o intervalo."}
    else if(m.stuck){strategy="Volte aos fundamentos e avance em etapas menores.";reason="O progresso está baixo apesar das tentativas. Vamos reconstruir a base."}
   }
   list.push({si:si,bi:bi,s:s,b:s.t[bi],m:m,score:score,reason:reason,strategy:strategy});
  });
 });
 list.sort(function(a,b){return b.score-a.score||a.si-b.si||a.bi-b.bi});return list;
}
function priorities(){
 return allItems().filter(function(x){return x.metrics.totalQuestions>0&&x.metrics.masteryScore<80})
 .sort(function(a,b){return a.metrics.stuck?-1:b.metrics.stuck?1:a.metrics.masteryScore-b.metrics.masteryScore})
 .slice(0,3);
}
function stateDiagnosis(items){
 var valid=items.filter(function(x){return x.metrics.totalQuestions>0});
 if(!valid.length)return{kind:"empty",title:"Seu diagnóstico está sendo construído",text:"Continue registrando seus estudos. O Ciclo precisa de algumas sessões para identificar seus pontos fortes e prioridades."};
 var stuck=valid.filter(function(x){return x.metrics.stuck});
 var evolving=valid.filter(function(x){return x.metrics.improvementScore>0});
 var weak=valid.filter(function(x){return x.metrics.masteryScore<60});
 if(stuck.length)return{kind:"stuck",title:"Alguns assuntos precisam de uma nova estratégia",text:stuck.length+" assunto(s) estão com progresso baixo. Vamos retomar os fundamentos e ajustar a forma de estudar."};
 if(weak.length||valid.some(function(x){return x.metrics.masteryScore<70&&x.metrics.improvementScore<5}))return{kind:"reinforce",title:"Você está consolidando sua aprendizagem",text:"Alguns assuntos precisam de reforço. O próximo passo é praticar com intenção e revisar os pontos de maior dificuldade."};
 return{kind:"evolving",title:"Você está evoluindo",text:evolving.length?"Seu desempenho recente mostra progresso. Continue alternando prática e revisão.":"Seu desempenho está consistente. Continue avançando e confirme a retenção ao longo do tempo."};
}
window.home=function(){
 var S=window.S,rec=candidates()[0],dt=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"}),today=day(),minutes=window.minsOn(today),q=window.qs(function(l){return l.d===today}).t;
 if(!S.subs.length)return '<div class="up">SEU COPILOTO DE APRENDIZAGEM</div><h1>Vamos começar?</h1><p class="mu">O Ciclo organiza seus estudos e ajuda você a decidir o próximo passo.</p><section class="card" style="max-width:650px"><h2 style="margin:0 0 8px">Prepare seu primeiro ciclo</h2><p class="mu">Adicione suas matérias e assuntos. Você poderá ajustar tudo depois.</p><button class="btn" onclick="go(\'cfg\')">Organizar meus estudos</button></section>';
 var meta=window.gOn()?'<div class="home-support"><h3>Meta diária</h3><b>'+window.fm(minutes)+' / '+window.fm(S.goal)+'</b><div class="bar"><i style="width:'+Math.min(100,minutes/Math.max(1,S.goal)*100)+'%"></i></div>'+(window.qOn()?'<p class="mu sm" style="margin:9px 0 0">'+q+' / '+(S.qgoal||30)+' questões</p>':'')+'</div>':(window.qOn()?'<div class="home-support"><h3>Meta de questões</h3><b>'+q+' / '+(S.qgoal||30)+'</b><div class="bar"><i style="width:'+Math.min(100,q/Math.max(1,S.qgoal||30)*100)+'%"></i></div></div>':'');
 var due=reviewDue(),review='<div class="home-support"><h3>Revisões</h3><b>'+(due===null?"Consultar revisões":due?due+" pendentes":"Tudo em dia")+'</b><button class="lk" onclick="go(\'cards\')">Revisar agora →</button></div>';
 var diag=stateDiagnosis(allItems()),p=priorities();
 var prioritiesHtml=p.length?p.map(function(x){return '<div class="home-priority"><span>•</span><span>'+e(x.subject.n)+' — '+e(topic(x.block))+'</span></div>'}).join(''):'<div class="mu sm">Suas prioridades aparecerão conforme você estuda.</div>';
 var title=rec?e(rec.s.n):"Seu ciclo está pronto",sub=rec?e(topic(rec.b)):"Adicione assuntos ao ciclo para receber uma recomendação.",reason=rec?e(rec.reason):"Você pode organizar seu percurso e começar quando quiser.";
 var recMeta=rec?(window.fm(rec.s.min)+" · 20 questões sugeridas"):(S.blockMinutes||15)+" min";
 var html='<div class="up">'+e(dt)+'</div><h1>'+(S.profileName?"Olá, "+e(S.profileName):"Seu plano de hoje")+'</h1>'+(S.profileGoal?'<p class="mu sm">'+e(S.profileGoal)+'</p>':'');
 if(window.ss)html+='<section class="home-support" style="border-color:var(--info);margin:14px 0"><b>Sessão não finalizada</b><p class="mu sm">Seus registros estão salvos em rascunho.</p><button class="btn" onclick="resumeStudy()">Retomar sessão</button></section>';
 html+='<div class="home-layout"><div class="home-primary"><section class="next-action-card"><div class="up">SUA PRÓXIMA SESSÃO</div><h2>'+title+'</h2><div class="next-topic">'+sub+'</div><p style="color:#E6EEF5;line-height:1.5">'+reason+'</p><div style="color:#D7E2EE;font-size:14px">'+recMeta+'</div>'+(rec&&rec.strategy?'<p style="color:#E6EEF5;font-size:13px;margin:10px 0 0">Estratégia sugerida: '+e(rec.strategy)+'</p>':'')+'<button class="btn" onclick="'+(rec?'startRecommended('+rec.si+')':'go(\'ciclo\')')+'">'+(rec?"Começar agora":"Ver meu ciclo")+'</button><button class="next-alt" onclick="toggleSubjectPicker()">Escolher outra matéria</button><div id="home-subject-picker" hidden style="margin-top:10px">'+S.subs.map(function(s,i){return '<button class="next-alt" style="display:block" onclick="startRecommended('+i+')">'+e(s.n)+'</button>'}).join('')+'</div></section></div>';
 html+='<aside class="home-secondary">'+meta+review+'<div class="home-support"><h3>Situação atual</h3><b>'+e(diag.title)+'</b><p class="mu sm" style="line-height:1.5;margin-bottom:0">'+e(diag.text)+'</p></div><div class="home-support home-priorities-card"><h3>Próximas prioridades</h3><div class="home-priorities">'+prioritiesHtml+'</div></div></aside></div>';
 html+='<div class="mu sm" style="display:flex;justify-content:space-between;gap:8px;margin-top:16px"><span>'+minutes+' min estudados hoje · '+q+' questões</span><span>Nível '+window.lvl(window.xpT())+' · sequência '+window.streak()+' dias</span></div>';
 return html;
};
window.toggleSubjectPicker=function(){var x=document.getElementById("home-subject-picker");if(x)x.hidden=!x.hidden};
window.startRecommended=function(si,bi){if(Number.isInteger(si))window.S.cur=si;if(Number.isInteger(bi)&&window.S.subs[si])window.S.subs[si].ptr=bi;window.start()};
window.ciclo=function(){
 var S=window.S;if(!S.subs.length)return '<h1>Seu Ciclo</h1><div class="card"><p class="mu">Adicione matérias e assuntos para montar seu percurso.</p><button class="btn" onclick="go(\'cfg\')">Adicionar matérias</button></div>';
 var cur=S.subs[S.cur]||S.subs[0],items=window.CicloLearning?window.CicloLearning.selectBlocks(S,cur,2):[],bi=items.length?items[0]:cur.ptr||0,rec=candidates(),next=rec.filter(function(x){return !(x.si===S.cur&&x.bi===bi)}).slice(0,3);
 var html='<div class="up">SEU PERCURSO</div><h1>Ciclo</h1><p class="mu">Seu GPS de estudos: agora, próximo e depois.</p><section class="gps-current"><div class="up">AGORA</div><h2 style="margin:8px 0">'+e(cur.n)+'</h2><div style="font-size:18px;font-weight:700">'+e(topic(cur.t[bi]))+'</div><div class="mu sm" style="margin-top:8px">'+window.fm(cur.min)+' · '+(cur.t.length?("Assunto "+(bi+1)+" de "+cur.t.length):"Sem assuntos cadastrados")+'</div><button class="btn" onclick="startRecommended('+S.cur+','+bi+')">Começar sessão</button></section>';
 html+='<h2>Próximas sessões</h2><div class="gps-list">'+(next.map(function(x,i){return '<div class="gps-item"><span class="gps-number">'+(i+1)+'</span><div class="gps-copy"><b>'+e(x.s.n)+'</b><small>'+e(topic(x.b))+'</small></div><span class="mu">›</span></div>'}).join('')||'<p class="mu sm">Seu percurso seguinte aparecerá conforme você avança.</p>')+'</div>';
 html+='<details class="report-advanced"><summary>Ver estrutura completa</summary><div style="padding-top:12px">'+S.subs.map(function(s,si){return '<section style="padding:10px 0;border-top:1px solid var(--ln)"><b>'+e(s.n)+'</b>'+s.t.map(function(b,i){return '<div class="report-line">'+(i+1)+'. '+e(topic(b))+(i===s.ptr?' · próximo':'')+'</div>'}).join('')+'</section>'}).join('')+'<button class="btn s" onclick="go(\'cfg\')">Organizar matérias e assuntos</button></div></details>';
 return html;
};
window.prog=function(){
 var items=allItems(),diag=stateDiagnosis(items),valid=items.filter(function(x){return x.metrics.totalQuestions>0}),strong=valid.filter(function(x){return x.metrics.masteryScore>=80&&x.metrics.passRecords.length>=3&&x.metrics.retention&&x.metrics.retention.score>=75}),improving=valid.filter(function(x){return x.metrics.improvementScore>=15}).sort(function(a,b){return b.metrics.improvementScore-a.metrics.improvementScore}),weak=valid.filter(function(x){return x.metrics.stuck||x.metrics.masteryScore<60||x.metrics.stagnation}).sort(function(a,b){return a.metrics.masteryScore-b.metrics.masteryScore}).slice(0,4);
 var strengths=strong.map(function(x){return '<div class="report-line">✓ '+e(x.subject.n)+' — '+e(topic(x.block))+'</div>'}).concat(improving.slice(0,3).map(function(x){return '<div class="report-line">↗ '+e(x.subject.n)+' — evolução de '+Math.round(x.metrics.improvementScore)+' pontos</div>'}));
 var attention=weak.map(function(x){return '<div class="report-line">• '+e(x.subject.n)+' — '+e(topic(x.block))+(x.metrics.stuck?' · precisa de nova estratégia':' · vale reforçar')+'</div>'});
 var html='<div class="up">APRENDIZAGEM</div><h1>Relatórios</h1><section class="report-state"><div class="up">SEU DIAGNÓSTICO</div><strong>'+e(diag.title)+'</strong><p class="mu" style="line-height:1.55;margin-bottom:0">'+e(diag.text)+'</p></section><div class="report-columns"><section class="report-box"><h3>Pontos fortes</h3>'+(strengths.join('')||'<p class="mu sm">Suas evoluções e assuntos dominados aparecerão aqui quando houver dados suficientes.</p>')+'</section><section class="report-box"><h3>Precisam de atenção</h3>'+(attention.join('')||'<p class="mu sm">Nenhum gargalo identificado com os dados atuais.</p>')+'</section></div>';
 var rec=candidates()[0];if(rec)html+='<section class="report-box" style="margin-top:14px"><div class="up">PRIORIDADE ATUAL</div><h3 style="margin-top:8px">'+e(rec.s.n)+' — '+e(topic(rec.b))+'</h3><p class="mu sm">'+e(rec.reason)+'</p>'+(rec.strategy?'<p class="sm">'+e(rec.strategy)+'</p>':'')+'<button class="btn" onclick="startRecommended('+rec.si+','+rec.bi+')">Estudar agora</button></section>';
 html+='<details class="report-advanced"><summary>Análise avançada</summary><div style="padding-top:12px"><p class="mu sm">Indicadores técnicos disponíveis para quem deseja aprofundar a análise.</p>';
 var mat=window.CicloLearning?window.CicloLearning.maturity(window.S):null;
 html+='<div class="report-line"><b>Maturidade de estudos:</b> '+(mat&&mat.score!==null?Math.round(mat.score)+"/100 · "+e(mat.level):"Em formação")+'</div>';
 var metrics=["learningScore","retentionScore","resilienceScore","velocityScore","fragilityScore","consistencyScore","masteryScore"];
 var labels={learningScore:"Learning Score",retentionScore:"Retenção",resilienceScore:"Resiliência",velocityScore:"Velocidade",fragilityScore:"Robustez",consistencyScore:"Consistência",masteryScore:"Domínio"};
 items.filter(function(x){return x.metrics.totalQuestions>0}).forEach(function(x){html+='<div class="report-line"><b>'+e(x.subject.n)+' — '+e(topic(x.block))+'</b><div class="mu sm">'+metrics.map(function(k){var v=x.metrics[k];return labels[k]+": "+(v===null||v===undefined?"Em formação":Math.round(v)+(k==="velocityScore"?"":"/100"))}).join(" · ")+'</div>'+(x.metrics.stagnation?'<div class="mu sm">Estagnação detectada: o tempo aumentou sem progresso relevante.</div>':'')+'</div>'});
 html+='</div></details><div class="mu sm" style="margin-top:14px">Os diagnósticos aparecem apenas quando há dados suficientes. Assuntos sem amostra válida não são tratados como zero.</div>';
 return html;
};
window.saveExamDate=function(value){window.S.examDate=value||"";window.save();window.render()};
window.cfg=function(){return oldCfg()+'<h2>Prazo da prova ou objetivo</h2><div class="card"><p class="mu sm">Opcional. Se você informar uma data, o Ciclo poderá considerar a proximidade da prova ao recomendar o próximo estudo.</p><label class="sm" for="ciclo-exam-date">Data da prova</label><input id="ciclo-exam-date" type="date" value="'+e(window.S.examDate||"")+'" onchange="saveExamDate(this.value)"><button class="lk" onclick="saveExamDate(\'\')">Remover data</button></div>'};
window.cards=function(){return '<div class="up">MEMÓRIA DE LONGO PRAZO</div><h1>Revisão</h1><p class="mu">Revise no momento certo para fortalecer o que aprendeu.</p><div id="anki-v2"><p class="mu">Carregando sua biblioteca…</p></div>'};
window.red=function(){
 var R=window.S.red||[],rated=R.filter(function(x){return x.nota!==null&&x.nota!==undefined}),avg=rated.length?Math.round(rated.reduce(function(a,x){return a+x.nota},0)/rated.length):null,best=rated.length?Math.max.apply(null,rated.map(function(x){return x.nota})):null,compet=R.filter(function(x){return x.c}),labels=["Norma culta","Compreensão","Argumentação","Coesão","Proposta"],means=compet.length?labels.map(function(_,i){return Math.round(compet.reduce(function(a,x){return a+(Number(x.c[i])||0)},0)/compet.length)}):null,weak=means?means.indexOf(Math.min.apply(null,means)):-1,last=R.length?R[R.length-1]:null;
 var h='<div class="up">PRODUÇÃO TEXTUAL</div><h1>Redação</h1><section class="report-state"><div class="up">DESEMPENHO GERAL</div><strong style="font-size:38px">'+(avg===null?"Em construção":avg+" pontos")+'</strong><p class="mu sm">'+R.length+' redação(ões) registrada(s)'+(best!==null?' · melhor nota '+best:'')+'</p></section>';
 h+='<div class="report-columns"><section class="report-box"><h3>Principal ponto de melhoria</h3>'+(weak>=0?'<b>Competência '+(weak+1)+' · '+labels[weak]+'</b><p class="mu sm">Média de '+means[weak]+' pontos.</p>':'<p class="mu sm">Registre competências em uma redação para identificar onde concentrar a prática.</p>')+'</section><section class="report-box"><h3>Próxima ação</h3><b>'+(last?"Continue sua evolução":"Comece sua primeira redação")+'</b><p class="mu sm">'+(last?"Último registro: "+last.d.split("-").reverse().join("/"):"Ainda não há redações registradas.")+'</p><button class="btn" onclick="document.getElementById(\'red-editor\').open=true;document.getElementById(\'red-editor\').scrollIntoView({behavior:\'smooth\'})">Nova redação</button></section></div>';
 h+='<details id="red-editor" class="report-advanced"><summary>Produzir e gerenciar redações</summary><div style="padding-top:12px">'+oldRed().replace(/^<h1>Redação<\/h1>/,"").replace(/<div class="hero" style="margin-top:14px">[\s\S]*?<\/div><\/div><\/div><\/div>/,"")+'</div></details>';
 return h;
};
window.sess=function(){
 var s=window.S.subs[window.S.cur],ix=window.idx(s);if(!window.ss)return oldSess();if(!window.ss.timer)window.ss.timer={remaining:(window.S.blockMinutes||15)*60,running:false};
 var html='<div class="study-v2-head"><div class="up">SESSÃO DE ESTUDO</div><h1>'+e(s.n)+'</h1><div class="mu">'+e(s.a)+' · '+e(topic(s.t[ix[0]]))+'</div></div><section class="study-v2-timer card"><div class="up">TEMPO DE ESTUDO</div><div id="study-timer-display" class="study-timer-display">'+window.timerText(window.timerSeconds())+'</div><div id="study-timer-status" class="mu sm">'+(window.ss.timer.running?"Cronômetro em andamento":"Pronto para começar")+'</div><div class="study-timer-actions" style="justify-content:center;margin-top:12px"><button id="study-timer-start" onclick="timerStart()" '+(window.ss.timer.running?'disabled':'')+'>▶ Iniciar</button><button id="study-timer-pause" onclick="timerPause()" '+(!window.ss.timer.running?'disabled':'')+'>Ⅱ Pausar</button></div></section>';
 html+='<div class="study-v2-counts">'+ix.map(function(bi,i){var ac=(window.ss.ac||[])[i]||0,er=(window.ss.er||[])[i]||0;return '<section class="study-v2-count" style="grid-column:1/-1;text-align:left"><div class="up">ASSUNTO '+(i+1)+' DE '+ix.length+'</div><b style="font-size:20px;margin:8px 0">'+e(topic(s.t[bi]))+'</b><div class="study-v2-counts"><div class="study-v2-count"><span class="mu sm">Acertos</span><b>'+ac+'</b><div class="study-stepper"><button onclick="stp(\'ac\','+i+',-1)">−</button><button class="add" onclick="stp(\'ac\','+i+',1)">+</button></div></div><div class="study-v2-count"><span class="mu sm">Erros</span><b>'+er+'</b><div class="study-stepper"><button onclick="stp(\'er\','+i+',-1)">−</button><button class="add" onclick="stp(\'er\','+i+',1)">+</button></div></div></div><details class="difficulty-optional"><summary>Mais opções</summary><select onchange="setDifficulty('+i+',this.value)"><option value="">Dificuldade não classificada</option><option value="easy" '+((window.ss.difficulty||[])[i]==="easy"?"selected":"")+'>Questões fáceis</option><option value="hard" '+((window.ss.difficulty||[])[i]==="hard"?"selected":"")+'>Questões difíceis</option></select></details>'+(er>0?'<button class="cycle-error-flashcard" onclick="createCycleFlashcard('+i+')">Criar flashcard deste erro</button>':'')+'</section>'}).join('')+'</div>';
 html+='<div class="study-v2-actions"><button class="btn" onclick="adv(0)" '+(window.hasStudied()?'':'disabled')+'>Finalizar sessão</button><button class="btn s" onclick="go(\'home\')">Salvar e sair</button><button class="lk r" onclick="adv(1)">Pular esta sessão</button></div>';
 return html;
};
window.toggleMoreNav=function(){
 var nav=document.getElementById("nav"),old=nav&&nav.querySelector(".more-menu");if(old){old.remove();return}
 if(!nav)return;var box=document.createElement("div");box.className="more-menu";box.innerHTML='<button onclick="go(\'red\')"><b>✎</b>Redação</button><button onclick="go(\'prog\')"><b>▦</b>Relatórios</button><button onclick="go(\'cfg\')"><b>⚙</b>Ajustes</button>';nav.appendChild(box);
};
function updateNavigation(){
 var nav=document.getElementById("nav");if(!nav||!window.S.ob)return;
 var current=window.tab==="sess"?"home":window.tab==="sub"?"cfg":window.tab==="qa"?"prog":["rev","cf","io"].includes(window.tab)?"cards":window.tab;
 var mobile=window.matchMedia("(max-width:700px)").matches;
 var active=mobile&&!["home","ciclo","cards"].includes(current)?"more":current;
 var items=mobile?[["home","◉","Início"],["ciclo","⌁","Ciclo"],["cards","▤","Revisão"],["more","•••","Mais"]]:[["home","◉","Início"],["ciclo","⌁","Ciclo"],["cards","▤","Revisão"],["red","✎","Redação"],["prog","▦","Relatórios"],["cfg","⚙","Ajustes"]];
 nav.innerHTML=items.map(function(x){return '<button class="'+(active===x[0]?"a":"")+'" onclick="'+(x[0]==="more"?"toggleMoreNav()":"go(\'"+x[0]+"\')")+'"><b>'+x[1]+'</b>'+x[2]+'</button>'}).join("");
}
window.render=function(){oldRender();updateNavigation()};
var root=document.getElementById("anki-v2"),ankiObserver;
function simplifyAnki(){
 var el=document.getElementById("anki-v2");if(!el)return;
 var heading=el.querySelector(".anki-welcome h2");if(!heading||heading.textContent==="Revisão")return;
 heading.textContent="Revisão";
 var tagline=el.querySelector(".anki-welcome p");if(tagline)tagline.textContent="Seus cartões no momento certo, sem precisar organizar tudo antes.";
 var top=el.querySelector(".anki-topline");if(top&&top.firstElementChild)top.firstElementChild.textContent="REVISÃO ESPAÇADA · FSRS";
 var stats=el.querySelector(".anki-stats");if(stats){var cards=stats.children;if(cards[0])cards[0].querySelector("small").textContent="Cartões";if(cards[1])cards[1].querySelector("small").textContent="Para revisar";if(cards[2])cards[2].querySelector("small").textContent="Revisões recentes";if(cards[3])cards[3].querySelector("small").textContent="Acertos recentes"}
}
function collapseAnkiTools(){
 var el=document.getElementById("anki-v2");if(!el||el.querySelector(".anki-tools-details"))return;
 var nodes=[el.querySelector(".anki-deck-tree"),el.querySelector(".anki-deck-form"),el.querySelector(".anki-toolbar"),el.querySelector("#anki-form-wrap"),el.querySelector("#anki-note-list"),el.querySelector(".anki-footer-actions")].filter(Boolean);
 if(!nodes.length)return;
 var details=document.createElement("details");details.className="report-advanced anki-tools-details";details.style.marginTop="16px";
 var summary=document.createElement("summary");summary.textContent="Gerenciar conteúdos";details.appendChild(summary);
 nodes.forEach(function(node){details.appendChild(node)});el.appendChild(details);
}
var appRoot=document.getElementById("app");if(appRoot){ankiObserver=new MutationObserver(function(){if(document.getElementById("anki-v2")){simplifyAnki();collapseAnkiTools()}});ankiObserver.observe(appRoot,{childList:true,subtree:true})}
window.render();
})();
