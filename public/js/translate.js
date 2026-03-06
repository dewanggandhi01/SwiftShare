/* ==================== SwiftTranslate – Main JS ==================== */
(function(){
'use strict';

/* ─── Language list (100+ languages) ─── */
const LANGUAGES = [
  {code:'af',name:'Afrikaans'},{code:'sq',name:'Albanian'},{code:'am',name:'Amharic'},
  {code:'ar',name:'Arabic'},{code:'hy',name:'Armenian'},{code:'az',name:'Azerbaijani'},
  {code:'eu',name:'Basque'},{code:'be',name:'Belarusian'},{code:'bn',name:'Bengali'},
  {code:'bs',name:'Bosnian'},{code:'bg',name:'Bulgarian'},{code:'ca',name:'Catalan'},
  {code:'ceb',name:'Cebuano'},{code:'zh-CN',name:'Chinese (Simplified)'},
  {code:'zh-TW',name:'Chinese (Traditional)'},{code:'co',name:'Corsican'},
  {code:'hr',name:'Croatian'},{code:'cs',name:'Czech'},{code:'da',name:'Danish'},
  {code:'nl',name:'Dutch'},{code:'en',name:'English'},{code:'eo',name:'Esperanto'},
  {code:'et',name:'Estonian'},{code:'fi',name:'Finnish'},{code:'fr',name:'French'},
  {code:'fy',name:'Frisian'},{code:'gl',name:'Galician'},{code:'ka',name:'Georgian'},
  {code:'de',name:'German'},{code:'el',name:'Greek'},{code:'gu',name:'Gujarati'},
  {code:'ht',name:'Haitian Creole'},{code:'ha',name:'Hausa'},{code:'haw',name:'Hawaiian'},
  {code:'he',name:'Hebrew'},{code:'hi',name:'Hindi'},{code:'hmn',name:'Hmong'},
  {code:'hu',name:'Hungarian'},{code:'is',name:'Icelandic'},{code:'ig',name:'Igbo'},
  {code:'id',name:'Indonesian'},{code:'ga',name:'Irish'},{code:'it',name:'Italian'},
  {code:'ja',name:'Japanese'},{code:'jv',name:'Javanese'},{code:'kn',name:'Kannada'},
  {code:'kk',name:'Kazakh'},{code:'km',name:'Khmer'},{code:'rw',name:'Kinyarwanda'},
  {code:'ko',name:'Korean'},{code:'ku',name:'Kurdish'},{code:'ky',name:'Kyrgyz'},
  {code:'lo',name:'Lao'},{code:'la',name:'Latin'},{code:'lv',name:'Latvian'},
  {code:'lt',name:'Lithuanian'},{code:'lb',name:'Luxembourgish'},{code:'mk',name:'Macedonian'},
  {code:'mg',name:'Malagasy'},{code:'ms',name:'Malay'},{code:'ml',name:'Malayalam'},
  {code:'mt',name:'Maltese'},{code:'mi',name:'Maori'},{code:'mr',name:'Marathi'},
  {code:'mn',name:'Mongolian'},{code:'my',name:'Myanmar'},{code:'ne',name:'Nepali'},
  {code:'no',name:'Norwegian'},{code:'ny',name:'Nyanja'},{code:'or',name:'Odia'},
  {code:'ps',name:'Pashto'},{code:'fa',name:'Persian'},{code:'pl',name:'Polish'},
  {code:'pt',name:'Portuguese'},{code:'pa',name:'Punjabi'},{code:'ro',name:'Romanian'},
  {code:'ru',name:'Russian'},{code:'sm',name:'Samoan'},{code:'gd',name:'Scots Gaelic'},
  {code:'sr',name:'Serbian'},{code:'st',name:'Sesotho'},{code:'sn',name:'Shona'},
  {code:'sd',name:'Sindhi'},{code:'si',name:'Sinhala'},{code:'sk',name:'Slovak'},
  {code:'sl',name:'Slovenian'},{code:'so',name:'Somali'},{code:'es',name:'Spanish'},
  {code:'su',name:'Sundanese'},{code:'sw',name:'Swahili'},{code:'sv',name:'Swedish'},
  {code:'tl',name:'Tagalog'},{code:'tg',name:'Tajik'},{code:'ta',name:'Tamil'},
  {code:'tt',name:'Tatar'},{code:'te',name:'Telugu'},{code:'th',name:'Thai'},
  {code:'tr',name:'Turkish'},{code:'tk',name:'Turkmen'},{code:'uk',name:'Ukrainian'},
  {code:'ur',name:'Urdu'},{code:'ug',name:'Uyghur'},{code:'uz',name:'Uzbek'},
  {code:'vi',name:'Vietnamese'},{code:'cy',name:'Welsh'},{code:'xh',name:'Xhosa'},
  {code:'yi',name:'Yiddish'},{code:'yo',name:'Yoruba'},{code:'zu',name:'Zulu'}
];

/* ─── DOM refs ─── */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const langFrom  = $('#lang-from');
const langTo    = $('#lang-to');
const inputText = $('#input-text');
const outputText= $('#output-text');
const charCount = $('#char-count');
const loadingOv = $('#loading-overlay');
const loadingTxt= $('#loading-text');

/* ─── Populate language dropdowns ─── */
function populateLangs(){
  LANGUAGES.forEach(l => {
    const o1 = new Option(l.name, l.code);
    const o2 = new Option(l.name, l.code);
    langFrom.appendChild(o1);
    langTo.appendChild(o2);
  });
  langTo.value = 'es'; // default target: Spanish
}
populateLangs();

/* ─── Tabs ─── */
$$('.tr-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.tr-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    $$('.tr-panel').forEach(p => p.hidden = true);
    const panel = $(`#panel-${tab.dataset.tab}`);
    if(panel) panel.hidden = false;
  });
});

