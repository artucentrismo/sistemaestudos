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
var originalSave=window.save, originalStart=window.start, originalStep=window.stp;
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
 if(!S.subs.length)return '<div class="up">SEU ESPAÇO DE ESTUDOS</div><h1>'+(S.profileName?'Olá, '+window.esc(S.profileName):'Vamos começar?')+'</h1><p class="mu">O Ciclo organiza seus estudos e indica o próximo passo. Você só precisa começar.</p><div class="card"><h2 style="margin-top:0">Prepare seu primeiro ciclo</h2><p class="mu sm">Adicione suas matérias e os assuntos que deseja estudar. Você poderá ajustar tudo depois.</p><button class="btn" onclick="go(\\'cfg\\')">Organizar meus estudos</button></div>';
 var rec=recommendation(),maturity=window.CicloLearning?window.CicloLearning.maturity(S):null;
 var html='<div class="up">'+dt+'</div><h1>'+(S.profileName?'Olá, '+window.esc(S.profileName)+' 👋':'Seu espaço de estudos')+'</h1>'+(S.profileGoal?'<div class="mu sm">'+window.esc(S.profileGoal)+'</div>':'');
 if(window.ss)html+='<section class="card resume-card"><div class="up">SESSÃO EM ANDAMENTO</div><h2 style="margin:8px 0">Continue de onde parou</h2><p class="mu sm">Seus registros ainda estão em rascunho e não foram adicionados ao histórico.</p><button class="btn" onclick="resumeStudy()">Retomar sessão</button></section>';
 html+='<section class="next-action-card"><div class="up" style="color:rgba(255,255,255,.72)">SUA PRÓXIMA AÇÃO</div>';
 if(rec){
  html+='<h2 style="font-size:25px;margin:10px 0 4px;color:#fff">'+window.esc(rec.subject.n)+'</h2><div style="font-size:17px;font-weight:650">'+window.esc((rec.block||[]).join(" · "))+'</div><p style="color:rgba(255,255,255,.82);line-height:1.5;margin:10px 0">'+window.esc(rec.reason)+'</p><div style="color:rgba(255,255,255,.75);font-size:13px">'+window.fm(rec.subject.min)+' estimados</div><button class="btn" style="background:#fff;color:#0F2744;width:100%;margin-top:16px" onclick="startRecommended('+rec.si+')">Começar agora</button>';
 }else html+='<h2 style="color:#fff">Seu ciclo está pronto para continuar</h2><p style="color:rgba(255,255,255,.8)">Adicione blocos para receber uma recomendação de estudo.</p><button class="btn" style="background:#fff;color:#0F2744" onclick="go(\\'ciclo\\')">Ver meu ciclo</button>';
 html+='</section><div class="quick-stats"><div class="tile"><span class="up">TEMPO HOJE</span><b>'+window.fm(minutes)+'</b>'+(window.gOn()?'<span class="mu sm">Meta: '+window.fm(S.goal)+'</span>':'')+'</div><div class="tile"><span class="up">QUESTÕES HOJE</span><b>'+questions+'</b><span class="mu sm">registradas</span></div><div class="tile"><span class="up">SEQUÊNCIA</span><b>'+window.streak()+' dias</b><span class="mu sm">de estudo</span></div></div>';
 if(window.gOn())html+='<section class="card"><div style="display:flex;justify-content:space-between;gap:10px"><b>Meta diária</b><span class="mu sm">'+Math.min(100,Math.round(minutes/Math.max(1,S.goal)*100))+'%</span></div><div class="bar"><i style="width:'+Math.min(100,minutes/Math.max(1,S.goal)*100)+'%"></i></div></section>';
 var due=0;try{var data=JSON.parse(localStorage.getItem("ciclo-anki-local-v1")||"null");if(data&&Array.isArray(data.cards))due=data.cards.filter(function(c){return c.due&&c.due<=today}).length}catch(e){}
 html+='<section class="card"><div class="up">OUTRAS OPÇÕES</div><div class="home-actions"><button onclick="go(\\'ciclo\\')"><b>↻ Ciclo</b><span>Ver matérias e cadernos</span></button><button onclick="go(\\'cards\\')"><b>▤ Anki</b><span>'+(due?due+' cartões para revisar':'Abrir seus flashcards')+'</span></button><button onclick="go(\\'red\\')"><b>✎ Redação</b><span>Registrar uma produção</span></button></div></section>';
 if(maturity&&maturity.score!==null)html+='<section class="card"><div class="up">SUA EVOLUÇÃO</div><div style="font-size:23px;font-weight:800;margin:6px 0">'+window.esc(maturity.level)+'</div><div class="mu sm">Sua maturidade de estudos está em evolução. Consulte os relatórios para entender os detalhes.</div><button class="lk" onclick="go(\\'prog\\')">Ver relatórios →</button></section>';
 html+='<div class="home-footer"><span class="mu sm">Nível '+window.lvl(window.xpT())+' · '+window.xpT()+' XP</span><span class="mu sm">🛡️ '+((S.game||{}).shields||0)+' escudos</span><button class="lk" onclick="go(\\'prog\\')">Conquistas e evolução</button></div>';
 return html;
};
window.startRecommended=function(si){if(Number.isInteger(si))window.S.cur=si;window.start()};
window.resumeStudy=function(){if(!window.ss)return;window.tab="sess";if(window.ss.timer)window.ss.timer.running=false;window.render()};
window.prog=function(){return '<h1>Relatórios</h1><p class="mu sm">Uma visão organizada da sua evolução, frequência e aprendizagem.</p>'+originalProg()};
window.save=function(){originalSave();persistDraft()};
window.start=function(){originalStart();persistDraft()};
window.stp=function(f,i,v){originalStep(f,i,v);persistDraft()};
window.setK=function(i){originalSetK(i);persistDraft()};
window.go=function(t){if(t!=="sess"&&window.ss){if(window.timerPause)window.timerPause();persistDraft()}originalGo(t)};
window.adv=function(skip){originalAdv(skip);if(!window.ss)clearDraft()};
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
