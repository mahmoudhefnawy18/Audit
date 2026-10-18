'use strict';
const SUPABASE_URL='https://epdinlgqlxfezrjjyhmk.supabase.co';
const SUPABASE_KEY='sb_publishable_xtEL7D8kZQiPiPMuXj-5ww_ibXNJhbr';
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const STORE='gynae-audit-v3', WEEK_KEY='gynae-audit-week-monday';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], z=n=>String(n).padStart(2,'0');
let cases=JSON.parse(localStorage.getItem(STORE)||localStorage.getItem('gynae-audit-v2')||localStorage.getItem('gynae-audit-v1')||'[]');
function isoDate(d){return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;}
function chooseAuditMonday(){let s=localStorage.getItem(WEEK_KEY);if(s)return s;const now=new Date(),from=new Date(now);from.setMonth(from.getMonth()-3);from.setHours(12,0,0,0);from.setDate(from.getDate()+(8-from.getDay())%7);let ms=[];for(let d=new Date(from);d<=now;d.setDate(d.getDate()+7))ms.push(isoDate(d));s=ms[Math.floor(Math.random()*ms.length)]||isoDate(now);localStorage.setItem(WEEK_KEY,s);return s;}
const AUDIT_MONDAY=chooseAuditMonday();
const HISTORICAL_PERIOD='feb2025', CURRENT_PERIOD='current';
let selectedPeriod=localStorage.getItem('gynae-audit-selected-period')===HISTORICAL_PERIOD?HISTORICAL_PERIOD:CURRENT_PERIOD;
function periodOf(c){return c.auditPeriod===HISTORICAL_PERIOD?HISTORICAL_PERIOD:CURRENT_PERIOD;}
function periodCases(period=selectedPeriod){return cases.filter(c=>periodOf(c)===period);}
function defaultPeriodDate(period){return period===HISTORICAL_PERIOD?'2025-02-01':AUDIT_MONDAY;}
function syncPeriodSelector(){const select=$('#auditPeriodSelect');if(select)select.value=selectedPeriod;const form=$('#caseAuditPeriod');if(form&&!val('caseId'))form.value=selectedPeriod;}
function selectAuditPeriod(period){selectedPeriod=period;localStorage.setItem('gynae-audit-selected-period',period);syncPeriodSelector();renderCases();}