/* ─── Char count ─── */
inputText.addEventListener('input', () => {
  const len = inputText.value.length;
  charCount.textContent = `${len.toLocaleString()} / 50,000`;
});

/* ─── Utility ─── */
function showLoading(msg='Translating...'){loadingTxt.textContent=msg;loadingOv.hidden=false}
function hideLoading(){loadingOv.hidden=true}
function toast(msg){
  let t=document.createElement('div');t.className='tr-toast';t.textContent=msg;
  document.body.appendChild(t);
  requestAnimationFrame(()=>t.classList.add('show'));
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300)},2500);
}
function sanitize(str){const d=document.createElement('div');d.textContent=str;return d.innerHTML}
function formatBytes(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB'}
function timeAgo(ts){const d=Date.now()-ts,s=d/1000;if(s<60)return'Just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return new Date(ts).toLocaleDateString()}

/* ─── Translation API call ─── */
async function translateText(text, from, to){
  const resp = await fetch('/api/translate', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({text, from: from==='auto'?'':from, to})
  });
  if(!resp.ok){
    const err = await resp.json().catch(()=>({error:'Translation failed'}));
    throw new Error(err.error||'Translation failed');
  }
  return resp.json();
}

/* ─── Recent languages ─── */
const RECENT_KEY = 'tr_recent_langs';
function getRecent(){try{return JSON.parse(localStorage.getItem(RECENT_KEY))||[]}catch{return[]}}
function addRecent(code){
  if(!code||code==='auto')return;
  let r=getRecent().filter(c=>c!==code);
  r.unshift(code);
  if(r.length>6)r.length=6;
  localStorage.setItem(RECENT_KEY,JSON.stringify(r));
  renderRecent();
}
function renderRecent(){
  const r=getRecent();
  const container=$('#recent-lang-chips');
  const wrap=$('#recent-langs');
  if(!r.length){wrap.hidden=true;return}
  wrap.hidden=false;
  container.innerHTML='';
  r.forEach(code=>{
    const lang=LANGUAGES.find(l=>l.code===code);
    if(!lang)return;
    const btn=document.createElement('button');
    btn.textContent=lang.name;
    btn.addEventListener('click',()=>{langTo.value=code});
    container.appendChild(btn);
  });
}
renderRecent();

/* ─── Translation History ─── */
const HISTORY_KEY='tr_history';
function getHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY))||[]}catch{return[]}}
function saveHistory(entry){
  const h=getHistory();
  h.unshift(entry);
  if(h.length>50)h.length=50;
  localStorage.setItem(HISTORY_KEY,JSON.stringify(h));
}
function clearHistory(){localStorage.removeItem(HISTORY_KEY);renderHistory()}
function renderHistory(){
  const list=$('#history-list');
  const h=getHistory();
  if(!h.length){list.innerHTML='<p class="tr-empty">No translations yet</p>';return}
  list.innerHTML='';
  h.forEach((entry,i)=>{
    const fromLang=LANGUAGES.find(l=>l.code===entry.from);
    const toLang=LANGUAGES.find(l=>l.code===entry.to);
    const card=document.createElement('div');
    card.className='tr-history-card';
    card.innerHTML=`
      <div class="tr-history-card-top">
        <span class="tr-history-card-lang">${sanitize(fromLang?fromLang.name:entry.from||'Auto')} → ${sanitize(toLang?toLang.name:entry.to)}</span>
        <span class="tr-history-card-time">${timeAgo(entry.ts)}</span>
      </div>
      <div class="tr-history-card-text">
        <span>${sanitize(entry.original.slice(0,150))}${entry.original.length>150?'…':''}</span>
        <span>${sanitize(entry.translated.slice(0,150))}${entry.translated.length>150?'…':''}</span>
      </div>
      <div class="tr-history-actions">
        <button class="tr-btn-sm" data-action="reuse" data-idx="${i}">♻️ Reuse</button>
        <button class="tr-btn-sm" data-action="copy" data-idx="${i}">📋 Copy</button>
        <button class="tr-btn-sm tr-btn-danger" data-action="delete" data-idx="${i}">🗑️</button>
      </div>`;
    list.appendChild(card);
  });
  list.querySelectorAll('[data-action]').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const idx=parseInt(btn.dataset.idx);
      const act=btn.dataset.action;
      const hh=getHistory();
      if(act==='reuse'&&hh[idx]){
        inputText.value=hh[idx].original;
        langTo.value=hh[idx].to;
        if(hh[idx].from)langFrom.value=hh[idx].from;
        $$('.tr-tab').forEach(t=>t.classList.remove('active'));
        $$('.tr-tab')[0].classList.add('active');
        $$('.tr-panel').forEach(p=>p.hidden=true);
        $('#panel-text').hidden=false;
        inputText.dispatchEvent(new Event('input'));
      }else if(act==='copy'&&hh[idx]){
        navigator.clipboard.writeText(hh[idx].translated).then(()=>toast('Copied!'));
      }else if(act==='delete'){
        hh.splice(idx,1);
        localStorage.setItem(HISTORY_KEY,JSON.stringify(hh));
        renderHistory();
      }
    });
  });
}

