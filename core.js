export const styles = {
  original: { name:'原始色調', description:'保留目前 JPEG 的色調', warmth:0, saturation:1, contrast:1, lift:0 },
  portrait: { name:'柔光人像', description:'降低反差、微暖色調；不辨識人臉或膚色', warmth:6, saturation:.92, contrast:.94, lift:5 },
  amber: { name:'暖日記', description:'暖色與柔和陰影，適合日常記憶', warmth:13, saturation:.92, contrast:.96, lift:4 },
  travel: { name:'旅途藍調', description:'微冷、清晰反差，適合建築與風景', warmth:-5, saturation:1.12, contrast:1.07, lift:0 },
  mono: { name:'銀灰散步', description:'中性黑白與輕微霧面陰影', warmth:0, saturation:0, contrast:1.08, lift:4 }
};
export const TONE_DEFAULTS={brightness:0,warmth:0,saturation:0,contrast:0};
const officialSource='https://app.fujifilm-dsc.com/en/manual/x100vi/menu_shooting/image_quality_setting/';
const creatorCompatibility='https://fujixweekly.com/fujifilm-x-trans-v-recipes/';
const publicRecipeLicense='公開可讀；未找到明示再散布授權。僅獨立摘要、事實參數與原連結，不含作者樣片、全文或付費包。';
const officialModes=[
 ['provia','PROVIA / STANDARD','通用自然記錄'],['velvia','Velvia / VIVID','風景與鮮明色彩'],['astia','ASTIA / SOFT','柔和反差'],['classic-chrome','CLASSIC CHROME','平靜色彩與陰影'],['reala-ace','REALA ACE','多場景自然色彩'],['pro-neg-hi','PRO Neg. Hi','人像與較強反差'],['pro-neg-std','PRO Neg. Std','人像與柔和層次'],['classic-neg','CLASSIC Neg.','層次鮮明'],['nostalgic-neg','NOSTALGIC Neg.','暖高光與陰影'],['eterna','ETERNA / CINEMA','柔和低飽和'],['eterna-bleach','ETERNA BLEACH BYPASS','低飽和高反差'],['acros','ACROS','細膩黑白'],['acros-ye','ACROS + Ye','黑白黃濾色'],['acros-r','ACROS + R','黑白紅濾色'],['acros-g','ACROS + G','黑白綠濾色'],['mono','MONOCHROME','中性黑白'],['mono-ye','MONOCHROME + Ye','黑白黃濾色'],['mono-r','MONOCHROME + R','黑白紅濾色'],['mono-g','MONOCHROME + G','黑白綠濾色'],['sepia','SEPIA','棕褐單色']
];
const recipes=[
 {id:'reggies-portra',name:'Reggie’s Portra',author:'Reggie Ballesteros',sourceUrl:'https://reggiebphotography.com/blog/the-most-versatile-fujifilm-x-trans-iv-film-simulation-recipe-reggies-portra',version:'作者2023原版；原頁明示X100VI',scenes:['portrait','travel','night'],summary:'日常、人像與混合光參考；不是人臉或閃燈偵測。',parameters:{film:'Classic Chrome',dr:'Auto',wb:'Auto',red:2,blue:-4,highlight:-1,shadow:-1,color:2,sharpness:-2,noiseReduction:-4,clarity:0,grain:'Weak / Small',colorChrome:'Strong',fxBlue:'Weak'},notes:['保留作者原版 FX Blue Weak，不默改成其他作者的通用轉換版本。']},
 {id:'portra-400-v2',name:'Kodak Portra 400 v2',path:'2022/12/16/kodak-portra-400-v2-fujifilm-x-t5-x-trans-v-film-simulation-recipe/',version:'X-Trans V 原版（2022）',scenes:['portrait','travel'],summary:'日光與黃昏參考；室內人工光可能過暖。',parameters:{film:'Classic Chrome',dr:'DR400',wb:'5200K',red:1,blue:-6,highlight:0,shadow:-2,color:2,sharpness:-2,noiseReduction:-4,clarity:-2,grain:'Strong / Small',colorChrome:'Strong',fxBlue:'Off'}},
 {id:'gold-200',name:'Kodak Gold 200',path:'2023/10/24/kodak-gold-200-fujifilm-x-t5-x-trans-v-film-simulation-recipe/',version:'X-Trans V 原版（2023）',scenes:['travel'],summary:'晴天、旅行與暖色日常參考。',parameters:{film:'Classic Chrome',dr:'DR400',wb:'Daylight',red:4,blue:-5,highlight:-1.5,shadow:.5,color:3,sharpness:-2,noiseReduction:-4,clarity:-2,grain:'Strong / Small',colorChrome:'Weak',fxBlue:'Off'}},
 {id:'kodachrome-64',name:'Kodachrome 64',path:'2022/11/28/kodachrome-64-fujifilm-x-t5-x-trans-v-film-simulation-recipe/',version:'X-Trans V 原版（2022）',scenes:['travel'],summary:'日光旅行與反差色彩參考。',parameters:{film:'Classic Chrome',dr:'DR200',wb:'Daylight',red:2,blue:-5,highlight:0,shadow:.5,color:2,sharpness:1,noiseReduction:-4,clarity:3,grain:'Weak / Small',colorChrome:'Strong',fxBlue:'Off'}},
 {id:'pacific-blues',name:'Pacific Blues',path:'2022/12/06/pacific-blues-fujifilm-x-t5-x-trans-v-film-simulation-recipe/',version:'X-Trans V 原版（2022）',scenes:['travel'],summary:'海邊、夏日與戶外色彩參考。',parameters:{film:'Classic Negative',dr:'DR400',wb:'5800K',red:1,blue:-3,highlight:-2,shadow:3,color:4,sharpness:-2,noiseReduction:-4,clarity:-3,grain:'Strong / Large',colorChrome:'Strong',fxBlue:'Weak'},notes:['配方作者是Ritchie Roesch；靈感來自Lucy Laucht的作品，不是Lucy本人的配方。']},
 {id:'cinestill-800t',name:'CineStill 800T',path:'2024/04/16/cinestill-800t-fujifilm-x-trans-v-film-simulation-recipe/',version:'X-Trans V 原版（2024）；原頁包含X100VI',scenes:['night'],summary:'夜間與人工光參考；白天可能有明顯冷色。',parameters:{film:'Eterna',dr:'DR400',wb:'Fluorescent 3',red:-6,blue:-4,highlight:0,shadow:2,color:4,sharpness:-3,noiseReduction:-4,clarity:-5,grain:'Strong / Large',colorChrome:'Strong',fxBlue:'Weak'}}
];
export const styleCatalog=[
 ...Object.entries(styles).map(([key,value])=>({id:`app-${key}`,kind:'app',styleKey:key,name:value.name,author:'fuji studio',sourceUrl:null,summary:value.description,compatibility:'JPEG / PNG、本機sRGB像素後製',licenseStatus:'內建自製參數；不代表富士官方或第三方作者授權成像。',postProcess:true,version:'內建v1',parameters:{},notes:['可直接預覽與微調；不是官方底片模擬、作者相機配方或LUT。']})),
 ...officialModes.map(([id,name,summary])=>({id:`official-${id}`,kind:'official',name,author:'FUJIFILM',sourceUrl:officialSource+'#FILM_SIMULATION',summary,compatibility:'X100VI機內模式；已拍JPEG不能由此還原',licenseStatus:'官方內容權利保留；此處僅名稱、獨立摘要與手冊連結，未打包圖像或官方成像。',postProcess:false,version:'X100VI官方手冊',parameters:{film:name},notes:['機內設定，不是可下載LUT。本網頁沒有實作官方成像；請使用相機或官方RAW工作流。']})),
 ...recipes.map(recipe=>({...recipe,kind:'recipe',author:recipe.author||'Ritchie Roesch',sourceUrl:recipe.sourceUrl||'https://fujixweekly.com/'+recipe.path,compatibility:'X100VI / X-Trans V相機參數；本專案實拍仍待校準',compatibilitySource:recipe.author?recipe.sourceUrl:creatorCompatibility,licenseStatus:publicRecipeLicense,postProcess:false,notes:[...(recipe.notes||[]),'只作機內設定參考，不在JPEG上假裝套用此配方。',...(recipe.parameters.dr==='DR400'?['DR400在X100VI需ISO500以上。']:recipe.parameters.dr==='DR200'?['DR200在X100VI需ISO250以上。']:[]),...(recipe.parameters.clarity!==0?['非零Clarity增加相機每張儲存時間，不是本機JPEG微調的銳利度滑桿。']:[])]}))
].map(entry=>({...entry,reviewedAt:'2026-10-28'}));
export function recommendSourceIds(kind,intent='travel'){
 const choices={app:{portrait:['app-portrait','app-amber','app-mono'],travel:['app-travel','app-amber','app-mono'],night:['app-amber','app-mono','app-travel']},official:{portrait:['official-pro-neg-std','official-astia','official-reala-ace'],travel:['official-velvia','official-reala-ace','official-classic-chrome'],night:['official-acros-g','official-eterna','official-reala-ace']},recipe:{portrait:['reggies-portra','portra-400-v2'],travel:['gold-200','pacific-blues','kodachrome-64'],night:['cinestill-800t','reggies-portra']}};
 return choices[kind]?.[intent]||choices[kind]?.travel||[];
}
export function localStyleSuggestions(photo){
 const metrics=photo.metrics||{},scene={portrait:'人像',travel:'旅行',night:'夜景／人工光'}[photo.intent]||'旅行';let ids=recommendSourceIds('app',photo.intent),reason=`依你選的「${scene}」列出三個本機起點，未辨識人物或評估喜好。`;
 if(metrics.bright>.12){ids=['app-portrait','app-amber','app-mono'];reason=`原片縮圖約 ${Math.round(metrics.bright*100)}% 接近高光邊界，先列較柔和反差的起點；不能恢復已損失細節，請人工確認。`;}
 else if(metrics.dark>.18||metrics.brightness<85){ids=['app-amber','app-portrait','app-mono'];reason=`原片縮圖暗部較多或平均亮度偏低，先從柔和陰影與低強度比較；不能判定這是否是刻意低調風格。`;}
 return {ids,reason,reviewRequired:true};
}
export function normaliseTone(value={}){return Object.fromEntries(Object.keys(TONE_DEFAULTS).map(key=>[key,Math.max(-40,Math.min(40,Number(value?.[key])||0))]));}
export function transform(data, key, strength, adjustments) {
  const s = styles[key] || styles.original, a = Math.max(0,Math.min(1,strength));
  const tone=normaliseTone(adjustments),tuned=Object.values(tone).some(value=>value!==0);
  for(let i=0;i<data.length;i+=4) {
    const l=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];
    for(let c=0;c<3;c++) {
      const warmth = c===0?s.warmth:c===2?-s.warmth:0;
      const v=((l+(data[i+c]-l)*s.saturation-128)*s.contrast+128+s.lift+warmth);
      data[i+c] = Math.round(data[i+c]*(1-a)+Math.max(0,Math.min(255,v))*a);
    }
    if(tuned){const luma=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];for(let c=0;c<3;c++){const offset=c===0?tone.warmth:c===2?-tone.warmth:0;data[i+c]=Math.round((luma+(data[i+c]-luma)*(1+tone.saturation/100)-128)*(1+tone.contrast/100)+128+tone.brightness*1.28+offset);}}
  }
  return data;
}
export function analyze(data,w,h) {
  const lum = new Float32Array(w*h); let sum=0,dark=0,bright=0,opaque=0;
  const hist=Array(16).fill(0),spatial=Array(48).fill(0),cells=Array(16).fill(0);
  for(let p=0;p<lum.length;p++) {
    const a=data[p*4+3]/255;
    const v=(.2126*data[p*4]+.7152*data[p*4+1]+.0722*data[p*4+2])*a+255*(1-a);
    lum[p]=v;sum+=v;dark+=v<12;bright+=v>243;opaque+=a;hist[Math.min(15,Math.floor(v/16))]++;
    const cell=Math.min(3,Math.floor((p%w)*4/w))+Math.min(3,Math.floor(Math.floor(p/w)*4/h))*4;cells[cell]++;
    for(let c=0;c<3;c++)spatial[cell*3+c]+=data[p*4+c]*a+255*(1-a);
  }
  let edge=0,count=0;
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++) {
    const i=y*w+x; const v=4*lum[i]-lum[i-1]-lum[i+1]-lum[i-w]-lum[i+w];edge+=v*v;count++;
  }
  const sharpness=Math.round(edge/Math.max(1,count));
  let hash='';
  for(let y=0;y<8;y++)for(let x=0;x<8;x++) {
    const yy=Math.min(h-1,Math.floor((y+.5)*h/8));
    hash+=lum[yy*w+Math.min(w-1,Math.floor(x*w/9))]>lum[yy*w+Math.min(w-1,Math.floor((x+1)*w/9))]?'1':'0';
  }
  const n=w*h, clipping=(dark+bright)/n;
  return { version:2, sharpness, brightness:Math.round(sum/n), dark:dark/n, bright:bright/n, alpha:opaque/n, hash, hist:hist.map(v=>v/n), spatial:spatial.map((v,i)=>v/Math.max(1,cells[Math.floor(i/3)])/255), score:Math.round(Math.min(70,Math.log2(sharpness+1)*7)+30*(1-clipping)) };
}
export function similar(a,b) {
  if(Math.abs(a.width/a.height-b.width/b.height)>.15)return false;
  const distance=[...a.metrics.hash].reduce((n,v,i)=>n+(v!==b.metrics.hash[i]),0);
  const hist=a.metrics.hist.reduce((n,v,i)=>n+Math.abs(v-b.metrics.hist[i]),0);
  if(a.metrics.spatial&&b.metrics.spatial) {
    if(Math.max(a.metrics.sharpness,b.metrics.sharpness)<20)return false;
    const spatial=a.metrics.spatial.reduce((n,v,i)=>n+Math.abs(v-b.metrics.spatial[i]),0)/a.metrics.spatial.length;
    if(spatial>.08)return false;
  }
  return distance<=10 && hist<.32;
}
export function groups(photos) {
  const result=[];
  for(const photo of photos) {const g=!photo.separateGroup&&result.find(g=>!g[0].separateGroup&&g.every(member=>similar(member,photo)));if(g)g.push(photo);else result.push([photo]);}
  return result.map(items=>({items,best:[...items].filter(p=>p.decision!=='exclude').sort((a,b)=>b.metrics.score-a.metrics.score || a.name.localeCompare(b.name))[0]?.id||null}));
}
const photoNameOrder=new Intl.Collator('zh-Hant',{numeric:true,sensitivity:'base'});
export function orderedPhotoGroups(photos){
  // Complete-link membership must see the same order after import, reload or another tab.
  return groups([...photos].sort((a,b)=>photoNameOrder.compare(a.name,b.name)||String(a.id).localeCompare(String(b.id))));
}
export function qualityBreakdown(metrics){
  const sharpness=Math.max(0,Number(metrics.sharpness)||0),dark=Math.max(0,Math.min(1,Number(metrics.dark)||0)),bright=Math.max(0,Math.min(1,Number(metrics.bright)||0));
  const detail=Math.min(70,Math.log2(sharpness+1)*7),exposure=30*(1-Math.min(1,dark+bright));
  return {detail,exposure,total:Math.round(detail+exposure),sharpness,dark,bright};
}
export function tips(m) {
  const result=[];
  if(m.sharpness<60)result.push('細節較少：可能失焦，也可能是平滑背景');
  if(m.dark>.18)result.push(`暗部偏多 ${Math.round(m.dark*100)}%：檢查陰影細節`);
  if(m.bright>.12)result.push(`高光偏多 ${Math.round(m.bright*100)}%：檢查亮部細節`);
  if(m.alpha<.99)result.push('透明區域以白底分析及輸出');
  if(!result.length)result.push('規則檢查未見明顯曝光警訊；請放大確認主體');
  return result;
}

