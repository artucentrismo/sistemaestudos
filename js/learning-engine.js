/* Ciclo — Motor de aprendizagem por cadernos
 * Modelo de compatibilidade: cada bloco de uma disciplina existente representa
 * um caderno de assuntos. Os registros antigos permanecem intactos.
 */
(function(global){
  "use strict";
  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function dayDiff(a,b){
    if(!a||!b)return 0;
    var x=new Date(a+"T12:00:00"),y=new Date(b+"T12:00:00");
    return Math.max(0,Math.floor((y-x)/86400000));
  }
  function labelOf(block){return (block||[]).join(" · ");}
  function notebookId(subject,block){
    return encodeURIComponent(String(subject.n)+"::"+labelOf(block));
  }
  function logsFor(state,subject,block){
    var label=labelOf(block),topics=block||[];
    return (state.log||[]).filter(function(log){
      if(log.n!==subject.n)return false;
      if(log.source!=="block"&&log.source!=="questions")return false;
      if(log.b===label)return true;
      return log.source==="questions"&&topics.indexOf(log.b)>=0;
    });
  }
  function passesFrom(logs){
    var groups={};
    logs.filter(function(l){return l.source==="block";}).forEach(function(l){
      var key=l.lap!==undefined&&l.lap!==null?"lap:"+l.lap:"date:"+l.d;
      groups[key]=groups[key]||{date:l.d,correct:0,total:0,lap:l.lap};
      groups[key].correct+=Number(l.ac)||0;
      groups[key].total+=(Number(l.ac)||0)+(Number(l.er)||0);
      if(l.d&&(!groups[key].date||l.d>groups[key].date))groups[key].date=l.d;
    });
    return Object.keys(groups).map(function(k){return groups[k];})
      .filter(function(p){return p.total>0;})
      .sort(function(a,b){return String(a.date).localeCompare(String(b.date))||
        (Number(a.lap)||0)-(Number(b.lap)||0);})
      .map(function(p){return p.total?p.correct/p.total*100:0;});
  }
  function metrics(state,subject,block){
    var logs=logsFor(state,subject,block),correct=0,total=0,lastDate=null;
    logs.forEach(function(l){
      var a=Number(l.ac)||0,e=Number(l.er)||0;
      correct+=a;total+=a+e;
      if(l.d&&(!lastDate||l.d>lastDate))lastDate=l.d;
    });
    var accuracy=total?correct/total*100:0;
    var passes=passesFrom(logs),recent=passes.slice(-4),consistency=0,improvement=0;
    if(recent.length>=2){
      var mean=recent.reduce(function(a,b){return a+b;},0)/recent.length;
      var variance=recent.reduce(function(a,b){return a+Math.pow(b-mean,2);},0)/recent.length;
      var deviation=Math.sqrt(variance);
      consistency=clamp(100-deviation*4,0,100);
    }
    if(passes.length>=2)improvement=clamp(passes[passes.length-1]-passes[0],0,100);
    var mastery=clamp(accuracy*.60+consistency*.20+improvement*.20,0,100);
    var count=passes.length;
    var stuck=count>=4&&mastery<50&&improvement<10;
    var severity=stuck?(count>=8&&mastery<40?"grave":count>=6?"medium":"light"):"none";
    var difficulty=100-mastery;
    var priority=(difficulty*.5)+((100-mastery)*.5);
    var days=lastDate?dayDiff(lastDate,new Date().toISOString().slice(0,10)):0;
    var recencyFactor=days/10;
    var weight=difficulty*recencyFactor;
    var status=mastery>=80?"DOMINADO":mastery>=60?"CONSOLIDANDO":mastery>=40?"EM APRENDIZADO":"CRÍTICO";
    return {
      notebookId:notebookId(subject,block),masteryScore:mastery,difficultyIndex:difficulty,
      priorityScore:priority,consistencyScore:consistency,improvementScore:improvement,
      accuracyScore:accuracy,totalQuestions:total,totalCorrect:correct,totalWrong:total-correct,
      currentPass:count,lastStudyDate:lastDate,status:status,stuck:stuck,
      lockSeverity:severity,theoryRecommended:count>=6&&mastery<50,
      theoryRequired:count>=8&&mastery<40,returnWeight:weight,passResults:passes
    };
  }
  function all(state){
    var out=[];
    (state.subs||[]).forEach(function(subject,si){
      (subject.t||[]).forEach(function(block,bi){
        out.push({subjectIndex:si,blockIndex:bi,subject:subject,block:block,
          metrics:metrics(state,subject,block)});
      });
    });
    return out;
  }
  function sync(state){
    state.learning=state.learning||{version:1,notebooks:{}};
    state.learning.version=1;
    state.learning.notebooks=state.learning.notebooks||{};
    all(state).forEach(function(item){
      var m=item.metrics;
      state.learning.notebooks[m.notebookId]={
        notebookId:m.notebookId,masteryScore:m.masteryScore,
        difficultyIndex:m.difficultyIndex,priorityScore:m.priorityScore,
        consistencyScore:m.consistencyScore,improvementScore:m.improvementScore,
        accuracyScore:m.accuracyScore,totalQuestions:m.totalQuestions,
        totalCorrect:m.totalCorrect,totalWrong:m.totalWrong,currentPass:m.currentPass,
        lastStudyDate:m.lastStudyDate,status:m.status,stuck:m.stuck,
        lockSeverity:m.lockSeverity,theoryRecommended:m.theoryRecommended,
        theoryRequired:m.theoryRequired,returnWeight:m.returnWeight
      };
    });
    return state.learning;
  }
  function selectBlocks(state,subject,count){
    var si=(state.subs||[]).indexOf(subject),items=all(state).filter(function(x){return x.subjectIndex===si;});
    if(!items.length)return [];
    items.sort(function(a,b){
      return b.metrics.priorityScore-a.metrics.priorityScore||a.blockIndex-b.blockIndex;
    });
    var pending=items.filter(function(x){return x.metrics.masteryScore<80;});
    var chosen=(pending.length?pending:items).slice(0,Math.max(1,count||1));
    return chosen.map(function(x){return x.blockIndex;});
  }
  function nextSubjectIndex(state,current){
    var subjects=state.subs||[];
    if(subjects.length<2)return subjects.length?0:0;
    var candidates=all(state).filter(function(x){return x.subjectIndex!==current;});
    if(!candidates.length)return (current+1)%subjects.length;
    candidates.sort(function(a,b){
      return b.metrics.priorityScore-a.metrics.priorityScore||a.subjectIndex-b.subjectIndex||a.blockIndex-b.blockIndex;
    });
    return candidates[0].subjectIndex;
  }
  function summary(state){
    var items=all(state),valid=items.filter(function(x){return x.metrics.totalQuestions>0;});
    var avg=valid.length?valid.reduce(function(a,x){return a+x.metrics.masteryScore;},0)/valid.length:0;
    var stuck=valid.filter(function(x){return x.metrics.stuck;});
    var strong=valid.slice().sort(function(a,b){return b.metrics.masteryScore-a.metrics.masteryScore;})[0];
    var weak=valid.slice().sort(function(a,b){return a.metrics.masteryScore-b.metrics.masteryScore;})[0];
    return {items:items,valid:valid,averageMastery:avg,stuck:stuck,strong:strong,weak:weak,
      dominated:valid.filter(function(x){return x.metrics.masteryScore>=80;}).length,
      evolving:valid.filter(function(x){return x.metrics.improvementScore>0&&x.metrics.masteryScore<80;}).length};
  }
  global.CicloLearning={metrics:metrics,all:all,sync:sync,selectBlocks:selectBlocks,
    nextSubjectIndex:nextSubjectIndex,summary:summary,notebookId:notebookId};
})(window);
