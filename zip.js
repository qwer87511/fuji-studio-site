import {Zip,ZipPassThrough} from './vendor/fflate.js';
import {encodeJpegCopy,normaliseTone,styles} from './core.js';

export const ZIP_LIMITS=Object.freeze({files:20,bytes:64*1024*1024});
const utf8=new TextEncoder(),pause=()=>new Promise(resolve=>setTimeout(resolve,0));
const reserved=/^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(?:\.|$)/i;
function shortName(value,maxBytes=150){let text=String(value||'photo').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'_').replace(/^[. ]+|[. ]+$/g,'');if(!text)text='photo';if(reserved.test(text))text='_'+text;while(utf8.encode(text).length>maxBytes)text=Array.from(text).slice(0,-1).join('');return text;}

// Snapshot only the photo bytes and local edit facts; no EXIF, GPS or camera recipe text.
export function makeExportTasks(photos){
 const used=new Set();return photos.map((photo,index)=>{
  const style=Object.hasOwn(styles,photo.style)?photo.style:'original',strength=Math.max(0,Math.min(100,Number(photo.strength)||0)),sourceKind=photo.sourceFormat==='RAF'?'raf-embedded-jpeg':'jpeg-or-png';
  const stem=shortName(String(photo.name||'photo').replace(/\.[^.]+$/,''))+(sourceKind==='raf-embedded-jpeg'?'-raf-preview':'')+`-fuji-${style}-${strength}`;
  let filename=stem+'.jpg',suffix=2;while(used.has(filename.toLocaleLowerCase('en-US')))filename=stem+`-${suffix++}.jpg`;used.add(filename.toLocaleLowerCase('en-US'));
  return {id:photo.id??String(index),blob:photo.blob,filename,style,strength,adjustments:normaliseTone(photo.adjustments),sourceKind,status:'pending'};
 });
}

/** Sequential, bounded archive. Callers commit returned results only after successful finalisation. */
export async function buildZipBatch(tasks,{signal,onProgress=()=>{},encode=encodeJpegCopy,limits=ZIP_LIMITS}={}){
 const maxFiles=Math.min(ZIP_LIMITS.files,Math.floor(limits.files)),maxBytes=Math.min(ZIP_LIMITS.bytes,Math.floor(limits.bytes));
 if(!Number.isSafeInteger(maxFiles)||!Number.isSafeInteger(maxBytes)||maxFiles<1||maxBytes<32768)throw new Error('ZIP容量設定無效');
 const pending=tasks.filter(task=>task.status==='pending'),completed=[],failed=[],chunks=[];let bytes=0,error,final=false,reason='finished',attempted=0;
 const zip=new Zip((err,chunk,last)=>{if(err){error=err;return;}bytes+=chunk.byteLength;if(bytes>maxBytes){error=new Error('ZIP超過容量上限；本包未完成，請重試較小選取範圍');return;}chunks.push(chunk);if(last)final=true;});
 const add=(name,data)=>{const entry=new ZipPassThrough(name);zip.add(entry);entry.push(data,true);if(error)throw error;};
 try{
  for(const task of pending){
   if(signal?.aborted){reason='cancelled';break;}if(attempted>=maxFiles){reason='file-limit';break;}attempted++;
   onProgress({phase:'photo',filename:task.filename,completed:completed.length,failed:failed.length,total:pending.length});
   let copy,data;
   try{
    copy=await encode(task.blob,{style:task.style,strength:task.strength,adjustments:{...task.adjustments},signal,onProgress:step=>onProgress({...step,filename:task.filename,completed:completed.length,failed:failed.length,total:pending.length})});
    if(signal?.aborted){reason='cancelled';break;}
    if(!(copy.blob instanceof Blob)||!copy.blob.size||copy.blob.type!=='image/jpeg')throw new Error('JPEG編碼未產生有效副本');
    // JPEG buffers + ZIP metadata are bounded. Reserve enough for <=20 file records + UTF-8 names.
    if(bytes+copy.blob.size+1024+32768>maxBytes){if(completed.length){reason='byte-limit';break;}throw new Error('單張副本超過本包容量，請使用單張另存或降低圖片尺寸');}
    data=new Uint8Array(await copy.blob.arrayBuffer());if(signal?.aborted){reason='cancelled';break;}
   }catch(err){if(signal?.aborted||err.name==='AbortError'){reason='cancelled';break;}failed.push({id:task.id,filename:task.filename,error:String(err.message||'編碼失敗').slice(0,160)});await pause();continue;}
   onProgress({phase:'archive',filename:task.filename,completed:completed.length,failed:failed.length,total:pending.length});
   add(task.filename,data);completed.push({id:task.id,filename:task.filename,width:copy.width,height:copy.height,scaled:Boolean(copy.scaled),style:task.style,strength:task.strength,adjustments:{...task.adjustments},sourceKind:task.sourceKind,cameraReferenceApplied:false});
   copy=null;data=null;await pause();
  }
  if(signal?.aborted)reason='cancelled';
  const remaining=pending.length-completed.length-failed.length;
  if(!completed.length){zip.terminate();return {blob:null,completed,failed,remaining,reason,bytes:0};}
  const manifest={format:'fuji-studio-jpeg-copies-v1',createdAt:new Date().toISOString(),reason,remaining,files:completed.map(({id,...file})=>file),failed:failed.map(({id,...file})=>file)};
  add('fuji-studio-export.json',utf8.encode(JSON.stringify(manifest,null,2)));
  add('請先閱讀.txt',utf8.encode('fuji studio — JPEG後製副本\r\n只含已完整完成的JPEG，不含原片、EXIF或GPS。\r\n本機近似調色不是富士官方底片模擬，官方模式與創作者相機配方未套用。\r\nRAF僅來自內嵌JPEG預覽，不是RAW開發。PNG透明區以白底輸出。\r\n輸出長邊最多8192px；瀏覽器sRGB Canvas非ICC軟打樣。\r\n詳細尺寸與本機調色參數見fuji-studio-export.json。\r\n請確認下載與檔案可讀，再關閉工作階段；原照片另行保管。\r\n'));
  zip.end();if(error)throw error;if(!final)throw new Error('ZIP尚未完整結束');
  const blob=new Blob(chunks,{type:'application/zip'});chunks.length=0;return {blob,completed,failed,remaining,reason,bytes:blob.size};
 }catch(err){zip.terminate();chunks.length=0;throw err;}
}