/* ─── Text Translation ─── */
$('#btn-translate-text').addEventListener('click', async()=>{
  const text=inputText.value.trim();
  if(!text){toast('Enter some text first');return}
  const from=langFrom.value;
  const to=langTo.value;
  if(!to){toast('Select target language');return}
  showLoading('Translating text...');
  try{
    const res=await translateText(text,from,to);
    outputText.textContent=res.translated;
    addRecent(to);
    saveHistory({original:text,translated:res.translated,from:from==='auto'?(res.detectedLang||''):from,to,ts:Date.now()});
    renderHistory();
  }catch(err){
    toast('Error: '+err.message);
  }finally{hideLoading()}
});

/* ─── Clear / Paste / Copy / Regenerate ─── */
$('#btn-clear-input').addEventListener('click',()=>{inputText.value='';outputText.textContent='';inputText.dispatchEvent(new Event('input'))});
$('#btn-paste').addEventListener('click',async()=>{
  try{const t=await navigator.clipboard.readText();inputText.value=t;inputText.dispatchEvent(new Event('input'))}catch{toast('Clipboard access denied')}
});
$('#btn-copy-output').addEventListener('click',()=>{
  const t=outputText.textContent;
  if(!t){toast('Nothing to copy');return}
  navigator.clipboard.writeText(t).then(()=>toast('Copied!'));
});
$('#btn-regenerate').addEventListener('click',()=>$('#btn-translate-text').click());

/* ─── Swap languages ─── */
$('#btn-swap-lang').addEventListener('click',()=>{
  if(langFrom.value==='auto'){toast('Cannot swap with Auto Detect');return}
  const tmp=langFrom.value;
  langFrom.value=langTo.value;
  langTo.value=tmp;
  const tmpText=inputText.value;
  inputText.value=outputText.textContent;
  outputText.textContent=tmpText;
  inputText.dispatchEvent(new Event('input'));
});