const EDIT_FIELDS = ['decision', 'style', 'strength', 'intent', 'separateGroup', 'adjustments', 'referenceId'];

export function editsOf(photo) {
  return Object.fromEntries(EDIT_FIELDS.map(key => [key, key==='separateGroup'?Boolean(photo[key]):key==='adjustments'?normaliseTone(photo[key]):key==='referenceId'?photo[key]||null:photo[key]]));
}

export function sameEdits(a, b) {
  const first=editsOf(a),second=editsOf(b);return EDIT_FIELDS.every(key => key==='adjustments'?JSON.stringify(first[key])===JSON.stringify(second[key]):first[key] === second[key]);
}

// Only browser-provided paths relative to an explicitly selected directory.
// Never accept absolute/device paths or silently collapse traversal segments.
export function importSourcePath(path,name){
  const value=String(path||'').normalize('NFC');
  if(!value||value.length>4096||value.startsWith('/')||/^[a-z]:/i.test(value)||/[\\\u0000-\u001f\u007f]/.test(value))throw new Error('來源不是有效的相對路徑');
  const parts=value.split('/');
  if(parts.length<2||parts.some(p=>!p||p==='.'||p==='..')||parts.at(-1)!==String(name).normalize('NFC'))throw new Error('來源相對路徑與檔名不符');
  return value;
}

