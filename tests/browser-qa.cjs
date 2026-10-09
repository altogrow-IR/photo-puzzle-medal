const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ headless:true, executablePath:process.env.BROWSER_EXECUTABLE });
 try {
 const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
 const page = await context.newPage(); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400) errors.push('HTTP '+r.status()+' '+r.url());});
 page.on('requestfailed',r=>{if(r.url().startsWith('http')) errors.push(r.failure()?.errorText+' '+r.url());});
 await page.goto(process.env.QA_URL || 'http://127.0.0.1:4188/photo-puzzle-medal/');
 const image = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="300" height="300" fill="#ffcc40"/><rect x="300" width="300" height="300" fill="#317b62"/><circle cx="360" cy="140" r="60" fill="white"/></svg>');
 const add = async (title, mode) => {
  await page.getByRole('button',{name:'写真パズルを追加'}).click();
  await page.locator('input[type=file]').first().setInputFiles({name:'qa.svg',mimeType:'image/svg+xml',buffer:image});
  await page.getByRole('textbox').fill(title);
  await page.locator('input[type=range]').first().fill('100');
  await page.getByLabel('3×3').check();
  if(mode==='jigsaw') await page.getByLabel('ジグソーパズル',{exact:false}).check();
  await page.getByRole('button',{name:'9ピースで保存'}).click();
  await page.getByRole('heading',{name:title,exact:true}).waitFor();
 };
 await add('QAジグソー','jigsaw');
 assert.equal(await page.getByRole('button',{name:'このパズルを削除'}).count(),0);
 const sizes = await page.evaluate(async()=>{
  const db=await new Promise((res,rej)=>{const r=indexedDB.open('photo-puzzle-medal-db');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  const images=await new Promise(res=>{const r=db.transaction('images').objectStore('images').getAll();r.onsuccess=()=>res(r.result)});db.close();
  return Promise.all(images.map(async i=>{const b=await createImageBitmap(i.blob);const size=[b.width,b.height];b.close();return size}));
 });
 assert(sizes.every(([w,h])=>w===h));
 await page.getByRole('button',{name:'遊ぶ',exact:true}).click();
 await page.locator('.tray-piece').first().waitFor();
 const snap = async i => {
  await page.getByRole('button',{name:`ピース${i+1}を選ぶ`,exact:true}).tap();
  const box=await page.locator('.jigsaw-stage').boundingBox();
  await page.touchscreen.tap(box.x+(i%3+.5)*box.width/3,box.y+(Math.floor(i/3)+.5)*box.height/3);
 };
 const trayOrder=await page.locator('.tray-piece').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));
 assert.notDeepEqual(trayOrder,Array.from({length:9},(_,i)=>'ピース'+(i+1)+'を選ぶ'));
 await page.getByRole('button',{name:'ピース9を選ぶ',exact:true}).scrollIntoViewIfNeeded();
 const source=await page.getByRole('button',{name:'ピース9を選ぶ',exact:true}).boundingBox();
 const stage=await page.locator('.jigsaw-stage').boundingBox();
 await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();
 await page.mouse.move(stage.x+stage.width/2,stage.y+stage.height/2,{steps:8});await page.mouse.up();
 const placed=page.getByLabel('ジグソーピース 9',{exact:true});await placed.waitFor();
 const box=await placed.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await page.mouse.move(stage.x-150,stage.y-150,{steps:8});await page.mouse.up();
 const outside=await page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.includes(':progress:')))).pieces.find(p=>p.correctIndex===8));
 assert.equal(outside.x,0);assert.equal(outside.y,0);
 await page.getByRole('button',{name:'残りを整頓'}).click();
 await snap(0);
 assert.equal(await page.locator('.jigsaw-piece.snapped').count(),1);
 await page.setViewportSize({width:844,height:390});
 await page.waitForTimeout(200);
 assert.equal(await page.locator('.jigsaw-piece.snapped').count(),1);
 await page.setViewportSize({width:320,height:700});
 await page.waitForTimeout(200);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('button',{name:'一覧に戻る',exact:true}).click();
 await page.reload(); await page.getByRole('button',{name:'つづきから'}).click(); await page.locator('.jigsaw-piece.snapped').waitFor();
 assert.equal(await page.locator('.jigsaw-piece.snapped').count(),1);
 await page.getByRole('button',{name:'残りを整頓'}).click();
 assert.equal(await page.locator('.jigsaw-piece.snapped').count(),1);
 await page.screenshot({path:'.qa/jigsaw-mobile.png',fullPage:true});
 const resumeOrder=await page.locator('.tray-piece').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));
 assert.deepEqual(resumeOrder,trayOrder.filter(name=>name!=='ピース1を選ぶ'));
 for (const [w,h] of [[768,1024],[1024,768],[820,1180],[1180,820],[1366,1024]]) {
   await page.setViewportSize({width:w,height:h});await page.waitForTimeout(150);
   const board=await page.locator('.jigsaw-stage').boundingBox();const tools=await page.locator('.jigsaw-tools').boundingBox();
   if(w>h) { assert(tools.x>=board.x+board.width-1,'wide tablet tray should sit beside board'); assert(board.y+board.height<=h+8,'wide tablet board should fit height'); } else { assert(tools.y>=board.y+board.height-1,'tall tablet should use full-width board'); assert(board.width>w*.8,'tall tablet board should use the available width'); }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(w===768 || w===1024) await page.screenshot({path:'.qa/jigsaw-tablet-'+w+'.png',fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
 const mobileBoard=await page.locator('.jigsaw-stage').boundingBox();const mobileTools=await page.locator('.jigsaw-tools').boundingBox();
 assert(mobileTools.y>=mobileBoard.y+mobileBoard.height,'phone layout should stay vertical');
 for(let i=1;i<9;i++) await snap(i);
 await page.getByRole('heading',{name:'完成！',exact:true}).waitFor();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('photo-puzzle-medal:app-stats')).totalMedals===1);
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.includes(':progress:')).length),0);
 await page.getByRole('button',{name:'もう一度遊ぶ'}).click();
 assert.equal(await page.locator('.jigsaw-piece.snapped').count(),0);
 await page.getByRole('button',{name:'一覧に戻る',exact:true}).click();
 await add('QAタイル','tile');
 await page.locator('.puzzle-card').filter({has:page.getByRole('heading',{name:'QAタイル',exact:true})}).getByRole('button',{name:'遊ぶ',exact:true}).click();
 await page.locator('.puzzle-tile').first().waitFor();
 await page.locator('.puzzle-tile').nth(0).click(); await page.locator('.puzzle-tile').nth(1).click();
 const order=await page.locator('.puzzle-tile').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));
 await page.waitForTimeout(1200);
 await page.getByRole('button',{name:'一覧に戻る',exact:true}).click();await page.reload();
 await page.locator('.puzzle-card').filter({has:page.getByRole('heading',{name:'QAタイル',exact:true})}).getByRole('button',{name:'つづきから'}).click();
 await page.locator('.puzzle-tile').first().waitFor();
 assert.deepEqual(await page.locator('.puzzle-tile').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label'))),order);
 assert.match(await page.locator('.play-stats').innerText(),/手数 1/);
 for(let i=0;i<9;i++) {
  const current=await page.locator('.puzzle-tile').nth(i).getAttribute('aria-label');
  if(current!==`パズルピース ${i+1}`){await page.getByRole('button',{name:`パズルピース ${i+1}`,exact:true}).click();await page.locator('.puzzle-tile').nth(i).click();}
 }
 await page.getByRole('heading',{name:'完成！',exact:true}).waitFor();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('photo-puzzle-medal:app-stats')).totalMedals===2);
 await page.getByRole('dialog').getByRole('button',{name:'一覧に戻る',exact:true}).click();
 for(const w of [320,390,768,1280]) {await page.setViewportSize({width:w,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${w}`);}
 await page.screenshot({path:'.qa/home-desktop.png',fullPage:true});
 const card=page.locator('.puzzle-card').filter({has:page.getByRole('heading',{name:'QAタイル',exact:true})});
 await card.locator('summary').click();
 page.once('dialog',d=>d.accept());await card.getByRole('button',{name:'このパズルを削除'}).click();
 await page.getByRole('heading',{name:'QAタイル',exact:true}).waitFor({state:'detached'});
 await page.reload();assert.equal(await page.locator('.puzzle-card').count(),1);
 // Legacy rectangular photos and missing mode remain usable without overwriting originals.
 await page.evaluate(async()=>{
 const canvas=document.createElement('canvas');canvas.width=600;canvas.height=300;const ctx=canvas.getContext('2d');ctx.fillStyle='#4080bb';ctx.fillRect(0,0,600,300);
 const blob=await new Promise(res=>canvas.toBlob(res,'image/jpeg'));
 const db=await new Promise(res=>{const r=indexedDB.open('photo-puzzle-medal-db');r.onsuccess=()=>res(r.result)});
 const tx=db.transaction(['puzzles','images'],'readwrite');const date=new Date().toISOString();
 tx.objectStore('images').put({id:'legacy-image',blob,mimeType:'image/jpeg',createdAt:date});tx.objectStore('images').put({id:'legacy-thumb',blob,mimeType:'image/jpeg',createdAt:date});
 tx.objectStore('puzzles').put({id:'legacy',title:'旧写真',imageId:'legacy-image',thumbnailId:'legacy-thumb',gridSize:3,pieceCount:9,completedCount:4,createdAt:date,updatedAt:date});
 await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close();
 });
 await page.reload();await page.locator('.puzzle-card').filter({has:page.getByRole('heading',{name:'旧写真',exact:true})}).getByRole('button',{name:'遊ぶ',exact:true}).click();
 await page.locator('.puzzle-tile').first().waitFor();
 const dims=await page.locator('.puzzle-tile').first().evaluate(async e=>{const url=getComputedStyle(e).backgroundImage.slice(5,-2);const image=new Image();image.src=url;await image.decode();return [image.naturalWidth,image.naturalHeight]});assert.equal(dims[0],dims[1]);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('photo-puzzle-medal:app-stats')).totalMedals),2);
 assert.deepEqual(errors,[]);
 console.log('PASS: crop, menu, tile/jigsaw completion, medals, resume, resize, tidy, 320/390/768/1280 overflow, delete and reload; no page errors');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});