/* ─── File Upload ─── */
const fileDropzone=$('#file-dropzone');
const fileInput=$('#file-input');
const fileInfo=$('#file-info');
let selectedFile=null;
let extractedText='';

fileDropzone.addEventListener('click',()=>fileInput.click());
fileDropzone.addEventListener('dragover',e=>{e.preventDefault();fileDropzone.classList.add('dragover')});
fileDropzone.addEventListener('dragleave',()=>fileDropzone.classList.remove('dragover'));
fileDropzone.addEventListener('drop',e=>{
  e.preventDefault();fileDropzone.classList.remove('dragover');
  if(e.dataTransfer.files.length)handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change',()=>{if(fileInput.files.length)handleFile(fileInput.files[0])});

function getFileIcon(name){
  const ext=name.split('.').pop().toLowerCase();
  if(ext==='pdf')return'📕';
  if(['png','jpg','jpeg','gif','bmp','webp'].includes(ext))return'🖼️';
  if(['docx','doc'].includes(ext))return'📘';
  return'📄';
}

function handleFile(file){
  const ext=file.name.split('.').pop().toLowerCase();
  const maxPDF=50*1024*1024, maxImg=10*1024*1024, maxTxt=5*1024*1024;
  if(ext==='pdf'&&file.size>maxPDF){toast('PDF too large (max 50MB)');return}
  if(['png','jpg','jpeg','gif','bmp','webp'].includes(ext)&&file.size>maxImg){toast('Image too large (max 10MB)');return}
  if(['txt','docx','doc'].includes(ext)&&file.size>maxTxt){toast('File too large (max 5MB)');return}
  const allowed=['pdf','png','jpg','jpeg','gif','bmp','webp','docx','doc','txt'];
  if(!allowed.includes(ext)){toast('Unsupported file type');return}
  selectedFile=file;
  extractedText='';
  pdfStructuredData=null;
  $('#file-icon').textContent=getFileIcon(file.name);
  $('#file-name').textContent=file.name;
  $('#file-size').textContent=formatBytes(file.size);
  fileDropzone.hidden=true;
  fileInfo.hidden=false;
  $('#file-result').hidden=true;
}

$('#btn-remove-file').addEventListener('click',()=>{
  selectedFile=null;extractedText='';pdfStructuredData=null;
  fileInput.value='';
  fileDropzone.hidden=false;
  fileInfo.hidden=true;
  $('#file-result').hidden=true;
});

/* ─── File text extraction ─── */
let pdfStructuredData=null;

/* Helper: get a fresh ArrayBuffer from the stored File (never reuses old buffers) */
async function getFreshFileBytes(){
  if(!selectedFile) return null;
  const buf = await selectedFile.arrayBuffer();
  return buf;
}

async function extractFromPDF(file){
  const buf=await file.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(buf.slice(0))}).promise;
  const pages=[];
  let flatText='';
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const vp=page.getViewport({scale:1});
    const tc=await page.getTextContent();
    const items=tc.items.filter(it=>it.str&&it.str.trim());
    items.sort((a,b)=>{
      const dy=b.transform[5]-a.transform[5];
      if(Math.abs(dy)>3)return dy;
      return a.transform[4]-b.transform[4];
    });
    const lines=[];
    let curLine=null;
    for(const item of items){
      const x=item.transform[4];
      const y=item.transform[5];
      const fs=Math.abs(item.transform[0])||12;
      const w=item.width||item.str.length*fs*0.5;
      if(!curLine||Math.abs(curLine.y-y)>fs*0.6){
        curLine={texts:[],x,y,fontSize:fs,right:x+w};
        lines.push(curLine);
      }else{
        curLine.x=Math.min(curLine.x,x);
        curLine.right=Math.max(curLine.right,x+w);
        curLine.fontSize=Math.max(curLine.fontSize,fs);
      }
      curLine.texts.push(item.str);
    }
    const textLines=lines.map(l=>({
      text:l.texts.join(' '),x:l.x,y:l.y,
      fontSize:l.fontSize,width:l.right-l.x
    }));
    const pageText=textLines.map(l=>l.text).join('\n');
    flatText+=pageText+'\n\n';
    pages.push({width:vp.width,height:vp.height,textLines,pageText});
  }
  pdfStructuredData={pages};
  return flatText.trim();
}