export async function openStore() {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('fuji-studio-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('另一個分頁暫時阻擋本機資料庫，請關閉舊版分頁後重試。'));
  });
  db.onversionchange = () => db.close();

  function read(key) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('photos', 'readonly');
      const request = key === undefined ? transaction.objectStore('photos').getAll() : transaction.objectStore('photos').get(key);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('本機讀取已中止'));
    });
  }

  function write(id, operation) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('photos', 'readwrite');
      const store = transaction.objectStore('photos');
      const request = store.get(id);
      let value, failure;
      request.onsuccess = () => {
        try { value = operation(store, request.result); }
        catch (error) { failure = error; transaction.abort(); }
      };
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = () => reject(failure || transaction.error);
      transaction.onabort = () => reject(failure || transaction.error || new Error('本機保存已中止'));
    });
  }

  function originalRecord(photo){
    const record={...photo,...editsOf(photo),revision:0};
    delete record._dirty;delete record._conflict;delete record._legacyMetrics;
    return record;
  }

  function insertBatch(photos,{signal}={}){
    if(photos.length>400)return Promise.reject(new Error('整批超過400張上限'));
    if(signal?.aborted)return Promise.reject(new DOMException('已取消整批匯入','AbortError'));
    return new Promise((resolve,reject)=>{
      const transaction=db.transaction('photos','readwrite'),store=transaction.objectStore('photos'),results=[];
      let failure,count=0;
      const abort=()=>{failure=new DOMException('已取消整批匯入','AbortError');try{transaction.abort();}catch{}};
      signal?.addEventListener('abort',abort,{once:true});
      const cleanup=()=>signal?.removeEventListener('abort',abort);
      transaction.oncomplete=()=>{cleanup();resolve(results);};
      transaction.onerror=()=>{cleanup();reject(failure||transaction.error||new Error('整批保存失敗'));};
      transaction.onabort=()=>{cleanup();reject(failure||transaction.error||new Error('整批保存已中止'));};
      const total=store.count();total.onsuccess=()=>{count=total.result;};
      // Queue reads in one transaction. Any failed add or cancellation aborts all adds.
      for(const photo of photos){const request=store.get(photo.id);request.onsuccess=()=>{
        try{
          if(signal?.aborted){abort();return;}
          if(request.result){results.push({record:request.result,inserted:false});return;}
          if(count>=400)throw Object.assign(new Error('本機保存總量已達400張（包含其他資料夾）'),{code:'CAPACITY_LIMIT'});
          const record=originalRecord(photo);store.add(record);count++;results.push({record,inserted:true});
        }catch(error){failure=error;transaction.abort();}
      };}
    });
  }

  return {
    all: () => read(),
    count: () => new Promise((resolve,reject)=>{
      const transaction=db.transaction('photos','readonly'),request=transaction.objectStore('photos').count();
      transaction.oncomplete=()=>resolve(request.result);
      transaction.onerror=transaction.onabort=()=>reject(transaction.error||new Error('無法讀取本機保存數量'));
    }),
    get: read,
    insertBatch,
    // Content-addressed originals are write-once: duplicate imports return the saved record.
    insert: photo => insertBatch([photo]).then(([result])=>result),
    // Only edit parameters may change. Original Blob, name, dimensions and metrics are retained.
    save: (id, revision, edits) => write(id, (store, existing) => {
      if (!existing) throw new Error('本機原片紀錄不存在，請保留目前分頁並重新保存。');
      const currentRevision = existing.revision || 0;
      if (currentRevision !== revision) {
        const error = new Error('另一個分頁已保存較新的版本。');
        error.code = 'CONFLICT';
        error.current = existing;
        throw error;
      }
      const record = { ...existing, ...editsOf(edits), revision: currentRevision + 1 };
      store.put(record);
      return record;
    }),
    close: () => db.close()
  };
}

