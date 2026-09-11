import {
  loadPublishedRelease, releaseReady, ensureOfferings, batchOfferings, scopedOfferings,
  runPaperMatch, comparabilityRecord, referenceYearFor, scorePosition, axisMarks,
  catalog, offerings, SELECTABLE_BATCHES, DEFAULT_BATCHES,
} from "./data.js";

/* 启动标记：boot-report.js 用它判断主模块是否跑完；没跑完就显示错误提示，
   而不是留下一个填满静态文案、数字却全是空的页面。 */
window.__paperBooted = "start";
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var esc=function(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
var reduce=!!(window.matchMedia&&matchMedia("(prefers-reduced-motion:reduce)").matches);
var ICON=function(n,cls){return '<svg class="icon '+(cls||"small")+'" aria-hidden="true"><use href="#i-'+n+'"/></svg>'};
var ARROW=ICON("arrow");

/* 两套前端共用同一份发布包与同一套规则（见 ./data.js）。
   原先内嵌在本文件里的 1.81 MB 数据切片与本地规则实现已经移除。 */
var BATCHES=SELECTABLE_BATCHES.slice();
var DISTS=[], COMP=[];
function syncReleaseGlobals(loaded){
  release = loaded;
  DISTS = loaded ? loaded.distributions : [];
  COMP = loaded ? loaded.comparability : [];
  if(DISTS.length){
    AVAILABLE_YEARS = DISTS.map(function(t){return t.year}).filter(function(y,i,a){return a.indexOf(y)===i});
  }
}
/* 本地保存已载入的发布包。data.js 导出的 release 是模块级只读绑定，
   这里用自己的变量，赋值不跨模块。 */
var release = null;
/* 用于挑参考年的年份集合。取发布包里实际存在的分段表年份，不写死。 */
var AVAILABLE_YEARS = [2023, 2024, 2025, 2026];
/* 科类集合。3+1+2 的两类，与发布包里的 track 字段取值一致。 */
var TRACKS = ["PHYSICS", "HISTORY"];

var refYearFor=function(track,years){ return track?referenceYearFor(track,years):null; };
/* 按当前已选科类取参考年；未选科时为 null，页面据此显示未知而不是猜一年。 */
var currentRefYear=function(){ return state.primary?refYearFor(state.primary,AVAILABLE_YEARS):null; };
var comparabilityFor=function(track,year){ return comparabilityRecord(track,year); };

/* ============================================================
   界面状态
   ============================================================ */
var YEARS=[2026,2027,2028];
var ADDS=["CHEMISTRY","BIOLOGY","POLITICS","GEOGRAPHY"];
var L={
  PHYSICS:"物理",HISTORY:"历史",CHEMISTRY:"化学",BIOLOGY:"生物",POLITICS:"政治",GEOGRAPHY:"地理",
  PASS:"符合已检查条件",UNKNOWN:"待核对",FAIL:"不符合",
  CONFIRMED:"已确认",DENIED:"已否认",PENDING:"待探索",
  AHEAD_OF_REFERENCE:"位置较有余量",BEHIND_REFERENCE:"需要更好位置",OVERLAPS_REFERENCE:"边界重叠",
  NOT_COMPARABLE:"暂无比较依据",
  INCOMPLETE_SUBJECTS:"选科未填完",SUBJECT_REQUIREMENT_FAILED:"选科不符合",UNKNOWN_REQUIREMENT:"有要求待核对",
  UNSUPPORTED_SCOPE:"不在本页支持范围",SCHOOL_SCORE_UNCALIBRATED:"校考/模考不换算省位次",
  TOTAL_NOT_SOURCE:"总分非来源值",UNKNOWN_SCORE_BASIS:"分数口径不一致",BONUS_BASIS_MISMATCH:"加分口径不一致",
  RANK_CONFLICT:"位次冲突",NO_OBSERVED_SCORE:"该分数官方未列出",OUT_OF_DISTRIBUTION_COVERAGE:"低于官方公布范围",
  MAJOR_HISTORY_MISSING:"缺少该专业历史",GROUP_HISTORY_MISSING:"缺少该专业组历史",
  GROUP_CHANGED:"专业组已重组",SOURCE_CONFLICT:"来源存在冲突",TARGET_YEAR_PLAN_MISSING:"目标年度计划尚未发布",
  DATASET_WITHDRAWN:"数据版本已撤回",TUITION_UNKNOWN:"学费未知",HARD_PREFERENCE_EXCLUDED:"不满足硬性偏好",
  NO_ACADEMIC_INPUT:"没有可用的分数位置"
};
var lab=function(v){return L[String(v)]||String(v)};
var reasonSeen={};
function reasonText(code){
  if(reasonSeen[code]!==undefined) return reasonSeen[code];
  return lab(code);
}

var QUESTIONS=[
  {id:"q-interest",dim:"兴趣",text:"最近一次你自愿多花时间完成的任务是什么？具体做了什么？",exp:"依据具体行为追问，不由爱好直接推导专业。"},
  {id:"q-attempt",dim:"动手",text:"讲一次实际动手尝试：怎样做、遇到什么困难、怎样处理？",exp:"任务经历与投入意愿分别记录，不评定能力上限。"},
  {id:"q-repeat",dim:"偏好",text:"整理数据、制作模型、阅读并解释规则，你更愿意重复哪一种？也可以都不选。",exp:"允许跳过，没有答案不生成结论。"},
  {id:"q-invest",dim:"投入",text:"为进一步了解一个方向，你愿意投入哪些学习任务？",exp:"由你陈述愿意投入的学习成本。"},
  {id:"q-constraint",dim:"条件",text:"地点、费用、时间等有哪些现实条件？哪些确定、哪些还可商量？",exp:"不把现实偏好冒充官方资格。"},
  {id:"q-correct",dim:"核对",text:"哪些方向描述符合你的想法？哪些需要改写、否认或继续了解？",exp:"确认与否认都由你操作，建议不能自动确认。"},
  {id:"q-next",dim:"下一步",text:"接下来两周愿意先试哪一件小任务？完成后想检查什么？",exp:"行动可修改，并明确复盘触发点。"}
];
var EXPERIENCE=[
  {cardId:"experience-data",directionId:"data-and-information",title:"数据整理与信息核对",art:"compass",
   tasks:["整理一份不含个人信息的公开小表格，标出空值和异常。","写半页笔记，分清已知和仍需查证的字段。"],
   ask:["哪一步愿意重复？","遇到矛盾数据时怎样处理？"]},
  {cardId:"experience-model",directionId:"design-and-making",title:"结构制作与修改",art:"lighthouse",
   tasks:["用纸搭一座小桥，画出方案并记录测试方法。","只改变一个结构细节，再比较现象。"],
   ask:["更愿意设计、制作还是记录？","失败后是否想继续修改？"]},
  {cardId:"experience-rules",directionId:"rules-and-social-questions",title:"规则阅读与流程记录",art:"harbor",
   tasks:["阅读一份公开的活动规则，用自己的话写出流程。","找出一个需要更多信息的问题，说明还缺什么。"],
   ask:["哪些地方最想追问？","如何向他人解释规则？"]}
];
var MAJOR_CARDS=[
  {cardId:"major-cs",link:"experience-data",majorName:"计算机科学与技术",inst:"北京科技大学",
   sourceUrl:"https://zhaosheng.ustb.edu.cn/xkzy/zyjs/jsjl_zyjs/fe2d63e31c4b4c058d59f5359c0b1b5f.htm",
   locator:"专业简介；主要课程（2026-06-18发布）",checkedOn:"2026-09-10",
   facts:["该校介绍将计算机系统与应用技术作为学习和工程实践的内容，并强调交流合作与解决工程问题。"],
   courses:["数据结构","操作系统","软件工程"],
   next:"除了整理数据，你是否愿意进一步了解程序怎样组织、运行和维护？"},
  {cardId:"major-mechanical",link:"experience-model",majorName:"机械工程",inst:"北京科技大学",
   sourceUrl:"https://me.ustb.edu.cn/jyjx/bks/f08f2ef382b546d7b31e560452fb5c08.htm",
   locator:"专业简介；主要课程（2025-12-01发布）",checkedOn:"2026-09-10",
   facts:["该校介绍覆盖机械系统的设计、制造、检测与控制，并强调自然科学基础和学习实践。"],
   courses:["机械制图","机械设计","控制工程基础"],
   next:"做完结构体验后，你是否想进一步了解材料、受力或控制方法？"},
  {cardId:"major-trade",link:"experience-rules",majorName:"国际经济与贸易",inst:"南开大学",
   sourceUrl:"https://nkiet.nankai.edu.cn/11797/list.htm",
   locator:"专业简介中的国际经济与贸易专业段落（网页未标明发布日期）",checkedOn:"2026-09-10",
   facts:["该系介绍强调经济贸易理论、专业技能、英语运用和相关政策理解。"],
   courses:["国际经济学","世界经济概论","国际贸易实务"],
   next:"读完规则体验后，你是否愿意继续了解跨地区交换、经济关系与语言沟通？"}
];
var CARD_SCOPE="以下是该校专业介绍中的学习内容示例，不能代表所有学校，也不构成院校推荐或报考资格判断。体验任务由本项目自拟。";

var state={
  page:"sail", targetYear:2027, primary:null, additional:[], score:600,
  batches:BATCHES.slice(0,1), answers:{}, profile:{},
  runYear:null, candidates:null, warnings:[], excluded:[], stale:false, generated:false
};

/* ---------- art ---------- */
var artSeq=0;
function svgFor(name,slot){
  var tpl=$("#art-"+name);if(!tpl||!slot||slot.dataset.done)return;
  var frag=tpl.content.cloneNode(true),svg=frag.querySelector("svg");if(!svg)return;
  var uid="n"+(artSeq++)+"-";
  $$("*",frag).forEach(function(el){
    if(el.id)el.id=uid+el.id;
    Array.prototype.slice.call(el.attributes).forEach(function(a){
      var v=a.value;if(!v||v.indexOf("#")<0)return;
      if(a.name==="href"||a.name==="xlink:href"){if(v.charAt(0)==="#")el.setAttribute(a.name,"#"+uid+v.slice(1));}
      else if(v.indexOf("url(#")>=0)el.setAttribute(a.name,v.replace(/url\(#([^)"']+)\)/g,function(m,id){return "url(#"+uid+id+")"}));
    });
  });
  svg.setAttribute("preserveAspectRatio","xMidYMid slice");
  slot.textContent="";slot.appendChild(frag);slot.dataset.done="1";
}
function initArt(root){$$(".art-slot[data-art]",root||document).forEach(function(s){svgFor(s.dataset.art,s)})}

/* ---------- 导航 ---------- */
var CHAPTERS=[
  {id:"sail",num:"01",k:"起航",icon:"sail"},
  {id:"locate",num:"02",k:"定位",icon:"compass"},
  {id:"talk",num:"03",k:"谈心",icon:"chat"},
  {id:"direction",num:"04",k:"方向",icon:"layers"},
  {id:"axis",num:"05",k:"分数轴",icon:"axis"},
  {id:"chart",num:"06",k:"航线图",icon:"route"}
];
function stepEnabled(id){
  if(id==="sail"||id==="locate") return true;
  if(id==="talk"||id==="direction") return !!(state.primary&&state.additional.length===2);
  return !!(state.primary&&state.additional.length===2&&state.score!==null);
}
function renderNav(){
  $("#desktop-nav").innerHTML=CHAPTERS.map(function(c){
    return '<button data-go="'+c.id+'"'+(c.id===state.page?' aria-current="step"':'')+(stepEnabled(c.id)?'':' disabled')+'>'+c.k+'</button>';
  }).join("");
  $("#bottom-nav").innerHTML=CHAPTERS.map(function(c){
    return '<button data-go="'+c.id+'"'+(c.id===state.page?' aria-current="step"':'')+(stepEnabled(c.id)?'':' disabled')+'>'+ICON(c.icon)+'<span>'+c.k+'</span></button>';
  }).join("");
}
function goPage(id){
  if(!stepEnabled(id)){ toast(id==="chart"||id==="axis"?"先选好科目并填一个目标情景分":"先选好首选科目和两门再选科目"); return; }
  var firstVisit=(id==="axis"&&!state.candidates);
  state.page=id;
  $$(".view").forEach(function(v){v.hidden=v.id!=="page-"+id});
  renderNav();initArt($("#page-"+id));
  window.scrollTo({top:0,behavior:reduce?"auto":"smooth"});
  // 第一次进入分数轴时自动跑一次，省去一次点击；之后由按钮或改动触发。
  if(firstVisit) setTimeout(runMatch,60);
}

/* ---------- 起航 ---------- */
function renderSail(){
  $("#seg-year").innerHTML=YEARS.map(function(y){
    return '<button class="chip" data-year="'+y+'" aria-pressed="'+(state.targetYear===y)+'">'+y+' 年</button>';
  }).join("");
  $("#seg-primary").innerHTML=TRACKS.map(function(t){
    return '<button class="chip" data-primary="'+t+'" aria-pressed="'+(state.primary===t)+'">'+lab(t)+'类</button>';
  }).join("");
  $("#seg-additional").innerHTML=ADDS.map(function(s){
    var on=state.additional.indexOf(s)>=0;
    return '<button class="chip" data-additional="'+s+'" aria-pressed="'+on+'">'+lab(s)+'</button>';
  }).join("");
  var ok=!!(state.primary&&state.additional.length===2);
  $("#sail-status").className="note "+(ok?"ok":"");
  $("#sail-status").innerHTML=ok
    ? "已选："+lab(state.primary)+"类 + "+state.additional.map(lab).join("、")+"。可以继续去「定位」了。"
    : "先选好科目，再去定位你的分数位置。"+(state.additional.length===2&&!state.primary?" 首选科目还没选。":"");
  syncCtx();
}
function syncCtx(){
  var parts=[state.targetYear+" · 四川"];
  parts.push(state.primary?lab(state.primary)+"类 + "+state.additional.map(lab).join("、"):"未选科");
  $("#ctx-label").textContent=parts.join(" · ");
}

/* ---------- 定位 ---------- */
function renderLocate(){
  var effective=state.primary?refYearFor(state.primary,AVAILABLE_YEARS):null;
  $("#batch-steps").innerHTML=BATCHES.map(function(b){
    var on=state.batches.indexOf(b)>=0;
    var n=state.primary?batchOfferings(state.primary,b):null;
    return '<div class="step-cell'+(on?" on":"")+'" role="button" tabindex="0" data-batch="'+esc(b)+'">'+
      '<div class="sk">批次</div><h4>'+esc(b)+'</h4><p>'+(n===null?"选择科类后显示条数":n.toLocaleString("zh-CN")+" 条专业（已发布）")+'</p></div>';
  }).join("");
  var min=150,max=700;
  if(state.primary){
    var t=DISTS.filter(function(x){return x.track===state.primary&&x.year===effective})[0];
    if(t){min=t.publishedMinScore;max=t.publishedMaxScore}
  }
  ["#score-input","#score-input2"].forEach(function(sel){
    var el=$(sel);el.min=String(min);el.max=String(max);
    if(state.score<min) state.score=min;
    if(state.score>max) state.score=max;
    el.value=String(state.score);
  });
  ["#axis-min","#axis-min2"].forEach(function(s){$(s).textContent=String(min)});
  ["#axis-max","#axis-max2"].forEach(function(s){$(s).textContent=String(max)});
  var mid=state.primary&&effective?(effective+" 年参考 · "+lab(state.primary)+"类"):"参考年载入中";
  ["#axis-mid","#axis-mid2"].forEach(function(s){$(s).textContent=mid});
  updateScoreUI();
  renderLocateReadout();
}
function updateScoreUI(){
  var min=Number($("#score-input").min),max=Number($("#score-input").max);
  var pct=max>min?((state.score-min)/(max-min)*100):0;
  ["#axis-prog","#axis-prog2"].forEach(function(s){$(s).style.width=pct.toFixed(2)+"%"});
  ["#axis-now","#axis-now2"].forEach(function(s){$(s).style.left=pct.toFixed(2)+"%"});
  $("#score-num").textContent=state.score===null?"—":state.score;
  $("#axis-score2").textContent=state.score===null?"—":state.score;
  $("#axis-title-score").textContent=state.score===null?"—":state.score;
  ["#score-input","#score-input2"].forEach(function(s){ if(Number($(s).value)!==state.score) $(s).value=String(state.score); });
}
function renderLocateReadout(){
  var box=$("#locate-readout"),note=$("#locate-note");
  if(!state.primary){box.innerHTML='<p class="basis">先回到「起航」选择首选科目。</p>';note.textContent="";return}
  // 位次由共享包的 scorePosition 计算：它按参考年那张表取行，分数不在公布范围时返回 null。
  var position=scorePosition(release,state.primary,state.score);
  var ref=position?position.tableYear:null;
  var readout;
  if(position){
    var iv=[position.rank-position.count+1,position.rank];
    readout='<div class="res-bar"><div class="res-count">'+ref+' 年 '+lab(state.primary)+'类，'+state.score+
      ' 分对应的官方位置区间是 <b>'+iv[0].toLocaleString("zh-CN")+' – '+iv[1].toLocaleString("zh-CN")+'</b> 名</div>'+
      '<div class="legend"><span>'+ICON("info")+' 同分 '+position.count+' 人，累计 '+position.rank.toLocaleString("zh-CN")+' 人 · 前 '+position.percentile.toFixed(1)+'%</span></div></div>';
  }else{
    var table=DISTS.filter(function(t){return t.track===state.primary})[0];
    var lowest=table?table.publishedMinScore:"—";
    readout='<div class="res-bar"><div class="res-count">官方分段表里没有列出 '+state.score+' 分（公布最低 '+lowest+' 分）</div>'+
      '<div class="legend"><span>不插值、不外推</span></div></div>';
  }
  box.innerHTML=readout;
  var cr=ref===null?null:comparabilityRecord(state.primary,ref);
  note.className="note";
  note.innerHTML=cr
    ? "<b>为什么可以用 "+ref+" 年做参考：</b>"+esc(cr.basis)+"<br><b>没有核对的部分：</b>"+esc(cr.not_examined||"无记录")+
      "<br>核实人："+esc(cr.reviewer||"未记录")+"，"+esc(cr.review_date||"未记录")+"。"
    : "没有找到该参考年的可比性记录，历史位置关系不应被采用。";
}

/* ---------- 谈心 ---------- */
function renderTalk(){
  $("#talk-panel").innerHTML=QUESTIONS.map(function(q,i){
    var a=state.answers[q.id];
    return '<div class="qrow"><span class="qnum">'+String(i+1).padStart(2,"0")+'</span><div class="qbody">'+
      '<h4>'+esc(q.text)+'</h4><p class="qexp">'+esc(q.exp)+'</p>'+
      '<textarea data-q="'+q.id+'" placeholder="用自己的话写下来，几个词也可以……">'+esc(a?a.text:"")+'</textarea>'+
      '<div class="qfoot"><button class="button sm secondary" data-act="save-q" data-q="'+q.id+'">保存这一题</button>'+
      '<button class="text-button" data-act="skip-q" data-q="'+q.id+'">'+(a?"取消这一题":"跳过这题")+'</button>'+
      (a?'<span class="bubble pass">已保存</span>':'<span class="bubble plain">未填写</span>')+
      '</div></div></div>';
  }).join("");
  var saved=Object.keys(state.answers).length;
  $("#talk-status").className="note"+(saved?" ok":"");
  $("#talk-status").innerHTML=saved
    ? "已保存 "+saved+" 题。跳过的题目不会生成任何结论；确认方向时，需要先保存第 1 题里属于你自己的具体表达。"
    : "一题都没填也没关系——但这样就不会生成方向结论，这是有意的。";
  $("#to-direction").disabled=!("q-interest" in state.answers);
}

/* ---------- 方向 ---------- */
function renderDirection(){
  $("#direction-grid").innerHTML=EXPERIENCE.map(function(card){
    var st=state.profile[card.directionId]||"PENDING";
    var major=MAJOR_CARDS.filter(function(m){return m.link===card.cardId})[0];
    var bubble=st==="CONFIRMED"?'<span class="bubble pass">已确认</span>'
      :st==="DENIED"?'<span class="bubble fail">已否认</span>':'<span class="bubble plain">待探索</span>';
    return '<article class="dir-card"><div class="dir-art"><div class="art-slot" data-art="'+card.art+'" aria-hidden="true"></div></div>'+
      '<div class="dir-body"><div class="dk">自拟学习体验</div><h3 class="serif">'+esc(card.title)+'</h3>'+
      '<ul class="dir-tasks">'+card.tasks.map(function(t){return "<li>"+esc(t)+"</li>"}).join("")+'</ul>'+
      '<p>做完之后可以问自己：'+esc(card.ask.join(" "))+'</p>'+
      '<div class="dir-foot">'+bubble+'<span style="display:flex;gap:8px">'+
      (st!=="CONFIRMED"?'<button class="text-button" data-act="confirm" data-dir="'+card.directionId+'">确认这个方向'+ARROW+'</button>':'')+
      (st!=="DENIED"?'<button class="text-button" data-act="deny" data-dir="'+card.directionId+'">不适合我</button>':'')+
      '<button class="text-button" data-detail="'+card.cardId+'">看事实卡</button>'+
      '</span></div></div></article>';
  }).join("");
  initArt($("#direction-grid"));
  var confirmed=Object.keys(state.profile).filter(function(k){return state.profile[k]==="CONFIRMED"});
  var denied=Object.keys(state.profile).filter(function(k){return state.profile[k]==="DENIED"});
  var confirmedNames=confirmed.map(function(id){
    var c=EXPERIENCE.filter(function(x){return x.directionId===id})[0];
    return c?c.title:id;
  });
  var confirmedText=confirmed.length
    ? "已确认 "+confirmed.length+" 个方向（"+confirmedNames.join("、")+"）"
    : "还没有确认任何方向";
  $("#direction-summary").innerHTML='<div class="panel soft">'+
    '<h3 class="serif" style="font-size:17px">当前画像</h3>'+
    '<p style="font-size:11.5px;color:#6f7a6c;line-height:1.95;margin-top:9px">'+
    confirmedText+'；已否认 '+denied.length+' 个；其余保持待探索。</p>'+
    '<div class="note warn" style="margin-top:14px"><b>一个必须说清楚的地方：</b>本次发布包里的专业没有带方向标签（directionTags 为空），'+
    '所以「已确认的方向」<b>不会</b>改变候选的排序，也不会过滤候选。项目已决定不在这种情况下去伪装适配度。'+
    '方向仍然是你的探索记录，只是不参与机器排序。</div></div>';
}

/* ---------- 匹配 ----------
   规则不在这一层：资格、参考关系、排序全部交给 @nanhang/domain 的 buildMatchResult
   （经 ./data.js 的 runPaperMatch 调用），与 React 版共用同一份实现。这里只把结果
   整理成页面需要的形状：把组线与专业线分开，并保留无法比较的原因代码。 */
function runMatch(){
  if(!state.primary||state.additional.length!==2){ toast("先选好科目");return }
  if(state.batches.length===0){ toast("请至少选择一个批次");return }
  if(!releaseReady()){ toast("发布数据尚未载入完成，请稍候");return }
  var ref=refYearFor(state.primary,AVAILABLE_YEARS);
  if(ref===null){ toast("没有可用的参考年");return }

  var request={
    track:state.primary, score:state.score, targetYear:state.targetYear,
    additional:state.additional.slice(), hardBudget:null,
    confirmedDirections:[], batches:state.batches.slice(),
  };
  runPaperMatch(request).then(function(out){
    if(!out){
      state.candidates=[];state.warnings=["MATCH_COVERAGE_NOT_PUBLISHED"];state.excluded=[];
      state.runYear=ref;state.stale=false;renderAxis();renderChart();return;
    }
    var result=out.result;
    // buildMatchResult 的候选已按「资格 → 方向 → 稳定 id」排好序；这里映射成页面形状。
    state.candidates=result.candidates.map(function(candidate){
      return {
        offering:candidate.offering_id,
        label:catalog[candidate.offering_id]||null,
        eligibility:{status:candidate.eligibility.status,
                     reasons:candidate.eligibility.reason_codes.slice()},
        group:{relation:candidate.group_reference.relation,
               sourceYear:candidate.group_reference.source_year,
               reasons:candidate.group_reference.reason_codes.slice(),
               referenceInterval:candidate.group_reference.reference_rank_interval},
        major:{relation:candidate.major_reference.relation,
               sourceYear:candidate.major_reference.source_year,
               reasons:candidate.major_reference.reason_codes.slice()},
        candidateRank:candidate.group_reference.candidate_rank_interval,
      };
    });
    state.warnings=result.warnings.slice();
    state.excluded=result.excluded_summary.map(function(item){
      return {code:item.reason_code,count:item.count};
    });
    state.runYear=ref;state.stale=false;
    renderAxis();renderChart();
  }).catch(function(error){
    toast("匹配失败："+(error&&error.message?error.message:error));
  });
}

function renderAxis(){
  if(!state.candidates){$("#cand-grid").innerHTML='<div class="empty">'+ICON("axis","large")+'<h3>还没运行匹配</h3><p>上面选好批次与分数后，候选会出现在这里。</p></div>';$("#res-count").textContent="0";return}
  var cands=state.candidates;
  $("#res-count").textContent=cands.length.toLocaleString("zh-CN");
  $("#axis-batches").innerHTML='<div class="steps">'+BATCHES.map(function(b){
    var on=state.batches.indexOf(b)>=0;
    var n=state.primary?batchOfferings(state.primary,b):null;
    return '<div class="step-cell'+(on?" on":"")+'" role="button" tabindex="0" data-batch="'+esc(b)+'"><div class="sk">'+(on?"已选批次":"未选")+
      '</div><h4>'+esc(b)+'</h4><p>'+(n===null?"条数未知":n.toLocaleString("zh-CN")+" 条专业（已发布）")+'</p></div>';
  }).join("")+'</div>';
  var w=$("#axis-warnings");
  var html="";
  if(state.warnings.length) html+='<div class="note warn">数据提示：'+state.warnings.map(lab).join("；")+'。'+
    (state.warnings.indexOf("NO_OBSERVED_SCORE")>=0||state.warnings.indexOf("OUT_OF_DISTRIBUTION_COVERAGE")>=0
      ? '这个分数没有可用的官方位置区间，所以所有候选的「组位置」「专业位置」都只会显示「暂无比较依据」，不会硬算一个关系。':"")+'</div>';
  var cr=comparabilityRecord(state.primary,state.runYear);
  if(cr) html+='<p class="basis">'+esc(state.runYear+" 年参考依据："+cr.basis)+'（核实：'+esc(cr.reviewer||"未记录")+'，'+esc(cr.review_date||"未记录")+'）'+(cr.not_examined?" 未核对："+esc(cr.not_examined):"")+'</p>';
  if(state.excluded.length) html+='<p class="basis">另有 '+state.excluded.reduce(function(s,x){return s+x.count},0)+
    ' 条候选被排除：'+state.excluded.map(function(x){return lab(x.code)+" "+x.count}).join("；")+'。</p>';
  w.innerHTML=html;
  $("#cand-grid").innerHTML=cands.map(function(c){
    // c 由共享规则的 MatchResult 映射而来；label 是发布包里的展示名，缺失时不猜。
    var o=c.label, off=c.offering;
    var badge=c.eligibility.status==="PASS"?'<span class="bubble pass">符合已检查条件</span>'
      :'<span class="bubble unknown">待核对</span>';
    var rel=c.group.relation;
    var cls=rel==="AHEAD_OF_REFERENCE"?"safe":rel==="BEHIND_REFERENCE"?"reach":rel==="OVERLAPS_REFERENCE"?"steady":"plain";
    var tags="";
    if(o){
      tags+='<span>招生数 '+(o.planCount==null?"未知":o.planCount)+'</span>';
      tags+='<span>学费 '+(o.tuition==null?"未知":"¥"+o.tuition)+'</span>';
      if(o.category) tags+='<span>'+esc(o.category)+'</span>';
      if(o.categoryClass&&o.categoryClass!==o.category) tags+='<span>'+esc(o.categoryClass)+'</span>';
    }
    var instTags=o&&o.institutionTags?o.institutionTags.split("/").map(function(t){return t.trim()}).filter(Boolean).slice(0,3):[];
    return '<article class="cand"><div class="cand-top">'+badge+
      '<span class="loc">'+ICON("pin")+esc(o?(o.institutionCity||"城市未知"):"省份未知")+'</span></div>'+
      '<h3 class="serif">'+esc(o?o.majorName:off) +'</h3>'+
      '<p class="loc" style="margin-top:5px">'+esc(o?o.institutionName:"院校名称未随发布包提供")+'</p>'+
      '<div class="tags">'+tags+(instTags.length?instTags.map(function(t){return '<span>'+esc(t)+'</span>'}).join(""):"")+'</div>'+
      '<div class="ranks">'+
      '<div class="rk"><div class="ry">参考年</div><div class="rv num">'+(c.group.sourceYear||state.runYear||"—")+'</div></div>'+
      '<div class="rk"><div class="ry">我的位次区间</div><div class="rv num">'+
      (c.candidateRank?c.candidateRank[0].toLocaleString("zh-CN")+" – "+c.candidateRank[1].toLocaleString("zh-CN"):"未定位")+'</div></div>'+
      '<div class="rk"><div class="ry">参考年记录位次</div><div class="rv num">'+
      (c.group.referenceInterval?c.group.referenceInterval[0].toLocaleString("zh-CN"):"无记录")+'</div></div>'+
      '<div class="rk"><div class="ry">专业组位置</div><div class="rv"><span class="bubble '+cls+'">'+lab(rel)+'</span></div></div>'+
      '<div class="rk"><div class="ry">专业位置</div><div class="rv"><span class="bubble '+cls+'">'+lab(c.major.relation)+'</span></div></div>'+
      '</div>'+
      (rel==="NOT_COMPARABLE"?'<p class="basis" style="margin-top:12px">组位置无法比较：'+esc(c.group.reasons.map(lab).join("、"))+'</p>':"")+
      '</article>';
  }).join("");
}
function renderChart(){
  var wrap=$("#route-svg"),legend=$("#route-legend"),detail=$("#chart-detail");
  if(!state.candidates){
    wrap.innerHTML='<div class="empty">'+ICON("route","large")+'<h3>还没有航线</h3><p>先去「分数轴」运行一次匹配。</p></div>';legend.innerHTML="";detail.innerHTML="";return;
  }
  var classes=[
    {key:"BEHIND_REFERENCE",label:"需要更好位置",color:"var(--reach)",dash:"6 10",w:2,y:74},
    {key:"OVERLAPS_REFERENCE",label:"边界重叠",color:"var(--steady)",dash:"",w:2.6,y:154},
    {key:"AHEAD_OF_REFERENCE",label:"位置较有余量",color:"var(--safe)",dash:"2 7",w:2,y:234},
    {key:"NOT_COMPARABLE",label:"暂无比较依据",color:"#c8cfc0",dash:"1 9",w:1.6,y:312}
  ];
  var groups=classes.map(function(c){
    return {meta:c,items:state.candidates.filter(function(x){
      var r=c.key==="NOT_COMPARABLE"?(x.group.relation==="NOT_COMPARABLE"):(x.group.relation===c.key);
      return r;
    })};
  });
  var maxY=352;
  var paths=groups.map(function(g){
    var n=g.items.length, off=Math.min(26,n*0.9);
    return '<path d="M40,'+g.meta.y+' C220,'+(g.meta.y-off)+' 400,'+(g.meta.y+off)+' 700,'+g.meta.y+' S860,'+(g.meta.y-off/2)+' 980,'+g.meta.y+'" '+
      'fill="none" stroke="'+g.meta.color+'" stroke-width="'+g.meta.w+'"'+(g.meta.dash?' stroke-dasharray="'+g.meta.dash+'"':'')+' opacity="'+(n?"0.95":"0.35")+'"/>'+
      '<circle cx="40" cy="'+g.meta.y+'" r="4" fill="'+g.meta.color+'"/>'+
      '<text x="1006" y="'+(g.meta.y+4)+'" font-size="11" fill="#7d8578">'+g.meta.label+'（'+n+'）</text>';
  }).join("");
  wrap.innerHTML='<svg viewBox="0 0 1120 '+maxY+'" width="100%" height="auto" role="img" aria-label="按位置关系分组的候选航线图">'+
    '<g opacity=".5">'+[0,1,2,3,4].map(function(i){
      return '<line x1="40" y1="'+(40+i*78)+'" x2="980" y2="'+(40+i*78)+'" stroke="#e4e9dc" stroke-width="1"/>';
    }).join("")+'</g>'+paths+
    '<text x="40" y="'+(maxY-8)+'" font-size="10" fill="#a9b3a3">参考年 '+state.runYear+' · 目标情景分 '+state.score+' · 共 '+state.candidates.length+' 条候选</text>'+
    '</svg>';
  legend.innerHTML='<span>连线只表示「候选位置区间」与「参考年记录」的比较结果</span>'+
    '<span>不是概率，也不是「冲稳保」</span>';
  detail.innerHTML='<div class="panel soft"><h3 class="serif" style="font-size:16px">这一页刻意不做的事</h3>'+
    '<ul class="dir-tasks" style="margin-top:11px">'+
    '<li>不计算录取概率，不给「冲刺 / 稳妥 / 保底」标签。</li>'+
    '<li>不把「专业组位置」当成「专业位置」：两者分列显示，缺一个就写「暂无比较依据」。</li>'+
    '<li>不因为分数变高就假设「更容易录取」——只是可比较的候选变了。</li>'+
    '<li>不把历史年份的科类口径回填到今年：未建立可比关系的年份不参与比较。</li>'+
    '</ul></div>';
  $("#chart-note").innerHTML="<b>参考年只有 "+state.runYear+" 年：</b>发布包里 2024、2023 年属于文理分科口径，"+
    "与现在的物理类/历史类不是同一定义，因此被标记为「未建立可比关系」，不参与位置比较。这不代表那些年份没有用，只代表它们不能直接拿来比。";
}

/* ---------- dialog ---------- */
var lastFocus=null;
function lockScroll(){document.documentElement.style.overflow="hidden";document.body.style.overflow="hidden"}
function unlockScroll(){if(!$("dialog[open]")){document.documentElement.style.overflow="";document.body.style.overflow=""}}
function openDialog(){
  var d=$("#detail-dialog");if(!d)return;
  if(d._t){clearTimeout(d._t);d._t=null}
  d.classList.remove("closing");
  if(!d.open)d.showModal();
  lastFocus=document.activeElement;lockScroll();
  var f=d.querySelector(".dialog-actions .button");if(f&&f.focus)f.focus();
}
function closeDialog(immediate){
  var d=$("#detail-dialog");if(!d||!d.open||d.classList.contains("closing"))return;
  if(immediate){if(d._t){clearTimeout(d._t);d._t=null}d.classList.remove("closing");d.close();unlockScroll();return}
  d.classList.add("closing");
  var finish=function(){if(d._t){clearTimeout(d._t);d._t=null}d.classList.remove("closing");if(d.open)d.close();unlockScroll();if(lastFocus&&lastFocus.focus)lastFocus.focus()};
  if(reduce)finish();else d._t=setTimeout(finish,200);
}
$("#detail-dialog").addEventListener("cancel",function(e){e.preventDefault();closeDialog()});
$("#detail-dialog").addEventListener("click",function(e){if(e.target===this)closeDialog()});
$("#detail-dialog").addEventListener("close",unlockScroll);

function openMajorCard(cardId){
  var m=MAJOR_CARDS.filter(function(x){return x.cardId===cardId})[0];if(!m)return;
  var exp=EXPERIENCE.filter(function(x){return x.cardId===m.link})[0];
  $("#dialog-body").innerHTML='<div class="dialog-art"><div class="art-slot" data-art="'+(exp?exp.art:"compass")+'" aria-hidden="true"></div></div>'+
    '<div class="dialog-content"><div class="eyebrow">专业事实卡 · 有出处</div>'+
    '<h2 id="dialog-title" class="serif">'+esc(m.majorName)+'</h2>'+
    '<p class="lead">'+esc(m.inst)+' 的专业介绍中这样说：</p>'+
    '<ul class="dialog-facts">'+m.facts.map(function(f){return "<li>"+esc(f)+"</li>"}).join("")+
    '<li>课程示例：'+esc(m.courses.join("、"))+'</li></ul>'+
    '<div class="note">'+esc(CARD_SCOPE)+'</div>'+
    '<div class="dialog-meta"><span>定位：'+esc(m.locator)+'</span><span>核对日期：'+esc(m.checkedOn)+'</span></div>'+
    '<p class="basis" style="margin-top:12px;word-break:break-all">来源：'+esc(m.sourceUrl)+'</p>'+
    '<div class="note warn" style="margin-top:14px"><b>尚未核对：</b>目标年度在四川的招生计划与资格要求；具体培养方案的适用年级；历史录取资料及可比口径。</div>'+
    '<div class="dialog-actions"><button class="button" type="button" data-act="close-dialog">知道了</button>'+
    '<button class="button secondary" type="button" data-detail-copy="'+esc(m.next)+'">把这个问题记下来</button></div></div>';
  initArt($("#dialog-body"));openDialog();
}
function openSourcePanel(){
  if(!release){ toast("发布数据尚未载入完成"); return }
  var m=release.manifest;
  var loaded=[...offerings.values()];
  var nInst=new Set(loaded.map(function(o){return catalog[o.offeringId]&&catalog[o.offeringId].institutionName}).filter(Boolean)).size;
  var nGroupHist=0,nMajorHist=0;
  loaded.forEach(function(o){
    nGroupHist+=o.history.filter(function(r){return r.subjectType==="group"}).length;
    nMajorHist+=o.history.filter(function(r){return r.subjectType==="major"}).length;
  });
  var verified=release.comparability.filter(function(c){return c.status==="VERIFIED"}).length;
  $("#dialog-body").innerHTML='<div class="dialog-content"><div class="eyebrow">关于这个页面</div>'+
    '<h2 id="dialog-title" class="serif">数据从哪来，能说到什么程度。</h2>'+
    '<p class="lead">这个页面是「南溟」的第二套前端（纸感版）。它读取与主前端完全相同的发布包，'+
    '并调用同一套共享规则（发布包读取、匹配输入、匹配规则），因此两条路线对同一份数据给出同样的解读。</p>'+
    '<ul class="dialog-facts">'+
    '<li>发布版本：'+esc(m.release_id)+'（'+esc(m.status)+'，'+(m.synthetic?"合成":"非合成")+'，生成于 '+esc(m.created_at)+'）</li>'+
    '<li>已发布覆盖：'+m.coverage.length+' 条覆盖声明，共 '+m.coverage.reduce(function(t,c){return t+c.published_offerings},0).toLocaleString("zh-CN")+' 条专业</li>'+
    '<li>本次已载入：'+loaded.length.toLocaleString("zh-CN")+' 条专业、'+nInst.toLocaleString("zh-CN")+' 所院校（按所选科类与批次按需加载）</li>'+
    '<li>历史记录：专业组 '+nGroupHist.toLocaleString("zh-CN")+' 条、专业 '+nMajorHist.toLocaleString("zh-CN")+' 条</li>'+
    '<li>官方一分一段表：'+DISTS.length+' 张，全量随发布包提供</li>'+
    '<li>跨年可比关系：'+COMP.length+' 条，其中已核实 '+verified+' 条</li>'+
    '</ul>'+
    '<div class="note warn"><b>关于范围：</b>本页只加载你选择的科类与批次对应的分片，'+
    '不是发布包的全部内容；「已载入」数字随你的选择变化。</div>'+
    '<div class="note"><b>页面不会做的事：</b>不预测录取、不给概率、不提供「冲稳保」；不把「暂无比较依据」说成「不好考」；不把历史年份的科类口径套到今年。'+
    '学费与招生数保持来源原样，未知就显示未知。</div>'+
    '<div class="dialog-actions"><button class="button" type="button" data-act="close-dialog">知道了</button></div></div>';
  openDialog();
}

/* ---------- toast ---------- */
var toastTimer=null;
function toast(msg){
  var t=$("#toast"),x=$("#toast-text");if(!t)return;
  if(x)x.textContent=msg;
  t.classList.add("show");
  if(toastTimer)clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){t.classList.remove("show");toastTimer=null},2500);
}

/* ---------- 事件 ---------- */
document.addEventListener("click",function(e){
  var t=e.target;
  var go=t.closest("[data-go]");
  if(go){e.preventDefault();goPage(go.dataset.go);return}
  var yr=t.closest("[data-year]");
  if(yr){e.preventDefault();state.targetYear=Number(yr.dataset.year);renderSail();return}
  var pr=t.closest("[data-primary]");
  if(pr){e.preventDefault();state.primary=pr.dataset.primary;state.candidates=null;
    renderNav();renderSail();renderLocate();renderTalk();renderDirection();return}
  var ad=t.closest("[data-additional]");
  if(ad){e.preventDefault();var s=ad.dataset.additional,i=state.additional.indexOf(s);
    if(i>=0)state.additional.splice(i,1);
    else if(state.additional.length<2)state.additional.push(s);
    else{toast("再选科目正好 2 门，先取消一门");return}
    state.candidates=null;renderNav();renderSail();renderLocate();renderTalk();renderDirection();return}
  var bt=t.closest("[data-batch]");
  if(bt){e.preventDefault();var b=bt.dataset.batch,j=state.batches.indexOf(b);
    if(j>=0){state.batches.splice(j,1)}else{state.batches.push(b)}
    state.candidates=null;renderLocate();renderAxis();renderChart();return}
  var ae=t.closest("[data-act]");
  if(ae){e.preventDefault();var a=ae.dataset.act;
    if(a==="close-dialog"){closeDialog();return}
    if(a==="print"){window.print();return}
    if(a==="export"){exportJson();return}
    if(a==="clear"){clearAll();return}
    if(a==="save-q"){var q=$('textarea[data-q="'+ae.dataset.q+'"]');saveAnswer(ae.dataset.q,q?q.value:"");return}
    if(a==="skip-q"){delete state.answers[ae.dataset.q];renderTalk();
      $("#talk-status").className="note";toast("已跳过。本题不会生成任何方向结论。");return}
    if(a==="confirm"){confirmDirection(ae.dataset.dir);return}
    if(a==="deny"){state.profile[ae.dataset.dir]="DENIED";renderDirection();toast("已记下：这个方向不适合你。");return}
  }
  if(t.closest("#run-match")){e.preventDefault();runMatch();toast("已按当前条件重新匹配");return}
  var dc=t.closest("[data-detail-copy]");
  if(dc){e.preventDefault();closeDialog(true);
    toast("已记下这个问题，可以自己写在纸上");return}
  var dt=t.closest("[data-detail]");
  if(dt){e.preventDefault();openMajorCard(dt.dataset.detail);return}
  var pn=t.closest("[data-panel]");
  if(pn){e.preventDefault();openSourcePanel();return}
  var bp=t.closest("[data-open-page]");
  if(bp){e.preventDefault();closeDialog(true);goPage(bp.dataset.openPage);return}
});
document.addEventListener("input",function(e){
  if(e.target.id==="score-input"||e.target.id==="score-input2"){
    state.score=Number(e.target.value);
    state.candidates=null;state.stale=true;
    updateScoreUI();renderLocateReadout();renderAxis();
  }
});
document.addEventListener("keydown",function(e){
  var cell=e.target.closest&&e.target.closest("[data-batch],[data-primary]");
  if(cell&&(e.key==="Enter"||e.key===" ")){e.preventDefault();cell.click();}
});
function saveAnswer(qid,text){
  if(!text.trim()){toast("回答不能为空；也可以明确选择跳过");return}
  state.answers[qid]={text:text.trim()};
  renderTalk();
  toast("已保存这一题");
}
function confirmDirection(dir){
  if(!("q-interest" in state.answers)){
    $("#talk-status").className="note warn";
    $("#talk-status").innerHTML="请先保存第 1 题中属于你自己的具体表达，再确认方向。";
    toast("先去「谈心」写第一题");return;
  }
  state.profile[dir]="CONFIRMED";renderDirection();
  toast("已确认这个方向");
}
function exportJson(){
  if(!state.candidates){toast("先运行一次匹配");return}
  var payload={
    note:"南溟前端纸感备用方案 · 导出结果。本文件不是报考建议，不含录取概率。",
    generated_at:new Date().toISOString(),
    release_id:release?release.manifest.release_id:null, rules_version:release?release.manifest.rules_version:null,
    reference_year:state.runYear, target_exam_year:state.targetYear,
    selection:{primary:state.primary,additional:state.additional},
    target_score:state.score, batches:state.batches,
    confirmed_directions:Object.keys(state.profile).filter(function(k){return state.profile[k]==="CONFIRMED"}),
    warnings:state.warnings, excluded_summary:state.excluded,
    candidates:state.candidates.slice(0,200).map(function(c){
      return {offering_id:c.offering,
        institution:c.label?c.label.institutionName:null, major:c.label?c.label.majorName:null,
        plan_count:c.label?c.label.planCount:null, tuition:c.label?c.label.tuition:null,
        eligibility:c.eligibility.status,
        group_relation:c.group.relation, group_reason_codes:c.group.reasons,
        major_relation:c.major.relation, major_reason_codes:c.major.reasons,
        reference_year:c.group.sourceYear, reference_rank_interval:c.group.referenceInterval};
    })
  };
  var blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  var url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url;a.download="nanming-match-result.json";document.body.appendChild(a);a.click();
  document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url)},1000);
  toast("已导出结果 JSON");
}
function clearAll(){
  state.answers={};state.profile={};state.candidates=null;state.stale=false;
  state.targetYear=2027;state.primary=null;state.additional=[];state.score=600;
  state.batches=BATCHES.slice(0,1);
  renderSail();renderLocate();renderTalk();renderDirection();renderAxis();renderChart();
  goPage("sail");toast("已清除你的填写；数据本身不受影响");
}

/* ---------- 初始化 ---------- */
renderSail();renderLocate();renderTalk();renderDirection();renderAxis();renderChart();renderNav();
$("#score-input").value=String(state.score);$("#score-input2").value=String(state.score);
updateScoreUI();
initArt(document);

/* 载入与主前端相同的发布包。失败时页面保持可用，并把状态说清楚而不是假装有数据。 */
loadPublishedRelease()
  .then(function(loaded){
    syncReleaseGlobals(loaded);
    var m=loaded.manifest;
    var badge=$("#release-badge");
    if(badge){
      badge.textContent="已载入发布数据 "+m.release_id;
      badge.className="release-badge ready";
    }
    renderSail();renderLocate();renderAxis();
  })
  .catch(function(error){
    var badge=$("#release-badge");
    if(badge){
      badge.textContent="发布数据载入失败："+(error&&error.message?error.message:error);
      badge.className="release-badge failed";
    }
  });
window.__paperBooted = "done";