async function extractFromImage(file){
  const url=URL.createObjectURL(file);
  try{
    const worker=await Tesseract.createWorker('eng');
    const {data}=await worker.recognize(url);
    await worker.terminate();
    return data.text.trim();
  }finally{URL.revokeObjectURL(url)}
}

async function extractFromDOCX(file){
  const buf=await file.arrayBuffer();
  const result=await mammoth.extractRawText({arrayBuffer:buf});
  return result.value.trim();
}

async function extractFromTXT(file){
  return file.text();
}

async function extractText(file, onProgress){
  const ext=file.name.split('.').pop().toLowerCase();
  if(ext==='pdf'){onProgress('Extracting text from PDF...');return extractFromPDF(file)}
  if(['png','jpg','jpeg','gif','bmp','webp'].includes(ext)){onProgress('Running OCR on image... (may take a moment)');return extractFromImage(file)}
  if(['docx','doc'].includes(ext)){onProgress('Extracting text from document...');return extractFromDOCX(file)}
  if(ext==='txt'){onProgress('Reading text file...');return extractFromTXT(file)}
  throw new Error('Unsupported file type');
}

/* ─── Translate File ─── */
$('#btn-translate-file').addEventListener('click',async()=>{
  if(!selectedFile){toast('Select a file first');return}
  const from=langFrom.value;
  const to=langTo.value;
  if(!to){toast('Select target language');return}
  const prog=$('#file-progress');
  const progFill=$('#progress-fill');
  const progText=$('#progress-text');
  prog.hidden=false;
  progFill.style.width='10%';
  const isPDF=selectedFile.name.toLowerCase().endsWith('.pdf');
  try{
    if(!extractedText){
      extractedText=await extractText(selectedFile, msg=>{progText.textContent=msg});
    }
    if(!extractedText){toast('Could not extract text from file');prog.hidden=true;return}
    progFill.style.width='30%';
    /* ── PDF: page-by-page translation with visual preview ── */
    if(isPDF&&pdfStructuredData){
      const sd=pdfStructuredData;
      sd.translatedPages=[];
      for(let i=0;i<sd.pages.length;i++){
        progText.textContent=`Translating page ${i+1} of ${sd.pages.length}...`;
        progFill.style.width=`${30+60*((i+1)/sd.pages.length)}%`;
        const pt=sd.pages[i].pageText;
        if(!pt.trim()){sd.translatedPages.push('');continue}
        const res=await translateText(pt,from,to);
        sd.translatedPages.push(res.translated);
      }
      progFill.style.width='95%';
      progText.textContent='Rendering preview...';
      /* Render original PDF pages as images */
      const origCol=$('#file-original');
      origCol.style.whiteSpace='normal';
      origCol.style.maxHeight='600px';
      const freshBuf1=await getFreshFileBytes();
      await renderPDFPagesAsImages(freshBuf1,origCol);
      /* Render translated text page-by-page */
      const transCol=$('#file-translated');
      transCol.contentEditable='false';
      transCol.style.whiteSpace='normal';
      transCol.style.maxHeight='600px';
      renderTranslatedPages(sd.translatedPages,transCol);
      const fullTranslated=sd.translatedPages.join('\n\n');
      progFill.style.width='100%';
      progText.textContent='Done!';
      $('#file-result').hidden=false;
      addRecent(to);
      saveHistory({original:extractedText.slice(0,500),translated:fullTranslated.slice(0,500),from:from==='auto'?'':from,to,ts:Date.now(),isFile:true,fileName:selectedFile.name});
      renderHistory();
    }else{
      /* ── Non-PDF: simple text translation ── */
      progFill.style.width='40%';
      progText.textContent='Translating...';
      const res=await translateText(extractedText,from,to);
      progFill.style.width='100%';
      progText.textContent='Done!';
      const origCol=$('#file-original');
      origCol.style.whiteSpace='pre-wrap';
      origCol.textContent=extractedText;
      const transCol=$('#file-translated');
      transCol.style.whiteSpace='pre-wrap';
      transCol.contentEditable='true';
      transCol.textContent=res.translated;
      $('#file-result').hidden=false;
      addRecent(to);
      saveHistory({original:extractedText.slice(0,500),translated:res.translated.slice(0,500),from:from==='auto'?(res.detectedLang||''):from,to,ts:Date.now(),isFile:true,fileName:selectedFile.name});
      renderHistory();
    }
    setTimeout(()=>{prog.hidden=true},1500);
  }catch(err){
    toast('Error: '+err.message);
    prog.hidden=true;
  }
});

