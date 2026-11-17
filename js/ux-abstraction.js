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
window.finalizeStudyV2=function(){
 var S=window.S,s=S.subs[S.cur],indices=window.idx(s),done=indices.filter(function(_,i){return window.ss&&window.ss.studied&&window.ss.studied[i]}),correct=0,wrong=0;
 indices.forEach(function(_,i){if(window.ss&&window.ss.studied&&window.ss.studied[i]){correct+=(window.ss.ac||[])[i]||0;wrong+=(window.ss.er||[])[i]||0}});
 var minutes=done.length*(S.blockMinutes||15),subject=s.n;
 window.adv(0);
 var old=document.getElementById("ciclo-finish-overlay");if(old)old.remove();
 var modal=document.createElement("div");modal.id="ciclo-finish-overlay";modal.className="ciclo-finish-overlay";
 modal.innerHTML='<section class="ciclo-finish-dialog" role="dialog" aria-modal="true" aria-labelledby="ciclo-finish-title"><div class="up">SESSÃO CONCLUÍDA</div><h2 id="ciclo-finish-title">Ótimo trabalho!</h2><p class="mu sm">'+e(subject)+' · sua atividade foi salva no histórico.</p><div class="ciclo-finish-stats"><div><b>'+minutes+'</b><span class="mu sm">min estimados</span></div><div><b>'+(correct+wrong)+'</b><span class="mu sm">questões</span></div><div><b>'+correct+'</b><span class="mu sm">acertos</span></div></div><p class="mu sm">'+wrong+' erro(s) registrados. Continue no seu ritmo: cada sessão contribui para sua evolução.</p><button class="btn" onclick="backupLocal();document.getElementById(\'ciclo-finish-overlay\').remove()">Baixar backup do Ciclo</button><button class="btn s" onclick="document.getElementById(\'ciclo-finish-overlay\').remove()">Continuar</button></section>';
 document.body.appendChild(modal);
};
window.sess=function(){return originalSess().replace(/ss=null;go\('home'\)/,"timerPause();persistDraft();go('home')")};

