import { importSourcePath, styles, styleCatalog, recommendSourceIds, localStyleSuggestions, normaliseTone, transform, analyze, groups, tips, orderedPhotoGroups, qualityBreakdown, openStore, editsOf, sameEdits, prepareImage, rawJpegCandidates, withDecoded, releaseCanvas, drawDecoded, encodeJpegCopy } from './core.js';
const $=id=>document.getElementById(id);
let interfaceTheme='graphite';try{interfaceTheme=localStorage.getItem('fuji-studio-appearance')==='charcoal'?'charcoal':'graphite';}catch{}document.documentElement.dataset.theme=interfaceTheme;
let readingLayout='readable';try{readingLayout=localStorage.getItem('fuji-studio-layout')==='compact'?'compact':'readable';}catch{}document.documentElement.dataset.layout=readingLayout;
let studioIdentity='contact';try{studioIdentity=localStorage.getItem('fuji-studio-identity')==='plain'?'plain':'contact';}catch{}document.documentElement.dataset.identity=studioIdentity;
let toneNavigationBusy=false,toneContextStarted=false;const keptNameOrder=new Intl.Collator('zh-Hant',{numeric:true,sensitivity:'base'});
let exportController=null,readingMessageMarker=null,savingSession=false,readingAction=null,pendingSaves=0;
const saveErrors=new WeakMap();
const saveStatus=document.createElement('p');saveStatus.id='saveState';saveStatus.className='saveState';saveStatus.setAttribute('role','status');$('message').before(saveStatus);
const conflictPanel=document.createElement('section');conflictPanel.id='conflictPanel';conflictPanel.className='conflictPanel';conflictPanel.hidden=true;
const conflictText=document.createElement('p');conflictText.id='conflictText';conflictText.setAttribute('role','alert');conflictPanel.append(conflictText);
for(const [id,label] of [['conflictLocal','保留此分頁版本'],['conflictSaved','採用已保存版本']]) {const button=document.createElement('button');button.id=id;button.textContent=label;conflictPanel.append(button);}
$('editor').prepend(conflictPanel);
const formatNote=document.createElement('p');formatNote.textContent='為避免瀏覽器在解碼時耗盡記憶體，圖片標頭會先檢查 60 百萬像素與單邊 32768 像素限制。兩分頁衝突保護適用於更新後開啟的分頁；若仍開著更新前舊版，請先保留其未保存修改，再重新載入。';document.querySelector('.limits').append(formatNote);
let photos=[], selected=null, busy=false, grouped=true, store, originalPreview=null, previewToken=0, saveQueue=Promise.resolve(), exporting=false;
let viewMode=matchMedia('(max-width:760px)').matches?'overview':'focus',decisionBusy=false,lastDecision=null;
let comparisonToken=0,comparisonAnchor=null,comparisonOther=null,comparisonZoom=false,comparisonPoint={x:.5,y:.5};
let comparisonGroups=[],comparisonGroupIndex=0,comparisonPairs=new Map(),comparisonAnchorHistory=new Map(),comparisonWorking=false,comparisonFailure=null,comparisonAfterKeep=false;
try{comparisonAfterKeep=JSON.parse(localStorage.getItem('fuji-studio-comparison')||'{}').afterKeep==='tone';}catch{}
let comparisonCandidateBusy=false,comparisonCandidatePending=null;
const comparisonFactsOpen=new Set();
let folderRun=null,folderSequence=0,savedPhotoCount=0;
let previewError=false;
let sourceCategory='app';
let batchProfile=null,batchApplying=false,lastBatch=null,batchPreviewToken=0,batchPreviewBusy=false,comparisonUseTone=false;
const urls=new Map(), downloadURLs=new Set();
const styledThumbs=new Map(),thumbPending=new Map();let galleryGeneration=0,galleryUseTone=true;
const thumbnailProfile=p=>JSON.stringify(lookOf(p)),hasTone=p=>(p.style!=='original'&&p.strength>0)||Object.values(normaliseTone(p.adjustments)).some(value=>value!==0);
function updateGalleryLookStatus(){if(!$('galleryLookStatus'))return;const cards=[...$('gallery').querySelectorAll('.card')],pending=cards.filter(c=>c.dataset.look==='pending').length,failed=cards.filter(c=>c.dataset.look==='failed').length;$('galleryLookStatus').textContent=!galleryUseTone?'原始縮圖':failed?`${failed} 張預覽失敗，先顯示原圖`:pending?`本機調色 · ${pending} 張處理中`:'各張本機調色 · 非RAW開發';$('retryGalleryLooks').hidden=!failed;}
function releaseStyledThumbnail(id){const item=styledThumbs.get(id);if(item){URL.revokeObjectURL(item.url);styledThumbs.delete(id);}}
function updateCardLook(p,card,generation=galleryGeneration){
  if(!card)return;const img=card.querySelector('img'),label=card.querySelector('.lookLabel'),key=thumbnailProfile(p),toned=galleryUseTone&&hasTone(p),cached=styledThumbs.get(p.id);
  if(cached&&cached.key!==key)releaseStyledThumbnail(p.id);
  if(!toned){img.src=thumbnailURL(p);card.dataset.look='original';img.dataset.profileKey=key;label.textContent='原圖';updateGalleryLookStatus();return;}
  if(cached?.key===key){img.src=cached.url;card.dataset.look='tone';img.dataset.profileKey=key;label.textContent='本機調色';updateGalleryLookStatus();return;}
  if(img.dataset.profileKey!==key){img.src=thumbnailURL(p);img.dataset.profileKey=key;}card.dataset.look='pending';label.textContent='原圖 · 調色預覽中';updateGalleryLookStatus();
  const old=thumbPending.get(p.id);if(old?.key===key&&old.generation===generation)return;
  const job={key,generation};thumbPending.set(p.id,job);const active=()=>galleryUseTone&&generation===galleryGeneration&&card.isConnected&&thumbnailProfile(p)===key;
  void withDecoded(p.thumb,async decoded=>{
    if(!active())return;const canvas=document.createElement('canvas');let url;
    try{canvas.width=decoded.width;canvas.height=decoded.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});drawDecoded(ctx,decoded);const image=ctx.getImageData(0,0,canvas.width,canvas.height);transform(image.data,p.style,p.strength/100,p.adjustments);ctx.putImageData(image,0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('縮圖編碼失敗');if(!active())return;url=URL.createObjectURL(blob);img.loading='eager';img.src=url;await img.decode();if(!active()){URL.revokeObjectURL(url);return;}releaseStyledThumbnail(p.id);styledThumbs.set(p.id,{key,url});card.dataset.look='tone';label.textContent='本機調色';}
    catch(error){if(url)URL.revokeObjectURL(url);throw error;}finally{releaseCanvas(canvas);}
  },active).catch(()=>{if(active()){img.src=thumbnailURL(p);card.dataset.look='failed';label.textContent='原圖 · 預覽失敗';}}).finally(()=>{if(thumbPending.get(p.id)===job)thumbPending.delete(p.id);updateGalleryLookStatus();});
}
function refreshCurrentThumbnail(){const p=current();if(p)updateCardLook(p,[...$('gallery').querySelectorAll('.card')].find(card=>card.dataset.id===p.id));}
const PAGE_SIZE=48;let galleryPage=0,groupSnapshot=[],groupMembership=[];
function photoGroups(){
  // Membership depends on pixels and the manual split, not on review or tone edits.
  if(groupSnapshot.length!==photos.length||photos.some((p,i)=>{const old=groupSnapshot[i];return old.photo!==p||old.metrics!==p.metrics||old.split!==Boolean(p.separateGroup);})){groupMembership=orderedPhotoGroups(photos).map(g=>g.items);groupSnapshot=photos.map(photo=>({photo,metrics:photo.metrics,split:Boolean(photo.separateGroup)}));}
  return groupMembership.map(items=>({items,best:items.filter(p=>p.decision!=='exclude').sort((a,b)=>b.metrics.score-a.metrics.score||a.name.localeCompare(b.name))[0]?.id||null}));
}
function trimThumbnailURLs(ids){const retain=new Set(ids);if(selected)retain.add(selected);for(const [id,url]of urls)if(!retain.has(id)){URL.revokeObjectURL(url);urls.delete(id);}}
const msg=(text,error=false)=>{$('message').textContent=text;$('message').classList.toggle('error',error);$('message').classList.toggle('quiet',!error&&(text.startsWith('已儲存')||/^新增 \d+ 張 · 重複 \d+ 張 · 失敗 0 張$/.test(text)||text.startsWith('已恢復')));placeReadingMessage();if(error&&photos.some(p=>p._dirty))openReadingRecoveryOptions();};
function hydrate(record) { return {...record, revision:record.revision||0, _dirty:false, _conflict:null, _legacyMetrics:record.metrics.version!==2}; }
function updateSaveState() {
  const pending=photos.filter(p=>p._dirty).length,persist=$('persist').checked,conflicted=photos.some(p=>p._conflict),writing=savingSession||pendingSaves>0,failed=photos.find(p=>p._dirty&&saveErrors.has(p)),reason=failed?saveErrors.get(failed):'';
  $('saveState').dataset.state=!photos.length?'empty':!persist?'memory':conflicted?'conflict':writing?'saving':pending?'dirty':'saved';$('saveState').hidden=!photos.length;
  $('saveState').textContent=!persist?`本分頁模式 · ${pending} 張未保存；關閉或刷新不保留新變更。${conflicted?'仍有保存衝突，請先處理。':''}`:conflicted?'保存衝突 · 請選擇版本':writing?'正在保存…':pending?`${pending} 張尚未保存${reason?' · '+reason:''}`:'瀏覽器已存';
  if(photos.length&&persist&&!pending&&!writing&&!conflicted)$('saveState').prepend(studioIcon('check'));
  $('saveState').classList.toggle('error',conflicted||(persist&&pending>0&&!writing));setButtonBusy('save',writing);
  const p=current();$('conflictPanel').hidden=!p?._conflict;
  if(p?._conflict)$('conflictText').textContent=`「${p.name}」已由另一個分頁保存。此分頁的修改仍保留，尚未覆蓋已保存版本。請選擇要保留的版本。`;
}
async function persistSnapshot(p,snapshot) {
  if(!store)throw new Error('本機資料庫無法使用');
  try {
    let saved;
    if(p.revision===null) {
      const result=await store.insert({...p,...snapshot});saved=result.record;
      if(!result.inserted&&!sameEdits(saved,snapshot)) {const e=new Error('另一個分頁已有此照片的版本。');e.code='CONFLICT';e.current=saved;throw e;}
    } else saved=await store.save(p.id,p.revision,snapshot);
    p.revision=saved.revision||0;p._dirty=!sameEdits(p,snapshot);p._conflict=null;saveErrors.delete(p);updateSaveState();
  } catch(error) {p._dirty=true;saveErrors.set(p,error.code==='CONFLICT'?'版本衝突':error.code==='CAPACITY_LIMIT'?'400張上限':error.name==='QuotaExceededError'?'保存空間不足':'保存失敗');if(error.code==='CONFLICT')p._conflict=error.current;updateSaveState();openReadingRecoveryOptions();throw error;}
}
function enqueueSave(p,snapshot) {pendingSaves++;updateSaveState();const work=saveQueue.catch(()=>{}).then(()=>persistSnapshot(p,snapshot)).finally(()=>{pendingSaves--;updateSaveState();});saveQueue=work;return work;}
function saveOne(photo) {
  photo._dirty=true;updateSaveState();
  if(!$('persist').checked){msg('修改保留於目前分頁；已關閉本機保存，刷新不會保留本次變更。');return Promise.resolve(true);}
  return enqueueSave(photo,editsOf(photo)).then(()=>{msg('已儲存於這個瀏覽器。');return true;},error=>{msg(error.code==='CONFLICT'?'保存衝突：請在風格工作台選擇要保留的版本。':error.code==='CAPACITY_LIMIT'?'本機保存總量已達400張（包含其他資料夾）；這張修改仍在本分頁，請先另存副本。舊資料未刪除。':'本機保存失敗：修改仍在此分頁。請保留原片，釋放空間後按「儲存工作階段」重試，或先另存風格副本。',true);return false;});
}
async function saveToneEdit(photo){
 const saved=await saveOne(photo);
 if(!saved&&selected===photo.id&&$('persist').checked&&document.body.dataset.stage==='tone'&&!busy&&!exporting&&!batchApplying&&!decisionBusy&&!toneNavigationBusy&&!document.querySelector('dialog[open]'))showSaveRecovery();
 return saved;
}
function updateExportState() {$('export').disabled=exporting||toneNavigationBusy||!originalPreview||!current();if($('previewStatus')){$('preview').hidden=!originalPreview;$('previewStatus').hidden=Boolean(originalPreview);$('previewStatus').textContent=previewError?'預覽解碼未成功；原片仍保留，可按重試。':'正在本機準備完整預覽…';$('retryPreview').hidden=!previewError;$('previewPlaceholder').hidden=Boolean(originalPreview)||!current();}describeDisabled('export',exporting?'正在製作副本':toneNavigationBusy?'正在切換照片':!current()?'先選照片':previewError?'預覽失敗，請先重試':'正在載入照片');updateDecisionControls();}
function setBusy(value) {busy=value;for(const id of ['choose','importTop','save','persist'])if($(id))$(id).disabled=value||exporting||batchApplying||toneNavigationBusy||Boolean(folderRun)||(savingSession&&['save','persist'].includes(id))||$(id).dataset.unsupported==='true';for(const id of ['choose','importTop'])setButtonBusy(id,value);setButtonBusy('save',savingSession||pendingSaves>0);setButtonBusy('export',exporting);setButtonBusy('folderConfirm',Boolean(folderRun?.phase==='committing'&&value));for(const id of ['choose','importTop'])describeDisabled(id,$(id)?.dataset.unsupported==='true'?'此瀏覽器不支援資料夾':folderRun?'先完成或取消資料夾選取':'正在處理照片');describeDisabled('save',savingSession?'正在保存':folderRun?'先完成或取消資料夾選取':'正在處理照片');$('progressArea').hidden=!value;updateExportState();}
function thumbnailURL(p) {if(!urls.has(p.id))urls.set(p.id,URL.createObjectURL(p.thumb));return urls.get(p.id);}
function updateSummary(){const keep=photos.filter(p=>p.decision==='keep').length;$('summary').textContent=photos.length?`${photos.length} 張畫面，${keep} 張已決定留下。`:'你的下一段記憶，從這裡開始。';$('count').textContent=`${photos.length} 張 · 保留 ${keep} 張`;$('workspace').hidden=!photos.length;document.body.classList.toggle('working',photos.length>0);if($('reviewProgress'))$('reviewProgress').textContent=`待決定 ${photos.filter(p=>p.decision==='pending').length} · 保留 ${keep}`;}
function render({revealSelection=false}={}) {
  galleryGeneration++;updateSummary();updateSaveState();const gallery=$('gallery');gallery.replaceChildren();
  const all=photoGroups(), visible=p=>$('filter').value==='all'||p.decision===$('filter').value;
  const entries=grouped?all:photos.map(p=>({items:[p],best:all.find(g=>g.items.includes(p)).best}));
  const ordered=entries.flatMap(g=>g.items.filter(visible)),pages=Math.max(1,Math.ceil(ordered.length/PAGE_SIZE));
  if(revealSelection){const index=ordered.findIndex(p=>p.id===selected);if(index>=0)galleryPage=Math.floor(index/PAGE_SIZE);}
  galleryPage=Math.max(0,Math.min(galleryPage,pages-1));const shown=ordered.slice(galleryPage*PAGE_SIZE,(galleryPage+1)*PAGE_SIZE),shownIds=new Set(shown.map(p=>p.id));trimThumbnailURLs(shownIds);
  for(const id of styledThumbs.keys())if(!galleryUseTone||!shownIds.has(id))releaseStyledThumbnail(id);
  if($('galleryPager')){$('galleryPager').hidden=pages===1;$('galleryRange').textContent=ordered.length?`${galleryPage*PAGE_SIZE+1}–${Math.min((galleryPage+1)*PAGE_SIZE,ordered.length)} / ${ordered.length} 張`:'0 張';$('prevPhotoPage').disabled=galleryPage===0;$('nextPhotoPage').disabled=galleryPage===pages-1;const select=$('photoPageSelect');select.replaceChildren();for(let i=0;i<pages;i++){const option=document.createElement('option');option.value=i;option.textContent=`第 ${i+1} / ${pages} 頁`;select.append(option);}select.value=galleryPage;}
  for(const [i,g] of entries.entries()) {
    const items=g.items.filter(p=>shownIds.has(p.id));if(!items.length)continue;
    const section=document.createElement('section');section.className=`group${g.items.length===1?' singleton':''}`;
    const title=document.createElement('div');title.className='groupTitle';title.textContent=g.items.length>1?`相似候選 ${String(i+1).padStart(2,'0')} · ${g.items.length} 張`:`畫面 ${String(i+1).padStart(2,'0')}`;
    if(g.items.length>1){const note=document.createElement('span');note.textContent=`依畫面規則 · 請人工確認${items.length<g.items.length?' · 本頁部分候選':''}`;title.append(note);}section.append(title);
    const cards=document.createElement('div');cards.className='cards';
    for(const p of items) {
      const card=document.createElement('button');card.className=`card${selected===p.id?' active':''}${p.decision==='exclude'?' excluded':''}`;card.dataset.id=p.id;card.dataset.format=p.sourceFormat;card.dataset.nameCollision=String(Boolean(photoContext(p)));card.setAttribute('aria-label',`編輯 ${photoLabel(p)}`);card.setAttribute('aria-pressed',String(selected===p.id));
      const img=document.createElement('img');img.src=thumbnailURL(p);img.alt=p.demo?'合成測試圖，非實拍':p.name;img.loading='lazy';card.append(img);
      const look=document.createElement('span');look.className='lookLabel';look.id=`gallery-look-${p.id}`;card.setAttribute('aria-describedby',look.id);card.append(look);
      if(p.sourceFormat==='RAF'){const format=document.createElement('span');format.className='formatBadge';format.textContent='RAF · JPEG預覽';card.append(format);}
      if(g.best===p.id && g.items.length>1){const badge=document.createElement('span');badge.className='badge';if(readingLayout==='readable'){badge.append(studioIcon('chart'),document.createTextNode('規則較佳'));badge.title='本組縮圖細節／曝光較佳，不是人物或美感判斷';}else badge.textContent='細節／曝光優先';card.append(badge);}
      if(p.decision!=='pending'){const state=document.createElement('span');state.className='state';if(readingLayout==='readable')state.append(studioIcon(p.decision==='keep'?'check':'exclude'),document.createTextNode(p.decision==='keep'?'已保留':'已排除'));else state.textContent=p.decision==='keep'?'♡ 已保留':'已排除';card.append(state);}
      const info=document.createElement('div');info.className='cardInfo';const name=document.createElement('strong');name.textContent=p.name;if(p.sourcePath){const origin=document.createElement('span');origin.className='sourceTag';origin.textContent=photoContext(p)||p.sourcePath.split('/').at(-2);origin.id=`source-${p.id}`;card.setAttribute('aria-describedby',`gallery-look-${p.id}${photoContext(p)?'':` source-${p.id}`}`);info.append(origin);card.title=photoContext(p)?photoLabel(p):p.sourcePath;}const detail=document.createElement('small');detail.textContent=`${p.demo?'合成 · ':''}${p.width} × ${p.height} · 規則 ${p.metrics.score}`;info.prepend(name);info.append(detail);card.append(info);card.onclick=async event=>{const keyboard=event.detail===0;await select(p.id,{openViewer:true});if(keyboard&&selected===p.id&&document.activeElement===document.body&&!document.querySelector("dialog[open]")){const title=$("viewerName");title.tabIndex=-1;$("viewer").scrollIntoView({block:"start"});title.focus({preventScroll:true});}};cards.append(card);
    }
    section.append(cards);gallery.append(section);
  }
  if(!gallery.children.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='這個篩選條件沒有照片。已排除的原片仍會保留。';gallery.append(empty);}
  for(const card of gallery.querySelectorAll('.card'))updateCardLook(photos.find(p=>p.id===card.dataset.id),card);updateGalleryLookStatus();applyReadingUI();
}
function focusContext(node,{onlyIfLost=false}={}){const active=document.activeElement,usable=e=>e&&e!==document.body&&e.isConnected&&!e.disabled&&e.getClientRects().length&&getComputedStyle(e).visibility!=="hidden";if(onlyIfLost&&usable(active))return;if(!usable(node))return;if(!node.matches("button,input,select,summary,a[href]"))node.tabIndex=-1;node.scrollIntoView({block:"center",inline:"nearest"});node.focus({preventScroll:true});}
function focusGalleryContext(){focusContext($("gallery").querySelector(".card.active")||$("gallery").querySelector(".card")||$("gallery"));}
function current(){return photos.find(p=>p.id===selected);}
function photoContext(photo){
  if(!photo||!photos.some(other=>other.id!==photo.id&&other.name.normalize('NFC').toLocaleLowerCase('en-US')===photo.name.normalize('NFC').toLocaleLowerCase('en-US')))return '';
  try{return importSourcePath(photo.sourcePath,photo.name).split('/').slice(1,-1).join('/')||'所選資料夾根目錄';}
  catch{return '來源資訊不足 · '+photo.id;}
}
function photoLabel(photo){const context=photoContext(photo);return photo.name+(context?' · '+context:'');}
function renderQuality(p) {
  if($('sourcePath')){$('sourcePath').hidden=!p.sourcePath;$('sourcePath').textContent=p.sourcePath?'本機來源：'+p.sourcePath:'';}
  $('quality').replaceChildren();for(const tip of tips(p.metrics)){const li=document.createElement('li');li.textContent=tip;$('quality').append(li);}
  if(p.sourceFormat==='RAF'){const li=document.createElement('li');li.textContent='目前只量測RAF內嵌JPEG；尺寸、清晰度與色調不是RAW解碼結果，也不能判斷RAW的可恢復高光。';$('quality').prepend(li);}
  if($('rawPair')){const candidates=rawJpegCandidates(photos,p);$('rawPair').hidden=!candidates.length;$('rawPairText').textContent=candidates.length===1?(p.sourcePath&&candidates[0].sourcePath?'找到同一批資料夾、相同父路徑的同名JPEG／RAF候選；仍請人工比較，兩個原檔與標記保留。':'找到同名JPEG／RAF候選，來源路徑不足以確認同次拍攝；請人工比較，兩個原檔與標記保留。'):`找到 ${candidates.length} 個同名JPEG／RAF候選；可能來自不同資料夾，不自動配對或合併。比較視窗可切換候選。`;$('compareRawPair').onclick=()=>openPhotoComparison(candidates.map(item=>item.id));}
  if($('scoreBreakdown')){
    const q=qualityBreakdown(p.metrics);$('scoreBreakdown').textContent=`規則 ${q.total}/100：細節 ${q.detail.toFixed(1)}/70，曝光 ${q.exposure.toFixed(1)}/30。細節來自最長邊320像素縮圖的邊緣能量 ${q.sharpness}；曝光依暗部 ${Math.round(q.dark*100)}% 與高光 ${Math.round(q.bright*100)}% 扣分。這不辨識主體、人物、眼睛、表情或喜好。`;
    const g=photoGroups().find(g=>g.items.some(item=>item.id===p.id)),eligible=g?.items.filter(item=>item.decision!=='exclude').sort((a,b)=>b.metrics.score-a.metrics.score)||[],gap=eligible.length>1?eligible[0].metrics.score-eligible[1].metrics.score:null;
    $('groupReason').textContent=g?.items.length>1?(gap===null?'其他候選已由你排除，保留你的人工決定。':gap<5?`本組前兩張只差 ${gap} 分，差距小，請人工比較主體與表情。`:`本組前兩張差 ${gap} 分，只代表縮圖細節／曝光差異，仍需人工確認。`):p.separateGroup?'這張由你指定獨立，原片與其他選片決定都保留。':'目前沒有足夠相似的畫面；不推定它是連拍。';
    $('splitGroup').textContent=p.separateGroup?'恢復自動分組':'讓這張獨立';
  }
}
async function select(id,{openViewer=false}={}) {
  selected=id;const p=current();if(!p)return;if(!exporting&&$('exportProgress'))$('exportProgress').hidden=true;const token=++previewToken;originalPreview=null;previewError=false;if($('previewPlaceholder'))$('previewPlaceholder').src=thumbnailURL(p);updateExportState();releaseCanvas($('preview'));render({revealSelection:true});
  if(openViewer){setViewMode('focus');setWorkspaceStage('review');}if($('viewerName'))$('viewerName').textContent=photoLabel(p);
  $('photoName').textContent=photoLabel(p);$('dimensions').textContent=`${p.width} × ${p.height} px${Math.max(p.width,p.height)>1200?' · 縮圖預覽；副本'+(Math.max(p.width,p.height)>8192?'長邊8192px':'依原尺寸'):''}${p.sourceFormat==='RAF'?' · RAF內嵌JPEG預覽尺寸，非RAW完整尺寸':''}${p.demo?' · 合成測試，非 X100VI 實拍':''}`;
  $('export').textContent=p.sourceFormat==='RAF'?'另存內嵌預覽副本 ↓':'另存風格副本 ↓';
  $('strength').value=p.strength;$('strengthValue').textContent=p.strength+'%';$('intent').value=p.intent;
  for(const id of ['keep','exclude','resetDecision'])$(id).setAttribute('aria-pressed',String(p.decision===({keep:'keep',exclude:'exclude',resetDecision:'pending'}[id])));
  renderQuality(p);
  renderStyles();$('export').disabled=true;
  try {
    await withDecoded(p.blob,bitmap=>{
      if(token!==previewToken)return;
      const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
      try {
        canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
        const ctx=canvas.getContext('2d',{willReadFrequently:true,colorSpace:'srgb'});drawDecoded(ctx,bitmap,0,0,canvas.width,canvas.height);
        if(p._legacyMetrics){const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let alpha=0;for(let i=3;i<data.length;i+=4)alpha+=data[i]/255;p.metrics.alpha=alpha/(data.length/4);p._legacyMetrics=false;renderQuality(p);}
        ctx.globalCompositeOperation='destination-over';ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='source-over';
        originalPreview=ctx.getImageData(0,0,canvas.width,canvas.height);drawPreview();
      }finally{releaseCanvas(canvas);}
    },()=>token===previewToken);
  }catch{if(token===previewToken){previewError=true;msg('無法讀取預覽；原片與修改仍保留，可按重試。',true);}}
  finally{if(token===previewToken){updateExportState();if(openViewer&&matchMedia('(max-width:760px)').matches)$('viewer').scrollIntoView({block:'start'});}}
}
function renderStyles() {
  const p=current();if(!p)return;for(const canvas of $('styles').querySelectorAll('canvas'))releaseCanvas(canvas);$('styles').replaceChildren();
  const local=localStyleSuggestions(p),entries=styleCatalog.filter(entry=>entry.kind===sourceCategory),suggested=(sourceCategory==='app'?local.ids:recommendSourceIds(sourceCategory,p.intent)).map(id=>styleCatalog.find(entry=>entry.id===id)).filter(Boolean);
  document.querySelector('.styleHeader h3').textContent=sourceCategory==='app'?'推薦色調':sourceCategory==='lut'?'可用LUT':'相機設定參考';
  $('styleReason').textContent=sourceCategory==='app'?local.reason:'依你選的場景列出相機設定參考，未偵測人物／閃燈，也不會在JPEG上假裝重現官方／作者成像。';
  if(sourceCategory==='lut')$('styleReason').textContent='尚未匯入或提供LUT，不下載付費或來源不明的預設包。可使用本機後製或查看相機來源。';
  for(const entry of suggested){
    const b=document.createElement('button');b.className='styleButton sourceCard';b.id=entry.postProcess?`style-${entry.styleKey}`:`source-${entry.id}`;b.setAttribute('aria-pressed',String(entry.postProcess?p.style===entry.styleKey:p.referenceId===entry.id));b.setAttribute('aria-label',entry.postProcess?entry.name:`${entry.name}，機內設定參考`);b.title=entry.summary;
    if(entry.postProcess){const canvas=document.createElement('canvas');canvas.width=canvas.height=0;canvas.dataset.stylePreview=entry.styleKey;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${entry.name}：同一張照片的本機調色預覽`);b.append(canvas);}
    const title=document.createElement('strong');title.textContent=entry.name;const note=document.createElement('small');note.textContent=entry.postProcess?'本機近似 · '+entry.summary:entry.author+' · 機內參考';b.append(title,note);b.onclick=()=>chooseSource(entry);$('styles').append(b);
  }
  $('allStyles').replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent=entries.length?'自由選擇全部項目…':'此分類尚無可用項目';$('allStyles').append(blank);for(const entry of entries){const option=document.createElement('option');option.value=entry.id;option.textContent=entry.name;$('allStyles').append(option);}
  const active=sourceCategory==='app'?`app-${p.style}`:p.referenceId||'';$('allStyles').value=entries.some(entry=>entry.id===active)?active:'';
  $('allStyles').disabled=!entries.length;
  const reference=styleCatalog.find(entry=>entry.id===p.referenceId);$('referenceBox').hidden=!reference;if(reference)$('referenceText').textContent=`此張參考：${reference.name}／${reference.author}。只記錄相機設定參考，未套用到JPEG；目前本機後製為「${styles[p.style]?.name||p.style}」。`;
  applyReadingCopy();renderSourceDetails(styleCatalog.find(entry=>entry.id===active));for(const [key,value]of Object.entries(normaliseTone(p.adjustments))){$(`tone-${key}`).value=value;$(`tone-${key}-value`).textContent=value>0?'+'+value:String(value);}renderStylePreviews();
}
async function chooseSource(entry){const p=current();if(!p)return;if(entry.postProcess)p.style=entry.styleKey;else p.referenceId=entry.id;renderStyles();drawPreview();const saved=await saveToneEdit(p);if(saved&&!entry.postProcess&&selected===p.id)msg('已記錄此張的相機設定參考；目前JPEG色彩未因這項參考而改變。');}
function renderSourceDetails(entry){
  const content=$('sourceDetailsContent');content.replaceChildren();if(!entry){content.textContent='選一項後查看作者、版本、兼容性、事實參數與來源。';return;}
  for(const text of [`作者：${entry.author}`,`版本：${entry.version} · 核對 ${entry.reviewedAt}`,`兼容性：${entry.compatibility}`,`授權狀態：${entry.licenseStatus}`,...entry.notes]){const p=document.createElement('p');p.textContent=text;content.append(p);}
  const names={film:'機內模式',dr:'動態範圍',wb:'白平衡',red:'WB 紅',blue:'WB 藍',highlight:'高光',shadow:'陰影',color:'色彩',sharpness:'銳利度',noiseReduction:'高ISO NR',clarity:'Clarity',grain:'顆粒',colorChrome:'Color Chrome',fxBlue:'Color Chrome FX Blue'};const list=document.createElement('dl');for(const [key,value]of Object.entries(entry.parameters)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=names[key]||key;dd.textContent=String(value);list.append(dt,dd);}content.append(list);
  if(entry.sourceUrl){const link=document.createElement('a');link.href=entry.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='開啟作者／官方原始來源 ↗';content.append(link);}else{const note=document.createElement('p');note.textContent='來源：本專案自製近似參數，沒有官方成像或第三方預設檔。';content.append(note);}
  if(entry.compatibilitySource&&entry.compatibilitySource!==entry.sourceUrl){const line=document.createElement('p'),link=document.createElement('a');link.href=entry.compatibilitySource;link.target='_blank';link.rel='noopener noreferrer';link.textContent='查看作者的相容機型來源 ↗';line.append(link);content.append(line);}
}
function renderStylePreviews(){
  if(!originalPreview)return;const targets=$('styles').querySelectorAll('canvas[data-style-preview]');if(!targets.length)return;const p=current(),temp=document.createElement('canvas');
  try{temp.width=originalPreview.width;temp.height=originalPreview.height;temp.getContext('2d').putImageData(originalPreview,0,0);for(const canvas of targets){const scale=Math.min(1,180/Math.max(temp.width,temp.height));canvas.width=Math.max(1,Math.round(temp.width*scale));canvas.height=Math.max(1,Math.round(temp.height*scale));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(temp,0,0,canvas.width,canvas.height);const image=ctx.getImageData(0,0,canvas.width,canvas.height);transform(image.data,canvas.dataset.stylePreview,p.strength/100,p.adjustments);ctx.putImageData(image,0,0);}}
  finally{releaseCanvas(temp);}
}
function drawPreview() {
  const p=current();if(!p||!originalPreview)return;const canvas=$('preview');canvas.width=originalPreview.width;canvas.height=originalPreview.height;const ctx=canvas.getContext('2d');
  const edited=new ImageData(new Uint8ClampedArray(originalPreview.data),canvas.width,canvas.height);transform(edited.data,p.style,p.strength/100,p.adjustments);ctx.putImageData(edited,0,0);
  const split=Math.round(canvas.width*Number($('compare').value)/100);ctx.putImageData(originalPreview,0,0,0,0,split,canvas.height);ctx.fillStyle='#e8e8df';ctx.fillRect(split,0,Math.max(1,canvas.width/500),canvas.height);
  renderStylePreviews();
  refreshCurrentThumbnail();
}
async function inspectImportFile(file){
 if(!/\.(jpe?g|png|raf)$/i.test(file.name))throw new Error('不支援的格式，請使用 JPEG、PNG 或含JPEG預覽的RAF');
 const isRAF=/\.raf$/i.test(file.name),limit=isRAF?128:64;
 if(!file.size)throw new Error('空檔案');if(file.size>limit*1024*1024)throw new Error(`超過單張 ${limit} MB 上限`);
 let buffer=await file.arrayBuffer();const header=prepareImage(file,buffer,{raf:isRAF}),digest=await crypto.subtle.digest('SHA-256',buffer);buffer=null;
 return {header,id:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')};
}
async function createImportPhoto(file,header,id,{demo=false,active=()=>true,sourcePath,sourceBatch}={}){
 return withDecoded(file,async bitmap=>{
  if(!active())return null;
  if(bitmap.width!==header.width||bitmap.height!==header.height)throw new Error('解碼方向或尺寸與圖片標頭不一致，請先轉為標準 JPEG / PNG');
  const width=bitmap.width,height=bitmap.height,canvas=document.createElement('canvas'),scale=Math.min(1,320/Math.max(width,height));
  try{
   canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
   const ctx=canvas.getContext('2d',{willReadFrequently:true,colorSpace:'srgb'});drawDecoded(ctx,bitmap,0,0,canvas.width,canvas.height);
   const metrics=analyze(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
   ctx.globalCompositeOperation='destination-over';ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
   const thumb=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.86));if(!thumb)throw new Error('無法建立縮圖');
   return {id,name:file.name,blob:file,thumb,width,height,metrics,demo,sourceFormat:header.format,sourceCamera:header.camera||null,...(sourcePath?{sourcePath,sourceBatch}:{}),decision:'pending',style:'original',strength:60,intent:'travel',revision:null,_dirty:true,_conflict:null};
  }finally{releaseCanvas(canvas);}
 },active);
}
function setupFolderImport(){
 const input=document.createElement('input');input.id='folderFiles';input.type='file';input.multiple=true;input.hidden=true;input.setAttribute('webkitdirectory','');document.body.append(input);
 const supported='webkitdirectory'in input;
 for(const id of ['choose','importTop']){const button=$(id);button.dataset.unsupported=String(!supported);button.onclick=()=>{if(!supported){msg('此瀏覽器不支援資料夾選取，無法開啟照片；請使用提供此功能的瀏覽器。',true);return;}if(!busy&&!folderRun)input.click();};}
 if(!supported){$('folderSupportNote').hidden=false;$('folderSupportNote').textContent='此瀏覽器未提供資料夾選取，無法開啟照片。沒有單檔或雲端替代入口。';}
 input.onchange=()=>{const files=Array.from(input.files);input.value='';if(files.length)inspectFolder(files);else msg('資料夾沒有可讀檔案，目前來源與編輯未變。');};
 input.addEventListener('cancel',()=>msg('已取消資料夾選取，目前來源與編輯未變。'));
 const dialog=document.createElement('dialog');dialog.id='folderImport';dialog.className='studioDialog folderDialog';dialog.setAttribute('aria-labelledby','folderTitle');
 dialog.innerHTML='<h2 id="folderTitle">檢查資料夾</h2><p id="folderStatus" role="status" class="muted"></p><progress id="folderProgress" max="100" value="0"></progress><p id="folderRoot" hidden></p><p id="folderSummary"></p><details id="folderSources" hidden><summary id="folderSourcesTitle">來源路徑</summary><ol id="folderPaths"></ol></details><details id="folderErrors" hidden><summary id="folderErrorsTitle">失敗原因</summary><ul id="folderErrorList"></ul></details><details><summary>匯入規則與限制</summary><p>只保存相對路徑於本機。重複內容保留既有照片或依路徑排序的第一個來源，不改原有編輯。JPEG／PNG與RAF共用既有大小／尺寸檢查；RAF僅內嵌JPEG預覽。未確認前不加入，取消整批不留半批；本機寫入失敗可重試。</p></details><div id="folderSwitchGuard" hidden><p id="folderSwitchMessage" role="alert"></p><label id="folderDiscardLabel" hidden><input id="folderDiscard" type="checkbox"> 我確認放棄這些未保存的分頁變更；原檔與已保存版本保留</label></div><div class="folderActions"><button id="folderCancel">取消整批</button><button id="folderConfirm" class="primary" disabled>確認加入</button></div>';
 const overview=document.createElement('section');overview.id='folderOverview';overview.hidden=true;overview.setAttribute('aria-label','本次檔案檢查結果');dialog.querySelector('h2').after(overview);const counts=document.createElement('details');counts.id='folderCounts';const countTitle=document.createElement('summary');countTitle.textContent='完整計數';dialog.querySelector('#folderSummary').before(counts);counts.append(countTitle,dialog.querySelector('#folderSummary'));dialog.querySelector('details:not([id])').id='folderRules';document.body.append(dialog);$('folderCancel').onclick=cancelFolderImport;$('folderConfirm').onclick=commitFolderImport;$('folderDiscard').onchange=()=>{if(folderRun?.phase==='preview')updateFolderGuard(folderRun);};dialog.addEventListener('cancel',e=>{e.preventDefault();cancelFolderImport();});
 const recovery=document.createElement('section');recovery.id='folderCapacity';recovery.hidden=true;const note=document.createElement('p');note.id='folderCapacityNote';note.textContent='本機保存總量包含其他資料夾。可只在本分頁開啟這批照片，不刪舊資料；新變更在刷新或關閉後不保留。';const memory=document.createElement('button');memory.id='folderMemory';memory.textContent='僅本分頁開啟';memory.setAttribute('aria-describedby','folderCapacityNote');memory.onclick=()=>{const run=folderRun;if(!run?.capacityBlocked||run.phase!=='preview'||!updateFolderGuard(run))return;run.memoryMode=true;commitFolderImport();};recovery.append(note,memory);dialog.querySelector('.folderActions').before(recovery);
}
function showFolderOverview(run){
 const box=$('folderOverview'),items=[['readable','可開啟',run.records.length,'image','folderSources'],['failed','讀取失敗',run.stats.failed,'info','folderErrors'],['duplicate','重複',run.stats.duplicates,'layers','folderCounts'],['unsupported','不支援',run.stats.ignored,'exclude','folderRules'],['unchecked','未檢查',run.stats.unprocessed,'pending','folderCounts']];box.replaceChildren();const total=document.createElement('p');total.className='folderTotal';total.textContent=run.stats.total+' 個檔案';box.append(total);const bar=document.createElement('div');bar.className='folderDistribution';bar.setAttribute('aria-hidden','true');const grid=document.createElement('div');grid.className='folderCountGrid';for(const[kind,label,count,icon,target]of items){if(count){const segment=document.createElement('span');segment.dataset.kind=kind;segment.style.flexGrow=count;bar.append(segment);}if(!count&&kind!=='readable')continue;const tile=document.createElement(count?'button':'div');tile.className='folderCount';tile.dataset.kind=kind;tile.dataset.count=String(count);const name=document.createElement('span'),number=document.createElement('strong');name.append(studioIcon(icon),document.createTextNode(label));number.textContent=String(count);tile.append(name,number);if(count){tile.type='button';tile.setAttribute('aria-label',label+' '+count+' 個；展開'+(kind==='failed'?'原因':'詳情'));tile.onclick=()=>{const details=$(target);details.open=true;focusContext(details.querySelector('summary'));};}grid.append(tile);}box.append(bar,grid);const subsets=[];if(run.stats.reconnected)subsets.push('其中 '+run.stats.reconnected+' 張銜接編輯');const raf=run.records.filter(p=>p.sourceFormat==='RAF').length;if(raf)subsets.push('RAF '+raf+' 張僅內嵌JPEG預覽，非RAW顯影');if(subsets.length){const note=document.createElement('p');note.className='folderSubsets';note.textContent=subsets.join(' · ');box.append(note);}box.hidden=false;
}
function updateFolderGuard(run){
 const ids=new Set(run.records.map(p=>p.id)),conflicted=photos.some(p=>p._conflict),unsaved=photos.filter(p=>p._dirty),leaving=unsaved.filter(p=>!ids.has(p.id));
 const persist=!run.memoryMode&&$('persist').checked,mustResolve=conflicted||(persist&&unsaved.length>0),discardRequired=!mustResolve&&!persist&&leaving.length>0;
 $('folderSwitchGuard').hidden=!mustResolve&&!discardRequired;$('folderDiscardLabel').hidden=!discardRequired;
 $('folderSwitchMessage').textContent=mustResolve?'目前有未保存變更或跨分頁衝突。請取消回工作台處理後再開啟資料夾。':discardRequired?`有 ${leaving.length} 張未保存的變更不在這個資料夾；取消可保留原工作台，繼續需明確放棄。`:'';
 const allowed=run.records.length>0&&!mustResolve&&(!discardRequired||$('folderDiscard').checked);
 $('folderConfirm').disabled=!allowed;return allowed;
}
function folderMessage(run,text,error=false){
 if(folderRun!==run)return;$('folderStatus').textContent=text;$('folderStatus').className=error?'message error':'muted';
}
function releaseFolderRun(run){
 if(folderRun!==run)return;run.records.length=0;folderRun=null;$('folderOverview').hidden=true;$('folderCapacity').hidden=true;$('folderPaths').replaceChildren();$('folderErrorList').replaceChildren();$('folderStatus').textContent='';$('folderRoot').textContent='';$('folderSummary').textContent='';$("folderImport").close();setBusy(false);if(run.controller.signal.aborted)focusContext(run.returnFocus||$(photos.length?"importTop":"choose"),{onlyIfLost:true});
}
function cancelFolderImport(){
 const run=folderRun;if(!run)return;run.controller.abort();
 if(run.phase==='preview'){releaseFolderRun(run);msg('已取消整批資料夾匯入；沒有加入任何照片，原有編輯保留。');}
 else{$('folderCancel').disabled=true;folderMessage(run,'正在取消整批；等待目前本機工作結束，不會加入半批。');}
}
async function inspectFolder(files){
 if(busy||exporting||batchApplying||folderRun)return;
 const run={returnFocus:document.activeElement,id:++folderSequence,controller:new AbortController(),phase:'checking',records:[],stats:{total:files.length,ignored:0,duplicates:0,reconnected:0,failed:0,unprocessed:0},notes:[]};folderRun=run;
 const active=()=>folderRun===run&&!run.controller.signal.aborted,seen=new Set(),sourceBatch=crypto.randomUUID(),capacity=400;
 setBusy(true);$('folderOverview').hidden=true;$('folderCounts').open=false;$('folderDiscard').checked=false;$('folderSwitchGuard').hidden=true;$('folderTitle').textContent='檢查資料夾';$('folderCancel').disabled=false;$('folderConfirm').disabled=true;$('folderSummary').textContent='';$('folderRoot').textContent='';$('folderRoot').hidden=true;for(const id of ['folderSources','folderErrors']){$(id).hidden=true;$(id).open=false;}$('folderErrorList').replaceChildren();$('folderPaths').replaceChildren();$('folderProgress').hidden=false;$('folderProgress').value=0;$('folderImport').showModal();folderMessage(run,'正在檢查你選取的資料夾；尚未加入照片。');
 $('folderCapacity').hidden=true;$('folderMemory').disabled=false;$('folderMemory').classList.add('primary');$('folderConfirm').classList.add('primary');
 try{
  if(files.length>10000)throw new Error('資料夾超過10000個檔案，請改選較小的子資料夾；整批未加入');
  const candidates=[];
  for(const file of files){
   if(!/\.(jpe?g|png|raf)$/i.test(file.name)){run.stats.ignored++;continue;}
   try{candidates.push({file,path:importSourcePath(file.webkitRelativePath,file.name)});}catch(error){run.stats.failed++;if(run.notes.length<6)run.notes.push(file.name+'：'+error.message);}
  }
  candidates.sort((a,b)=>keptNameOrder.compare(a.path,b.path)||a.path.localeCompare(b.path));
  for(let i=0;i<candidates.length&&active();i++){
   if(run.records.length>=capacity){run.stats.unprocessed=candidates.length-i;break;}
   const {file,path}=candidates[i];$('folderProgress').value=(i+1)/candidates.length*100;folderMessage(run,`檢查 ${i+1} / ${candidates.length}：${file.name}`);
   try{
    const {header,id}=await inspectImportFile(file);if(!active())break;
    if(seen.has(id)){run.stats.duplicates++;continue;}
    let previous=photos.find(p=>p.id===id);if(!previous&&store){try{previous=await store.get(id);}catch{const error=new Error('本機編輯讀取失敗，整批未開啟；請重新載入後重選資料夾，原有來源與編輯保留');error.code='RESTORE_UNAVAILABLE';throw error;}}if(!active())break;
    const photo=await createImportPhoto(file,header,id,{active,sourcePath:path,sourceBatch});
    if(photo&&previous){Object.assign(photo,editsOf(previous),{revision:previous.revision??null,_dirty:Boolean(previous._dirty),_conflict:previous._conflict||null});run.stats.reconnected++;}
    if(!active())break;if(photo){run.records.push(photo);seen.add(id);}
   }catch(error){if(!active())break;if(error.code==='RESTORE_UNAVAILABLE')throw error;run.stats.failed++;if(run.notes.length<6)run.notes.push(path+'：'+error.message);}
   await new Promise(r=>setTimeout(r,0));
  }
  if(!active())return;
  run.phase='preview';$('folderTitle').textContent='匯入檢查';$('folderProgress').hidden=true;
  $('folderSummary').textContent=`共 ${run.stats.total} 個檔案 · 可開啟 ${run.records.length} 張 · 銜接既有編輯 ${run.stats.reconnected} 張 · 內容重複 ${run.stats.duplicates} 張 · 忽略非支援檔 ${run.stats.ignored} 個 · 失敗 ${run.stats.failed} 張 · 容量上限未檢查 ${run.stats.unprocessed} 張`;
  for(const p of run.records.slice(0,8)){const li=document.createElement('li');li.textContent=p.sourcePath;$('folderPaths').append(li);}
  let root=run.records[0]?.sourcePath.split('/')[0];if(!root){for(const file of files){try{root=importSourcePath(file.webkitRelativePath,file.name).split('/')[0];break;}catch{}}}$('folderRoot').hidden=false;$('folderRoot').textContent=root?'資料夾 · '+root:'來源未知';showFolderOverview(run);
  $('folderSources').hidden=!run.records.length;$('folderSourcesTitle').textContent=`來源路徑（${run.records.length}張${run.records.length>8?'，顯示前8筆':''}）`;
  $('folderErrors').hidden=!run.notes.length;$('folderErrorsTitle').textContent=`失敗原因（${run.stats.failed}張${run.stats.failed>6?'，顯示前6筆':''}）`;
  for(const note of run.notes){const li=document.createElement('li');li.textContent=note;$('folderErrorList').append(li);}
  folderMessage(run,(run.records.length?'原片不變 · 無上傳':'沒有可開啟照片；取消後改選資料夾。原片不變，無上傳。')+(!$('persist').checked?' · 僅本分頁，刷新不保留':''));
  $('folderConfirm').textContent=`開啟 ${run.records.length} 張`;await saveQueue.catch(()=>{});updateFolderGuard(run);
 }catch(error){run.records.length=0;run.phase='preview';$('folderConfirm').disabled=true;$('folderProgress').hidden=true;folderMessage(run,error.message,true);}
 finally{
  if(folderRun===run){if(run.controller.signal.aborted){releaseFolderRun(run);msg('已取消整批資料夾匯入；沒有加入任何照片，原有編輯保留。');}else setBusy(false);}
 }
}
async function commitFolderImport(){
 const run=folderRun;if(!run||run.phase!=='preview'||!run.records.length)return;
 run.phase='committing';setBusy(true);$('folderConfirm').disabled=true;$('folderMemory').disabled=true;$('folderCancel').disabled=false;folderMessage(run,'正在整批加入；完成前不會顯示部分照片。');
 try{
  await saveQueue.catch(()=>{});if(run.controller.signal.aborted)return;if(!updateFolderGuard(run)){run.phase='preview';return;}
  let results;
  const persisted=!run.memoryMode&&$('persist').checked;if(persisted){if(!store)throw new Error('本機資料庫無法使用，整批未加入');results=await store.insertBatch(run.records,{signal:run.controller.signal});}
  else results=run.records.map(record=>({record,inserted:true}));
  if(folderRun!==run||run.controller.signal.aborted)return;
  const fresh=new Map(run.records.map(p=>[p.id,p]));
  const replacement=results.map(({record})=>{const source=fresh.get(record.id);return {...(persisted?hydrate(record):record),name:source.name,blob:source.blob,thumb:source.thumb,width:source.width,height:source.height,metrics:source.metrics,sourceFormat:source.sourceFormat,sourceCamera:source.sourceCamera,sourcePath:source.sourcePath,sourceBatch:source.sourceBatch,demo:source.demo};});
  const previousSelected=selected;previewToken++;originalPreview=null;releaseCanvas($('preview'));galleryGeneration++;
  for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();for(const id of styledThumbs.keys())releaseStyledThumbnail(id);thumbPending.clear();
  releaseZipArtifact();zipTasks=[];lastDecision=null;lastBatch=null;readingAction=null;toneContextStarted=false;if(run.memoryMode)$('persist').checked=false;photos=replacement;selected=photos.some(p=>p.id===previousSelected)?previousSelected:null;galleryPage=0;$('filter').value='all';
  const root=run.records[0].sourcePath.split('/')[0];$('activeFolder').textContent=`資料夾 · ${root}`;$('activeFolder').title='本次選取，沒有持續連線或監看';$('activeFolder').hidden=false;
  const summary=`已開啟 ${replacement.length} 張 · 銜接既有編輯 ${run.stats.reconnected} 張 · 內容重複 ${run.stats.duplicates} 張 · 忽略 ${run.stats.ignored} 個 · 失敗 ${run.stats.failed} 張 · 容量上限未檢查 ${run.stats.unprocessed} 張${!persisted?'；新變更僅留本分頁。':''}`;
  releaseFolderRun(run);render();if(photos.length)await select(selected||photos[0].id);msg(summary,run.stats.failed>0||run.stats.unprocessed>0);

 }catch(error){if(folderRun===run&&!run.controller.signal.aborted){run.phase='preview';folderMessage(run,'整批未加入：'+error.message+'。暫存仍在，可重試或取消。',true);$('folderConfirm').disabled=false;if(error.code==='CAPACITY_LIMIT'){run.capacityBlocked=true;$('folderCapacity').hidden=false;$('folderConfirm').textContent='重試保存並開啟';$('folderConfirm').classList.remove('primary');}}}
 finally{if(folderRun===run){if(run.controller.signal.aborted){releaseFolderRun(run);msg('已取消整批資料夾匯入；沒有加入任何照片，原有編輯保留。');}else{$('folderMemory').disabled=false;setBusy(false);}}}
}
async function exportCopy() {
  const p=current();if(!p||exporting||toneNavigationBusy)return;const key=p.style,strength=p.strength,tone=normaliseTone(p.adjustments),controller=new AbortController();exportController=controller;exporting=true;setBusy(busy);$('exportProgress').hidden=false;$('cancelExport').hidden=false;$('cancelExport').disabled=false;$('exportWorkStatus').className='muted';msg('正在本機製作 JPEG 副本，請稍候…');
  $('cancelExport').scrollIntoView({block:'center'});
  try {
    const copy=await encodeJpegCopy(p.blob,{style:key,strength,adjustments:tone,signal:controller.signal,onProgress:progress=>{const bar=$('exportPixelProgress');bar.hidden=progress.phase!=='pixels';if(progress.phase==='pixels'){bar.value=progress.completedRows/progress.totalRows*100;$('exportWorkStatus').textContent=`「${p.name}」· 套用像素 ${Math.round(bar.value)}%（尚未完成JPEG）`;}else $('exportWorkStatus').textContent=`「${p.name}」· ${progress.phase==='encode'?'編碼JPEG（尚未完成）':'等待／解碼原片'}；使用開始時的本機參數。`;}});
    const link=document.createElement('a'),url=URL.createObjectURL(copy.blob);downloadURLs.add(url);link.href=url;link.download=`${p.name.replace(/\.[^.]+$/,'').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_')}${p.sourceFormat==='RAF'?'-raf-preview':''}-fuji-${key}-${strength}.jpg`;link.click();setTimeout(()=>{URL.revokeObjectURL(url);downloadURLs.delete(url);},60000);
    const result=`已建立 ${copy.width} × ${copy.height} JPEG 副本${p.sourceFormat==='RAF'?'（僅來自RAF內嵌JPEG，非RAW開發）':''}${copy.scaled?'（長邊已縮小至 8192）':''}，下載由瀏覽器處理。原檔未修改。`;msg(result);$('exportWorkStatus').textContent=`「${p.name}」${result}`;
  }catch(e){const cancelled=e.name==='AbortError',result=cancelled?'已取消製作，未產生新副本；原片與修改保留。':`另存失敗：${e.message}。原片與修改仍保留，可直接重試；若記憶體不足，請先關閉其他影像分頁。`;msg(result,!cancelled);$('exportWorkStatus').textContent=`「${p.name}」${result}`;$('exportWorkStatus').className=cancelled?'muted':'message error';}finally{const focus=document.activeElement,returnFocus=selected===p.id&&document.body.dataset.stage==='tone'&&(focus===document.body||focus===$('cancelExport')||focus===$('export'));exportController=null;exporting=false;$('cancelExport').hidden=true;$('exportPixelProgress').hidden=true;setBusy(busy);if(returnFocus&&!$('export').disabled){$('export').scrollIntoView({block:'center'});$('export').focus({preventScroll:true});}}
}
function setupToneLibrary(){
  document.querySelector('.styleHeader h3').textContent='推薦色調';const night=document.createElement('option');night.value='night';night.textContent='夜景／人工光';$('intent').append(night);
  const category=document.createElement('label');category.className='sourceCategory';category.textContent='來源分類 ';const select=document.createElement('select');select.id='sourceCategory';for(const [value,label]of [['app','本機後製'],['official','官方機內模式'],['recipe','創作者相機配方'],['lut','LUT（尚未提供）']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}select.onchange=()=>{sourceCategory=select.value;renderStyles();};category.append(select);$('styles').before(category);
  const allLabel=document.createElement('label');allLabel.className='allStylesLabel';allLabel.textContent='全部自由選擇 ';const all=document.createElement('select');all.id='allStyles';all.onchange=()=>{const entry=styleCatalog.find(item=>item.id===all.value);if(entry)chooseSource(entry);};allLabel.append(all);
  const reference=document.createElement('div');reference.id='referenceBox';reference.className='referenceBox';reference.hidden=true;const referenceText=document.createElement('p');referenceText.id='referenceText';const clear=document.createElement('button');clear.id='clearReference';clear.textContent='清除此張參考';clear.onclick=()=>{const p=current();if(!p)return;p.referenceId=null;renderStyles();saveToneEdit(p);};reference.append(referenceText,clear);
  const details=document.createElement('details');details.id='sourceDetails';const summary=document.createElement('summary');summary.textContent='作者、參數、兼容性與來源';const detailContent=document.createElement('div');detailContent.id='sourceDetailsContent';details.append(summary,detailContent);
  const tone=document.createElement('details');tone.id='toneDetails';const toneSummary=document.createElement('summary');toneSummary.textContent='單張微調 · 本機後製';tone.append(toneSummary);
  for(const [key,label]of [['brightness','亮度'],['warmth','暖冷'],['saturation','飽和度'],['contrast','反差']]){const control=document.createElement('label');control.className='sliderLabel';control.textContent=label;const value=document.createElement('output');value.id=`tone-${key}-value`;value.textContent='0';const input=document.createElement('input');input.id=`tone-${key}`;input.type='range';input.min=-40;input.max=40;input.step=1;input.value=0;input.setAttribute('aria-label',`${label}（本機微調）`);input.oninput=()=>{const p=current();if(!p)return;p.adjustments={...normaliseTone(p.adjustments),[key]:Number(input.value)};p._dirty=true;value.textContent=Number(input.value)>0?'+'+input.value:input.value;updateSaveState();drawPreview();};input.onchange=()=>{if(current())saveToneEdit(current());};control.append(value,input);tone.append(control);}
  const reset=document.createElement('button');reset.id='resetTone';reset.textContent='重設微調';reset.onclick=()=>{const p=current();if(!p)return;p.adjustments=normaliseTone();renderStyles();drawPreview();saveToneEdit(p);};const note=document.createElement('p');note.className='muted';note.textContent='這些是JPEG／PNG像素調整，不等同相機白平衡、ISO或官方底片模擬。規則分數仍根據原片；不同光線需要人工比較。';tone.append(reset,note);$('styles').after(allLabel,reference,details,tone);
  $('strength').closest('label').firstChild.textContent='本機近似強度 ';document.querySelector('.comparison .after').textContent='本機後製';
  const shared=document.createElement('div');shared.className='sharedToneActions';const copy=document.createElement('button');copy.id='copyTone';copy.textContent='沿用到已保留照片';copy.onclick=openBatchTone;const undo=document.createElement('button');undo.id='undoBatchTone';undo.textContent='復原上次批次';undo.disabled=true;undo.onclick=undoBatchTone;const status=document.createElement('p');status.id='batchToneStatus';status.className='muted';status.setAttribute('role','status');shared.append(copy,undo,status);tone.after(shared);
  const exportProgress=document.createElement('section');exportProgress.id='exportProgress';exportProgress.hidden=true;exportProgress.setAttribute('aria-label','副本製作進度');const exportStatus=document.createElement('p');exportStatus.id='exportWorkStatus';exportStatus.className='muted';exportStatus.setAttribute('role','status');const exportBar=document.createElement('progress');exportBar.id='exportPixelProgress';exportBar.max=100;exportBar.value=0;exportBar.hidden=true;exportBar.setAttribute('aria-label','副本像素處理進度');const cancelExport=document.createElement('button');cancelExport.id='cancelExport';cancelExport.textContent='取消製作副本';cancelExport.onclick=()=>{if(!exportController||!exporting)return;exportController.abort();cancelExport.disabled=true;exportStatus.textContent='正在取消；已開始的原生解碼／JPEG編碼可能需要稍等。';};exportProgress.append(exportStatus,exportBar,cancelExport);$('export').after(exportProgress);
  const dialog=document.createElement('dialog');dialog.id='batchTone';dialog.className='studioDialog';dialog.setAttribute('aria-labelledby','batchToneTitle');const header=document.createElement('div');header.className='comparisonHeader';const title=document.createElement('h2');title.id='batchToneTitle';title.textContent='批次沿用';const cancel=document.createElement('button');cancel.id='cancelBatchTone';cancel.textContent='取消';cancel.onclick=closeBatchTone;header.append(title,cancel);const profileSummary=document.createElement('p');profileSummary.id='batchProfileSummary';profileSummary.className='referenceBox';const notice=document.createElement('p');notice.className='muted';notice.textContent='範圍：其他已保留照片，含總覽其他頁。僅取代勾選照片的色調、強度與四項微調；相機參考與選片標記不變。前6張為縮圖預覽，效果請逐張確認。上次沿用可在本分頁復原，原檔不變。';const list=document.createElement('div');list.id='batchToneList';const apply=document.createElement('button');apply.id='applyBatchTone';apply.className='primary';apply.onclick=applyBatchTone;dialog.append(header,profileSummary,notice,list,apply);dialog.addEventListener('cancel',event=>{if(batchApplying)event.preventDefault();else closeBatchTone();});document.body.append(dialog);const batchInsets=new ResizeObserver(updateBatchInsets);batchInsets.observe(header);batchInsets.observe(apply);
}
// Original generic SVG geometry; no external icon/font asset or requests.
const studioPaths={
 horizon:['M2 12h20'],import:['M12 3v12m-4-4 4 4 4-4','M5 15v5h14v-5'],download:['M12 3v12m-4-4 4 4 4-4','M5 19h14'],
 check:['M5 12l4 4L19 6'],exclude:['M6 6l12 12M18 6 6 18'],pending:['M12 8v5','M12 17h.01','M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'],
 left:['M19 12H5m6-6-6 6 6 6'],right:['M5 12h14m-6-6 6 6-6 6'],down:['M6 9l6 6 6-6'],folder:['M3 6h7l2 3h9v12H3z','M3 6V3h7l2 3'],undo:['M8 5 3 10l5 5','M3 10h11a6 6 0 0 1 0 12'],
 grid:['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
 image:['M3 4h18v16H3z','M3 16l5-5 4 4 3-3 6 6','M15 8h.01'],compare:['M3 4h18v16H3z','M12 2v20'],
 sliders:['M4 3v18M12 3v18M20 3v18','M1 8h6M9 16h6M17 7h6'],save:['M4 3h13l3 3v15H4z','M8 3v6h8V3M8 15h8v6'],
 archive:['M3 4h18v5H3z','M5 9v12h14V9M10 13h4'],layers:['M3 7l9-4 9 4-9 4z','M3 12l9 4 9-4M3 17l9 4 9-4'],
 copy:['M8 3h13v14H8z','M16 17v4H3V7h5'],lock:['M7 10V7a5 5 0 0 1 10 0v3','M5 10h14v11H5zM12 14v3'],
 info:['M12 11v6M12 7h.01','M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'],chart:['M4 3v18h17','M8 16v-4M13 16V7M18 16v-7'],close:['M5 5l14 14M19 5 5 19']};
function studioIcon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const[k,v]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false',class:'studioIcon'}))svg.setAttribute(k,v);for(const d of studioPaths[name]||studioPaths.info){const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);svg.append(path);}return svg;}
function readingButton(id,icon,label,accessible){const b=typeof id==='string'?$(id):id;if(!b)return;if(readingLayout==='compact'){if(b.dataset.compactLabel&&b.querySelector('.studioIcon'))b.textContent=b.dataset.compactLabel;return;}if(id==='nextPending'&&readyForKeptTone()){icon='sliders';label=resumeKeptTone()?'繼續調色':'開始調色';accessible=resumeKeptTone()?'繼續目前這張已保留照片的調色':'開始逐張調色已保留照片';}if(!b.querySelector('.studioIcon'))b.dataset.compactLabel=b.textContent;const key=icon+'|'+label;if(b.dataset.readingKey!==key||!b.querySelector('.studioIcon')){const text=document.createElement('span');text.textContent=label;b.replaceChildren(studioIcon(icon),text);b.dataset.readingKey=key;}if(accessible)b.setAttribute('aria-label',accessible);}
let mobileCanvasObserver,readingPreviewSlot,readingCompareSlot,readingExportSlot,readingProgressSlot,readingSessionSlots=[],readingReviewSlot,readingHeadingText,readingDecisionSlots=[],readingToneSlots=[];
function placeReadingDecisions(){const bar=$('reviewDecisionBar');if(!bar)return;const readable=readingLayout==='readable';for(const{node,marker}of readingDecisionSlots){if(readable){if(node.parentElement!==bar)bar.append(node);}else if(node.parentElement===bar)marker.after(node);}bar.hidden=!readable||document.body.dataset.stage==='tone';}
function openReadingRecoveryOptions(){if(readingLayout==='readable'&&$('sessionTools'))$('sessionTools').open=true;}
function placeReadingMessage(){if(!readingMessageMarker||!$('sessionTools'))return;const node=$('message');if(readingLayout==='readable'&&photos.length&&!node.classList.contains('error'))$('sessionTools').append(node);else readingMessageMarker.after(node);}
function setButtonBusy(id,value){const button=typeof id==='string'?$(id):id;if(!button)return;if(value)button.setAttribute('aria-busy','true');else button.removeAttribute('aria-busy');}
function describeDisabled(id,reason){const button=$(id);if(!button)return;if(button.disabled&&reason){button.setAttribute('aria-description',reason);button.title=reason;button.dataset.disableReason='true';}else{button.removeAttribute('aria-description');if(button.dataset.disableReason){button.removeAttribute('title');delete button.dataset.disableReason;}}}
function placeReadingSessionTools(){if(!$('sessionTools'))return;const readable=readingLayout==='readable';for(const{node,marker}of readingSessionSlots){if(readable&&(!node.classList.contains('privacy')||photos.length))$('sessionTools').append(node);else marker.after(node);}$('sessionTools').hidden=!readable;const heading=document.querySelector('.toolbar h2');if(readable){heading.append($('reviewProgress'));if(heading.firstChild?.nodeType===Node.TEXT_NODE)heading.firstChild.textContent='照片 ';$('reviewProgress').textContent='待決 '+photos.filter(p=>p.decision==='pending').length;}else{readingReviewSlot.after($('reviewProgress'));if(heading.firstChild?.nodeType===Node.TEXT_NODE)heading.firstChild.textContent=readingHeadingText;}}
function updateToneInsets(){
 const box=$('mobileCanvas'),head=$('editor')?.querySelector('.editorHead');if(!box||!head)return;
 const height=box.hidden?0:Math.ceil(box.getBoundingClientRect().height),headHeight=Math.ceil(head.getBoundingClientRect().height);document.documentElement.style.setProperty('--mobile-canvas-height',height+'px');document.documentElement.style.setProperty('--tone-tools-height',headHeight+'px');
 const active=readingLayout==='readable'&&studioIdentity==='contact'&&document.body.dataset.stage==='tone'&&matchMedia('(max-width:760px)').matches;
 const room=innerHeight-height-headHeight;
 document.documentElement.dataset.toneToolsPinned=String(active&&room>=Math.max(200,innerHeight*.3));
}
function placeReadingCanvas(){if(!readingPreviewSlot)return;const box=$('mobileCanvas'),preview=$('preview').closest('.comparison'),slider=$('compare').closest('label'),active=readingLayout==='readable'&&studioIdentity==='contact'&&document.body.dataset.stage==='tone'&&matchMedia('(max-width:760px)').matches;if(active){box.append(preview,slider);box.hidden=false;}else{readingPreviewSlot.after(preview);readingCompareSlot.after(slider);box.hidden=true;}}
function placeToneOrder(){
 const tray=$('toneSecondary');if(!tray)return;
 const active=readingLayout==='readable'&&studioIdentity==='contact'&&document.body.dataset.stage==='tone';
 for(const{node,marker}of readingToneSlots){if(active){if(node.parentElement!==tray)tray.append(node);}else if(node.parentElement===tray)marker.after(node);}
 tray.hidden=!active;
}
function placeReadingExport(){
 if(!readingExportSlot)return;const button=$('export'),progress=$('exportProgress'),note=$('exportShortNote');
 if(readingLayout==='compact'){readingExportSlot.after(button);readingProgressSlot.after(progress);return;}
 if(document.body.dataset.stage==='tone'){
  const head=$('editor').querySelector('.editorHead');
  if(studioIdentity==='contact'){
   if(button.parentElement!==head)head.append(button);
   if(note.parentElement!==head)head.append(note);if(head.nextSibling!==progress)head.after(progress);
   readingButton('export','download',current()?.sourceFormat==='RAF'?'另存預覽':'另存',current()?.sourceFormat==='RAF'?'另存RAF內嵌預覽JPEG副本，非RAW開發':'另存風格JPEG副本');
  }else head.after(button,progress,note);
 }else{if(button.parentElement!==$('decisions'))$('decisions').append(button);if($('decisions').nextSibling!==progress||progress.nextSibling!==note)$('decisions').after(progress,note);}
}
function applyReadingCopy(){
 if(!$('qualitySummary'))return;const readable=readingLayout==='readable',p=current();$('qualitySummary').hidden=!p;if(p){const alerts=[];if(p.metrics.sharpness<60)alerts.push('細節較少');const group=photoGroups().find(g=>g.items.includes(p)),ranked=group?.items.filter(p=>p.decision!=='exclude').sort((a,b)=>b.metrics.score-a.metrics.score)||[];if(ranked.length>1&&ranked[0].metrics.score-ranked[1].metrics.score<5)alerts.push('同組差距小');if(p.metrics.bright>.12)alerts.push('高光偏多');if(p.metrics.dark>.18)alerts.push('暗部偏多');if(p.metrics.alpha<.99)alerts.push('透明區轉白');if(p.sourceFormat==='RAF')alerts.push('RAF僅內嵌預覽');const label=(alerts.length?alerts.join(' · ')+' · ':'')+'人物與表情未分析';$('qualitySummary').replaceChildren(studioIcon('info'),document.createTextNode(label));$('qualitySummary').setAttribute('aria-label',label+'；縮圖規則不代表人物或美感判斷');
  const reason=sourceCategory==='app'?localStyleSuggestions(p).reason:sourceCategory==='lut'?'尚未提供LUT，不下載付費或來源不明預設。':'相機參考不套用到JPEG，未分析人物或閃燈。';$('recommendationExplanation').textContent=reason;if(readable)$('styleReason').textContent=sourceCategory==='app'?'本機近似':sourceCategory==='lut'?'尚未提供 LUT':'機內參考 · 不套用至 JPEG';
 }
 const note=$('originalExportNote');if(note){if(readable)$('exportInfo').append(note);else $('exportNoteMarker').before(note);}
 const short=$('exportShortNote');if(short){const text=(p?.sourceFormat==='RAF'?'sRGB 內嵌JPEG副本 · 原片不變':'sRGB JPEG 副本 · 原片不變')+($('persist').checked?'':' · 本分頁，關閉／刷新不保留新變更');if(short.dataset.copyKey!==text){short.replaceChildren(studioIcon('lock'),document.createTextNode(text));short.dataset.copyKey=text;}}
}
function applyReadingUI(){
 const p=current();for(const[id,icon,text,aria]of [['importTop','folder','資料夾','開啟本機資料夾'],['choose','folder','開啟資料夾','開啟本機資料夾'],['keep','check','保留','保留 K'],['exclude','exclude','排除','排除 X'],['resetDecision','pending','待定','待決定 U'],['nextPending','right','下一張'],['undoDecision','undo','復原','復原標記 Z'],['compareGroup','compare','比較','並列比較相似候選'],['editTone','sliders','調色','調色與匯出'],['overviewReturn','grid','總覽','全部照片'],['backToPhoto','image','照片','回照片'],['save','save','保存','儲存工作階段'],['exportZip','archive','ZIP','打包已保留照片 · ZIP'],['groupToggle','layers',grouped?'分組：開':'分組：關'],['view-overview','grid','','照片總覽'],['view-focus','image','','專注選片'],['copyTone','copy','批次沿用'],['undoBatchTone','undo','復原沿用'],['prevKeptTone','left','上一張'],['nextKeptTone','right','下一張'],['prevPhotoPage','left','上一頁'],['nextPhotoPage','right','下一頁'],['prevCompareGroup','left','上一組'],['nextCompareGroup','right','下一組'],['closeComparison','close','關閉','關閉比較'],['export','download',p?.sourceFormat==='RAF'?'另存內嵌預覽':'另存 JPEG',p?.sourceFormat==='RAF'?'另存RAF內嵌預覽JPEG副本，非RAW開發':'另存風格JPEG副本']])readingButton(id,icon,text,aria);
 for(const b of document.querySelectorAll('.comparisonKeep'))readingButton(b,'check',b.textContent.replace(/^\s+|\s+$/g,''));
 if(readingLayout==='readable'&&$('decisionHint')){const text=(readingAction?((readingAction.photoId&&readingAction.photoId!==selected?'上次 · ':'')+readingAction.label):'')||(readyForKeptTone()?`保留 ${photos.filter(p=>p.decision==='keep').length} 張 · 可開始調色`:photos.length&&!photos.some(p=>p.decision==='pending')?'無保留照片 · 可復原':'標記可復原');$('decisionHint').replaceChildren(studioIcon(readingAction?.error?'info':readingAction?.busy?'pending':readingAction?'check':'info'),document.createTextNode(text));$('decisionHint').classList.toggle('error',Boolean(readingAction?.error));}
 if($('decisionHint'))$('decisionHint').hidden=readingLayout==='readable'&&!readingAction&&!readyForKeptTone()&&photos.some(p=>p.decision==='pending');
 applyReadingCopy();placeReadingExport();placeReadingSessionTools();placeReadingMessage();applyContactIdentity();placeReadingCanvas();placeReadingDecisions();placeToneOrder();
}
function setupContactIdentity(){
 const intro=document.querySelector('.intro h1'),lead=document.querySelector('.intro .lead');intro.dataset.compactHtml=intro.innerHTML;lead.dataset.compactText=lead.textContent;const proof=document.createElement('div');proof.id='contactProof';proof.setAttribute('role','img');proof.setAttribute('aria-label','本機照片流程：開啟資料夾、比較挑片、另存副本');for(let i=1;i<=3;i++){const frame=document.createElement('div'),number=document.createElement('span');frame.className='proofPlaceholder';number.className='proofNumber';number.textContent=['開啟','挑片','另存'][i-1];frame.append(studioIcon(['folder','compare','download'][i-1]),number);proof.append(frame);}const caption=document.createElement('p');caption.className='proofCaption';caption.textContent='';caption.hidden=true;proof.append(caption);document.querySelector('.intro .session').prepend(proof);
 const counter=document.createElement('span');counter.id='framePosition';counter.className='framePosition';counter.setAttribute('role','status');$('viewerName').after(counter);
 const story=document.createElement('details');story.id='designStory';story.className='designStory';const title=document.createElement('summary');title.textContent='設計筆記：靜觀與印樣';const history=document.createElement('p');history.textContent='杉本博司《Seascapes》反覆以海天邊界觀看不同地點；這裡把等幅留白與穩定畫布轉成一間安靜的看圖室，讓介面退後，專心決定哪一刻值得留下。';
 const translation=document.createElement('p');translation.textContent='底部接觸印樣以本工作室的檔名順序編號，圈記代表你親自保留，也隨時可以改變選擇。';

 const source=document.createElement('a');source.href='https://www.sugimotohiroshi.com/seascapes-1';source.target='_blank';source.rel='noopener noreferrer';source.textContent='杉本博司官方：Seascapes';const museum=document.createElement('a');museum.href='https://hirshhorn.si.edu/explore/the-hirshhorn-presents-the-first-career-survey-for-hiroshi-sugimoto/';museum.target='_blank';museum.rel='noopener noreferrer';museum.textContent='Smithsonian Hirshhorn：回顧展記錄';story.append(title,history,translation,source,document.createElement('br'),museum);$('appearanceSettings').before(story);
}
function applyContactIdentity(){
 if(!$('framePosition'))return;const active=readingLayout==='readable'&&studioIdentity==='contact',ordered=[...photos].sort((a,b)=>keptNameOrder.compare(a.name,b.name)||a.id.localeCompare(b.id)),numbers=new Map(ordered.map((p,i)=>[p.id,String(i+1).padStart(3,'0')])),p=current();
 $('framePosition').hidden=!active||!p;if(p){$('framePosition').textContent=`${numbers.get(p.id)} / ${String(photos.length).padStart(3,'0')}`;$('framePosition').setAttribute('aria-label',`工作室序號 ${numbers.get(p.id)}，共 ${photos.length} 張`);}
 $('designStory').hidden=!active;$('themeChoice').parentElement.hidden=active;$('contactProof').hidden=!active;const intro=document.querySelector('.intro h1'),lead=document.querySelector('.intro .lead');if(active){intro.innerHTML='選片與調色';lead.textContent='';lead.hidden=true;}else{intro.innerHTML=intro.dataset.compactHtml;lead.textContent=lead.dataset.compactText;lead.hidden=false;}if(active){const heading=document.querySelector('.toolbar h2');if(heading.firstChild?.nodeType===Node.TEXT_NODE)heading.firstChild.textContent='選片室 ';}
 for(const card of $('gallery').querySelectorAll('.card')){let number=card.querySelector('.frameNumber');if(!active){number?.remove();card.removeAttribute('data-decision');continue;}const p=photos.find(p=>p.id===card.dataset.id);if(!p)continue;card.dataset.decision=p.decision;if(!number){number=document.createElement('span');number.className='frameNumber';number.setAttribute('aria-hidden','true');card.prepend(number);}number.textContent=numbers.get(p.id);}
}

function setupReadingUI(){
 const pressedButtons=new Set(),releasePressed=()=>{for(const button of pressedButtons)delete button.dataset.pressed;pressedButtons.clear();};
 document.addEventListener('pointerdown',event=>{const button=event.target.closest?.('button,summary');if(event.button===0&&button&&!button.disabled){button.dataset.pressed='true';pressedButtons.add(button);}},true);
 for(const type of ['pointerup','pointercancel'])document.addEventListener(type,releasePressed,true);window.addEventListener('blur',releasePressed);
 document.addEventListener('pointerout',event=>{const button=event.target.closest?.('button,summary');if(button&&pressedButtons.has(button)&&(!(event.relatedTarget instanceof Node)||!button.contains(event.relatedTarget))){delete button.dataset.pressed;pressedButtons.delete(button);}},true);
 if(!document.body.dataset.stage)document.body.dataset.stage='review';
 $('view-overview').title='照片總覽';$('view-focus').title='專注選片';const filter=$('filter'),caption=[...filter.parentElement.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());if(caption){const span=document.createElement('span');span.className='filterCaption';span.textContent=caption.textContent;caption.replaceWith(span);}filter.setAttribute('aria-label','顯示照片');
 $('decisionHint').setAttribute('role','status');$('decisionHint').setAttribute('aria-live','polite');
 const marks=document.createElement('div');marks.id='reviewDecisionBar';marks.setAttribute('role','group');marks.setAttribute('aria-label','人工選片，原檔不變');$('viewer').querySelector('.comparison').before(marks);for(const id of ['keep','exclude','resetDecision','nextPending','undoDecision','decisionHint']){const node=$(id),marker=document.createComment('compact decision control');node.before(marker);readingDecisionSlots.push({node,marker});}
 const mobileCanvas=document.createElement('div');mobileCanvas.id='mobileCanvas';mobileCanvas.hidden=true;document.querySelector('.desk').prepend(mobileCanvas);mobileCanvasObserver=new ResizeObserver(updateToneInsets);mobileCanvasObserver.observe(mobileCanvas);mobileCanvasObserver.observe($('editor').querySelector('.editorHead'));window.addEventListener('resize',updateToneInsets);readingPreviewSlot=document.createComment('original viewing canvas');$('preview').closest('.comparison').before(readingPreviewSlot);readingCompareSlot=document.createComment('original compare slider');$('compare').closest('label').before(readingCompareSlot);matchMedia('(max-width:760px)').addEventListener('change',applyReadingUI);
 const tools=document.createElement('details');tools.id='sessionTools';const toolsTitle=document.createElement('summary');toolsTitle.textContent='選項';toolsTitle.setAttribute('aria-label','工作階段選項');tools.append(toolsTitle);document.querySelector('.toolbar .filters').append(tools);readingMessageMarker=document.createComment('normal message position');$('message').before(readingMessageMarker);for(const node of [$('groupToggle'),$('save'),document.querySelector('.privacy')]){const marker=document.createComment('compact session control');node.before(marker);readingSessionSlots.push({node,marker});}readingReviewSlot=document.createComment('compact review progress');$('reviewProgress').before(readingReviewSlot);readingHeadingText=document.querySelector('.toolbar h2').firstChild.textContent;
 readingExportSlot=document.createComment('original single export');$('export').before(readingExportSlot);readingProgressSlot=document.createComment('original export progress');$('exportProgress').before(readingProgressSlot);
 const summary=document.createElement('p');summary.id='qualitySummary';summary.className='readingStatus';summary.dataset.readableOnly='';$('dimensions').after(summary);
 const recommend=document.createElement('details');recommend.id='recommendationDetails';recommend.dataset.readableOnly='';const title=document.createElement('summary');title.textContent='推薦依據';const explanation=document.createElement('p');explanation.id='recommendationExplanation';recommend.append(title,explanation);$('styleReason').after(recommend);
 const note=[...$('editor').querySelectorAll('p')].find(n=>n.textContent.includes('JPEG 副本，不保留'));if(note){note.id='originalExportNote';const marker=document.createElement('span');marker.id='exportNoteMarker';note.before(marker);const details=document.createElement('details');details.id='exportInfo';details.dataset.readableOnly='';const heading=document.createElement('summary');heading.textContent='副本與色彩限制';details.append(heading,note);marker.after(details);const short=document.createElement('p');short.id='exportShortNote';short.className='readingStatus';short.dataset.readableOnly='';short.append(studioIcon('lock'),document.createTextNode('JPEG 副本 · 原片不變'));$('export').after(short);}
 const settings=$('appearanceSettings'),label=document.createElement('label');label.textContent='版式 ';const select=document.createElement('select');select.id='layoutChoice';select.setAttribute('aria-label','工作台版式');for(const[value,text]of [['contact','靜觀暗房（預設）'],['readable','清晰圖示基線'],['compact','先前緊湊版']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.value=readingLayout==='compact'?'compact':studioIdentity==='contact'?'contact':'readable';select.onchange=()=>{readingLayout=select.value==='compact'?'compact':'readable';studioIdentity=select.value==='contact'?'contact':'plain';document.documentElement.dataset.layout=readingLayout;document.documentElement.dataset.identity=studioIdentity;try{localStorage.setItem('fuji-studio-layout',readingLayout);localStorage.setItem('fuji-studio-identity',studioIdentity);}catch{}$('observationDetails').open=readingLayout==='compact';render();if(current())renderStyles();applyReadingUI();};label.append(select);settings.append(label);
 if(readingLayout==='readable')$('observationDetails').open=false;
 // Full labels remain accessible, and unknown/save/error messages stay in the main flow.
 const persistLabel=$('persist').parentElement;for(const node of [...persistLabel.childNodes])if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim()){node.textContent=' 保存副本與編輯';$('persist').setAttribute('aria-label','在此瀏覽器保存副本與編輯；重新整理後須重選資料夾，沒有持續連線');break;}
 const firstPrivacy=document.querySelector('.privacy>span');firstPrivacy.replaceChildren(studioIcon('lock'),document.createTextNode('僅在此裝置處理'));
 const tray=document.createElement('div');tray.id='toneSecondary';tray.hidden=true;$('editor').append(tray);for(const id of ['observationDetails','recommendationDetails']){const node=$(id),marker=document.createComment('original tone information');node.before(marker);readingToneSlots.push({node,marker});}
 if($('exportShortNote'))$('export').setAttribute('aria-describedby','exportShortNote');
 setupContactIdentity();applyReadingUI();
}

function setupArtDirection(){
 const modes=[['horizon','海平線 · 印樣'],['theater','光幕 · 劇場'],['baseline','靜觀暗房 · 基線']],root=document.documentElement;
 let mode='horizon';try{const saved=localStorage.getItem('fuji-studio-art');if(modes.some(([id])=>id===saved))mode=saved;}catch{}
 const label=document.createElement('label');label.textContent='構圖 ';const choice=document.createElement('select');choice.id='artChoice';choice.setAttribute('aria-label','暗房藝術構圖');for(const[value,text]of modes){const option=document.createElement('option');option.value=value;option.textContent=text;choice.append(option);}choice.value=mode;root.dataset.art=mode;
 choice.onchange=()=>{root.dataset.art=choice.value;try{localStorage.setItem('fuji-studio-art',choice.value);}catch{}};label.append(choice);$('appearanceSettings').append(label);
 const plate=document.createElement('div');plate.className='artPlate';plate.setAttribute('aria-hidden','true');
 // Original geometric studies. No artwork, photograph or third-party asset is embedded.
 plate.innerHTML='<svg viewBox="0 0 900 250" preserveAspectRatio="xMidYMid slice" focusable="false"><g class="horizonStudy"><path class="artSky" d="M0 0H900V125H0Z"/><path class="artSea" d="M0 125H900V250H0Z"/><path class="artHorizon" d="M0 125H900"/><path class="artReflection" d="M450 20V230M410 28H490M425 222H475"/><circle cx="450" cy="125" r="75"/><path class="artFine" d="M30 24H180M30 24V74M870 226H720M870 226V176"/></g><g class="theaterStudy"><path class="artRoom" d="M0 0H900V250H0Z"/><path class="artWall" d="M0 0L225 45V205L0 250ZM900 0L675 45V205L900 250Z"/><path class="artCeiling" d="M0 0H900L675 45H225ZM0 250H900L675 205H225Z"/><path class="artScreen" d="M225 45H675V205H225Z"/><path class="artFine" d="M80 35L180 56M80 215L180 194M820 35L720 56M820 215L720 194"/></g></svg>';
 document.querySelector('.intro .session').prepend(plate);
 const compare=$('compare');const sync=()=>root.style.setProperty('--art-split',compare.value+'%');compare.addEventListener('input',sync);sync();
 // A small response outside the photo: one bounded motion, never a loading gate.
 const preview=$('preview'),motion=matchMedia('(prefers-reduced-motion:reduce)');let wasHidden=preview.hidden;const cancelMotion=()=>preview.closest('.comparison')?.getAnimations().forEach(a=>a.cancel()),observer=new MutationObserver(()=>{const ready=wasHidden&&!preview.hidden;wasHidden=preview.hidden;if(ready){cancelMotion();const frame=preview.closest('.comparison');if(!motion.matches&&frame&&root.dataset.art!=='baseline')frame.animate([{outlineColor:'#e7e7e2'},{outlineColor:'#737373'}],{duration:220,iterations:1});}});observer.observe(preview,{attributes:true,attributeFilter:['hidden']});motion.addEventListener('change',cancelMotion);window.addEventListener('pagehide',event=>{if(!event.persisted){observer.disconnect();motion.removeEventListener('change',cancelMotion);}});
 const story=document.createElement('p');story.textContent='海平線把固定觀看條件轉為刻度與印樣編號；光幕把明亮畫面與暗室的關係轉為框景。幾何構圖由本工作室原創，並非藝術家作品或背書。';const source=document.createElement('a');source.href='https://www.sugimotohiroshi.com/theatersj';source.textContent='杉本博司官方：劇場';source.target='_blank';source.rel='noopener noreferrer';$('designStory').append(story,document.createElement('br'),source);
}

function setupAppearance(){
  const settings=document.createElement('details');settings.id='appearanceSettings';settings.className='appearanceSettings';const title=document.createElement('summary');title.textContent='工作台外觀';const label=document.createElement('label');label.textContent='介面色調 ';const select=document.createElement('select');select.id='themeChoice';select.setAttribute('aria-label','介面色調');for(const [value,text]of [['graphite','中性石墨（預設）'],['charcoal','微暖炭灰']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.value=interfaceTheme;select.onchange=()=>{interfaceTheme=select.value==='charcoal'?'charcoal':'graphite';document.documentElement.dataset.theme=interfaceTheme;try{localStorage.setItem('fuji-studio-appearance',interfaceTheme);}catch{}};label.append(select);const note=document.createElement('p');note.textContent='只改工作台的背景、文字與控制項。照片像素、濾鏡、原檔及匯出結果都不受介面外觀影響。';settings.append(title,label,note);document.querySelector('footer').before(settings);
}
function setupReviewUI(){
  document.querySelector('.toolbar>div').append(saveStatus);
  const galleryPanel=document.createElement('section');galleryPanel.id='galleryPanel';$('gallery').before(galleryPanel);galleryPanel.append($('gallery'));const pager=document.createElement('nav');pager.id='galleryPager';pager.hidden=true;pager.setAttribute('aria-label','照片分頁');const range=document.createElement('span');range.id='galleryRange';range.setAttribute('role','status');const pageLabel=document.createElement('label');pageLabel.textContent='跳頁 ';const pageSelect=document.createElement('select');pageSelect.id='photoPageSelect';pageSelect.setAttribute('aria-label','照片頁數');pageSelect.onchange=()=>{galleryPage=Number(pageSelect.value);render();};pageLabel.append(pageSelect);pager.append(range);for(const [id,text,offset]of [['prevPhotoPage','← 上一頁',-1],['nextPhotoPage','下一頁 →',1]]){const button=document.createElement('button');button.id=id;button.textContent=text;button.onclick=()=>{galleryPage+=offset;render();if(button.disabled)focusContext($("galleryRange"),{onlyIfLost:true});};pager.append(button);}pager.append(pageLabel);galleryPanel.prepend(pager);
  const lookTools=document.createElement('div');lookTools.className='galleryLookTools';const lookLabel=document.createElement('label'),lookToggle=document.createElement('input');lookToggle.type='checkbox';lookToggle.id='galleryUseTone';lookToggle.checked=galleryUseTone;lookToggle.onchange=()=>{galleryUseTone=lookToggle.checked;rememberReviewPreferences();render();};lookLabel.append(lookToggle,document.createTextNode(' 顯示本機調色'));const lookStatus=document.createElement('span');lookStatus.id='galleryLookStatus';lookStatus.setAttribute('role','status');const retryLooks=document.createElement('button');retryLooks.id='retryGalleryLooks';retryLooks.textContent='重試縮圖';retryLooks.hidden=true;retryLooks.onclick=()=>render();lookTools.append(lookLabel,lookStatus,retryLooks);galleryPanel.prepend(lookTools);
  const viewer=document.createElement('section');viewer.id='viewer';viewer.tabIndex=-1;document.querySelector('.desk').insertBefore(viewer,$('editor'));
  const heading=document.createElement('div');heading.className='viewerHead';const title=document.createElement('h2');title.id='viewerName';title.textContent='選一張照片';const back=document.createElement('button');back.id='overviewReturn';back.textContent='← 全部照片';back.onclick=()=>{render({revealSelection:true});setViewMode('overview');focusGalleryContext();};heading.append(title,back);viewer.append(heading,document.querySelector('.comparison'),$('compare').closest('label'),$('dimensions'),$('decisions'));
  const next=document.createElement('button');next.id='nextPending';next.textContent='下一張 →';next.onclick=()=>goNextPending();
  const undo=document.createElement('button');undo.id='undoDecision';undo.textContent='復原標記 Z';undo.setAttribute('aria-keyshortcuts','Z');undo.onclick=undoLastDecision;$('decisions').append(next,undo);
  const hint=document.createElement('p');hint.id='decisionHint';hint.className='decisionHint';hint.setAttribute('role','status');viewer.append(hint);
  const placeholder=document.createElement('img');placeholder.id='previewPlaceholder';placeholder.alt='目前照片的本機縮圖，完整預覽準備中';placeholder.hidden=true;document.querySelector('.comparison').prepend(placeholder);const previewStatus=document.createElement('p');previewStatus.id='previewStatus';previewStatus.setAttribute('role','status');previewStatus.hidden=true;const retry=document.createElement('button');retry.id='retryPreview';retry.textContent='重試預覽';retry.hidden=true;retry.onclick=()=>select(selected);viewer.insertBefore(previewStatus,$('decisions'));viewer.insertBefore(retry,$('decisions'));
  const compareButton=document.createElement('button');compareButton.id='compareGroup';compareButton.textContent='比較候選';compareButton.setAttribute('aria-label','並列比較相似候選');compareButton.onclick=openPhotoComparison;heading.insertBefore(compareButton,back);const editTone=document.createElement('button');editTone.id='editTone';editTone.textContent='調色與匯出';editTone.setAttribute('aria-controls','editor');editTone.onclick=showTone;heading.insertBefore(editTone,back);$('editor').tabIndex=-1;$('editor').setAttribute('aria-label','調色與匯出');const backToPhoto=document.createElement('button');backToPhoto.id='backToPhoto';backToPhoto.textContent='↑ 回照片';backToPhoto.setAttribute('aria-controls','viewer');backToPhoto.onclick=showReview;document.querySelector('.editorHead').append(backToPhoto);
  const toneNav=document.createElement('nav');toneNav.id='tonePhotoNav';toneNav.hidden=true;toneNav.setAttribute('aria-label','依檔名逐張調色已保留照片');for(const [id,text,offset]of [['prevKeptTone','← 上一張',-1],['nextKeptTone','下一張 →',1]]){const button=document.createElement('button');button.id=id;button.textContent=text;button.setAttribute('aria-label',offset<0?'上一張已保留照片':'下一張已保留照片');button.onclick=()=>navigateKeptTone(offset);toneNav.append(button);}const position=document.createElement('span');position.id='tonePhotoPosition';position.setAttribute('role','status');position.title='已保留照片，依檔名自然排序；不自動複製上一張參數';toneNav.insertBefore(position,toneNav.querySelector('#nextKeptTone'));document.querySelector('.editorHead').after(toneNav);
  const bar=document.createElement('div');bar.className='reviewBar';bar.id='reviewBar';const modes=document.createElement('div');modes.className='viewModes';modes.setAttribute('role','group');modes.setAttribute('aria-label','工作台顯示方式');
  for(const [mode,text]of [['overview','照片總覽'],['focus','專注選片']]){const button=document.createElement('button');button.id=`view-${mode}`;button.textContent=text;button.onclick=()=>setViewMode(mode,true);modes.append(button);}
  const progress=document.createElement('span');progress.id='reviewProgress';progress.setAttribute('aria-live','polite');const advance=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id='autoAdvance';checkbox.checked=true;try{const preference=JSON.parse(localStorage.getItem('fuji-studio-ui')||'{}');if(['focus','overview'].includes(preference.viewMode))viewMode=preference.viewMode;checkbox.checked=preference.autoAdvance!==false;galleryUseTone=preference.galleryUseTone!==false;lookToggle.checked=galleryUseTone;}catch{}checkbox.onchange=rememberReviewPreferences;advance.append(checkbox,document.createTextNode(' 標記後下一張'));bar.append(modes,progress,advance);document.querySelector('.desk').before(bar);
  const reason=document.createElement('p');reason.id='groupReason';reason.className='groupReason';const score=document.createElement('details');score.id='scoreDetails';const summary=document.createElement('summary');summary.textContent='為什麼是這個規則分數？';const breakdown=document.createElement('p');breakdown.id='scoreBreakdown';score.append(summary,breakdown);const split=document.createElement('button');split.id='splitGroup';split.textContent='讓這張獨立';split.onclick=()=>{const p=current();if(!p)return;p.separateGroup=!p.separateGroup;render();renderQuality(p);saveOne(p);};const originalRuleNote=$('quality').nextElementSibling;score.append(split);if(originalRuleNote?.classList.contains('muted'))score.append(originalRuleNote);$('quality').after(reason,score);
  const pair=document.createElement('div');pair.id='rawPair';pair.className='referenceBox';pair.hidden=true;const pairText=document.createElement('p');pairText.id='rawPairText';const pairButton=document.createElement('button');pairButton.id='compareRawPair';pairButton.textContent='比較同名JPEG／RAF';pair.append(pairText,pairButton);score.after(pair);
  const observation=document.createElement('details');observation.id='observationDetails';observation.className='observationDetails';observation.open=true;const observationTitle=document.createElement('summary');observationTitle.textContent='品質與分組依據';const oldQualityTitle=$('quality').previousElementSibling;oldQualityTitle.before(observation);oldQualityTitle.remove();observation.append(observationTitle,$('quality'),reason,score,pair);const sourcePath=document.createElement('p');sourcePath.id='sourcePath';sourcePath.className='localSourcePath';sourcePath.hidden=true;observation.append(sourcePath);
  const dialog=document.createElement('dialog');dialog.id='photoComparison';dialog.setAttribute('aria-labelledby','compareTitle');const dialogHeader=document.createElement('div');dialogHeader.className='comparisonHeader';const dialogTitle=document.createElement('h2');dialogTitle.id='compareTitle';dialogTitle.textContent='並列看，自己決定';const close=document.createElement('button');close.id='closeComparison';close.textContent='關閉比較';close.onclick=requestCloseComparison;dialogHeader.append(dialogTitle,close);
  const controls=document.createElement('div');controls.className='comparisonTools';const chooserLabel=document.createElement('label');chooserLabel.textContent='手動對照（含跨組） ';const chooser=document.createElement('select');chooser.id='compareCandidate';chooser.onchange=()=>requestComparisonCandidate(chooser.value||null,{allowExternal:true});chooserLabel.append(chooser);const zoom=document.createElement('button');zoom.id='compareZoom';zoom.textContent='100% 中央細節';zoom.onclick=()=>{comparisonZoom=!comparisonZoom;comparisonPoint={x:.5,y:.5};renderPhotoComparison();};const toneLabel=document.createElement('label');const toneCheck=document.createElement('input');toneCheck.type='checkbox';toneCheck.id='compareTone';toneCheck.onchange=()=>{comparisonUseTone=toneCheck.checked;renderPhotoComparison();};toneLabel.append(toneCheck,document.createTextNode(' 顯示各張本機調色'));controls.append(chooserLabel,zoom,toneLabel);
  const instruction=document.createElement('p');instruction.id='compareInstruction';instruction.className='muted';instruction.textContent='比較原始JPEG／PNG，不套用本機色調。點整張圖的主體位置可比較同區域100%像素；不偵測人物或表情。保留一張不會自動排除其他照片。';const grid=document.createElement('div');grid.id='comparisonGrid';
  const groupNav=document.createElement('nav');groupNav.className='comparisonGroupNav';groupNav.setAttribute('aria-label','組間導航');
  for(const[id,text,offset]of [['prevCompareGroup','上一組',-1],['nextCompareGroup','下一組',1]]){const button=document.createElement('button');button.id=id;button.textContent=text;button.setAttribute('aria-label',text);button.setAttribute('aria-describedby','compareGroupPosition');button.title=text;button.onclick=()=>navigateComparisonGroup(offset);groupNav.append(button);}const groupPosition=document.createElement('span');groupPosition.id='compareGroupPosition';groupPosition.setAttribute('role','status');groupNav.insertBefore(groupPosition,groupNav.lastChild);
  const groupHint=document.createElement('p');groupHint.id='compareGroupHint';groupHint.className='muted';
  const settings=document.createElement('details');settings.className='comparisonSettings';const settingsTitle=document.createElement('summary');settingsTitle.textContent='比較設定與限制';const afterLabel=document.createElement('label'),afterCheck=document.createElement('input');afterCheck.type='checkbox';afterCheck.id='compareAfterKeep';afterCheck.checked=comparisonAfterKeep;afterCheck.onchange=()=>{comparisonAfterKeep=afterCheck.checked;try{localStorage.setItem('fuji-studio-comparison',JSON.stringify({afterKeep:comparisonAfterKeep?'tone':'stay'}));}catch{}updateComparisonControls();};afterLabel.append(afterCheck,document.createTextNode(' 保留後直接調色（關閉時留在比較）'));const anchorUndo=document.createElement('button');anchorUndo.id='undoComparisonAnchor';anchorUndo.textContent='還原基準';anchorUndo.hidden=true;anchorUndo.setAttribute('aria-label','還原上一個比較基準');anchorUndo.onclick=()=>changeComparisonAnchor(true);settings.append(settingsTitle,controls,afterLabel,anchorUndo,instruction);
  const status=document.createElement('p');status.id='comparisonStatus';status.className='muted';status.setAttribute('role','status');const recover=document.createElement('button');recover.id='comparisonRecover';recover.textContent='處理保存問題';recover.hidden=true;recover.onclick=async()=>{if(comparisonWorking||!comparisonFailure)return;const p=comparisonFailure;closePhotoComparison();await select(p.id,{openViewer:true});showSaveRecovery();};
  const keyHint=document.createElement('p');keyHint.id='comparisonKeyHint';keyHint.className='muted';keyHint.textContent='左右鍵切換組；聚焦照片時 K 保留、X 排除、U 待決定。選單保留原生鍵盤操作。';dialog.append(dialogHeader,groupNav,groupHint,grid,status,recover,settings,keyHint);dialog.addEventListener('cancel',event=>{event.preventDefault();requestCloseComparison();});dialog.addEventListener('keydown',event=>{if(event.ctrlKey||event.altKey||event.metaKey||event.repeat||(event.key!=='Tab'&&event.target.closest('input,select,textarea')))return;const key=event.key.toLowerCase();if(key==='arrowleft'||key==='arrowright'){event.preventDefault();navigateComparisonGroup(key==='arrowleft'?-1:1);}else if(['k','x','u','b','n'].includes(key)){const p=photos.find(p=>p.id===event.target.closest('figure')?.dataset.photoId);if(p){if(key==='b'||key==='n'){if(p.id===comparisonOther){event.preventDefault();if(key==='b')changeComparisonAnchor();else nextComparisonCandidate();}}else{event.preventDefault();markComparisonPhoto(p,({k:'keep',x:'exclude',u:'pending'})[key]);}}}else if(key==='tab'){const nodes=[...dialog.querySelectorAll('button,input,select,summary,figure[tabindex]')].filter(n=>!n.disabled&&n.getClientRects().length&&n.tabIndex>=0),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}});document.body.append(dialog);
  const skip=document.createElement('a');skip.href='#viewer';skip.className='skipLink';skip.textContent='跳到目前照片與標記';skip.onclick=event=>{event.preventDefault();if(photos.length){setViewMode('focus');$('viewer').focus();}else $('choose').focus();};document.body.prepend(skip);
  setupToneLibrary();
  for(const [id,key,text]of [['keep','K','♡ 保留 K'],['exclude','X','－ 排除 X'],['resetDecision','U','待決定 U']]){$(id).textContent=text;$(id).setAttribute('aria-keyshortcuts',key);}
  setViewMode(viewMode);
}
function rememberReviewPreferences(){try{localStorage.setItem('fuji-studio-ui',JSON.stringify({viewMode,autoAdvance:$('autoAdvance').checked,galleryUseTone}));}catch{}}
function setViewMode(mode,remember=false){const origin=document.activeElement,leavingDetail=mode==="overview"&&($("viewer")?.contains(origin)||$("editor")?.contains(origin));viewMode=mode;document.body.dataset.view=mode;if(mode==='overview')setWorkspaceStage('review');for(const name of ['overview','focus'])$(`view-${name}`)?.setAttribute('aria-pressed',String(mode===name));if(remember)rememberReviewPreferences();if(leavingDetail)focusGalleryContext();}
function setWorkspaceStage(stage){document.body.dataset.stage=stage;if($('observationDetails')&&(stage==='tone'||readingLayout==='compact'))$('observationDetails').open=stage!=='tone';updateToneNavigation();applyReadingUI();}
function showTone(){if(!current())return;toneContextStarted=true;setViewMode('focus');setWorkspaceStage('tone');const editor=$('editor');editor.scrollTop=0;if(!$('mobileCanvas')?.hidden){const margin=parseFloat(getComputedStyle(editor).scrollMarginTop)||0;scrollTo(0,scrollY+editor.getBoundingClientRect().top-$('mobileCanvas').getBoundingClientRect().height-12-margin);}else editor.scrollIntoView({block:'start'});editor.focus({preventScroll:true});}
function showReview(){if(document.body.dataset.stage==='tone')toneContextStarted=true;setViewMode('focus');setWorkspaceStage('review');$('viewer').scrollIntoView({block:'start'});$('viewer').focus({preventScroll:true});}
function showSaveRecovery(){
 if(current()?._conflict){showTone();return;}
 openReadingRecoveryOptions();const state=$('saveState'),button=$('save'),header=document.querySelector('body>header');
 const viewport=window.visualViewport,top=viewport?.offsetTop||0,bottom=top+(viewport?.height||innerHeight),fixed=header&&['fixed','sticky'].includes(getComputedStyle(header).position),inset=fixed?Math.max(top,header.getBoundingClientRect().bottom):top;
 scrollBy(0,Math.min(state.getBoundingClientRect().top,button.getBoundingClientRect().top)-inset-16);
 const rect=button.getBoundingClientRect();if(rect.bottom>bottom)scrollBy(0,rect.bottom-bottom+16);
 button.focus({preventScroll:true});
}
// Session context only: visiting the editor never marks a photo complete.
function resumeKeptTone(){const p=current();return toneContextStarted&&p?.decision==='keep'?p:null;}
function keptTonePhotos(){return photos.filter(p=>p.decision==='keep').sort((a,b)=>keptNameOrder.compare(a.name,b.name)||a.id.localeCompare(b.id));}
function updateToneNavigation(){
  if(!$('tonePhotoNav'))return;const kept=keptTonePhotos(),index=kept.findIndex(p=>p.id===selected),disabled=busy||exporting||batchApplying||decisionBusy||toneNavigationBusy||!originalPreview;$('tonePhotoNav').hidden=index<0||kept.length<2;$('tonePhotoPosition').textContent=`${index+1} / ${kept.length} 已保留`;$('prevKeptTone').disabled=disabled||index<=0;$('nextKeptTone').disabled=disabled||index<0||index>=kept.length-1;for(const id of ['view-overview','view-focus','backToPhoto','editTone'])$(id).disabled=toneNavigationBusy;
}
async function navigateKeptTone(offset){
  if(toneNavigationBusy||busy||exporting||batchApplying||decisionBusy||!originalPreview)return;const p=current(),kept=keptTonePhotos(),index=kept.findIndex(item=>item.id===p?.id),target=kept[index+offset];if(index<0||!target)return;let recovery=false;toneNavigationBusy=true;setBusy(busy);
  try{await saveQueue.catch(()=>{});if(selected!==p.id||viewMode!=='focus'||document.body.dataset.stage!=='tone')return;if(p._conflict){recovery=true;return;}if(p._dirty&&$('persist').checked&&!await saveOne(p)){recovery=true;return;}if(selected!==p.id)return;await select(target.id);if(selected===target.id&&viewMode==='focus'&&document.body.dataset.stage==='tone'){if(originalPreview)showTone();else showReview();}}
  finally{toneNavigationBusy=false;setBusy(busy);if(recovery&&selected===p.id)showSaveRecovery();}
}
function pendingAfter(id){const start=photos.findIndex(p=>p.id===id);for(let offset=1;offset<photos.length;offset++){const p=photos[(start+offset+photos.length)%photos.length];if(p.decision==='pending')return p;}}
function readyForKeptTone(){return photos.length>0&&!photos.some(p=>p.decision==='pending')&&photos.some(p=>p.decision==='keep');}
function updateDecisionControls(){
 for(const id of ['keep','exclude','resetDecision','undoDecision'])setButtonBusy(id,decisionBusy&&readingAction?.control===id);
  if($('exportZip'))$('exportZip').disabled=busy||exporting||batchApplying||toneNavigationBusy||!photos.some(p=>p.decision==='keep'&&!p._conflict);
  if(!$('nextPending'))return;const disabled=decisionBusy||batchApplying||toneNavigationBusy||!current()||!originalPreview;
  for(const id of ['keep','exclude','resetDecision'])$(id).disabled=disabled;
  const finish=readyForKeptTone();$('nextPending').disabled=disabled||(!pendingAfter(selected)&&!finish);$('nextPending').classList.toggle('primary',finish);if(readingLayout==='compact')$('nextPending').textContent=finish?(resumeKeptTone()?'繼續調色':'開始調色'):'→ 下一張';$('undoDecision').disabled=decisionBusy||toneNavigationBusy||!lastDecision;if($('compareGroup'))$('compareGroup').disabled=disabled;
  if($('copyTone')){$('copyTone').disabled=disabled||exporting||!photos.some(p=>p.id!==selected&&p.decision==='keep'&&!p._conflict);$('undoBatchTone').disabled=batchApplying||!lastBatch;}
  const wait=decisionBusy?'正在保存標記':batchApplying?'正在沿用批次':toneNavigationBusy?'正在切換照片':!current()?'先開啟資料夾並選照片':previewError?'預覽失敗，請先重試':!originalPreview?'正在載入照片':'';
  for(const id of ['keep','exclude','resetDecision','compareGroup'])describeDisabled(id,wait);describeDisabled('nextPending',wait||'沒有下一張待定照片');describeDisabled('undoDecision',decisionBusy?'正在保存標記':toneNavigationBusy?'正在切換照片':'尚無可復原標記');
  describeDisabled('exportZip',exporting?'正在製作副本':wait||'先保留無衝突的照片才能打包');describeDisabled('copyTone',wait||'需另有已保留且無保存衝突的照片');describeDisabled('undoBatchTone',batchApplying?'正在沿用或復原':'尚無可復原的批次');
  const remaining=photos.filter(p=>p.decision==='pending').length;$('decisionHint').textContent=remaining?`K 保留 · X 排除 · Z 復原。人物／表情尚未偵測，請依照片決定。`:'本輪待決定已完成；標記仍可復原，原檔始終保留。';
  updateToneNavigation();applyReadingUI();
}
async function goNextPending(){
 if(decisionBusy||toneNavigationBusy||busy||exporting||batchApplying)return;const target=pendingAfter(selected);if(target){await select(target.id,{openViewer:true});return;}
 if(!readyForKeptTone()||document.body.dataset.stage==='tone'||!originalPreview)return;
 const p=current(),first=resumeKeptTone()||keptTonePhotos()[0];if(!p||!first)return;let recovery=false;toneNavigationBusy=true;setBusy(busy);
 try{await saveQueue.catch(()=>{});if(selected!==p.id)return;if(p._conflict){recovery=true;return;}if(p._dirty&&$('persist').checked&&!await saveOne(p)){recovery=true;return;}if(selected!==p.id)return;await select(first.id);if(originalPreview)showTone();else showReview();}
 finally{toneNavigationBusy=false;setBusy(busy);if(recovery&&selected===p.id)showSaveRecovery();}
}
async function decide(decision,{advance=$('autoAdvance').checked}={}){
  const p=current();if(!p||decisionBusy||toneNavigationBusy||!originalPreview)return;let recover=false;const control={keep:'keep',exclude:'exclude',pending:'resetDecision'}[decision];readingAction={control,photoId:p.id,label:'套用標記…',busy:true,error:false};decisionBusy=true;updateDecisionControls();
  try{
    if(p.decision!==decision)lastDecision={id:p.id,before:p.decision};p.decision=decision;render();for(const [id,value]of Object.entries({keep:'keep',exclude:'exclude',resetDecision:'pending'}))$(id).setAttribute('aria-pressed',String(value===decision));
    const saved=await saveOne(p);
    recover=!saved;readingAction={control,photoId:p.id,label:saved?({keep:'已保留',exclude:'已排除 · 原片保留',pending:'已設待定'}[decision])+($('persist').checked?' · 可復原':' · 本分頁'):'標記未保存 · 請重試保存',busy:false,error:!saved};
    if(saved&&decision!=='pending'&&advance&&selected===p.id){const next=pendingAfter(p.id);if(next)await select(next.id,{openViewer:true});}
    return saved;
  }finally{decisionBusy=false;updateDecisionControls();if(recover&&selected===p.id)showSaveRecovery();}
}
async function undoLastDecision(){
  if(!lastDecision||decisionBusy||toneNavigationBusy)return;const p=photos.find(photo=>photo.id===lastDecision.id);if(!p)return;let recover=false;readingAction={control:'undoDecision',photoId:p.id,label:'復原標記…',busy:true,error:false};decisionBusy=true;updateDecisionControls();
  try{p.decision=lastDecision.before;render();const saved=await saveOne(p);recover=!saved;if(saved)lastDecision=null;readingAction={control:'undoDecision',photoId:p.id,label:saved?($('persist').checked?'已復原標記':'已復原 · 本分頁'):'復原未保存 · 請重試保存',busy:false,error:!saved};await select(p.id,{openViewer:true});}
  finally{decisionBusy=false;updateDecisionControls();if(recover&&selected===p.id)showSaveRecovery();}
}
function closePhotoComparison(){comparisonFactsOpen.clear();comparisonCandidatePending=null;comparisonToken++;for(const canvas of $('comparisonGrid').querySelectorAll('canvas'))releaseCanvas(canvas);$('comparisonGrid').replaceChildren();if($('photoComparison').open)$('photoComparison').close();}
function rememberComparisonPair(){const g=comparisonGroups[comparisonGroupIndex];if(g)comparisonPairs.set(g[0].id,{anchor:comparisonAnchor,other:comparisonOther});}
function comparisonItems(){return comparisonGroups[comparisonGroupIndex]||[];}
function updateComparisonControls(){
 if(!$('compareGroupPosition'))return;const items=comparisonItems();$('compareGroupPosition').textContent=`第 ${comparisonGroupIndex+1} / ${comparisonGroups.length} 組 · ${items.length} 張`;
 $('prevCompareGroup').disabled=comparisonWorking||comparisonGroupIndex<=0;$('nextCompareGroup').disabled=comparisonWorking||comparisonGroupIndex>=comparisonGroups.length-1;
 for(const id of ['compareZoom','compareTone','compareAfterKeep','closeComparison'])$(id).disabled=comparisonWorking;
 $('compareCandidate').disabled=comparisonWorking&&!comparisonCandidateBusy;
 const eligible=items.filter(p=>p.decision!=='exclude').sort((a,b)=>b.metrics.score-a.metrics.score),gap=eligible.length>1?eligible[0].metrics.score-eligible[1].metrics.score:null;
 $('compareGroupHint').textContent=(items.length===1?'單張檢視，不推定連拍或佳片。':gap===null?'依你目前的人工標記；其他候選不會自動排除。':gap<5?`本組規則前兩名只差 ${gap} 分，差距小，請人工比較。`:`本組規則前兩名差 ${gap} 分，只代表縮圖細節／曝光。`)+` 保留 ${items.filter(p=>p.decision==='keep').length} · 待決定 ${items.filter(p=>p.decision==='pending').length} · 排除 ${items.filter(p=>p.decision==='exclude').length}。`+(comparisonOther&&!items.some(p=>p.id===comparisonOther)?' 右側是跨組人工對照，不代表相似。':'');
 for(const figure of $('comparisonGrid').querySelectorAll('figure')){const p=photos.find(p=>p.id===figure.dataset.photoId),ready=figure.dataset.ready==='true',failed=figure.dataset.ready==='failed';if(!p)continue;const choice=figure.querySelector('select');choice.value=p.decision;choice.disabled=comparisonWorking||(!ready&&!failed);for(const option of choice.options)option.disabled=!ready&&option.value!=='pending';const keep=figure.querySelector('.comparisonKeep');keep.disabled=comparisonWorking||!ready||(!comparisonAfterKeep&&p.decision==='keep');keep.textContent=comparisonAfterKeep?'保留並調色':p.decision==='keep'?'已保留':'保留這張';figure.querySelector('.comparisonRetry').disabled=comparisonWorking;const next=figure.querySelector('.comparisonNextCandidate');if(next){next.disabled=comparisonWorking&&!comparisonCandidateBusy;readingButton(next,'right','下一張');}const promote=figure.querySelector('.comparisonAnchorAction');if(promote){promote.disabled=comparisonWorking||!ready;readingButton(promote,'compare','設為基準');}}
 const history=comparisonAnchorHistory.get(items[0]?.id)||[];if($('undoComparisonAnchor')){$('undoComparisonAnchor').hidden=!history.length;$('undoComparisonAnchor').disabled=comparisonWorking;}if($('comparisonKeyHint'))$('comparisonKeyHint').textContent='左右鍵切換組；聚焦照片時 K 保留、X 排除、U 待決定。'+(items.length>=3?'對照照片：N 下一張、B 設基準。':'');
 applyReadingUI();
}
function comparisonSaveFailure(p){comparisonFailure=p;$('comparisonStatus').className='message error';$('comparisonStatus').textContent=p._conflict?`「${photoLabel(p)}」有跨分頁保存衝突；未離開本組，請先處理版本。`:`「${photoLabel(p)}」尚未保存；草稿仍保留，未離開本組。請先處理保存問題。`;$('comparisonRecover').hidden=false;}
async function guardComparisonLeave(){
 await saveQueue.catch(()=>{});const ids=new Set([...comparisonItems().map(p=>p.id),comparisonAnchor,comparisonOther]);for(const p of photos.filter(p=>ids.has(p.id))){if(p._conflict){comparisonSaveFailure(p);return false;}if(p._dirty&&$('persist').checked&&!await saveOne(p)){comparisonSaveFailure(p);return false;}}return true;
}
async function requestCloseComparison(){if(comparisonWorking)return;comparisonWorking=true;updateComparisonControls();let safe=false;try{safe=await guardComparisonLeave();}finally{comparisonWorking=false;updateComparisonControls();}if(safe){const anchor=comparisonAnchor;closePhotoComparison();if(anchor&&anchor!==selected){await select(anchor);if(viewMode==='focus')showReview();}}}
function fillComparisonCandidates(){const items=comparisonItems(); const chooser=$('compareCandidate');chooser.replaceChildren();const none=document.createElement('option');none.value='';none.textContent='單張檢視（不指定對照）';chooser.append(none);
 for(const[label,candidates]of [['同組候選',items.filter(p=>p.id!==comparisonAnchor)],['其他照片（跨組人工對照）',photos.filter(p=>!items.includes(p)&&p.id!==comparisonAnchor).sort((a,b)=>keptNameOrder.compare(a.name,b.name)||a.id.localeCompare(b.id))]]){if(!candidates.length)continue;const optgroup=document.createElement('optgroup');optgroup.label=label;for(const p of candidates){const option=document.createElement('option');option.value=p.id;option.textContent=photoLabel(p);optgroup.append(option);}chooser.append(optgroup);}chooser.value=comparisonOther||'';}
function configureComparisonPair(groupIndex,{anchor,other}={}){
 comparisonGroupIndex=groupIndex;const items=comparisonItems(),saved=comparisonPairs.get(items[0]?.id);comparisonAnchor=items.some(p=>p.id===anchor)?anchor:items.some(p=>p.id===saved?.anchor)?saved.anchor:items[0]?.id;
 comparisonOther=other&&photos.some(p=>p.id===other)&&other!==comparisonAnchor?other:saved?.other&&photos.some(p=>p.id===saved.other)&&saved.other!==comparisonAnchor?saved.other:items.find(p=>p.id!==comparisonAnchor)?.id||null;rememberComparisonPair();
 fillComparisonCandidates();comparisonZoom=false;comparisonPoint={x:.5,y:.5};comparisonFailure=null;$('comparisonRecover').hidden=true;$('comparisonStatus').className='muted';$('comparisonStatus').textContent=$('persist').checked?'每張標記獨立保存，不會自動排除其他候選。':'目前關閉本機保存；本次標記與微調僅留在分頁，刷新不保留。';updateComparisonControls();
}
function openPhotoComparison(preferred=[]){
 const p=current();if(!p)return;comparisonFactsOpen.clear();comparisonGroups=photoGroups().map(g=>g.items);comparisonPairs=new Map();comparisonAnchorHistory=new Map();comparisonCandidateBusy=false;comparisonCandidatePending=null;comparisonWorking=false;const index=comparisonGroups.findIndex(g=>g.some(item=>item.id===p.id));comparisonUseTone=false;$('compareTone').checked=false;
 const priority=Array.isArray(preferred)?preferred.find(id=>id!==p.id&&photos.some(p=>p.id===id)):null;configureComparisonPair(Math.max(0,index),{anchor:p.id,other:priority});$('photoComparison').showModal();$('photoComparison').scrollTop=0;renderPhotoComparison();
}
async function navigateComparisonGroup(offset){
 const target=comparisonGroupIndex+offset;if(comparisonWorking||target<0||target>=comparisonGroups.length)return;comparisonWorking=true;updateComparisonControls();let moved=false;
 try{if(!await guardComparisonLeave())return;rememberComparisonPair();configureComparisonPair(target);moved=true;}finally{comparisonWorking=false;updateComparisonControls();}if(moved){renderPhotoComparison();$('photoComparison').scrollTop=0;$('comparisonGrid').querySelector('figure')?.focus({preventScroll:true});}
}
// Coalesce choices while the save guard is pending; decode jobs use comparisonToken.
// Candidate navigation never changes the basis or a photo's editable fields.
async function requestComparisonCandidate(id,{allowExternal=false}={}){
 if(!$('photoComparison').open||comparisonWorking&&!comparisonCandidateBusy)return;
 const items=comparisonItems(),valid=id===null?allowExternal:id!==comparisonAnchor&&photos.some(p=>p.id===id)&&(allowExternal||items.some(p=>p.id===id));
 if(!valid){$('compareCandidate').value=comparisonOther||'';return;}
 comparisonCandidatePending={id,anchor:comparisonAnchor,group:comparisonGroupIndex};
 if(comparisonCandidateBusy)return;
 comparisonCandidateBusy=true;comparisonWorking=true;updateComparisonControls();
 let changed=false;
 try{
  if(!await guardComparisonLeave())return;
  const request=comparisonCandidatePending;
  if(!request||request.anchor!==comparisonAnchor||request.group!==comparisonGroupIndex)return;
  comparisonOther=request.id;rememberComparisonPair();$('compareCandidate').value=comparisonOther||'';
  comparisonFailure=null;$('comparisonRecover').hidden=true;$('comparisonStatus').className='muted';
  const other=photos.find(p=>p.id===comparisonOther);
  $('comparisonStatus').textContent=other?`對照：${photoLabel(other)}；基準與人工標記未變。${!$('persist').checked?'草稿仍留在本分頁。':''}`:'單張檢視；基準與人工標記未變。';
  changed=true;
 }finally{
  comparisonCandidatePending=null;comparisonCandidateBusy=false;comparisonWorking=false;
  $('compareCandidate').value=comparisonOther||'';updateComparisonControls();
  if(!changed&&comparisonFailure)$('comparisonRecover').focus();
 }
 if(changed)renderPhotoComparison();
}
function nextComparisonCandidate(){
 const items=comparisonItems();if(items.length<3)return;
 const currentId=comparisonCandidatePending?.id||comparisonOther;
 if(!items.some(p=>p.id===currentId))return;
 const candidates=items.filter(p=>p.id!==comparisonAnchor),index=candidates.findIndex(p=>p.id===currentId);
 if(index<0)return;
 requestComparisonCandidate(candidates[(index+1)%candidates.length].id);
}
async function changeComparisonAnchor(undo=false){
 if(comparisonWorking||!$('photoComparison').open)return;const items=comparisonItems(),groupId=items[0]?.id,history=comparisonAnchorHistory.get(groupId)||[],visible=[...$('comparisonGrid').querySelectorAll('figure')],right=visible.find(f=>f.dataset.photoId===comparisonOther);
 if(undo){if(!history.length)return;}else if(items.length<3||!items.some(p=>p.id===comparisonOther)||right?.dataset.ready!=='true')return;
 comparisonWorking=true;updateComparisonControls();let changed=false;
 try{
  if(!await guardComparisonLeave())return;
  if(undo){const previous=history.pop();comparisonAnchor=previous.anchor;comparisonOther=previous.other;}
  else{const previous={anchor:comparisonAnchor,other:comparisonOther},index=items.findIndex(p=>p.id===comparisonOther);const next=Array.from({length:items.length-1},(_,i)=>items[(index+i+1)%items.length]).find(p=>p.id!==previous.anchor);if(!next)return;history.push(previous);if(history.length>8)history.shift();comparisonAnchor=previous.other;comparisonOther=next.id;}
  comparisonAnchorHistory.set(groupId,history);rememberComparisonPair();fillComparisonCandidates();comparisonFailure=null;$('comparisonRecover').hidden=true;$('comparisonStatus').className='muted';const anchor=photos.find(p=>p.id===comparisonAnchor);$('comparisonStatus').textContent=`${undo?'已還原':'比較基準'}：${photoLabel(anchor)}；選片標記與調色未變。${!$('persist').checked?'草稿仍留在本分頁。':''}`;changed=true;
 }finally{comparisonWorking=false;updateComparisonControls();if(!changed&&comparisonFailure)$('comparisonRecover').focus();}
 if(changed){renderPhotoComparison();$('comparisonGrid').querySelector('figure')?.focus({preventScroll:true});}
}

async function markComparisonPhoto(p,decision){
 if(comparisonWorking||!$('photoComparison').open)return;const figure=[...$('comparisonGrid').querySelectorAll('figure')].find(f=>f.dataset.photoId===p.id);if(!figure||figure.dataset.ready!=='true'&&decision!=='pending')return;
 if(p._conflict){comparisonSaveFailure(p);return;}comparisonWorking=true;updateComparisonControls();let saved=false;const goTone=decision==='keep'&&comparisonAfterKeep;
 try{if(p.decision!==decision)lastDecision={id:p.id,before:p.decision};p.decision=decision;render();saved=await saveOne(p);if(!saved)comparisonSaveFailure(p);else{$('comparisonStatus').className='muted';$('comparisonStatus').textContent=`「${photoLabel(p)}」已標記${({keep:'保留',exclude:'排除',pending:'待決定'})[decision]}；其他候選未變更。${!$('persist').checked?'本次修改僅留在分頁。':''}`;}if(saved&&goTone&&!await guardComparisonLeave())saved=false;}
 finally{comparisonWorking=false;updateComparisonControls();if(!goTone&&saved)figure.focus({preventScroll:true});if(!saved&&!$('comparisonRecover').hidden)$('comparisonRecover').focus();}
 if(saved&&goTone){closePhotoComparison();await select(p.id,{openViewer:true});if(originalPreview)showTone();else showReview();}
}
async function renderPhotoComparison(){
 const token=++comparisonToken,grid=$('comparisonGrid'),nextHadFocus=document.activeElement?.classList.contains('comparisonNextCandidate');for(const facts of grid.querySelectorAll('.comparisonFacts')){const id=facts.closest('figure')?.dataset.photoId;if(!id)continue;if(facts.open)comparisonFactsOpen.add(id);else comparisonFactsOpen.delete(id);}for(const canvas of grid.querySelectorAll('canvas'))releaseCanvas(canvas);grid.replaceChildren();$('compareZoom').textContent=comparisonZoom?'回到整張比較':'100% 中央細節';
 $('compareInstruction').textContent=(comparisonUseTone?'比較各張目前的本機調色，規則分數仍來自原片。':'比較原始JPEG／PNG或RAF內嵌JPEG，不套用本機調色。')+'RAF的100%只代表預覽像素，不是RAW完整細節。點整張圖的主體位置可比較同區域100%像素；不偵測人物或表情。組序依檔名與同名ID固定，本次分組不因標記重排；新匯入或人工拆組後重開比較以更新。';
 const jobs=[];for(const id of [comparisonAnchor,comparisonOther].filter(Boolean)){
  const p=photos.find(p=>p.id===id);if(!p)continue;const figure=document.createElement('figure');figure.dataset.photoId=p.id;figure.dataset.ready='false';figure.tabIndex=0;figure.setAttribute('aria-label',`${photoLabel(p)}，可用K保留、X排除、U待決定`);
  const caption=document.createElement('figcaption'),title=document.createElement('strong');title.textContent=photoLabel(p);const score=document.createElement('span');score.textContent=`${p.sourceFormat==='RAF'?'RAF內嵌JPEG · ':''}${p.width} × ${p.height} · 規則 ${p.metrics.score} · 細節 ${p.metrics.sharpness} · 暗 ${Math.round(p.metrics.dark*100)}% / 亮 ${Math.round(p.metrics.bright*100)}%`;let facts=null;if(readingLayout==='readable'){const kind=document.createElement('span');kind.className='comparisonKind';kind.textContent=(p.sourceFormat==='RAF'?'RAF內嵌JPEG · ':'')+(comparisonUseTone?'本機近似':'原始預覽');caption.append(title,kind);facts=document.createElement('details');facts.className='comparisonFacts';facts.open=comparisonFactsOpen.has(p.id);const summary=document.createElement('summary');summary.textContent='數據';summary.setAttribute('aria-label',photoLabel(p)+' 的縮圖觀察數據');facts.append(summary,score);facts.addEventListener('toggle',()=>{if(!facts.isConnected)return;if(facts.open)comparisonFactsOpen.add(p.id);else comparisonFactsOpen.delete(p.id);});}else caption.append(title,score);
  const loading=document.createElement('p');loading.className='muted';loading.setAttribute('role','status');loading.textContent='正在本機準備比較預覽…';const canvas=document.createElement('canvas');canvas.width=canvas.height=0;canvas.hidden=true;canvas.setAttribute('aria-label',`${photoLabel(p)} ${comparisonZoom?'100%像素區域':'整張比較'}`);
  const choose=document.createElement('button');choose.className='comparisonKeep';choose.disabled=true;choose.onclick=()=>markComparisonPhoto(p,'keep');const label=document.createElement('label');label.className='comparisonMark';label.textContent='人工標記 ';const select=document.createElement('select');select.setAttribute('aria-label',`${photoLabel(p)} 的人工標記`);for(const[value,text]of [['pending','待決定'],['keep','保留'],['exclude','排除']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.onchange=()=>markComparisonPhoto(p,select.value);label.append(select);const retry=document.createElement('button');retry.className='comparisonRetry';retry.textContent='重試預覽';retry.hidden=true;retry.onclick=()=>renderPhotoComparison();const role=document.createElement('div');role.className='comparisonRole';const roleLabel=document.createElement('span');roleLabel.textContent=p.id===comparisonAnchor?'基準':'對照';role.append(roleLabel);if(p.id===comparisonOther&&comparisonItems().length>=3&&comparisonItems().some(item=>item.id===p.id)){roleLabel.remove();const next=document.createElement('button');next.className='comparisonNextCandidate';next.textContent='下一張';next.setAttribute('aria-label','下一個同組對照候選，基準不變');next.setAttribute('aria-keyshortcuts','N');next.onclick=nextComparisonCandidate;role.append(next);const promote=document.createElement('button');promote.className='comparisonAnchorAction';promote.textContent='設為基準';promote.setAttribute('aria-label',`以 ${photoLabel(p)} 為比較基準`);promote.setAttribute('aria-keyshortcuts','B');promote.disabled=true;promote.onclick=()=>changeComparisonAnchor();role.append(promote);}figure.append(caption,role,loading,canvas,choose,label,retry);if(facts)figure.append(facts);grid.append(figure);jobs.push({p,figure,loading,canvas,retry});
 }
 updateComparisonControls();if(nextHadFocus)grid.querySelector('.comparisonNextCandidate')?.focus({preventScroll:true});
 for(const {p,figure,loading,canvas,retry}of jobs){
  try{await withDecoded(p.blob,decoded=>{if(token!==comparisonToken)return;const scale=Math.min(1,720/decoded.width,600/decoded.height);canvas.width=Math.max(1,Math.round(decoded.width*scale));canvas.height=Math.max(1,Math.round(decoded.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);if(comparisonZoom){const left=Math.max(0,Math.min(decoded.width-canvas.width,decoded.width*comparisonPoint.x-canvas.width/2)),top=Math.max(0,Math.min(decoded.height-canvas.height,decoded.height*comparisonPoint.y-canvas.height/2));drawDecoded(ctx,decoded,-left,-top,decoded.width,decoded.height);}else drawDecoded(ctx,decoded,0,0,canvas.width,canvas.height);if(comparisonUseTone){const image=ctx.getImageData(0,0,canvas.width,canvas.height);transform(image.data,p.style,p.strength/100,p.adjustments);ctx.putImageData(image,0,0);}canvas.hidden=false;loading.hidden=true;figure.dataset.ready='true';},()=>token===comparisonToken&&$('photoComparison').open);}
  catch(error){if(token===comparisonToken){loading.textContent=`比較預覽失敗：${error.message}。狀態未知，不代表佳片或排除；原片與標記保留，可重試。`;loading.className='message error';figure.dataset.ready='failed';retry.hidden=false;}}
  if(token!==comparisonToken)return;updateComparisonControls();canvas.onclick=event=>{if(comparisonZoom||comparisonWorking)return;const rect=canvas.getBoundingClientRect();comparisonPoint={x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};comparisonZoom=true;renderPhotoComparison();};
 }
}

function lookOf(photo){return {style:photo.style,strength:photo.strength,adjustments:normaliseTone(photo.adjustments)};}
function sameLook(first,second){return first.style===second.style&&first.strength===second.strength&&JSON.stringify(normaliseTone(first.adjustments))===JSON.stringify(normaliseTone(second.adjustments));}
// Keep the result and its next action together without interrupting other reading.
function showBatchResult(action,origin,focusBefore){
  const active=document.activeElement;
  if(selected!==origin||document.body.dataset.stage!=='tone'||document.querySelector('dialog[open]')||![focusBefore,document.body].includes(active))return;
  const target=$(action);target.setAttribute('aria-describedby','batchToneStatus');
  $('batchToneStatus').scrollIntoView({block:'nearest'});target.focus({preventScroll:true});
}
async function showBatchSaveFailure(photo){await select(photo.id);showTone();showSaveRecovery();}
function updateBatchInsets(){const d=$('batchTone');if(!d?.open)return;const padding=parseFloat(getComputedStyle(d).paddingTop)||0;d.style.setProperty('--batch-head',d.querySelector('.comparisonHeader').getBoundingClientRect().height+padding+8+'px');d.style.setProperty('--batch-foot',$('applyBatchTone').getBoundingClientRect().height+padding+8+'px');}
function closeBatchTone(){if(batchApplying)return;setButtonBusy('applyBatchTone',false);batchPreviewToken++;batchPreviewBusy=false;for(const canvas of $('batchToneList').querySelectorAll('canvas'))releaseCanvas(canvas);$('batchToneList').replaceChildren();if($('batchTone').open)$('batchTone').close();}
function updateBatchSelection(){const list=$('batchToneList'),count=list.querySelectorAll('input:checked').length,total=list.querySelectorAll('input').length;setButtonBusy('applyBatchTone',batchApplying||batchPreviewBusy);$('applyBatchTone').textContent=batchApplying?'正在沿用…':batchPreviewBusy?'正在製作本機預覽…':`沿用 ${count} / ${total} 張`; $('applyBatchTone').disabled=!count||batchApplying||batchPreviewBusy;}
async function openBatchTone(){
  const p=current();if(!p||batchApplying)return;batchProfile=lookOf(p);batchPreviewBusy=true;const targets=photos.filter(photo=>photo.id!==p.id&&photo.decision==='keep'&&!photo._conflict),token=++batchPreviewToken;const list=$('batchToneList');list.replaceChildren();
  const reference=styleCatalog.find(entry=>entry.id===p.referenceId),toneNames={brightness:'亮度',warmth:'暖冷',saturation:'飽和度',contrast:'反差'},tone=Object.entries(batchProfile.adjustments).map(([key,value])=>`${toneNames[key]} ${value>0?'+':''}${value}`).join('／');$('batchProfileSummary').textContent=`${photoContext(p)?`來源：${photoLabel(p)}。`:''}${p.style==='original'?'本機後製':'本機近似'}：${styles[p.style]?.name||p.style} · 強度 ${p.strength}% · ${tone}。${reference?`相機參考「${reference.name}」不會套用或複製。`:'官方模式與創作者機內配方不包含在此批次。'}`;
  for(const [index,photo]of targets.entries()){const label=document.createElement('label');label.className='batchToneItem';const input=document.createElement('input');input.type='checkbox';input.value=photo.id;input.checked=true;input.onchange=updateBatchSelection;const name=document.createElement('span');name.textContent=photoLabel(photo);label.append(input,name);if(index<6){const canvas=document.createElement('canvas');canvas.width=canvas.height=0;canvas.dataset.photoId=photo.id;label.append(canvas);}list.append(label);}
  updateBatchSelection();$('batchTone').showModal();updateBatchInsets();
  for(const canvas of list.querySelectorAll('canvas')){const photo=targets.find(photo=>photo.id===canvas.dataset.photoId);try{await withDecoded(photo.thumb,decoded=>{if(token!==batchPreviewToken)return;canvas.width=decoded.width;canvas.height=decoded.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});drawDecoded(ctx,decoded);const image=ctx.getImageData(0,0,canvas.width,canvas.height);transform(image.data,batchProfile.style,batchProfile.strength/100,batchProfile.adjustments);ctx.putImageData(image,0,0);},()=>token===batchPreviewToken&&$('batchTone').open);}catch{canvas.parentElement.querySelector('input').checked=false;canvas.parentElement.append(document.createTextNode(' 縮圖預覽失敗；預設不勾選，可自行決定。'));}if(token!==batchPreviewToken)return;}
  if(token===batchPreviewToken){batchPreviewBusy=false;updateBatchSelection();}
}
async function applyBatchTone(){
  const origin=selected,focusBefore=document.activeElement;
  if(batchApplying||batchPreviewBusy||!batchProfile)return;const ids=[...$('batchToneList').querySelectorAll('input:checked')].map(input=>input.value),profile={...batchProfile,adjustments:{...batchProfile.adjustments}},history=[];let failed=[];batchApplying=true;setBusy(busy);$('cancelBatchTone').disabled=true;updateBatchSelection();
  try{for(const id of ids){const p=photos.find(photo=>photo.id===id);if(!p)continue;history.push({id,before:lookOf(p),applied:profile});Object.assign(p,profile,{adjustments:{...profile.adjustments}});if(!await saveOne(p))failed.push(p);}
    lastBatch=history;render();$('batchToneStatus').textContent=failed.length?`已處理 ${history.length} 張，其中 ${failed.length} 張未保存；請處理衝突或重試。`:`已沿用本機調色到 ${history.length} 張；可復原上次沿用（本分頁）。`;
  }finally{batchApplying=false;$('cancelBatchTone').disabled=false;closeBatchTone();setBusy(busy);}
  if(failed.length)await showBatchSaveFailure(failed[0]);else if(current()){renderStyles();drawPreview();showBatchResult('undoBatchTone',origin,focusBefore);}
}
async function undoBatchTone(){
  const origin=selected,focusBefore=document.activeElement;
  if(!lastBatch||batchApplying)return;const history=lastBatch;let restored=0,skipped=0,failed=[];batchApplying=true;setBusy(busy);
  try{for(const item of history){const p=photos.find(photo=>photo.id===item.id);if(!p)continue;if(!sameLook(p,item.applied)){skipped++;continue;}Object.assign(p,item.before,{adjustments:{...item.before.adjustments}});if(await saveOne(p))restored++;else failed.push(p);}lastBatch=null;render();$('batchToneStatus').textContent=`已復原 ${restored} 張${skipped?`；${skipped} 張已有新微調，保留新版本`:''}${failed.length?`；${failed.length} 張尚未保存，請處理衝突或重試`:''}。`;}
  finally{batchApplying=false;setBusy(busy);}
  if(failed.length)await showBatchSaveFailure(failed[0]);else if(current()){renderStyles();drawPreview();showBatchResult('copyTone',origin,focusBefore);}
}
// One bounded archive is held at a time; no directory handle or multi-download permission.
let zipTasks=[],zipArtifact=null,zipController=null,zipClosePending=false,zipStarting=false,zipModulePromise;
function releaseZipArtifact(){if(zipArtifact?.url){URL.revokeObjectURL(zipArtifact.url);downloadURLs.delete(zipArtifact.url);}zipArtifact=null;}
function closeZipExport(){++zipSelectionVersion;if(zipController){zipClosePending=true;zipController.abort();$('zipCancel').disabled=true;$('zipStatus').textContent='正在取消並釋放影像；原片與微調保留。';return;}releaseZipArtifact();zipTasks=[];$('zipList').replaceChildren();$('zipExport').close();}
function updateZipSelection(){const count=$('zipList').querySelectorAll('input:checked:not(:disabled)').length;$('zipStart').disabled=!count;$('zipStart').textContent=`製作 ${count} 張的第一包`;$('zipSelectionCount').textContent=`已選 ${count} 張 · 每包最多20張／64 MiB`;++zipSelectionVersion;}
let zipSelectionVersion=0;
function renderZipResults(){
 const list=$('zipResults');list.replaceChildren();for(const task of zipTasks){const item=document.createElement('li'),context=photoContext(photos.find(p=>p.id===task.id));item.textContent=`${task.filename}${context?' · '+context:''} · ${task.status==='done'?'已製作JPEG副本':task.status==='failed'?`失敗：${task.error}`:'尚未處理'}`;if(task.status==='failed')item.className='zipFailed';list.append(item);}
 const remaining=zipTasks.filter(task=>task.status==='pending').length,failed=zipTasks.filter(task=>task.status==='failed').length;
 $('zipNext').hidden=!remaining;$('zipNext').disabled=Boolean(zipArtifact&&!zipArtifact.requested);$('zipNext').textContent=zipArtifact?'已確認下載，製作下一包':`繼續處理 ${remaining} 張`;
 $('zipRetry').hidden=!failed;$('zipRetry').disabled=Boolean(zipArtifact&&!zipArtifact.requested);$('zipDownload').hidden=!zipArtifact;
 if(zipArtifact){const size=zipArtifact.blob.size<1048576?`${Math.max(1,Math.ceil(zipArtifact.blob.size/1024))} KiB`:`${(zipArtifact.blob.size/1048576).toFixed(1)} MiB`;$('zipDownload').textContent=`下載本包 ${zipArtifact.count} 張 JPEG（${size} ZIP）`;}
}
function openZipExport(){
 if(busy||exporting||batchApplying||toneNavigationBusy)return;releaseZipArtifact();zipTasks=[];zipClosePending=false;++zipSelectionVersion;
 $('zipSelection').hidden=false;$('zipStart').hidden=false;$('zipResults').replaceChildren();$('zipList').replaceChildren();for(const p of photos.filter(p=>p.decision==='keep').sort((a,b)=>keptNameOrder.compare(a.name,b.name))){
  const row=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span');row.className='zipPhoto';input.type='checkbox';input.value=p.id;input.checked=!p._conflict;input.disabled=Boolean(p._conflict);input.onchange=updateZipSelection;
  text.textContent=`${photoLabel(p)} · ${styles[p.style]?.name||p.style} ${p.strength}%${p.sourceFormat==='RAF'?' · 僅內嵌JPEG':''}${p._conflict?' · 請先解決保存衝突':''}${p._dirty?' · 使用本分頁未保存微調':''}`;row.append(input,text);$('zipList').append(row);
 }
 for(const id of ['zipDownload','zipNext','zipRetry','zipCancel'])$(id).hidden=true;$('zipClose').disabled=false;$('zipProgress').hidden=true;
 $('zipStatus').className='muted';$('zipStatus').textContent='先選擇已保留照片。每張使用各自目前的本機調色；官方／創作者相機參考不套用。';updateZipSelection();$('zipExport').showModal();
}
async function startZipSelection(){
 if(zipController||zipStarting)return;zipStarting=true;const version=zipSelectionVersion;$('zipStart').disabled=true;await saveQueue.catch(()=>{});if(!$('zipExport').open||version!==zipSelectionVersion){zipStarting=false;return;}
 const ids=new Set([...$('zipList').querySelectorAll('input:checked:not(:disabled)')].map(input=>input.value)),chosen=photos.filter(p=>ids.has(p.id)&&p.decision==='keep'&&!p._conflict).sort((a,b)=>keptNameOrder.compare(a.name,b.name));
 if(chosen.length!==ids.size){$('zipStatus').textContent='有照片狀態已變更，請關閉後重新選擇。';$('zipStart').disabled=false;zipStarting=false;return;}
 if(!chosen.length){updateZipSelection();zipStarting=false;return;}
 try{const module=await (zipModulePromise??=import('./zip.js'));if(!$('zipExport').open||version!==zipSelectionVersion)return;zipTasks=module.makeExportTasks(chosen);$('zipSelection').hidden=true;await runZipBatch();}
 catch(error){zipModulePromise=null;$('zipStatus').className='message error';$('zipStatus').textContent=`無法啟動ZIP：${error.message}。原片與微調保留，請重試。`;$('zipSelection').hidden=false;updateZipSelection();}
 finally{zipStarting=false;}
}
async function runZipBatch(){
 if(zipController||!zipTasks.some(task=>task.status==='pending'))return;const initiator=document.activeElement;releaseZipArtifact();zipClosePending=false;const controller=new AbortController();zipController=controller;exporting=true;setBusy(busy);
 for(const id of ['zipStart','zipNext','zipRetry','zipDownload'])$(id).hidden=true;$('zipCancel').hidden=false;$('zipCancel').disabled=false;$('zipStatus').className='muted';$('zipStatus').textContent='正在本機準備ZIP；尚未完成，也尚未開始下載。';$('zipProgress').hidden=true;
 try{
  const module=await (zipModulePromise??=import('./zip.js'));const result=await module.buildZipBatch(zipTasks,{signal:controller.signal,onProgress:step=>{
   $('zipStatus').textContent=`已完成 ${step.completed} 張 · 失敗 ${step.failed} 張 · 本輪待處理 ${step.total} 張\n${step.filename} · ${{photo:'準備副本',decode:'等待／解碼',pixels:'套用本機調色',encode:'編碼JPEG',archive:'封裝完整JPEG'}[step.phase]||'處理中'}（本包尚未完成）`;
   $('zipProgress').hidden=step.phase!=='pixels';if(step.phase==='pixels')$('zipProgress').value=step.completedRows/step.totalRows*100;
  }});
  for(const item of result.completed){const task=zipTasks.find(t=>t.id===item.id);task.status='done';}
  for(const item of result.failed){const task=zipTasks.find(t=>t.id===item.id);task.status='failed';task.error=item.error;}
  const failed=zipTasks.filter(task=>task.status==='failed').length,remaining=zipTasks.filter(task=>task.status==='pending').length,totalDone=zipTasks.filter(task=>task.status==='done').length;
  if(result.blob)zipArtifact={blob:result.blob,count:result.completed.length,requested:false,url:null};
  const reason={cancelled:'已取消剩餘處理。','file-limit':'已達每包處理上限。','byte-limit':'已達本包容量上限。',finished:''}[result.reason];
  $('zipStatus').textContent=`${reason}本包完整副本 ${result.completed.length} 張；此選取已製作 ${totalDone}／${zipTasks.length} 張，失敗 ${failed} 張，尚未處理 ${remaining} 張。${result.blob?'請先下載並確認本包，再繼續。':'未建立ZIP；可重試或關閉。'}下載由瀏覽器處理，本工具無法確認磁碟儲存成功。原片與微調保留。`;
  if(failed)$('zipStatus').className='message error';
 }catch(error){zipModulePromise=null;$('zipStatus').className='message error';$('zipStatus').textContent=`本包製作失敗：${error.message}。未提供不完整ZIP，這一包的照片仍可重試；先前下載不受影響。原片與微調保留。`;}
 finally{zipController=null;exporting=false;$('zipCancel').hidden=true;$('zipProgress').hidden=true;setBusy(busy);renderZipResults();if(zipClosePending)closeZipExport();else if(zipArtifact&&$('zipExport').open&&(document.activeElement===initiator||document.activeElement===document.body)){$('zipDownload').focus({preventScroll:true});$('zipDownload').scrollIntoView({block:'center'});}}
}
function setupZipExport(){
 const open=document.createElement('button');open.id='exportZip';open.textContent='打包已保留照片 · ZIP';document.querySelector('.toolbar .filters').append(open);open.onclick=openZipExport;
 const dialog=document.createElement('dialog');dialog.id='zipExport';dialog.className='studioDialog zipDialog';dialog.setAttribute('aria-labelledby','zipTitle');
 dialog.innerHTML='<div class="dialogHead"><h2 id="zipTitle">打包保留照片</h2><button id="zipClose" aria-label="關閉批次輸出">關閉</button></div><p class="muted">輸出每張各自調色的JPEG副本，不含原檔／EXIF／GPS。RAF僅輸出內嵌JPEG預覽，非官方RAW轉檔；相機配方不會自動套用。</p><details class="zipLimits"><summary>容量、取消與資料保護</summary><p class="muted">逐張處理，每包最多20張／64 MiB。封裝可能短暫保留兩份ZIP緩衝，加上單張解碼記憶體；若資源不足請減少選取。分包與取消可繼續，關閉視窗或刷新需重新選取，已下載檔案保留。檔案先留在記憶體，只有按下載才交給瀏覽器；本工具無法確認磁碟存檔成功。</p></details><section id="zipSelection"><div class="zipSelectionTools"><button id="zipSelectAll">全選</button><button id="zipSelectNone">全不選</button><span id="zipSelectionCount" class="muted"></span></div><div id="zipList" class="zipList"></div><button id="zipStart" class="primary full">製作第一包</button></section><p id="zipStatus" role="status" aria-live="polite" class="muted"></p><progress id="zipProgress" aria-label="目前照片的像素處理進度" max="100" hidden></progress><div class="zipActions"><button id="zipCancel" hidden>取消剩餘處理</button><button id="zipDownload" class="primary" hidden>下載本包ZIP</button><button id="zipNext" hidden>製作下一包</button><button id="zipRetry" hidden>重試失敗照片</button></div><details id="zipResultDetails"><summary>逐張結果與未處理清單</summary><ul id="zipResults"></ul></details>';
 document.body.append(dialog);$('zipClose').onclick=closeZipExport;dialog.addEventListener('cancel',event=>{event.preventDefault();closeZipExport();});$('zipStart').onclick=startZipSelection;
 dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const controls=[...dialog.querySelectorAll('button,input,summary,[tabindex]')].filter(node=>!node.disabled&&node.getClientRects().length&&node.tabIndex>=0),first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}});
 for(const [id,checked]of [['zipSelectAll',true],['zipSelectNone',false]])$(id).onclick=()=>{for(const input of $('zipList').querySelectorAll('input:not(:disabled)'))input.checked=checked;updateZipSelection();};
 $('zipCancel').onclick=()=>{zipController?.abort();$('zipCancel').disabled=true;$('zipStatus').textContent='正在取消；等待原生解碼或編碼結束，不會開始下一張。';};
 $('zipNext').onclick=runZipBatch;$('zipRetry').onclick=()=>{for(const task of zipTasks)if(task.status==='failed'){task.status='pending';delete task.error;}runZipBatch();};
 $('zipDownload').onclick=()=>{if(!zipArtifact||zipController)return;try{if(!zipArtifact.url){zipArtifact.url=URL.createObjectURL(zipArtifact.blob);downloadURLs.add(zipArtifact.url);}const a=document.createElement('a');a.href=zipArtifact.url;a.download=`fuji-studio-copies-${new Date().toISOString().replace(/[:.]/g,'-')}.zip`;a.click();zipArtifact.requested=true;renderZipResults();}catch(error){$('zipStatus').className='message error';$('zipStatus').textContent=`下載啟動失敗：${error.message}。本包仍保留，可再按下載或先保留本分頁。`;}};
}
setupAppearance();setupReviewUI();setupZipExport();setupReadingUI();setupArtDirection();
setupFolderImport();
window.addEventListener('dragover',e=>e.preventDefault());
window.addEventListener('drop',e=>{e.preventDefault();msg('照片來源統一由「開啟資料夾」選取；拖放不會讀取或加入檔案。');});
$('filter').onchange=()=>{galleryPage=0;render();};$('groupToggle').onclick=()=>{grouped=!grouped;galleryPage=0;$('groupToggle').textContent=`相似分組：${grouped?'開':'關'}`;$('groupToggle').setAttribute('aria-pressed',String(grouped));render({revealSelection:true});};
for(const [id,decision] of Object.entries({keep:'keep',exclude:'exclude',resetDecision:'pending'}))$(id).onclick=()=>decide(decision);
window.addEventListener('keydown',event=>{
  if(document.querySelector('dialog[open]')||event.ctrlKey||event.metaKey||event.altKey||event.repeat||event.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  const key=event.key.toLowerCase();if(!photos.length)return;
  if(['k','x','u','z','arrowright','escape'].includes(key))event.preventDefault();
  if(key==='k')decide('keep');else if(key==='x')decide('exclude');else if(key==='u')decide('pending');else if(key==='z')undoLastDecision();else if(key==='arrowright')goNextPending();else if(key==='escape')setViewMode('overview');
});
$('strength').oninput=()=>{const p=current();if(p){p.strength=Number($('strength').value);p._dirty=true;updateSaveState();$('strengthValue').textContent=p.strength+'%';drawPreview();}};
$('strength').onchange=()=>{if(current())saveToneEdit(current());};$('compare').oninput=drawPreview;
$('intent').onchange=()=>{if(current()){current().intent=$('intent').value;renderStyles();saveToneEdit(current());}};
$('export').onclick=exportCopy;
$('persist').onchange=()=>{updateSaveState();applyReadingCopy();msg($('persist').checked?'本機保存已開啟；按「儲存工作階段」保存目前照片。':'已關閉後續本機保存；先前保存資料仍在此瀏覽器，未自動刪除。');};
$('save').onclick=async()=>{
  if(savingSession)return;
  if(!$('persist').checked){msg('請先勾選「在此瀏覽器保存」，再儲存工作階段。');return;}
  const returnPhoto=document.body.dataset.stage==='tone'&&current()?._dirty&&document.activeElement===$('save')?selected:null;
  savingSession=true;setBusy(busy);updateSaveState();let failures=0,capacityFailures=0;
  try {
    await saveQueue.catch(()=>{});
    if(!store)store=await openStore();
    for(const p of photos.filter(p=>p._dirty||p.revision===null)) {
      try{await enqueueSave(p,editsOf(p));}catch(error){failures++;if(error.code==='CAPACITY_LIMIT')capacityFailures++;}
    }
    msg(failures?`保存失敗：仍有 ${failures} 張未保存；修改留在此分頁。${capacityFailures?`其中 ${capacityFailures} 張因本機保存總量已達400張（包含其他資料夾），請先另存副本；舊資料未刪除。`:'衝突請選擇版本，其餘可釋放空間後重試。'}`:`已儲存 ${photos.length} 張照片與編輯於這個瀏覽器。`,failures>0);
  }catch(error){msg(`保存失敗：${error.message}。修改仍留在此分頁，可稍後再試。`,true);}
  finally{savingSession=false;setBusy(busy);updateSaveState();const clean=failures===0&&!photos.some(p=>p._dirty||p._conflict);if(clean&&readingAction?.error){readingAction={label:'修改已保存',busy:false,error:false};applyReadingUI();}if(clean&&$('batchToneStatus')?.textContent.includes('未保存'))$('batchToneStatus').textContent='批次修改已保存；原片不變。';if(returnPhoto&&selected===returnPhoto&&clean&&document.body.dataset.stage==='tone')showTone();}
};
for(const [id,preferLocal] of [['conflictLocal',true],['conflictSaved',false]])$(id).onclick=async()=>{
  const p=current();if(!p?._conflict||!store)return;
  $('conflictLocal').disabled=$('conflictSaved').disabled=true;
  try {
    await saveQueue.catch(()=>{});const latest=await store.get(p.id);
    if(!latest)throw new Error('已保存紀錄不存在，請保留本分頁。');
    p.revision=latest.revision||0;p._conflict=null;saveErrors.delete(p);
    if(preferLocal)await saveOne(p);
    else {Object.assign(p,editsOf(latest));p._dirty=false;await select(p.id);msg('已採用最新保存的編輯版本；原片未變更。');}
  }catch(error){msg(`版本處理失敗：${error.message}，本分頁修改仍保留。`,true);}
  finally{$('conflictLocal').disabled=$('conflictSaved').disabled=false;updateSaveState();}
};
window.addEventListener('beforeunload',event=>{if(photos.some(p=>p._dirty)){event.preventDefault();event.returnValue='';}});
window.addEventListener('pagehide',event=>{
  if(event.persisted)return;
  folderRun?.controller.abort();folderRun=null;exportController?.abort();mobileCanvasObserver?.disconnect();
  zipController?.abort();releaseZipArtifact();zipTasks=[];
  galleryGeneration++;for(const url of [...urls.values(),...downloadURLs])URL.revokeObjectURL(url);for(const id of styledThumbs.keys())releaseStyledThumbnail(id);
  urls.clear();downloadURLs.clear();thumbPending.clear();originalPreview=null;comparisonToken++;for(const canvas of document.querySelectorAll('canvas'))releaseCanvas(canvas);store?.close();
});
setBusy(true);msg('正在檢查本機保存資訊…');
try{
 store=await openStore();savedPhotoCount=await store.count();render();
 msg(savedPhotoCount?`已有 ${savedPhotoCount} 張本機保存紀錄；請重選照片資料夾，依內容銜接既有編輯。未連線原資料夾。`:'原片不變 · 本機處理');
}catch{$('persist').checked=false;msg('無法開啟本機保存；仍可主動選取資料夾。新變更僅留分頁，刷新前請另存副本。',true);}
finally{setBusy(false);}