/* ─── Download Translated ─── */
$('#btn-dl-txt').addEventListener('click',()=>{
  const text=$('#file-translated').textContent;
  if(!text){toast('Nothing to download');return}
  const blob=new Blob([text],{type:'text/plain'});
  downloadBlob(blob,'translated.txt');
});

$('#btn-dl-pdf').addEventListener('click',async()=>{
  /* ── Layout-preserving PDF when original was a PDF ── */
  if(pdfStructuredData&&pdfStructuredData.translatedPages){
    showLoading('Creating layout-preserving PDF...');
    try{
      const bytes=await createLayoutPreservingPDF();
      const outName=selectedFile?selectedFile.name.replace(/\.pdf$/i,'-translated.pdf'):'translated.pdf';
      downloadBlob(new Blob([bytes],{type:'application/pdf'}),outName);
    }catch(err){toast('PDF creation failed: '+err.message)}
    finally{hideLoading()}
    return;
  }
  /* ── Fallback: plain text → new PDF ── */
  const text=$('#file-translated').textContent;
  if(!text){toast('Nothing to download');return}
  try{
    const pdfDoc=await PDFLib.PDFDocument.create();
    const font=await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    const fontSize=11;
    const margin=50;
    const pageW=595;const pageH=842;
    const maxW=pageW-2*margin;
    const lines=wrapText(text,font,fontSize,maxW);
    let page=pdfDoc.addPage([pageW,pageH]);
    let y=pageH-margin;
    for(const line of lines){
      if(y<margin){page=pdfDoc.addPage([pageW,pageH]);y=pageH-margin}
      page.drawText(line,{x:margin,y,size:fontSize,font,color:PDFLib.rgb(0,0,0)});
      y-=fontSize*1.5;
    }
    const bytes=await pdfDoc.save();
    downloadBlob(new Blob([bytes],{type:'application/pdf'}),'translated.pdf');
  }catch(err){toast('PDF creation failed: '+err.message)}
});

$('#btn-copy-result').addEventListener('click',()=>{
  const text=$('#file-translated').textContent;
  if(!text){toast('Nothing to copy');return}
  navigator.clipboard.writeText(text).then(()=>toast('Copied!'));
});

function wrapText(text,font,size,maxW){
  const result=[];
  for(const paragraph of text.split('\n')){
    if(!paragraph.trim()){result.push('');continue}
    const words=paragraph.split(/\s+/);
    let line='';
    for(const w of words){
      const test=line?(line+' '+w):w;
      let tw;
      try{tw=font.widthOfTextAtSize(test,size)}catch{tw=test.length*size*0.5}
      if(tw>maxW&&line){result.push(line);line=w}else{line=test}
    }
    if(line)result.push(line);
  }
  return result;
}

/* ─── Render original PDF pages as images ─── */
async function renderPDFPagesAsImages(fileBytes,container){
  container.innerHTML='';
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(fileBytes)}).promise;
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const scale=Math.min(1.5,480/page.getViewport({scale:1}).width);
    const vp=page.getViewport({scale});
    const canvas=document.createElement('canvas');
    canvas.width=vp.width;canvas.height=vp.height;
    canvas.style.cssText='width:100%;margin-bottom:4px;border-radius:4px;box-shadow:0 1px 6px rgba(0,0,0,.35);';
    await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
    const label=document.createElement('div');
    label.style.cssText='text-align:center;font-size:.7rem;color:var(--text2);margin-bottom:10px;';
    label.textContent=`Page ${i} of ${pdf.numPages}`;
    container.appendChild(canvas);
    container.appendChild(label);
  }
}

/* ─── Render translated text page-by-page ─── */
function renderTranslatedPages(translatedPages,container){
  container.innerHTML='';
  translatedPages.forEach((text,i)=>{
    const block=document.createElement('div');
    block.style.cssText='margin-bottom:14px;padding:10px 12px;background:rgba(108,99,255,.06);border-radius:8px;border-left:3px solid var(--accent);';
    const label=document.createElement('div');
    label.style.cssText='font-size:.72rem;color:var(--accent);font-weight:600;margin-bottom:6px;';
    label.textContent=`Page ${i+1}`;
    const content=document.createElement('div');
    content.style.cssText='white-space:pre-wrap;line-height:1.6;font-size:.93rem;';
    content.textContent=text;
    block.appendChild(label);
    block.appendChild(content);
    container.appendChild(block);
  });
}

