/* Ciclo — Motor oficial de aprendizagem por cadernos.
 * Compatível com o histórico antigo: cada bloco continua sendo um caderno.
 */
(function(global){
"use strict";
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function dayDiff(a,b){if(!a||!b)return 0;return Math.max(0,Math.floor((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/86400000));}
function labelOf(b){return (b||[]).join(" · ");}
function notebookId(s,b){return encodeURIComponent(String(s.n)+"::"+labelOf(b));}
function logsFor(state,s,b){var label=labelOf(b),topics=b||[];return(state.log||[]).filter(function(l){return l.n===s.n&&(l.source==="block"||l.source==="questions")&&(l.b===label||(l.source==="questions"&&topics.indexOf(l.b)>=0));});}
function passRecords(logs){
 var groups={};
 logs.filter(function(l){return l.source==="block";}).forEach(function(l){
  var k=l.lap!==undefined&&l.lap!==null?"lap:"+l.lap:"date:"+l.d;
  groups[k]=groups[k]||{date:l.d,correct:0,total:0,minutes:0,lap:l.lap};
  groups[k].correct+=Number(l.ac)||0;groups[k].total+=(Number(l.ac)||0)+(Number(l.er)||0);
  groups[k].minutes+=Math.max(0,Number(l.m)||0);
  if(l.d&&(!groups[k].date||l.d>groups[k].date))groups[k].date=l.d;
 });
 return Object.keys(groups).map(function(k){return groups[k];}).filter(function(p){return p.total>0;})
 .sort(function(a,b){return String(a.date).localeCompare(String(b.date))||(Number(a.lap)||0)-(Number(b.lap)||0);})
 .map(function(p){p.accuracy=p.correct/p.total*100;return p;});
}
function retentionFrom(records){
 var result=null;
 for(var i=1;i<records.length;i++){
  var a=records[i-1],b=records[i],days=dayDiff(a.date,b.date);
  var cycles=a.lap!==undefined&&b.lap!==undefined?Math.max(0,Number(b.lap)-Number(a.lap)):0;
  if((days>=7||cycles>=1)&&a.accuracy>0)result={score:clamp(b.accuracy/a.accuracy*100,0,100),previous:a.accuracy,returned:b.accuracy,days:days,cycles:cycles,date:b.date};
 }
 return result;
}
function metrics(state,s,b){
 var logs=logsFor(state,s,b),correct=0,total=0,lastDate=null;
 logs.forEach(function(l){var a=Number(l.ac)||0,e=Number(l.er)||0;correct+=a;total+=a+e;if(l.d&&(!lastDate||l.d>lastDate))lastDate=l.d;});
 var accuracy=total?correct/total*100:0,records=passRecords(logs),recent=records.slice(-4),consistency=0,improvement=0;
 if(recent.length>=2){
  var mean=recent.reduce(function(n,p){return n+p.accuracy;},0)/recent.length;
  var variance=recent.reduce(function(n,p){return n+Math.pow(p.accuracy-mean,2);},0)/recent.length;
  consistency=clamp(100-Math.sqrt(variance)*4,0,100);
  improvement=clamp(recent[recent.length-1].accuracy-recent[0].accuracy,0,100);
 }
 var mastery=clamp(accuracy*.60+consistency*.20+improvement*.20,0,100),count=records.length;
 var stuck=count>=4&&mastery<50&&improvement<10;
 var severity=stuck?(count>=8&&mastery<40?"grave":count>=6?"medium":"light"):"none";
 var retention=retentionFrom(records),first=recent.length?recent[0].accuracy:null,last=recent.length?recent[recent.length-1].accuracy:null;
 var initialError=first===null?null:100-first,finalError=last===null?null:100-last;
 var errorReduction=initialError===null||initialError===0?null:clamp((initialError-finalError)/initialError*100,0,100);
 var progression=recent.length>=2?improvement:null;
 var learningScore=progression!==null&&errorReduction!==null&&retention?progression*.5+errorReduction*.3+retention.score*.2:null;
 var easy=logs.filter(function(l){return l.difficulty==="easy";}),hard=logs.filter(function(l){return l.difficulty==="hard";});
 function sample(arr){return{n:arr.reduce(function(n,l){return n+(Number(l.ac)||0)+(Number(l.er)||0);},0),ok:arr.reduce(function(n,l){return n+(Number(l.ac)||0);},0)};}
 var es=sample(easy),hs=sample(hard),fragility=es.n>=20&&hs.n>=20?es.ok/es.n*100-hs.ok/hs.n*100:null;
 var prev=records.slice(-8,-4),curr=records.slice(-4);
 var prevTime=prev.length===4?prev.reduce(function(n,p){return n+p.minutes;},0)/4:null;
 var currTime=curr.length===4?curr.reduce(function(n,p){return n+p.minutes;},0)/4:null;
 var stagnation=count>=8&&prev.length===4&&curr.length===4&&improvement<5&&currTime>prevTime;
 var id=notebookId(s,b),episode=state.learning&&state.learning.episodes?state.learning.episodes[id]:null;
 var attempts=episode?episode.returns+episode.abandons:0,resilience=attempts?episode.returns/attempts*100:null;
 var velocityMinutes=logs.reduce(function(n,l){return n+Math.max(0,Number(l.m)||0);},0);
 var velocity=velocityMinutes>0?total/velocityMinutes:null;
 var velocityScore=velocity===null?null:clamp((velocity-.5)/2.5*100,0,100);
 var status=mastery>=80?"DOMINADO":mastery>=60?"CONSOLIDANDO":mastery>=40?"EM APRENDIZADO":"CRÍTICO";
 return{notebookId:id,masteryScore:mastery,difficultyIndex:100-mastery,priorityScore:100-mastery,
 consistencyScore:consistency,improvementScore:improvement,accuracyScore:accuracy,totalQuestions:total,
 totalCorrect:correct,totalWrong:total-correct,currentPass:count,lastStudyDate:lastDate,status:status,
 stuck:stuck,lockSeverity:severity,theoryRecommended:count>=6&&mastery<50,theoryRequired:count>=8&&mastery<40,
 passResults:records.map(function(p){return p.accuracy;}),passRecords:records,retentionScore:retention?retention.score:null,
 retention:retention,progressionScore:progression,errorReductionScore:errorReduction,learningScore:learningScore,
 fragilityScore:fragility,easyQuestions:es.n,hardQuestions:hs.n,
 fragilityStatus:fragility===null?"AMOSTRA INSUFICIENTE":fragility<=15?"CONHECIMENTO SÓLIDO":fragility<=30?"LEVE FRAGILIDADE":fragility<=50?"FRAGILIDADE MODERADA":"FRAGILIDADE ALTA",
 stagnation:stagnation,previousAverageMinutes:prevTime,currentAverageMinutes:currTime,
 resilienceScore:resilience,resilienceReturns:episode?episode.returns:0,resilienceAbandons:episode?episode.abandons:0,
 velocity:velocity,velocityScore:velocityScore,smsScore:null};
}

function maturity(state){
 var active=all(state).filter(function(x){return x.metrics.totalQuestions>0;});
 if(!active.length)return{score:null,level:"Aguardando dados",components:{dm:null,cs:null,vs:null,rs:null},bottleneck:null,activeNotebooks:0};
 var dm=active.reduce(function(n,x){return n+x.metrics.masteryScore;},0)/active.length;
 var csValues=active.map(function(x){return x.metrics.passRecords.length>=2?x.metrics.consistencyScore:null;});
 var cs=csValues.every(function(v){return v!==null;})?csValues.reduce(function(n,v){return n+v;},0)/csValues.length:null;
 var minutes=active.reduce(function(n,x){return n+x.metrics.passRecords.reduce(function(a,p){return a+p.minutes;},0);},0);
 var questions=active.reduce(function(n,x){return n+x.metrics.totalQuestions;},0);
 var lv=minutes>0?questions/minutes:null,vs=lv===null?null:clamp((lv-.5)/2.5*100,0,100);
 var returns=active.reduce(function(n,x){return n+x.metrics.resilienceReturns;},0),abandons=active.reduce(function(n,x){return n+x.metrics.resilienceAbandons;},0);
 var rs=returns+abandons>0?returns/(returns+abandons)*100:null;
 var parts={dm:dm,cs:cs,vs:vs,rs:rs};
 if(cs===null||vs===null||rs===null)return{score:null,level:"Em formação",components:parts,bottleneck:null,activeNotebooks:active.length,missing:["dm","cs","vs","rs"].filter(function(k){return parts[k]===null;})};
 var score=dm*.4+cs*.3+vs*.15+rs*.15;
 var names={dm:"Domínio médio",cs:"Consistência",vs:"Velocidade",rs:"Resiliência"},lowest=Object.keys(parts).sort(function(a,b){return parts[a]-parts[b];})[0];
 return{score:score,level:score<=30?"Sobrevivência":score<=50?"Aprendiz":score<=70?"Competitivo":score<=85?"Alto Nível":"Elite",components:parts,bottleneck:names[lowest],activeNotebooks:active.length,missing:[]};
}
function all(state){var out=[];(state.subs||[]).forEach(function(s,si){(s.t||[]).forEach(function(b,bi){out.push({subjectIndex:si,blockIndex:bi,subject:s,block:b,metrics:metrics(state,s,b)});});});return out;}
function ensure(state){state.learning=state.learning||{};state.learning.version=2;state.learning.notebooks=state.learning.notebooks||{};state.learning.episodes=state.learning.episodes||{};state.unlockMode=state.unlockMode==="advanced"?"advanced":"standard";return state.learning;}
function sync(state){
 var learning=ensure(state);
 all(state).forEach(function(x){var m=x.metrics,id=m.notebookId,e=learning.episodes[id];
  if((m.masteryScore<50||m.accuracyScore<50)&&(!e||!e.open)){e={open:true,offered:false,returns:e?e.returns:0,abandons:e?e.abandons:0,startedAt:new Date().toISOString()};learning.episodes[id]=e;}
  learning.notebooks[id]=m;
 });
 if(state.unlockManual!==true){var maturityScore=maturity(state).score;state.unlockMode=maturityScore!==null&&maturityScore>=70?"advanced":"standard";}
 return learning;
}
function maxActive(state){return state.unlockMode==="advanced"?2:1;}
function unlockedItems(state,s){
 var si=(state.subs||[]).indexOf(s),items=all(state).filter(function(x){return x.subjectIndex===si;}).sort(function(a,b){return a.blockIndex-b.blockIndex;});
 var active=0,limit=maxActive(state),out=[];
 for(var i=0;i<items.length;i++){var x=items[i];if(x.metrics.masteryScore>=80){out.push(x);continue;}if(active<limit){out.push(x);active++;continue;}break;}
 return out;
}
function selectBlocks(state,s,count){
 var eligible=unlockedItems(state,s);if(!eligible.length)return [];
 eligible.sort(function(a,b){return b.metrics.priorityScore-a.metrics.priorityScore||a.blockIndex-b.blockIndex;});
 return eligible.slice(0,Math.max(1,Math.min(count||1,maxActive(state)))).map(function(x){return x.blockIndex;});
}
function markOffered(state,s,indices){var l=ensure(state);(indices||[]).forEach(function(bi){var e=l.episodes[notebookId(s,s.t[bi])];if(e&&e.open)e.offered=true;});return indices||[];}
function recordStudy(state,s,indices){var l=ensure(state);(indices||[]).forEach(function(bi){var e=l.episodes[notebookId(s,s.t[bi])];if(e&&e.open&&e.offered){e.returns++;e.open=false;e.offered=false;e.lastReturnAt=new Date().toISOString();}});}
function recordAbandon(state,s,indices){var l=ensure(state);(indices||[]).forEach(function(bi){var e=l.episodes[notebookId(s,s.t[bi])];if(e&&e.open&&e.offered){e.abandons++;e.offered=false;e.lastAbandonAt=new Date().toISOString();}});}
function nextSubjectIndex(state,current){
 var subjects=state.subs||[];if(subjects.length<2)return subjects.length?0:0;var candidates=[];
 subjects.forEach(function(s,si){if(si===current)return;selectBlocks(state,s,maxActive(state)).forEach(function(bi){candidates.push({subjectIndex:si,blockIndex:bi,metrics:metrics(state,s,s.t[bi])});});});
 if(!candidates.length)return(current+1)%subjects.length;
 candidates.sort(function(a,b){return b.metrics.priorityScore-a.metrics.priorityScore||a.subjectIndex-b.subjectIndex||a.blockIndex-b.blockIndex;});
 return candidates[0].subjectIndex;
}
function summary(state){
 var items=all(state),valid=items.filter(function(x){return x.metrics.totalQuestions>0;}),avg=valid.length?valid.reduce(function(n,x){return n+x.metrics.masteryScore;},0)/valid.length:0;
 var stuck=valid.filter(function(x){return x.metrics.stuck;}),strong=valid.slice().sort(function(a,b){return b.metrics.masteryScore-a.metrics.masteryScore;})[0],weak=valid.slice().sort(function(a,b){return a.metrics.masteryScore-b.metrics.masteryScore;})[0];
 return{items:items,valid:valid,averageMastery:avg,stuck:stuck,strong:strong,weak:weak,dominated:valid.filter(function(x){return x.metrics.masteryScore>=80;}).length,evolving:valid.filter(function(x){return x.metrics.improvementScore>0&&x.metrics.masteryScore<80;}).length,stagnating:valid.filter(function(x){return x.metrics.stagnation;}),resilience:valid.filter(function(x){return x.metrics.resilienceScore!==null;})};
}
global.CicloLearning={metrics:metrics,all:all,sync:sync,maturity:maturity,selectBlocks:selectBlocks,nextSubjectIndex:nextSubjectIndex,summary:summary,notebookId:notebookId,markOffered:markOffered,recordStudy:recordStudy,recordAbandon:recordAbandon,maxActive:maxActive,unlockedItems:unlockedItems};
})(window);