window.prog=function(){return '<h1>Relatórios</h1><p class="mu sm">Uma visão organizada da sua evolução, frequência e aprendizagem.</p>'+originalProg()};
window.save=function(){originalSave();persistDraft()};
window.start=function(){originalStart();persistDraft()};
window.stp=function(f,i,v){originalStep(f,i,v);persistDraft()};
window.setK=function(i){originalSetK(i);persistDraft()};
window.go=function(t){if(t==="ciclo")t="home";if(t!=="sess"&&window.ss){if(window.timerPause)window.timerPause();persistDraft()}originalGo(t);if(typeof toggleSidebar==="function")toggleSidebar(false)};
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
.ciclo-finish-overlay{position:fixed;inset:0;z-index:2000;background:#071426b8;display:grid;place-items:center;padding:18px}
.ciclo-finish-dialog{width:min(100%,480px);background:var(--cd);color:var(--tx);border:1px solid var(--ln);border-radius:22px;padding:24px;box-shadow:0 24px 70px #0004}
.ciclo-finish-dialog h2{margin:6px 0 8px;font-size:27px}
.ciclo-finish-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0}
.ciclo-finish-stats div{background:var(--surface2);border-radius:12px;padding:12px;text-align:center}
.ciclo-finish-stats b{display:block;font-size:22px}
.ciclo-finish-dialog button{margin-top:8px}

button,a,summary,input,select,textarea{outline-offset:3px}
:focus-visible{outline:3px solid var(--info)!important;outline-offset:3px!important}
button{min-height:44px;cursor:pointer}
input,select,textarea{font-size:16px}
.card,.tile{border:1px solid var(--ln);box-shadow:none;border-radius:16px}

/* Layout responsivo consolidado: breakpoints por viewport, sem classificar
   todo dispositivo touch como tablet. */
:root{overflow-x:hidden}
html,body{width:100%;max-width:100%;min-width:320px}
body{overflow-x:clip}
#app{box-sizing:border-box;width:100%;max-width:1120px;min-width:0;margin:0 auto;padding:30px 32px 110px}
#app *{min-width:0}
#app img,#app video,#app canvas,#app svg{max-width:100%;height:auto}
#app table{display:block;width:100%;max-width:100%;overflow-x:auto}
#app input,#app select,#app textarea{box-sizing:border-box;max-width:100%;min-width:0}
#app .home-layout{grid-template-columns:minmax(0,1.6fr) minmax(250px,1fr)}
#app .report-columns{grid-template-columns:repeat(2,minmax(0,1fr))}
#app .home-primary,#app .home-secondary,#app .home-support,#app .report-box{min-width:0}
#nav{box-sizing:border-box}
@media(min-width:1201px){
 body{padding-left:236px}
 #app{padding:34px 36px 80px}
 #nav{position:fixed;z-index:900;left:0;top:0;bottom:0;width:236px;display:flex!important;flex-direction:column;justify-content:flex-start;align-items:stretch;gap:6px;padding:26px 14px;background:var(--cd);border-right:1px solid var(--ln);backdrop-filter:none}
 #nav:before{content:"CICLO";display:block;font:800 20px Manrope,Inter,sans-serif;letter-spacing:.12em;color:var(--ac);padding:8px 14px 28px}
 #nav button{display:flex;align-items:center;gap:13px;max-width:none;width:100%;min-height:48px;text-align:left;padding:10px 14px;border-radius:12px;font-size:15px;color:var(--mu)}
 #nav button b{display:inline-grid;place-items:center;width:24px;font-size:19px}
 #nav button.a{background:color-mix(in srgb,var(--ac) 9%,var(--cd));color:var(--ac);font-weight:750}
 #nav .more-menu{position:absolute;left:12px;right:12px;bottom:18px;background:var(--cd);border:1px solid var(--ln);border-radius:14px;padding:8px;box-shadow:0 12px 30px #0002}
 .tabs{display:none!important}
}
@media(min-width:701px) and (max-width:1200px), (pointer:coarse) and (hover:none) and (min-width:701px) and (max-width:1400px){
 body{padding-left:0!important}
 #app{width:100%;max-width:1120px;padding:26px 28px 124px}
 #nav{position:fixed!important;z-index:1200!important;top:auto!important;left:0!important;right:0!important;bottom:0!important;transform:none!important;width:100%!important;height:auto!important;min-height:68px!important;max-height:calc(88px + env(safe-area-inset-bottom))!important;display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;justify-content:space-around!important;align-items:stretch!important;gap:6px!important;padding:7px 16px calc(7px + env(safe-area-inset-bottom))!important;margin:0!important;border:0!important;border-top:1px solid var(--ln)!important;border-radius:0!important;background:var(--cd)!important;box-shadow:0 -8px 24px rgba(16,24,40,.08)!important;overflow:visible!important}
 #nav:before{display:none!important;content:none!important}
 #nav button{box-sizing:border-box;flex:1 1 0!important;width:auto!important;min-width:0!important;max-width:190px!important;height:auto!important;min-height:52px!important;margin:0!important;padding:5px 6px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;text-align:center!important;white-space:nowrap!important;font-size:12px!important;line-height:1.2!important;border-radius:10px!important}
 #nav button b{display:block!important;width:auto!important;margin:0!important;font-size:19px!important;line-height:1.1!important}
 #nav .more-menu{position:absolute!important;left:auto!important;right:14px!important;top:auto!important;bottom:calc(78px + env(safe-area-inset-bottom))!important;width:min(250px,calc(100vw - 28px))!important;max-width:none!important;background:var(--cd)!important;border:1px solid var(--ln)!important;border-radius:14px!important;padding:8px!important;box-shadow:0 12px 30px rgba(0,0,0,.18)!important}
 #nav .more-menu button{width:100%!important;min-height:46px!important;max-width:none!important;flex-direction:row!important;justify-content:flex-start!important;text-align:left!important;font-size:14px!important}
 #app .home-layout{grid-template-columns:minmax(0,1fr)!important;gap:14px}
 #app .next-action-card{width:100%;min-height:0;margin:14px 0;padding:26px}
 #app .home-secondary{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
 #app .home-secondary .home-priorities-card{grid-column:1/-1}
}
@media(min-width:901px) and (max-width:1200px){
 #app .home-layout{grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr)!important}
 #app .next-action-card{min-height:280px}
}
@media(max-width:900px){
 #app{padding:22px 20px 122px}
 #app .home-layout,#app .report-columns{grid-template-columns:minmax(0,1fr)!important}
 #app .next-action-card{min-height:0;padding:24px}
 #app .home-secondary{grid-template-columns:repeat(2,minmax(0,1fr))}
 #app .home-secondary .home-priorities-card{grid-column:1/-1}
 #app .study-v2-counts{gap:10px}
 #app .study-v2-count{padding:14px 10px}
}
@media(max-width:700px), (pointer:coarse) and (hover:none) and (max-width:700px){
 html,body{min-width:320px}
 #app{width:100%;max-width:100%;padding:20px 16px calc(122px + env(safe-area-inset-bottom));overflow-x:clip}
 #nav{position:fixed!important;z-index:1200!important;top:auto!important;left:0!important;right:0!important;bottom:0!important;width:100%!important;height:auto!important;min-height:64px!important;display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;justify-content:space-around!important;gap:2px!important;padding:6px 8px calc(6px + env(safe-area-inset-bottom))!important;border:0!important;border-top:1px solid var(--ln)!important;background:var(--cd)!important;backdrop-filter:blur(18px)}
 #nav:before{display:none!important}
 #nav button{flex:1 1 0!important;min-width:0!important;max-width:none!important;min-height:52px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;text-align:center!important;padding:5px 2px!important;font-size:11px!important;white-space:nowrap}
 #nav button b{display:block!important;width:auto!important;font-size:19px!important}
 #nav .more-menu{position:absolute!important;left:auto!important;right:10px!important;bottom:calc(72px + env(safe-area-inset-bottom))!important;width:min(210px,calc(100vw - 20px))!important}
 #app .home-layout,#app .report-columns{grid-template-columns:minmax(0,1fr)!important}
 #app .home-secondary{grid-template-columns:minmax(0,1fr)!important}
 #app .home-secondary .home-priorities-card{grid-column:auto}
 #app .next-action-card{min-height:0;padding:22px}
 #app .study-v2-counts{grid-template-columns:repeat(2,minmax(0,1fr))}
 #app .anki-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
 #app .anki-actions{grid-template-columns:repeat(2,minmax(0,1fr))}
 #app .anki-actions .anki-primary{grid-column:1/-1}
 #app .anki-toolbar{grid-template-columns:minmax(0,1fr)}
 #app .anki-toolbar button{width:100%}
 #app .anki-grade-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
 #app .grid{grid-template-columns:repeat(2,minmax(0,1fr))}
 #app .row{flex-wrap:wrap}
 #app .row>.f{flex:1 1 100%}
 #app .ciclo-finish-stats{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media(max-width:380px){
 #app{padding-left:12px;padding-right:12px}
 #app .card{padding:16px}
 #app .ciclo-finish-dialog{padding:18px}
 #nav button{font-size:10px!important}
}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;
css.textContent += `
/* Navegação lateral completa e formulários com hierarquia consistente */
.app-topbar-inner{padding-left:clamp(16px,3vw,34px)}
@media(min-width:701px){
 body{padding-left:224px!important}
 #nav{position:fixed!important;inset:0 auto 0 0!important;width:224px!important;height:100dvh!important;max-height:100dvh!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;gap:7px!important;padding:24px 14px!important;overflow-y:auto!important;overflow-x:hidden!important;background:var(--cd)!important;border:0!important;border-right:1px solid var(--ln)!important;border-radius:0!important;box-shadow:4px 0 24px rgba(16,24,40,.04)!important;z-index:1300!important}
 #nav:before{display:block!important;content:"CICLO"!important;padding:8px 14px 26px!important;font:800 20px Manrope,Inter,sans-serif!important;letter-spacing:.12em!important;color:var(--ac)!important}
 #nav button{flex:none!important;width:100%!important;max-width:none!important;min-height:48px!important;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:13px!important;padding:10px 13px!important;text-align:left!important;font-size:14px!important;white-space:normal!important;border-radius:12px!important}
 #nav button b{display:inline-grid!important;place-items:center!important;width:25px!important;flex:none!important;font-size:19px!important}
 #nav button.a{background:color-mix(in srgb,var(--ac) 10%,var(--cd))!important;color:var(--ac)!important;font-weight:750!important}
 #app{max-width:1120px!important;margin:0 auto!important}
 .app-topbar-inner{max-width:1120px!important;margin-left:0!important}
 #ciclo-sidebar-toggle{display:none!important}
}
@media(min-width:701px) and (max-width:1000px){
 body{padding-left:204px!important}
 #nav{width:204px!important;padding:18px 10px!important}
 .app-topbar-inner{margin-left:0!important}
 #app{padding-left:20px!important;padding-right:20px!important}
 #app .home-layout,#app .report-columns{grid-template-columns:minmax(0,1fr)!important}
}
#ciclo-sidebar-toggle{border:1px solid var(--ln);background:var(--cd);color:var(--tx);border-radius:11px;min-width:42px;min-height:42px;padding:8px 10px;font-size:20px;line-height:1;cursor:pointer}
#ciclo-sidebar-backdrop{display:none}
@media(max-width:700px){
 body{padding-left:0!important}
 .app-topbar-inner{margin:0!important;padding:10px 14px!important;gap:10px!important}
 #ciclo-sidebar-toggle{display:inline-flex!important;align-items:center;justify-content:center;flex:none;order:-1}
 #nav{position:fixed!important;z-index:1500!important;inset:0 auto 0 0!important;width:min(290px,86vw)!important;height:100dvh!important;max-height:100dvh!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;gap:7px!important;padding:24px 14px calc(24px + env(safe-area-inset-bottom))!important;overflow-y:auto!important;overflow-x:hidden!important;background:var(--cd)!important;border:0!important;border-right:1px solid var(--ln)!important;border-radius:0 18px 18px 0!important;box-shadow:16px 0 48px rgba(0,0,0,.18)!important;transform:translateX(-110%)!important;transition:transform .22s ease!important}
 #nav.sidebar-open{transform:translateX(0)!important}
 #nav:before{display:block!important;content:"CICLO"!important;padding:8px 14px 24px!important;font:800 20px Manrope,Inter,sans-serif!important;letter-spacing:.12em!important;color:var(--ac)!important}
 #nav button{flex:none!important;width:100%!important;max-width:none!important;min-height:50px!important;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:13px!important;padding:10px 13px!important;text-align:left!important;font-size:15px!important;white-space:normal!important;border-radius:12px!important}
 #nav button b{display:inline-grid!important;place-items:center!important;width:26px!important;flex:none!important;font-size:20px!important}
 #nav button.a{background:color-mix(in srgb,var(--ac) 10%,var(--cd))!important;color:var(--ac)!important;font-weight:750!important}
 #ciclo-sidebar-backdrop{display:block;position:fixed;inset:0;z-index:1490;background:rgba(8,18,32,.42);opacity:0;pointer-events:none;transition:opacity .2s}
 #ciclo-sidebar-backdrop.visible{opacity:1;pointer-events:auto}
 #app{padding:18px 14px calc(40px + env(safe-area-inset-bottom))!important;max-width:100%!important}
}
.goal-settings-card{display:grid;gap:12px}
.goal-setting{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:14px;padding:16px;border:1px solid var(--ln);border-radius:14px;background:var(--cd)}
.goal-setting-copy b{display:block;font-size:15px;color:var(--tx)}
.goal-setting-copy p{margin:5px 0 0;color:var(--mu);font-size:13px;line-height:1.45}
.goal-setting-control{display:flex;align-items:center;gap:10px}
.goal-setting-control small{font-size:12px;color:var(--mu)}
.goal-value{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:12px 14px 14px;border:1px solid var(--ln);border-top:0;border-radius:0 0 14px 14px;margin-top:-12px;background:var(--surface2)}
.goal-value label{font-size:13px;font-weight:650;color:var(--tx)}
.goal-value input{width:112px!important;min-height:44px;margin:0!important;padding:9px 11px!important;border:1px solid var(--ln)!important;border-radius:10px!important;background:var(--cd)!important;color:var(--tx)!important;text-align:center;font-size:16px!important}
.goal-setting .sw{width:52px!important;height:30px!important;min-height:30px!important;border-radius:99px!important;padding:0!important;flex:none!important}
.goal-setting .sw i{width:24px!important;height:24px!important;top:3px!important;left:3px!important}
.goal-setting .sw.on i{left:25px!important}
.anki-note-editor{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:14px!important;padding:clamp(16px,3vw,26px)!important;border:1px solid var(--ln)!important;box-shadow:0 8px 28px rgba(16,24,40,.05)}
.anki-form-title{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin-bottom:4px}
.anki-form-title h3{margin:5px 0 0!important;font-size:21px!important}
.anki-note-editor>label{display:grid!important;gap:7px!important;margin:0!important;font-size:13px!important;color:var(--tx)!important}
.anki-note-editor input:not([type=file]),.anki-note-editor select,.anki-note-editor textarea{box-sizing:border-box!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:12px 13px!important;border:1px solid var(--ln)!important;border-radius:11px!important;background:var(--bg)!important;color:var(--tx)!important;font:inherit!important;font-size:16px!important;line-height:1.5!important}
.anki-note-editor textarea{min-height:140px!important;resize:vertical!important}
.anki-field-card{display:grid!important;gap:12px!important;min-width:0!important;padding:16px!important;border:1px solid var(--ln)!important;border-radius:14px!important;background:var(--surface2)!important}
.anki-field-heading{display:flex!important;align-items:center!important;gap:11px!important}
.anki-field-heading>div{display:grid!important;gap:3px!important}
.anki-field-heading b{font-size:15px!important;color:var(--tx)!important}
.anki-field-heading small{font-size:12px!important;color:var(--mu)!important}
.anki-field-number{display:grid!important;place-items:center!important;width:32px!important;height:32px!important;flex:none!important;border-radius:10px!important;background:var(--ac)!important;color:white!important;font-weight:800!important}
.anki-field-footer{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important;color:var(--mu)!important;font-size:12px!important}
.anki-note-editor input[type=file]{width:100%!important;max-width:100%!important;padding:10px!important;border:1px dashed var(--ln)!important;border-radius:10px!important;background:var(--surface2)!important;color:var(--tx)!important}
.anki-note-editor .anki-primary{min-height:50px!important}
@media(max-width:700px){
 .goal-setting{grid-template-columns:minmax(0,1fr)!important;gap:12px!important;padding:14px!important}
 .goal-setting-control{justify-content:space-between!important}
 .goal-value{grid-template-columns:minmax(0,1fr) 100px!important;padding:11px 12px 13px!important}
 .goal-value input{width:100%!important}
 .anki-note-editor{padding:14px!important;gap:12px!important}
 .anki-field-card{padding:12px!important}
 .anki-note-editor textarea{min-height:120px!important}
 .anki-form-title h3{font-size:19px!important}
 .anki-note-editor .anki-icon-button{flex:none!important}
}
@media(prefers-reduced-motion:reduce){#nav,#ciclo-sidebar-backdrop{transition:none!important}}
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
 var valid=items.filter(function(x){return x.metrics.totalQuestions>0}),logs=window.S.log||[],dates={};
 logs.forEach(function(l){if(l.d)dates[l.d]=true});
 var sessions=logs.filter(function(l){return l.source==="block"||l.source==="questions"}).length,questions=logs.reduce(function(n,l){return n+(Number(l.ac)||0)+(Number(l.er)||0)},0);
 if(!valid.length)return{kind:"empty",title:"Seu diagnóstico está sendo construído",text:"Continue registrando seus estudos. O Ciclo precisa de algumas sessões para identificar seus pontos fortes e prioridades."};
 if(sessions<3||questions<50)return{kind:"formation",title:"Você está iniciando sua jornada",text:"Continue estudando e registrando suas questões. Quando houver dados suficientes, o Ciclo mostrará sua evolução e os assuntos que merecem atenção."};
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
 var diag=stateDiagnosis(allItems()),p=(diag.kind==="formation"||diag.kind==="empty")?[]:priorities();
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


/* Início e percurso passam a ser uma única tela. */
var homeBeforeCycle=window.home;
window.home=function(){
 var html=homeBeforeCycle();
 html=html.replace("<button onclick=\"go('ciclo')\"><b>↻ Ciclo</b><span>Ver matérias e cadernos</span></button>","");
 var cycle=window.ciclo?window.ciclo():"";
 cycle=cycle.replace("<h1>Ciclo</h1>","<h2 style='margin-top:8px'>Seu percurso de estudos</h2>").replace('<p class="mu">Seu GPS de estudos: agora, próximo e depois.</p>','');
 return html+'<section class="integrated-cycle" style="margin-top:28px">'+cycle+'</section>';
};
window.prog=function(){
 var items=allItems(),diag=stateDiagnosis(items),valid=items.filter(function(x){return x.metrics.totalQuestions>0}),ready=diag.kind!=="formation"&&diag.kind!=="empty",strong=ready?valid.filter(function(x){return x.metrics.masteryScore>=80&&x.metrics.passRecords.length>=3&&x.metrics.retention&&x.metrics.retention.score>=75}):[],improving=ready?valid.filter(function(x){return x.metrics.improvementScore>=15}).sort(function(a,b){return b.metrics.improvementScore-a.metrics.improvementScore}):[],weak=ready?valid.filter(function(x){return x.metrics.stuck||x.metrics.masteryScore<60||x.metrics.stagnation}).sort(function(a,b){return a.metrics.masteryScore-b.metrics.masteryScore}).slice(0,4):[];
 var strengths=strong.map(function(x){return '<div class="report-line">✓ '+e(x.subject.n)+' — '+e(topic(x.block))+'</div>'}).concat(improving.slice(0,3).map(function(x){return '<div class="report-line">↗ '+e(x.subject.n)+' — evolução de '+Math.round(x.metrics.improvementScore)+' pontos</div>'}));
 var attention=weak.map(function(x){return '<div class="report-line">• '+e(x.subject.n)+' — '+e(topic(x.block))+(x.metrics.stuck?' · precisa de nova estratégia':' · vale reforçar')+'</div>'});
 var html='<div class="up">APRENDIZAGEM</div><h1>Relatórios</h1><section class="report-state"><div class="up">SEU DIAGNÓSTICO</div><strong>'+e(diag.title)+'</strong><p class="mu" style="line-height:1.55;margin-bottom:0">'+e(diag.text)+'</p></section><div class="report-columns"><section class="report-box"><h3>Pontos fortes</h3>'+(strengths.join('')||'<p class="mu sm">Suas evoluções e assuntos dominados aparecerão aqui quando houver dados suficientes.</p>')+'</section><section class="report-box"><h3>Precisam de atenção</h3>'+(attention.join('')||'<p class="mu sm">Nenhum gargalo identificado com os dados atuais.</p>')+'</section></div>';
 var rec=candidates()[0];if(rec&&ready)html+='<section class="report-box" style="margin-top:14px"><div class="up">PRIORIDADE ATUAL</div><h3 style="margin-top:8px">'+e(rec.s.n)+' — '+e(topic(rec.b))+'</h3><p class="mu sm">'+e(rec.reason)+'</p>'+(rec.strategy?'<p class="sm">'+e(rec.strategy)+'</p>':'')+'<button class="btn" onclick="startRecommended('+rec.si+','+rec.bi+')">Estudar agora</button></section>';
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
 html+='<div class="study-v2-actions"><button class="btn" onclick="finalizeStudyV2()" '+(window.hasStudied()?'':'disabled')+'>Finalizar sessão</button><button class="btn s" onclick="go(\'home\')">Salvar e sair</button><button class="lk r" onclick="adv(1)">Pular esta sessão</button></div>';
 return html;
};
window.toggleMoreNav=function(){
 var nav=document.getElementById("nav"),old=nav&&nav.querySelector(".more-menu");if(old){old.remove();return}
 if(!nav)return;var box=document.createElement("div");box.className="more-menu";box.innerHTML='<button onclick="go(\'red\')"><b>✎</b>Redação</button><button onclick="go(\'prog\')"><b>▦</b>Relatórios</button><button onclick="go(\'cfg\')"><b>⚙</b>Ajustes</button>';nav.appendChild(box);
};

function toggleSidebar(force){
 var nav=document.getElementById("nav"),back=document.getElementById("ciclo-sidebar-backdrop");
 if(!nav)return;
 var open=typeof force==="boolean"?force:!nav.classList.contains("sidebar-open");
 nav.classList.toggle("sidebar-open",open);
 if(back)back.classList.toggle("visible",open);
 var btn=document.getElementById("ciclo-sidebar-toggle");if(btn)btn.setAttribute("aria-expanded",open?"true":"false");
}
window.toggleSidebar=toggleSidebar;
function updateNavigation(){
 var nav=document.getElementById("nav");if(!nav||!window.S.ob)return;
 var current=window.tab==="sess"?"home":window.tab==="sub"?"cfg":window.tab==="qa"?"prog":["rev","cf","io"].includes(window.tab)?"cards":window.tab==="ciclo"?"home":window.tab;
 var items=[["home","◉","Início e ciclo"],["cards","▤","Revisão"],["red","✎","Redação"],["prog","▦","Relatórios"],["cfg","⚙","Ajustes"]];
 nav.innerHTML=items.map(function(x){return '<button class="'+(current===x[0]?"a":"")+'" onclick="go(\''+x[0]+'\');toggleSidebar(false)"><b>'+x[1]+'</b>'+x[2]+'</button>'}).join("");
 var inner=document.querySelector(".app-topbar-inner");
 if(inner&&!document.getElementById("ciclo-sidebar-toggle")){
  var btn=document.createElement("button");btn.id="ciclo-sidebar-toggle";btn.type="button";btn.setAttribute("aria-label","Abrir menu de navegação");btn.setAttribute("aria-expanded","false");btn.textContent="☰";btn.onclick=function(){toggleSidebar()};
  inner.insertBefore(btn,inner.firstChild);
 }
 if(!document.getElementById("ciclo-sidebar-backdrop")){
  var back=document.createElement("div");back.id="ciclo-sidebar-backdrop";back.onclick=function(){toggleSidebar(false)};document.body.appendChild(back);
 }
}

window.render=function(){oldRender();updateNavigation()};
window.addEventListener("resize",updateNavigation,{passive:true});
window.addEventListener("orientationchange",function(){setTimeout(updateNavigation,80)},{passive:true});
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
 var nodes=[el.querySelector(".anki-deck-tree"),el.querySelector(".anki-deck-form"),el.querySelector(".anki-toolbar"),el.querySelector("#anki-note-list"),el.querySelector(".anki-footer-actions")].filter(Boolean);
 if(!nodes.length)return;
 var details=document.createElement("details");details.className="report-advanced anki-tools-details";details.style.marginTop="16px";
 var summary=document.createElement("summary");summary.textContent="Gerenciar conteúdos";details.appendChild(summary);
 nodes.forEach(function(node){details.appendChild(node)});el.appendChild(details);
}

/* Metas em cartões separados: controle e valor ficam juntos e legíveis. */
var cfgBeforeGoals=window.cfg;
window.cfg=function(){
 var html=cfgBeforeGoals();
 var a=html.indexOf("<h2>Metas</h2>"),b=html.indexOf("<h2>Tempo do bloco de questões</h2>",a);
 if(a>=0&&b>a){
  var goals='<h2>Metas diárias</h2><div class="goal-settings-card">'+
   '<section><div class="goal-setting"><div class="goal-setting-copy"><b>Meta de tempo</b><p>Defina quantos minutos deseja estudar por dia.</p></div><div class="goal-setting-control"><small>'+(window.gOn()?"Ativada":"Desativada")+'</small>'+window.sw(window.gOn(),'S.goalOn=!gOn();save();render()')+'</div></div>'+(window.gOn()?'<div class="goal-value"><label for="cycle-goal-minutes">Minutos por dia</label><input id="cycle-goal-minutes" type="number" min="15" max="1440" step="5" inputmode="numeric" value="'+window.S.goal+'" onchange="setG(this.value)"></div>':'')+'</section>'+
   '<section><div class="goal-setting"><div class="goal-setting-copy"><b>Meta de questões</b><p>Escolha quantas questões pretende resolver diariamente.</p></div><div class="goal-setting-control"><small>'+(window.qOn()?"Ativada":"Desativada")+'</small>'+window.sw(window.qOn(),'S.qgoalOn=!qOn();save();render()')+'</div></div>'+(window.qOn()?'<div class="goal-value"><label for="cycle-goal-questions">Questões por dia</label><input id="cycle-goal-questions" type="number" min="1" max="1000" step="5" inputmode="numeric" value="'+(window.S.qgoal||30)+'" onchange="S.qgoal=Math.max(1,Math.min(1000,parseInt(this.value)||30));save();render()"></div>':'')+'</section></div>';
  html=html.slice(0,a)+goals+html.slice(b);
 }
 return html;
};
var appRoot=document.getElementById("app");if(appRoot){ankiObserver=new MutationObserver(function(){if(document.getElementById("anki-v2")){simplifyAnki();collapseAnkiTools()}});ankiObserver.observe(appRoot,{childList:true,subtree:true})}
window.render();
})();


/* Identidade visual do Ciclo e identificação do estudante na tela inicial. */
(function(){
"use strict";
var brandStyle=document.createElement("style");
brandStyle.textContent=`
#nav:before{content:"Seus estudos em ciclo"!important;display:block;font:800 18px Manrope,Inter,sans-serif!important;letter-spacing:-.025em!important;line-height:1.25;color:var(--ac);padding:8px 14px 2px!important;white-space:normal}
#nav:after{content:"por artucentrismo";display:block;order:0;font:500 12px Inter,system-ui,sans-serif;color:var(--mu);padding:0 14px 25px;letter-spacing:.01em}
#nav button{order:1}
.student-identity{display:flex;align-items:center;gap:11px;margin:0 0 18px;padding:12px 15px;background:var(--cd);border:1px solid var(--ln);border-radius:15px;width:max-content;max-width:100%;box-shadow:0 2px 8px rgba(10,20,40,.035)}
.student-identity-emoji{display:grid;place-items:center;width:40px;height:40px;flex:none;border-radius:12px;background:color-mix(in srgb,var(--ac) 10%,var(--cd));font-size:25px}
.student-identity-label{display:block;color:var(--mu);font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-bottom:2px}
.student-identity-name{display:block;color:var(--tx);font-size:16px;font-weight:750;line-height:1.3;overflow-wrap:anywhere}
@media(max-width:700px){.student-identity{margin-top:4px;margin-bottom:14px}}
`;
document.head.appendChild(brandStyle);
document.title="Seus estudos em ciclo";
var previousHome=window.home;
window.home=function(){
 var html=previousHome();
 var name=window.S&&window.S.profileName?window.esc(window.S.profileName):"Estudante";
 var identity='<div class="student-identity"><span class="student-identity-emoji" aria-hidden="true">🧑‍🎓</span><span><span class="student-identity-label">Estudante</span><span class="student-identity-name">'+name+'</span></span></div>';
 html=html.replace(/<h1>Olá, [\s\S]*?<\/h1>/, '<h1>Seu próximo passo</h1>');
 html=html.replace(/<h1>Seu espaço de estudos<\/h1>/,'<h1>Vamos começar</h1>');
 return identity+html;
};
if(typeof window.render==="function"){var renderWithBrand=window.render;window.render=function(){renderWithBrand();};window.render();}
})();