/* ─── Create layout-preserving translated PDF ─── */
async function createLayoutPreservingPDF(){
  const sd=pdfStructuredData;
  const freshBuf=await getFreshFileBytes();
  const srcDoc=await PDFLib.PDFDocument.load(new Uint8Array(freshBuf));
  const outDoc=await PDFLib.PDFDocument.create();
  const font=await outDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  const copiedPages=await outDoc.copyPages(srcDoc,srcDoc.getPageIndices());
  for(let i=0;i<copiedPages.length;i++){
    const page=outDoc.addPage(copiedPages[i]);
    const pd=sd.pages[i];
    const transText=sd.translatedPages[i];
    if(!pd||!transText)continue;
    const origLines=pd.textLines;
    const mapped=mapTranslationToPositions(transText,origLines);
    for(let j=0;j<origLines.length;j++){
      const ol=origLines[j];
      const tl=mapped[j]||'';
      /* White-out original text */
      page.drawRectangle({
        x:ol.x-2,
        y:ol.y-ol.fontSize*0.35,
        width:Math.min(page.getWidth()-ol.x,ol.width*2.5+40),
        height:ol.fontSize*1.35,
        color:PDFLib.rgb(1,1,1)
      });
      /* Draw translated text */
      if(tl.trim()){
        const fs=Math.min(ol.fontSize,13);
        const maxW=page.getWidth()-ol.x-30;
        try{
          const wrapped=wrapText(tl,font,fs,maxW);
          let yy=ol.y;
          for(const wl of wrapped){
            page.drawText(wl,{x:ol.x,y:yy,size:fs,font,color:PDFLib.rgb(0,0,0)});
            yy-=fs*1.2;
          }
        }catch(e){/* char not supported by font – skip */}
      }
    }
  }
  return outDoc.save();
}

/* ─── Map translated text to original line positions ─── */
function mapTranslationToPositions(translatedText,origLines){
  if(!origLines.length)return[];
  const transLines=translatedText.split('\n');
  if(transLines.length===origLines.length)return transLines;
  /* Proportionally distribute words across original positions */
  const totalOrig=origLines.reduce((s,l)=>s+l.text.length,0)||1;
  const words=translatedText.replace(/\n/g,' ').split(/\s+/).filter(w=>w);
  const total=words.length;
  const result=[];
  let idx=0;
  for(let i=0;i<origLines.length;i++){
    if(i===origLines.length-1){
      result.push(words.slice(idx).join(' '));
    }else{
      const count=Math.max(1,Math.round(origLines[i].text.length/totalOrig*total));
      result.push(words.slice(idx,idx+count).join(' '));
      idx+=count;
    }
  }
  return result;
}

function downloadBlob(blob,name){
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},100);
}

/* ─── Batch Translation ─── */
const batchDropzone=$('#batch-dropzone');
const batchInput=$('#batch-input');
const batchList=$('#batch-list');
let batchFiles=[];

batchDropzone.addEventListener('click',()=>batchInput.click());
batchDropzone.addEventListener('dragover',e=>{e.preventDefault();batchDropzone.classList.add('dragover')});
batchDropzone.addEventListener('dragleave',()=>batchDropzone.classList.remove('dragover'));
batchDropzone.addEventListener('drop',e=>{
  e.preventDefault();batchDropzone.classList.remove('dragover');
  addBatchFiles(Array.from(e.dataTransfer.files));
});
batchInput.addEventListener('change',()=>{addBatchFiles(Array.from(batchInput.files))});

function addBatchFiles(files){
  const allowed=['pdf','png','jpg','jpeg','gif','bmp','webp','docx','doc','txt'];
  for(const f of files){
    if(batchFiles.length>=10){toast('Max 10 files');break}
    const ext=f.name.split('.').pop().toLowerCase();
    if(!allowed.includes(ext)){toast(`${f.name}: unsupported type`);continue}
    batchFiles.push({file:f,status:'pending'});
  }
  renderBatchList();
}