function datePlus(s,n){let d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return isoDate(d);}
function combineDT(dateId,timeId){let d=$('#'+dateId)?.value,t=$('#'+timeId)?.value;return d&&t?`${d}T${t}`:'';}
function splitDT(v,dateId,timeId,blank=false){const d=$('#'+dateId),t=$('#'+timeId);if(!d||!t)return;d.value=v?.includes('T')?v.split('T')[0]:(blank?'':($('#caseDate')?.value||AUDIT_MONDAY));t.value=v?.includes('T')?v.split('T')[1].slice(0,5):(blank?'':'09:00');}
function val(id){return $('#'+id).value;}
function num(id){return val(id)===''?'':Number(val(id));}
function parseDT(s){if(!s)return null;let d=new Date(s);return Number.isNaN(d.getTime())?null:d;}
function localDT(d){return `${isoDate(d)}T${z(d.getHours())}:${z(d.getMinutes())}`;}
function addMin(d,m){return new Date(d.getTime()+m*60000);}
function fmt(s){let d=parseDT(s);return d?d.toLocaleString([],{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';}
function saveLocal(){localStorage.setItem(STORE,JSON.stringify(cases));renderCases();}
async function loadFromSupabase(){try{const {data,error}=await supabaseClient.from('gynae_audit_cases').select('*').order('case_number',{ascending:true});if(error)throw error;const remote=(data||[]).map(row=>({...row.case_data,id:row.id,caseNumber:row.case_number,date:row.case_date}));const localById=new Map(cases.map(c=>[c.id,c]));remote.forEach(c=>localById.set(c.id,c)); // Preserve unsynced local cases; do not silently discard them.
cases=[...localById.values()];saveLocal();}catch(error){console.error('Supabase load error:',error);renderCases();}}
async function saveCaseToSupabase(c){try{const row={id:c.id,case_number:c.caseNumber,case_date:c.date,procedure:c.procedure||null,asa:c.asa||null,postop_destination:c.postopCare||null,pca:c.pca==='Yes',rsc:c.rsc==='Yes',it_diamorphine:c.itDiamorph==='Yes',case_data:c,updated_at:new Date().toISOString()};const {error}=await supabaseClient.from('gynae_audit_cases').upsert(row,{onConflict:'id'});if(error)throw error;return true;}catch(error){console.error('Supabase save error:',error);alert('Saved on this device, but could not sync to Supabase.');return false;}}
function showView(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===id));window.scrollTo(0,0);}
$$('.tab').forEach(b=>b.onclick=()=>showView(b.dataset.view));
$('#newCaseBtn').onclick=()=>newCase();
function nextNo(period=selectedPeriod){return Math.max(0,...periodCases(period).map(c=>Number(c.caseNumber)||0))+1;}
const numberIds=['poPara','ivPara','codeine30','codeine60','ibuprofen','opiate2_5','opiate5','opiate10','opiate20','diclofenacPR','ondansetron','cyclizine','chlorphenamine','macrogol','peppermint'];
const textIds=['procedure','asa','postopCare','pca','pcaDrug','itDiamorph','rsc','postopPrescriptions','oralOpiateDrug','diclofenacTheatre','otherAnalgesia','otherAntiemetics','otherLaxatives','anaesthesiaType','ondansetronRoute','cyclizineRoute'];
const timeIds=[['pcaStartTime','pcaStartDate','pcaStartClock'],['pcaStopTime','pcaStopDate','pcaStopClock'],['rscStartTime','rscStartDate','rscStartClock'],['rscStopTime','rscStopDate','rscStopClock'],['itTime','itDate','itClock'],['recoveryTime','recoveryDate','recoveryClock'],['dischargeTime','dischargeDate','dischargeClock']];

/* Theatre medication entry builder. Structured rows are saved in case_data. */
const intraopDrugs = {
  'Paracetamol': {doses:['1 g','0.5 g'],routes:['IV','Oral']},
  'Morphine': {doses:[],routes:['IV','IM','Oral'],unit:'mg'},
  'Oxycodone': {doses:[],routes:['IV','Oral'],unit:'mg'},
  'Remifentanil infusion': {doses:['Infusion'],routes:['IV'],unit:'mcg/kg/min or details'},
  'Fentanyl': {doses:['25 mcg','50 mcg','75 mcg','100 mcg'],routes:['IV'],unit:'mcg'},
  'Magnesium sulphate': {doses:['1 g','2 g','3 g','4 g','5 g'],routes:['IV'],unit:'g'},
  'Dexamethasone': {doses:['3.3 mg','6.6 mg'],routes:['IV'],unit:'mg'},
  'Ondansetron': {doses:['4 mg','8 mg'],routes:['IV','Oral','IM'],unit:'mg'},
  'Cyclizine': {doses:['50 mg'],routes:['IV','IM'],unit:'mg'},
  'Other': {doses:[],routes:['IV','Oral','IM','Other'],unit:'dose and units'}
};
function makeOption(value,label){const o=document.createElement('option');o.value=value;o.textContent=label||value;return o;}
function addIntraopEntry(data={}){
  const wrap=document.createElement('div');wrap.className='card-inner intraop-entry';wrap.style.marginBottom='12px';
  const grid=document.createElement('div');grid.className='grid';
  const drugLabel=document.createElement('label');drugLabel.textContent='Medication';
  const drug=document.createElement('select');drug.className='intraop-drug';drug.append(makeOption('','Select medication'));
  Object.keys(intraopDrugs).forEach(name=>drug.append(makeOption(name)));
  drugLabel.append(drug);
  const doseLabel=document.createElement('label');doseLabel.textContent='Dose';
  const dose=document.createElement('select');dose.className='intraop-dose';doseLabel.append(dose);
  const customLabel=document.createElement('label');customLabel.textContent='Custom dose (include units)';
  const custom=document.createElement('input');custom.type='text';custom.className='intraop-custom';custom.placeholder='e.g. 125 mcg or 6 mg';customLabel.append(custom);
  const routeLabel=document.createElement('label');routeLabel.textContent='Route';
  const route=document.createElement('select');route.className='intraop-route';routeLabel.append(route);
  const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='Remove medication';remove.style.marginTop='8px';remove.onclick=()=>wrap.remove();
  grid.append(drugLabel,doseLabel,customLabel,routeLabel);wrap.append(grid,remove);
  function updateChoices(selectedDose='',selectedRoute=''){
    const cfg=intraopDrugs[drug.value]||{doses:[],routes:[]};
    dose.replaceChildren(makeOption('','Select dose'));
    cfg.doses.forEach(d=>dose.append(makeOption(d)));
    dose.append(makeOption('__custom__','Custom dose'));
    route.replaceChildren(makeOption('','Select route'));
    cfg.routes.forEach(r=>route.append(makeOption(r)));
    route.value=selectedRoute&&cfg.routes.includes(selectedRoute)?selectedRoute:(cfg.routes[0]||'');
    dose.value=cfg.doses.includes(selectedDose)?selectedDose:'__custom__';
    custom.value=cfg.doses.includes(selectedDose)?'':(selectedDose||'');
    customLabel.style.display=dose.value==='__custom__'?'':'none';
    custom.placeholder=cfg.unit?`Enter ${cfg.unit}`:'Enter dose and units';
  }
  drug.onchange=()=>updateChoices();
  dose.onchange=()=>{customLabel.style.display=dose.value==='__custom__'?'':'none';};
  drug.value=intraopDrugs[data.drug]?data.drug:'';
  updateChoices(data.dose||'',data.route||'');
  $('#intraopEntries').append(wrap);
}
function collectIntraop(){return $$('#intraopEntries .intraop-entry').map(w=>{
  const drug=w.querySelector('.intraop-drug').value;
  const doseSelect=w.querySelector('.intraop-dose').value;
  const dose=doseSelect==='__custom__'?w.querySelector('.intraop-custom').value.trim():doseSelect;
  const route=w.querySelector('.intraop-route').value;
  return {drug,dose,route};
}).filter(m=>m.drug||m.dose);}
$('#addIntraop').onclick=()=>addIntraopEntry();

function resetForm(){$('#caseForm').reset();$('#caseId').value='';$('#observations').innerHTML='';$('#simpleObservations').innerHTML='';$('#deleteCase').classList.add('hidden');numberIds.forEach(id=>$('#'+id).value=0);$('#ibuprofenNP').checked=false;$('#pcaDrug').value='';$('#oralOpiateDrug').value='';$('#caseDate').value=defaultPeriodDate(selectedPeriod);$('#caseAuditPeriod').value=selectedPeriod;$('#intraopEntries').innerHTML='';timeIds.forEach(([key,d,t])=>splitDT('',d,t,key.endsWith('StopTime')||key==='dischargeTime'));updateConditional();}
function addSimpleObservation(data={}){const node=$('#simpleObsTemplate').content.cloneNode(true),item=node.querySelector('.simple-obs');item.querySelector('[data-simple="date"]').value=data.date||$('#caseDate').value||defaultPeriodDate(selectedPeriod);item.querySelector('[data-simple="time"]').value=data.time||'09:00';item.querySelector('[data-simple="painScore"]').value=data.painScore??'';item.querySelector('[data-simple="nvScore"]').value=data.nvScore??'';item.querySelector('.remove-simple-obs').onclick=()=>item.remove();$('#simpleObservations').appendChild(node);}
function collectSimpleObservations(){return $$('#simpleObservations .simple-obs').map(item=>{const obj={};item.querySelectorAll('[data-simple]').forEach(el=>obj[el.dataset.simple]=el.value);return obj;});}
$('#addSimpleObs').onclick=()=>addSimpleObservation();
function newCase(){resetForm();$('#caseNumber').value=nextNo(selectedPeriod);showView('form');}
$('#auditPeriodSelect').addEventListener('change',e=>selectAuditPeriod(e.target.value));
$('#caseAuditPeriod').addEventListener('change',e=>{const p=e.target.value;if(!val('caseId')){$('#caseNumber').value=nextNo(p);$('#caseDate').value=defaultPeriodDate(p);timeIds.forEach(([key,d,t])=>{if(!key.endsWith('StopTime')&&key!=='dischargeTime')$('#'+d).value=$('#caseDate').value;});}});

function monitoringSelected(){return ['pca','rsc','itDiamorph'].some(id=>val(id)==='Yes');}
function getTimes(){return {pcaStart:val('pca')==='Yes'?parseDT(combineDT('pcaStartDate','pcaStartClock')):null,rscStart:val('rsc')==='Yes'?parseDT(combineDT('rscStartDate','rscStartClock')):null,itStart:val('itDiamorph')==='Yes'?parseDT(combineDT('itDate','itClock')):null,pcaStop:val('pca')==='Yes'?parseDT(combineDT('pcaStopDate','pcaStopClock')):null,rscStop:val('rsc')==='Yes'?parseDT(combineDT('rscStopDate','rscStopClock')):null,recovery:parseDT(combineDT('recoveryDate','recoveryClock')),discharge:parseDT(combineDT('dischargeDate','dischargeClock'))};}
function activeAt(start,stop,at){return !!start&&at>=start&&(!stop||at<=stop);}
function scheduleSettings(){
 const t=getTimes(),p=val('pca')==='Yes',r=val('rsc')==='Yes',it=val('itDiamorph')==='Yes';
 const candidates=[];
 if(p&&t.pcaStart)candidates.push(t.pcaStart);
 if(r&&t.rscStart)candidates.push(t.rscStart);
 const start=candidates.length?new Date(Math.min(...candidates.map(d=>d.getTime()))):it?t.itStart:null;
 if(!start)return {start:null,limit:null,t,p,r,it};
 // For PCA/RSC: last infusion stoppage or discharge. An unspecified stop means ongoing.
 // IT-only retains its 48-hour observation maximum.
 let limit=(p||r)?null:addMin(start,48*60);
 if(p||r){
   const stops=[];
   if(p)stops.push(t.pcaStop);
   if(r)stops.push(t.rscStop);
   if(stops.every(Boolean))limit=new Date(Math.max(...stops.map(d=>d.getTime())));
 }
 if(t.discharge&&(!limit||t.discharge<limit))limit=t.discharge;
 return {start,limit,t,p,r,it};
}

function protocolTimes(start,end,reason){if(!start)return [];let offsets=[15,30,45,60,120,180,240,300];const maxMinutes=end?Math.max(300,Math.ceil((end-start)/60000)):20160;for(let m=540;m<=maxMinutes;m+=240)offsets.push(m);return offsets.map(m=>({t:addMin(start,m),reason})).filter(x=>!end||x.t<=end);}
function setObservationVisibility(obs,s){const when=parseDT(obs.querySelector('[data-k="requiredAt"]').value);if(!when)return;const pActive=s.p&&activeAt(s.t.pcaStart,s.t.pcaStop,when);const rActive=s.r&&activeAt(s.t.rscStart,s.t.rscStop,when);obs.querySelectorAll('.pcaField').forEach(el=>{el.classList.toggle('hidden',!pActive);el.querySelectorAll('[data-k]').forEach(input=>input.disabled=!pActive);});obs.querySelectorAll('.rscFields').forEach(el=>{el.classList.toggle('hidden',!rActive);el.querySelectorAll('[data-k]').forEach(input=>input.disabled=!rActive);});obs.querySelectorAll('.itFields').forEach(el=>{el.classList.toggle('hidden',!s.it);el.querySelectorAll('[data-k]').forEach(input=>input.disabled=!s.it);});}
function updateConditional(){const p=val('pca')==='Yes',r=val('rsc')==='Yes',it=val('itDiamorph')==='Yes';[['pcaTimeWrap',p],['rscTimeWrap',r],['itTimeWrap',it],['recoveryTimeWrap',it],['obsCard',p||r||it],['noObsMessage',!(p||r||it)]].forEach(([id,on])=>$('#'+id).classList.toggle('hidden',!on));if(!(p||r||it))$('#observations').innerHTML='';const s=scheduleSettings();$$('#observations .obs').forEach(o=>setObservationVisibility(o,s));}
function generateSchedule(){if(!monitoringSelected()){$('#observations').innerHTML='';return;}const s=scheduleSettings();const old=new Map(collectObs().map(o=>[o.requiredAt,o]));let schedule=[];if(s.start){schedule=protocolTimes(s.start,s.limit,'').filter(x=>!(s.it&&!s.p&&!s.r&&s.t.recovery&&x.t<=s.t.recovery)).map(x=>{const requiredAt=localDT(x.t);const reason=[s.p&&activeAt(s.t.pcaStart,s.t.pcaStop,x.t)?'PCA':'',s.r&&activeAt(s.t.rscStart,s.t.rscStop,x.t)?'RSC':'',s.it?'IT diamorphine':''].filter(Boolean).join(' + ');return {...(old.get(requiredAt)||{}),requiredAt,reason};});}$('#observations').innerHTML='';schedule.forEach(addObservation);$('#scheduleHint').textContent=schedule.length?`${schedule.length} required observations; until discharge or the last PCA/RSC stoppage (IT-only: 48 hours). For ongoing infusions, refresh as needed.`:'Enter the intervention start date and time.';updateConditional();}
['pca','rsc','itDiamorph'].forEach(id=>$('#'+id).addEventListener('change',()=>{updateConditional();generateSchedule();}));
['pcaStartDate','pcaStartClock','pcaStopDate','pcaStopClock','rscStartDate','rscStartClock','rscStopDate','rscStopClock','itDate','itClock','recoveryDate','recoveryClock','dischargeDate','dischargeClock'].forEach(id=>$('#'+id).addEventListener('change',generateSchedule));
$('#generateObs').onclick=generateSchedule;
function addObservation(data={}){const node=$('#obsTemplate').content.cloneNode(true),obs=node.querySelector('.obs');obs.querySelector('[data-k-display="requiredAt"]').textContent=fmt(data.requiredAt);obs.querySelector('[data-k-display="reason"]').textContent=data.reason||'';obs.querySelectorAll('[data-k]').forEach(el=>{if(el.dataset.k==='actualDate'||el.dataset.k==='actualClock')return;el.value=data[el.dataset.k]??'';});let actualDate=data.actualDate||'',actualClock=data.actualClock||'';if(data.actualTime?.includes('T'))[actualDate,actualClock]=data.actualTime.split('T');obs.querySelector('[data-k="actualDate"]').value=actualDate||data.requiredAt?.split('T')[0]||AUDIT_MONDAY;obs.querySelector('[data-k="actualClock"]').value=(actualClock||data.requiredAt?.split('T')[1]||'09:00').slice(0,5);const sel=obs.querySelector('[data-k="observationPostop"]'),pill=obs.querySelector('.status-pill');function status(){pill.textContent=sel.value==='Y'?'Done':sel.value==='N'?'Missed':'Due';pill.className='status-pill '+(sel.value==='Y'?'done':sel.value==='N'?'missed':'');}sel.addEventListener('change',()=>{if(sel.value==='Y'&&data.requiredAt){const [d,t]=data.requiredAt.split('T');obs.querySelector('[data-k="actualDate"]').value=d;obs.querySelector('[data-k="actualClock"]').value=t.slice(0,5);}status();});status();$('#observations').appendChild(node);setObservationVisibility(obs,scheduleSettings());}
function collectObs(){return $$('#observations .obs').map(o=>{const x={};o.querySelectorAll('[data-k]').forEach(el=>x[el.dataset.k]=el.value);x.actualTime=x.actualDate&&x.actualClock?`${x.actualDate}T${x.actualClock}`:'';return x;});}
$('#caseForm').onsubmit=async e=>{e.preventDefault();if(monitoringSelected()&&!$('#observations').children.length){generateSchedule();if(!$('#observations').children.length&&!confirm('No observation schedule could be generated. Save anyway?'))return;}const period=val('caseAuditPeriod');
if(period===HISTORICAL_PERIOD&&(val('caseDate')<'2025-02-01'||val('caseDate')>'2025-02-07')){alert('The February 2025 audit covers 1–7 February 2025. Choose a date within this period.');return;}
const id=val('caseId')||crypto.randomUUID();const c={id,auditPeriod:period,caseNumber:Number(val('caseNumber'))||nextNo(),date:val('caseDate'),ibuprofenNP:$('#ibuprofenNP').checked,intraopMedications:collectIntraop(),simpleObservations:monitoringSelected()?[]:collectSimpleObservations(),observations:monitoringSelected()?collectObs():[],updatedAt:new Date().toISOString()};textIds.forEach(k=>c[k]=val(k));numberIds.forEach(k=>c[k]=num(k));timeIds.forEach(([key,d,t])=>c[key]=combineDT(d,t));const i=cases.findIndex(x=>x.id===id);if(i>=0){Object.assign(cases[i],c);}else cases.push(c);saveLocal();const synced=await saveCaseToSupabase(i>=0?cases[i]:c);if(synced)await loadFromSupabase();showView('home');};
function editCase(id){const c=cases.find(x=>x.id===id);if(!c)return;resetForm();$('#caseId').value=c.id;$('#caseNumber').value=c.caseNumber;$('#caseAuditPeriod').value=periodOf(c);$('#caseDate').value=c.date||defaultPeriodDate(periodOf(c));textIds.forEach(k=>{if(c[k]!==undefined)$('#'+k).value=c[k];});numberIds.forEach(k=>$('#'+k).value=c[k]??(k==='codeine30'?c.codeine??0:0));$('#ibuprofenNP').checked=c.ibuprofenNP===true;$('#intraopEntries').innerHTML='';(c.intraopMedications||[]).forEach(addIntraopEntry);timeIds.forEach(([key,d,t])=>splitDT(c[key],d,t,key.endsWith('StopTime')||key==='dischargeTime'));(c.observations||[]).forEach(addObservation);(c.simpleObservations||[]).forEach(addSimpleObservation);$('#deleteCase').classList.remove('hidden');updateConditional();$('#scheduleHint').textContent=`${c.observations?.length||0} saved observation(s). Generate / refresh to recalculate.`;showView('form');}
$('#deleteCase').onclick=async()=>{const id=val('caseId');if(!id||!confirm('Delete this case?'))return;try{const {error}=await supabaseClient.from('gynae_audit_cases').delete().eq('id',id);if(error)throw error;cases=cases.filter(c=>c.id!==id);saveLocal();resetForm();showView('home');}catch(error){console.error('Supabase delete error:',error);alert('Unable to delete this case from Supabase.');}};
function esc(s){const d=document.createElement('div');d.textContent=String(s??'');return d.innerHTML;}
function renderCases(){
 const selected=periodCases();
 syncPeriodSelector();
 $('#caseCount').textContent=selected.length;
 $('#obsCount').textContent=selected.reduce((a,c)=>a+(c.observations?.length||0),0);
 $('#incompleteCount').textContent=selected.filter(c=>!c.procedure||!c.asa).length;
 $('#auditWeek').textContent=selectedPeriod===HISTORICAL_PERIOD?'Audit period: 01 Feb 2025 – 07 Feb 2025':`Audit week: ${AUDIT_MONDAY} – ${datePlus(AUDIT_MONDAY,6)}`;
 const area=$('#caseList');area.innerHTML='';
 if(!selected.length){area.innerHTML='<div class="empty">No cases in this audit period yet.<br>Tap “New patient” to start.</div>';return;}
 selected.slice().sort((a,b)=>(b.caseNumber||0)-(a.caseNumber||0)).forEach(c=>{
  const d=document.createElement('div');d.className='case-item';
  d.innerHTML=`<div><b>Case ${esc(c.caseNumber)}</b><small>${esc(c.date)} · ${esc(c.procedure||'No procedure')}<br>${c.observations?.length||0} scheduled observation(s)</small></div><button type="button">Edit</button>`;
  d.querySelector('button').onclick=()=>editCase(c.id);area.appendChild(d);
 });
}

const caseColumns=[['anaesthesiaType','Anaesthesia type'],['intraopMedications','Intraoperative medications'],['ondansetronRoute','Ondansetron route'],['cyclizineRoute','Cyclizine route'],['caseNumber','Case Number'],['date','Date'],['procedure','Procedure'],['asa','ASA'],['postopCare','Postop care'],['pca','PCA'],['pcaDrug','PCA drug'],['itDiamorph','IT Diamorphine'],['rsc','RSC'],['postopPrescriptions','Postop prescriptions'],['poPara','PO Paracetamol doses'],['ivPara','IV Paracetamol doses'],['codeine30','Codeine 30 mg doses'],['codeine60','Codeine 60 mg doses'],['ibuprofen','Ibuprofen doses'],['diclofenacTheatre','Diclofenac given in theatre'],['diclofenacPR','Diclofenac PR doses'],['oralOpiateDrug','Oral opiate'],['opiate2_5','Opiate 2.5 mg doses'],['opiate5','Opiate 5 mg doses'],['opiate10','Opiate 10 mg doses'],['opiate20','Opiate 20 mg doses'],['otherAnalgesia','Other analgesia'],['ondansetron','Ondansetron doses'],['cyclizine','Cyclizine doses'],['otherAntiemetics','Other antiemetics'],['chlorphenamine','Chlorphenamine doses'],['macrogol','Macrogol doses'],['peppermint','Peppermint pill doses'],['otherLaxatives','Other laxatives'],['pcaStartTime','PCA start'],['pcaStopTime','PCA stoppage'],['rscStartTime','RSC start'],['rscStopTime','RSC stoppage'],['itTime','IT Diamorphine time'],['recoveryTime','Recovery arrival'],['dischargeTime','Discharge']];
const obsColumns=[['requiredAt','Minimum required'],['reason','Monitoring reason'],['observationPostop','Observation postop'],['actualTime','Actual observation time'],['painScore','Pain score'],['nvScore','N & V score'],['sedationScore','Sedation score'],['functionalActivity','Function activity'],['itching','Itching'],['hallucination','Hallucination'],['totalPca','Total PCA administered'],['laBolus','LA bolus'],['rscRate','RSC rate'],['laToxicity','LA toxicity score'],['laSite','LA site assessment'],['motorPower','Motor power'],['sensoryScore','Sensory score'],['dermatomeHeight','Dermatome height'],['slt','SLT']];
function exportRows(period){const rows=[[...caseColumns,...obsColumns].map(x=>x[1])];periodCases(period).slice().sort((a,b)=>(a.caseNumber||0)-(b.caseNumber||0)).forEach(c=>{(c.observations?.length?c.observations:[{}]).forEach((o,i)=>{const s={p: c.pca==='Yes',r:c.rsc==='Yes',it:c.itDiamorph==='Yes',t:{pcaStart:parseDT(c.pcaStartTime),pcaStop:parseDT(c.pcaStopTime),rscStart:parseDT(c.rscStartTime),rscStop:parseDT(c.rscStopTime)}};const when=parseDT(o.requiredAt);rows.push([...caseColumns.map(([k])=>{if(i)return '';if(k==='intraopMedications')return (c.intraopMedications||[]).map(m=>[m.drug,m.dose,m.route].filter(Boolean).join(' / ')).join('; ');if(k==='ibuprofen')return c.ibuprofenNP?'NP':c.ibuprofen??'';if(k==='codeine30')return c.codeine30??c.codeine??0;return c[k]??'';}),...obsColumns.map(([k])=>{if(k==='totalPca'&&when&&!(s.p&&activeAt(s.t.pcaStart,s.t.pcaStop,when)))return '';if(['laBolus','rscRate','laToxicity','laSite'].includes(k)&&when&&!(s.r&&activeAt(s.t.rscStart,s.t.rscStop,when)))return '';if(['motorPower','sensoryScore','dermatomeHeight','slt'].includes(k)&&!s.it)return '';return o[k]??'';})]);});});return rows;}
$('#exportExcel').onclick=()=>{
 if(!window.XLSX){alert('Excel library could not load. Check internet connection.');return;}
 const wb=XLSX.utils.book_new();
 for(const [period,label] of [[HISTORICAL_PERIOD,'01-07 Feb 2025'],[CURRENT_PERIOD,'Current audit']]){
  const ws=XLSX.utils.aoa_to_sheet(exportRows(period));
  ws['!cols']=[...caseColumns,...obsColumns].map(([,h])=>({wch:Math.max(13,Math.min(32,h.length+2))}));
  XLSX.utils.book_append_sheet(wb,ws,label);
  const simpleRows=[['Case Number','Case Date','Observation Date','Observation Time','Pain score','N & V score']];
  periodCases(period).forEach(c=>(c.simpleObservations||[]).forEach(o=>simpleRows.push([c.caseNumber,c.date,o.date||'',o.time||'',o.painScore??'',o.nvScore??''])));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(simpleRows),period===HISTORICAL_PERIOD?'Feb 2025 Pain NV':'Current Pain NV');
 }
 XLSX.writeFile(wb,`Gynae_Audit_Two_Periods_${isoDate(new Date())}.xlsx`);
};
function downloadBackup(){const blob=new Blob([JSON.stringify({version:4,auditMonday:AUDIT_MONDAY,exportedAt:new Date().toISOString(),cases},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Gynae_Audit_Backup_${isoDate(new Date())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
$('#exportBackup').onclick=downloadBackup;
$('#importBackup').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text()),incoming=Array.isArray(j)?j:j.cases;if(!Array.isArray(incoming))throw Error('Invalid backup');if(!confirm(`Replace cloud data with ${incoming.length} case(s)? Download a backup first.`))return;const {error}=await supabaseClient.from('gynae_audit_cases').delete().not('id','is',null);if(error)throw error;for(const c of incoming){if(!c.id)c.id=crypto.randomUUID();if(!await saveCaseToSupabase(c))throw Error('Upload failed partway through');}cases=incoming;saveLocal();alert('Backup imported successfully.');showView('home');}catch(error){console.error('Backup import error:',error);alert('Backup import failed; cloud data may be partially changed.');}finally{e.target.value='';}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(console.error);
syncPeriodSelector();renderCases();loadFromSupabase();