function parseImage(buffer) {
  const bytes = new Uint8Array(buffer), view = new DataView(buffer);
  let width, height, orientation = 1, format;
  const omitted=[],iccParts=[];let taggedOrientation,unmanagedColor=false;
  const acceptOrientation=value=>{if(value===undefined)return;if(taggedOrientation!==undefined&&taggedOrientation!==value)throw new Error('圖片方向標記互相衝突，請先轉成標準 JPEG / PNG');taggedOrientation=value;orientation=value;};
  if (bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) {
    if (String.fromCharCode(...bytes.slice(12,16)) !== 'IHDR') throw new Error('PNG 缺少有效尺寸標頭');
    format = 'PNG'; width = view.getUint32(16); height = view.getUint32(20);
    for(let offset=8;offset+12<=bytes.length;){
      const length=view.getUint32(offset),end=offset+12+length;
      if(end>bytes.length)throw new Error('PNG 區塊長度無效');
      const type=String.fromCharCode(...bytes.slice(offset+4,offset+8));
      if(type==='eXIf'){
        if(crc32(bytes,offset+4,end-4)!==view.getUint32(end-4))throw new Error('PNG EXIF 區塊已損壞');
        acceptOrientation(readTIFFOrientation(view,offset+8,end-4));omitted.push([offset,end]);
      }
      offset=end;if(type==='IEND')break;
    }
  } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    format = 'JPEG';
    for (let offset = 2; offset + 3 < bytes.length;) {
      const segmentStart=offset;
      if (bytes[offset++] !== 255) throw new Error('JPEG 標頭已損壞');
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || marker >= 208 && marker <= 215) continue;
      if (offset + 2 > bytes.length) throw new Error('JPEG 標頭不完整');
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) throw new Error('JPEG 標頭長度無效');
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
        if (length < 8) throw new Error('JPEG 尺寸標頭無效');
        height = view.getUint16(offset + 3); width = view.getUint16(offset + 5);
      }
      if (marker === 225) {
        const start=offset+2,end=offset+length;
        if(end-start>=6&&String.fromCharCode(...bytes.slice(start,start+6))==='Exif\0\0'){
          acceptOrientation(readTIFFOrientation(view,start+6,end));
          unmanagedColor ||= readTIFFUnmanagedColor(view,start+6,end);
        }
        else if(end-start<65536){
          const text=new TextDecoder().decode(bytes.slice(start,end));
          if(text.startsWith('http://ns.adobe.com/xap/1.0/')){
            const match=text.match(/\btiff:Orientation\s*=\s*["'](\d+)["']/)||text.match(/<tiff:Orientation>\s*(\d+)\s*<\/tiff:Orientation>/);
            if(match){const value=Number(match[1]);if(value<1||value>8)throw new Error('圖片方向標記無效');acceptOrientation(value);}
            const color=text.match(/\bexif:ColorSpace\s*=\s*["'](\d+)["']/)||text.match(/<exif:ColorSpace>\s*(\d+)\s*<\/exif:ColorSpace>/);
            if(color&&Number(color[1])!==1)unmanagedColor=true;
          }
        }
        // Decode a local metadata-stripped copy so native auto-orientation cannot run twice.
        omitted.push([segmentStart,offset+length]);
      }
      if(marker===226&&length>=14&&String.fromCharCode(...bytes.slice(offset+2,offset+14))==='ICC_PROFILE\0'){
        if(length<16)throw new Error('JPEG 的 ICC 色彩描述檔分段不完整，請先轉成 sRGB');
        iccParts.push({sequence:bytes[offset+14],count:bytes[offset+15],bytes:bytes.subarray(offset+16,offset+length)});
      }
      offset += length;
    }
    if(!checkJPEGICC(iccParts)&&unmanagedColor)throw new Error('JPEG 標示非 sRGB／未校準色域，卻沒有嵌入 ICC。請先轉成 sRGB 或嵌入有效 ICC；原片未變。');
  } else throw new Error('檔案內容不是有效的 JPEG 或 PNG，請確認格式與副檔名');
  if (!width || !height) throw new Error('圖片缺少有效尺寸');
  if (width * height > 60000000) throw new Error('超過 60 百萬像素上限，尚未解碼');
  if (Math.max(width, height) > 32768) throw new Error('圖片單邊超過 32768 像素，瀏覽器畫布不支援此尺寸');
  const rotated = orientation >= 5 && orientation <= 8;
  return { header:{ width: rotated ? height : width, height: rotated ? width : height, orientation, format },rawWidth:width,rawHeight:height,omitted };
}

export function inspectImage(buffer) {return parseImage(buffer).header;}

const RAF_MAGIC='FUJIFILMCCD-RAW ';
function hasRAFMagic(buffer){const bytes=new Uint8Array(buffer);return bytes.length>=16&&Array.from(RAF_MAGIC,(c,i)=>bytes[i]===c.charCodeAt(0)).every(Boolean);}
function rafPreview(buffer){
  if(buffer.byteLength<108)throw new Error('RAF 檔頭不完整，無法讀取內嵌JPEG預覽');
  if(!hasRAFMagic(buffer))throw new Error('RAF 簽章無效；副檔名不代表有效的相機檔案');
  const view=new DataView(buffer),offset=view.getUint32(84),length=view.getUint32(88);
  if(offset<108||length<4||offset+length>buffer.byteLength)throw new Error('RAF 內嵌JPEG範圍無效或檔案不完整');
  if(length>64*1024*1024)throw new Error('RAF 內嵌JPEG超過64 MB預覽上限');
  const bytes=new Uint8Array(buffer,offset,length);
  if(bytes[0]!==255||bytes[1]!==216||bytes[length-2]!==255||bytes[length-1]!==217)throw new Error('RAF 沒有此版本可讀取的完整JPEG預覽；請先轉JPEG');
  const camera=String.fromCharCode(...new Uint8Array(buffer,28,32)).split('\0')[0].replace(/[^\x20-\x7e]/g,'').trim();
  return {offset,length,camera,buffer:buffer.slice(offset,offset+length)};
}
export function inspectRAF(buffer){const raf=rafPreview(buffer),header=parseImage(raf.buffer).header;if(header.format!=='JPEG')throw new Error('RAF 預覽格式不是JPEG');return {...header,format:'RAF',previewFormat:'JPEG',camera:raf.camera,previewOffset:raf.offset,previewLength:raf.length};}
export function rawJpegCandidates(photos,photo){
  const raw=p=>p.sourceFormat==='RAF'||/\.raf$/i.test(p.name),jpeg=p=>!raw(p)&&/\.jpe?g$/i.test(p.name),stem=p=>p.name.replace(/\.[^.]+$/,'').toLocaleLowerCase('en-US');
  if(!raw(photo)&&!jpeg(photo))return [];
  const sameOrigin=p=>!p.sourcePath||!photo.sourcePath||(p.sourceBatch===photo.sourceBatch&&p.sourcePath.slice(0,p.sourcePath.lastIndexOf('/'))===photo.sourcePath.slice(0,photo.sourcePath.lastIndexOf('/')));
  return photos.filter(p=>p.id!==photo.id&&stem(p)===stem(photo)&&sameOrigin(p)&&(raw(photo)?jpeg(p):raw(p)));
}

function readTIFFOrientation(view,tiff,end) {
  if(end-tiff<8)return;
  const endian = view.getUint16(tiff), little = endian === 0x4949;
  if (!little && endian !== 0x4d4d || view.getUint16(tiff+2,little) !== 42) return;
  const directory = tiff + view.getUint32(tiff+4,little);
  if (directory < tiff + 8 || directory + 2 > end) return;
  const count = view.getUint16(directory,little);
  for (let i=0; i<count; i++) {
    const entry = directory + 2 + i*12;
    if (entry + 12 > end) return;
    if (view.getUint16(entry,little) === 0x112 && view.getUint16(entry+2,little) === 3 && view.getUint32(entry+4,little) === 1) {
      const value = view.getUint16(entry+8,little);
      if(value<1||value>8)throw new Error('圖片方向標記無效');
      return value;
    }
  }
}

// Read only bounded colour hints before stripping EXIF from the decode copy.
// 65535 means uncalibrated, not necessarily Adobe RGB. R03 is a DCF option hint.
function readTIFFUnmanagedColor(view,tiff,end){
  if(end-tiff<8)return false;
  const endian=view.getUint16(tiff),little=endian===0x4949;
  if(!little&&endian!==0x4d4d||view.getUint16(tiff+2,little)!==42)return false;
  const entries=relative=>{
    const start=tiff+relative;if(start<tiff+8||start+2>end)return [];
    const count=view.getUint16(start,little);if(start+2+count*12>end)return [];
    return Array.from({length:count},(_,i)=>start+2+i*12);
  };
  const scalar=(list,tag,type)=>{const entry=list.find(p=>view.getUint16(p,little)===tag&&view.getUint16(p+2,little)===type&&view.getUint32(p+4,little)===1);return entry===undefined?undefined:type===3?view.getUint16(entry+8,little):view.getUint32(entry+8,little);};
  const root=entries(view.getUint32(tiff+4,little)),exif=entries(scalar(root,0x8769,4)??0),color=scalar(exif,0xa001,3)??scalar(root,0xa001,3);
  if(color!==undefined&&color!==1)return true;
  const interop=entries(scalar(exif,0xa005,4)??0);
  return interop.some(p=>view.getUint16(p,little)===1&&view.getUint16(p+2,little)===2&&view.getUint32(p+4,little)===4&&String.fromCharCode(view.getUint8(p+8),view.getUint8(p+9),view.getUint8(p+10),view.getUint8(p+11))==='R03\0');
}

// Structural checks only; the browser remains the colour-management engine.
function checkJPEGICC(parts){
  if(!parts.length)return false;
  const fail=()=>{throw new Error('JPEG 的 ICC 色彩描述檔不完整或不支援。請先轉成 sRGB；原片未變。');};
  const count=parts[0].count,total=parts.reduce((n,p)=>n+p.bytes.length,0);
  if(!count||parts.length!==count||total<132||total>16*1024*1024)fail();
  const ordered=[...parts].sort((a,b)=>a.sequence-b.sequence);
  if(ordered.some((p,i)=>p.count!==count||p.sequence!==i+1))fail();
  const profile=new Uint8Array(total);let offset=0;for(const p of ordered){profile.set(p.bytes,offset);offset+=p.bytes.length;}
  const view=new DataView(profile.buffer),signature=start=>String.fromCharCode(...profile.subarray(start,start+4)),tags=view.getUint32(128),tableEnd=132+12*tags;
  if(view.getUint32(0)!==total||signature(36)!=='acsp'||signature(16)!=='RGB '||!tags||tableEnd>total)fail();
  for(let i=0;i<tags;i++){const entry=132+i*12,start=view.getUint32(entry+4),size=view.getUint32(entry+8);if(start<tableEnd||size<8||start+size>total)fail();}
  return true;
}

function crc32(bytes,start,end){let crc=0xffffffff;for(let i=start;i<end;i++){crc^=bytes[i];for(let bit=0;bit<8;bit++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}return (crc^0xffffffff)>>>0;}

const preparedImages=new WeakMap();
export function prepareImage(blob,buffer,{raf:expectRAF=false}={}) {
  let image=blob,imageBuffer=buffer,raf;
  if(expectRAF||hasRAFMagic(buffer)){raf=rafPreview(buffer);image=blob.slice(raf.offset,raf.offset+raf.length,'image/jpeg');imageBuffer=raf.buffer;}
  const parsed=parseImage(imageBuffer),parts=[];let offset=0;
  if(raf)parsed.header={...parsed.header,format:'RAF',previewFormat:'JPEG',camera:raf.camera,previewOffset:raf.offset,previewLength:raf.length};
  for(const [start,end] of parsed.omitted){parts.push(image.slice(offset,start));offset=end;}
  parts.push(image.slice(offset));
  const source=parsed.omitted.length?new Blob(parts,{type:parsed.header.format==='PNG'?'image/png':'image/jpeg'}):image;
  preparedImages.set(blob,{...parsed,source});return parsed.header;
}

export function orientationMatrix(width,height,orientation){
  const transforms={1:[1,0,0,1,0,0],2:[-1,0,0,1,width,0],3:[-1,0,0,-1,width,height],4:[1,0,0,-1,0,height],5:[0,1,1,0,0,0],6:[0,1,-1,0,height,0],7:[0,-1,-1,0,height,width],8:[0,-1,1,0,0,width]};
  return transforms[orientation]||transforms[1];
}

export function drawDecoded(context,decoded,x=0,y=0,width=decoded.width,height=decoded.height){
  context.save();
  try{context.translate(x,y);context.scale(width/decoded.width,height/decoded.height);context.transform(...orientationMatrix(decoded.raw.width,decoded.raw.height,decoded.orientation));context.drawImage(decoded.raw,0,0);}
  finally{context.restore();}
}

let decodeQueue = Promise.resolve();
export function withDecoded(blob, operation, shouldContinue = () => true) {
  const work = decodeQueue.catch(() => {}).then(async () => {
    if(!shouldContinue())return;
    if(!preparedImages.has(blob))prepareImage(blob,await blob.arrayBuffer());
    if(!shouldContinue())return;
    const prepared=preparedImages.get(blob);
    let bitmap;
    try { bitmap = await createImageBitmap(prepared.source, { imageOrientation: 'from-image' }); }
    catch (error) { throw new Error('圖片解碼失敗，檔案可能損壞或瀏覽器不支援此編碼', { cause:error }); }
    try {
      if(bitmap.width!==prepared.rawWidth||bitmap.height!==prepared.rawHeight)throw new Error('瀏覽器解碼尺寸與原始像素不一致，請先轉成標準 JPEG / PNG');
      return await operation({raw:bitmap,width:prepared.header.width,height:prepared.header.height,orientation:prepared.header.orientation});
    }
    finally { bitmap.close(); }
  });
  decodeQueue = work;
  return work;
}

export function releaseCanvas(canvas) {
  if (canvas) { canvas.width = 0; canvas.height = 0; }
}

// Shared local copy renderer. It owns no source writes, downloads or destination handles.
export async function encodeJpegCopy(source,{style='original',strength=60,adjustments,signal,onProgress=()=>{}}={}){
  const key=Object.hasOwn(styles,style)?style:'original',amount=Math.max(0,Math.min(100,Number(strength)||0))/100,tone=normaliseTone(adjustments),check=()=>{if(signal?.aborted)throw new DOMException('已取消副本製作','AbortError');};
  check();onProgress({phase:'decode'});
  const result=await withDecoded(source,async decoded=>{
    check();const scale=Math.min(1,8192/Math.max(decoded.width,decoded.height)),canvas=document.createElement('canvas');
    try{
      canvas.width=Math.max(1,Math.round(decoded.width*scale));canvas.height=Math.max(1,Math.round(decoded.height*scale));const ctx=canvas.getContext('2d',{willReadFrequently:true,colorSpace:'srgb'});ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);drawDecoded(ctx,decoded,0,0,canvas.width,canvas.height);
      for(let y=0;y<canvas.height;y+=128){check();const rows=Math.min(128,canvas.height-y),chunk=ctx.getImageData(0,y,canvas.width,rows);transform(chunk.data,key,amount,tone);ctx.putImageData(chunk,0,y);onProgress({phase:'pixels',completedRows:y+rows,totalRows:canvas.height});await new Promise(resolve=>setTimeout(resolve,0));}
      check();onProgress({phase:'encode'});const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.95));check();if(!blob)throw new Error('無法編碼圖片');return {blob,width:canvas.width,height:canvas.height,scaled:scale<1};
    }finally{releaseCanvas(canvas);}
  },()=>!signal?.aborted);
  check();if(!result)throw new Error('副本製作未完成');return result;
}