function renderBatchList(){
  if(!batchFiles.length){batchList.hidden=true;$('#btn-translate-batch').hidden=true;return}
  batchList.hidden=false;
  $('#btn-translate-batch').hidden=false;
  batchList.innerHTML='';
  batchFiles.forEach((bf,i)=>{
    const item=document.createElement('div');item.className='tr-batch-item';
    const statusCls=bf.status==='done'?'done':bf.status==='error'?'error':'';
    const statusText=bf.status==='pending'?'Pending':bf.status==='extracting'?'Extracting...':bf.status==='translating'?'Translating...':bf.status==='done'?'✓ Done':'✗ Error';
    item.innerHTML=`
      <span class="tr-file-icon">${getFileIcon(bf.file.name)}</span>
      <span class="tr-batch-name">${sanitize(bf.file.name)} (${formatBytes(bf.file.size)})</span>
      <span class="tr-batch-status ${statusCls}">${statusText}</span>
      <button class="tr-batch-remove" data-idx="${i}">✕</button>`;
    batchList.appendChild(item);
  });
  batchList.querySelectorAll('.tr-batch-remove').forEach(btn=>{
    btn.addEventListener('click',()=>{
      batchFiles.splice(parseInt(btn.dataset.idx),1);
      renderBatchList();
    });
  });
}

$('#btn-translate-batch').addEventListener('click',async()=>{
  const from=langFrom.value;
  const to=langTo.value;
  if(!to){toast('Select target language');return}
  if(!batchFiles.length){toast('Add files first');return}
  showLoading('Batch translating...');
  const resultsDiv=$('#batch-results');
  resultsDiv.hidden=false;
  resultsDiv.innerHTML='';
  for(let i=0;i<batchFiles.length;i++){
    const bf=batchFiles[i];
    if(bf.status==='done')continue;
    try{
      bf.status='extracting';renderBatchList();
      loadingTxt.textContent=`Extracting text from ${bf.file.name}... (${i+1}/${batchFiles.length})`;
      const text=await extractText(bf.file,()=>{});
      if(!text){bf.status='error';renderBatchList();continue}
      bf.status='translating';renderBatchList();
      loadingTxt.textContent=`Translating ${bf.file.name}... (${i+1}/${batchFiles.length})`;
      const res=await translateText(text,from,to);
      bf.status='done';bf.result={original:text,translated:res.translated};
      // Add download button for each result
      const resCard=document.createElement('div');
      resCard.className='tr-result-panel';
      resCard.innerHTML=`
        <div class="tr-result-header">
          <h3>${getFileIcon(bf.file.name)} ${sanitize(bf.file.name)}</h3>
          <div class="tr-result-actions">
            <button class="tr-btn-sm batch-dl-txt" data-idx="${i}">📝 TXT</button>
            <button class="tr-btn-sm batch-copy" data-idx="${i}">📋 Copy</button>
          </div>
        </div>
        <div class="tr-sbs-col" style="margin-bottom:.5rem">
          <div class="tr-sbs-header">Translated</div>
          <div class="tr-sbs-content">${sanitize(res.translated.slice(0,500))}${res.translated.length>500?'…':''}</div>
        </div>`;
      resultsDiv.appendChild(resCard);
      renderBatchList();
    }catch(err){
      bf.status='error';bf.error=err.message;
      renderBatchList();
    }
  }
  hideLoading();
  toast('Batch translation complete!');
  // Bind download/copy for batch items
  resultsDiv.querySelectorAll('.batch-dl-txt').forEach(btn=>btn.addEventListener('click',()=>{
    const bf=batchFiles[parseInt(btn.dataset.idx)];
    if(bf&&bf.result)downloadBlob(new Blob([bf.result.translated],{type:'text/plain'}),bf.file.name.replace(/\.[^.]+$/,'')+'-translated.txt');
  }));
  resultsDiv.querySelectorAll('.batch-copy').forEach(btn=>btn.addEventListener('click',()=>{
    const bf=batchFiles[parseInt(btn.dataset.idx)];
    if(bf&&bf.result)navigator.clipboard.writeText(bf.result.translated).then(()=>toast('Copied!'));
  }));
});

/* ─── History Tab ─── */
$('#btn-clear-history').addEventListener('click',()=>{
  if(confirm('Clear all translation history?'))clearHistory();
});
renderHistory();

/* ─── Keyboard shortcut: Ctrl+Enter to translate ─── */
inputText.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();$('#btn-translate-text').click()}
});

})();
