/* cyh · Personal Atlas V. Local Canvas universe + accessible HTML controls. */
(() => {
  'use strict';
  const { projects, getPanel, renderPanelBody, escapeHTML: esc } = window.CYH;
  const canvas = document.querySelector('#universe-canvas');
  const atlas = document.querySelector('.atlas');
  const labelsHost = document.querySelector('#map-labels');
  const imagesHost = document.querySelector('#map-images');
  const site = document.querySelector('#site');
  const dialog = document.querySelector('#preview');
  const content = document.querySelector('#preview-content');
  const closeButton = document.querySelector('#preview-close');
  const backButton = document.querySelector('#preview-back');
  const imageViewer = document.querySelector('#image-viewer');
  const imageClose = document.querySelector('#image-viewer-close');
  const imageButtons = new Map();
  let imageSelection = null, imageOpener = null;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const scene = new window.CYHUniverse(canvas);
  const camera = { x: 0, y: 0, z: 1000 }, target = { ...camera };
  const velocity = { x: 0, y: 0, z: 0 }, inertia = { x: 0, y: 0 };
  const pointers = new Map(), buttons = new Map();
  const measure = document.createElement('canvas').getContext('2d');
  let phone = false, frame = null, flight = null, hovered = null, selected = null;
  let category = '全部', current = null, trail = [], opener = null;
  let lastTime = 0, sceneTime = 0, lastLayout = -1, layout = [], raf = 0;
  let gesture = null, suppressClickUntil = 0, lastTap = null;
  let dimensions = { w: 0, h: 0 }, focusedGalaxy = null;
  let navigationDepth = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const idOf = (key, index = 0) => `${key}:${Number(index)}`;
  const overlaps = (a,b,gap=4) => a.x<b.x+b.width+gap && a.x+a.width+gap>b.x && a.y<b.y+b.height+gap && a.y+a.height+gap>b.y;

  function resize() {
    const w=innerWidth,h=innerHeight,wasPhone=phone;
    phone=w<760||h>w; dimensions={w,h}; scene.resize(w,h,phone);
    if(wasPhone!==phone)reset(false);
    buttons.forEach(({el})=>el.remove());buttons.clear();lastLayout=-1;
  }
  function clearMotion() {flight=null;inertia.x=inertia.y=0;velocity.x=velocity.y=velocity.z=0;}
  function limits() {return scene.zoomRange||{min:1,max:1550};}
  function boundTarget(rubber=false) {
    const b=scene.bounds||{minX:-950,maxX:950,minY:-1000,maxY:1000},padding=phone?140:220;
    for(const [axis,low,high] of [['x',b.minX-padding,b.maxX+padding],['y',b.minY-padding,b.maxY+padding]]) {
      const bound=clamp(target[axis],low,high);target[axis]=rubber?bound+(target[axis]-bound)*.24:bound;
    }
    const {min,max}=limits(),z=clamp(target.z,min,max);target.z=rubber?z+(target.z-z)*.18:z;
  }
  function announce(text) {document.querySelector('#view-status').textContent=text;}
  function flyTo(pose,done) {
    clearMotion();
    if(motion.matches){Object.assign(camera,pose);Object.assign(target,pose);done?.();}
    else flight={from:{...camera},to:{...pose},start:performance.now(),duration:980,done};
  }
  function reset(animate=true) {
    navigationDepth=0;
    clearMotion();if(imageViewer.open)imageViewer.close();if(dialog.open)dialog.close();selected=null;focusedGalaxy=null;
    const home=scene.home();if(animate)flyTo(home);else{Object.assign(camera,home);Object.assign(target,home);}
    announce('已返回宇宙全景');
  }
  function focusGalaxy(key) {
    navigationDepth=scene.galaxies.find(g=>g.key===key)?.z||0;
    if(dialog.open)dialog.close();selected=null;focusedGalaxy=key;
    const pose=scene.focusPose(key);if(pose)flyTo(pose);
    announce(`正在靠近${({s1:'工作复盘',s2:'视觉灵感',s3:'AI 工作流',s4:'接下来'})[key]}`);
  }
  function previewTarget(key,index=0,trigger) {
    if(!getPanel(key,Number(index),category))return;
    if(dialog.open){openPanel(key,index,trigger);return;}
    const id=idOf(key,index),node=frame?.nodes.find(n=>n.id===id);
    if(!node){openPanel(key,index,trigger);return;}
    selected=id;focusedGalaxy=node.galaxy;
    const pose=scene.focusPose(node.galaxy)||{...camera};
    if(!node.main){const world=scene.getWorld(id,sceneTime)||node.world;pose.x=world.x;pose.y=world.y;pose.z=Math.max(limits().min,pose.z*.82);}
    opener=trigger||document.activeElement;
    flyTo(pose,()=>openPanel(key,index,trigger));announce(`正在靠近${node.title}`);
  }
  function zoomAt(factor,x=scene.center.x,y=scene.center.y) {
    flight=null;focusedGalaxy=null;selected=null;inertia.x=inertia.y=0;
    const anchor=imageAt(x,y)||hitAt(x,y);
    if(anchor?.world)navigationDepth=anchor.world.z;
    const oldZ=target.z,range=limits(),newZ=clamp(oldZ*factor,range.min,range.max);
    // Use the same depth-aware projection for wheel, pinch and close magnification.
    const before=scene.projectionScale(target,navigationDepth),after=scene.projectionScale({...target,z:newZ},navigationDepth);
    target.x+=(x-scene.center.x)*(1/before-1/after);
    target.y+=(y-scene.center.y)*(1/before-1/after);
    target.z=newZ;
  }
  function updateCamera(now,dt) {
    if(flight){
      const f=flight,t=clamp((now-f.start)/f.duration,0,1),ease=t*t*t*(10+t*(-15+6*t));
      camera.x=f.from.x+(f.to.x-f.from.x)*ease;camera.y=f.from.y+(f.to.y-f.from.y)*ease;
      camera.z=Math.exp(Math.log(f.from.z)+Math.log(f.to.z/f.from.z)*ease);Object.assign(target,camera);
      if(t===1){flight=null;f.done?.();}return;
    }
    if(!pointers.size){target.x+=inertia.x*dt;target.y+=inertia.y*dt;inertia.x*=Math.exp(-5.5*dt);inertia.y*=Math.exp(-5.5*dt);boundTarget();}
    if(motion.matches){Object.assign(camera,target);return;}
    // Substepped damped spring provides smooth inertia and elastic edge return.
    const steps=Math.max(1,Math.ceil(dt/.012)),step=dt/steps;
    for(let s=0;s<steps;s++)for(const axis of ['x','y','z']){
      let value=axis==='z'?Math.log(camera.z):camera[axis];const goal=axis==='z'?Math.log(target.z):target[axis];
      velocity[axis]+=((goal-value)*180-velocity[axis]*25)*step;value+=velocity[axis]*step;
      camera[axis]=axis==='z'?Math.exp(value):value;
    }
  }
  function labelFor(n) {
    if(buttons.has(n.id))return buttons.get(n.id);
    const el=document.createElement('button');el.type='button';el.className=`map-node${n.main?' is-main':''}`;
    el.dataset.open=n.key;el.dataset.index=n.index||0;el.dataset.node=n.id;el.style.setProperty('--hue',n.hue);
    el.setAttribute('aria-label',`${n.title}，靠近并查看预览`);el.setAttribute('aria-haspopup','dialog');el.setAttribute('aria-controls','preview');el.title=n.title;
    el.innerHTML=n.main?`<span class="node-kicker">${esc(n.sub)}</span><span class="node-name">${esc(n.title)}</span>`:`<span class="node-name">${esc(n.title)}</span>${n.sub?`<span class="node-sub">${esc(n.sub)}</span>`:''}`;
    measure.font=`${n.main?(phone?17:22):11}px "Segoe UI", "Microsoft YaHei", sans-serif`;
    const width=n.main?(phone||dimensions.h<550?132:158):Math.min(phone?154:230,Math.max(66,measure.measureText(n.title).width+28));
    el.style.width=`${Math.ceil(width)}px`;labelsHost.append(el);
    const result={el,width:el.offsetWidth,height:el.offsetHeight||44};buttons.set(n.id,result);return result;
  }
  function layoutLabels(now) {
    if(!frame)return;
    const area={x:phone?14:26,y:phone?170:174,right:dimensions.w-(phone?14:26),bottom:dimensions.h-(phone?150:135)};
    if(dimensions.h<550){area.y=70;area.bottom=dimensions.h-100;}
    const zoom=1000/camera.z,nearest=frame.galaxies.reduce((a,n)=>!a||distance(n,scene.center)<distance(a,scene.center)?n:a,null);
    const detailGalaxy=focusedGalaxy||nearest?.key;
    const candidates=frame.nodes.filter(n=>{
      if(!n.visible||n.alpha<.09||n.x < -20||n.x>dimensions.w+20||n.y<area.y-20||n.y>area.bottom+20)return false;
      if(n.main)return zoom<(phone?1.65:1.35)||n.galaxy===detailGalaxy;
      if(dimensions.h<550&&zoom<1.1)return false;
      if(phone&&n.key==='pin'&&zoom<3.8)return false;
      return (n.reveal??0)>.14&&n.galaxy===detailGalaxy;
    });
    candidates.sort((a,b)=>Number(b.main)-Number(a.main)||Number(b.id===selected)-Number(a.id===selected)||Number(b.key==='board')-Number(a.key==='board')||distance(a,scene.center)-distance(b,scene.center));
    const occupied=(frame.satellites||[]).filter(s=>s.visible&&s.alpha>.3).map(s=>({x:s.x,y:s.y,width:s.width,height:s.height})),next=[],shown=new Set();
    for(const n of candidates){
      const item=labelFor(n),width=item.width,height=item.height;let preferred;
      if(n.main&&(phone||dimensions.h<550)&&zoom<1.65){preferred={x:n.x+Math.max(n.r,14)+9,y:n.y-height/2};if(preferred.x+width>area.right)preferred.x=n.x-width-Math.max(n.r,14)-9;}
      else if(n.main&&phone&&n.key==='s2')preferred={x:n.x-width/2,y:n.y-n.r-height-18};
      else if(n.main&&n.labelAnchor){preferred={x:n.labelAnchor.x-width/2,y:n.labelAnchor.y-height/2};if(!phone&&zoom<1.35&&n.key==='s2')preferred.x-=n.rx*n.scale*.55;}
      else preferred={x:n.x-width/2,y:n.y+(n.main?-n.r-height-24:n.r+7)};
      if(n.main){preferred.x=clamp(preferred.x,area.x,area.right-width);preferred.y=clamp(preferred.y,area.y,area.bottom-height);}
      const options=[preferred];
      if(!n.main)options.push({x:n.x+Math.max(n.r,5)+9,y:n.y-height/2},{x:n.x-width-Math.max(n.r,5)-9,y:n.y-height/2},{x:n.x-width/2,y:n.y-n.r-height-9});
      for(let r=24;r<=(phone?210:155);r+=24)for(const a of [-Math.PI/2,Math.PI/2,0,Math.PI,-Math.PI/4,Math.PI/4,Math.PI*.75,-Math.PI*.75])options.push({x:preferred.x+Math.cos(a)*r,y:preferred.y+Math.sin(a)*r});
      const fits=p=>p.x>=area.x&&p.y>=area.y&&p.x+width<=area.right&&p.y+height<=area.bottom
        &&!occupied.some(r=>overlaps({...p,width,height},r,phone?3:5))
        &&!frame.nodes.some(other=>other.visible&&other.alpha>.22&&!(phone&&other.key==='pin'&&zoom<3.8)&&(!((phone||dimensions.h<550)&&zoom<1.65&&n.main)||other.main)&&overlaps({...p,width,height},{x:other.x-other.r-3,y:other.y-other.r-3,width:other.r*2+6,height:other.r*2+6},1));
      let position=options.find(fits);
      if(!position&&(n.main||(phone&&zoom>1.65))){
        const slots=[];for(let y=area.y;y+height<=area.bottom;y+=height+5)for(let x=area.x;x+width<=area.right;x+=12)if(fits({x,y}))slots.push({x,y});
        slots.sort((a,b)=>Math.hypot(a.x+width/2-n.x,a.y+height/2-n.y)-Math.hypot(b.x+width/2-n.x,b.y+height/2-n.y));position=slots[0];
      }
      if(!position)continue;
      const rect={...position,width,height};occupied.push(rect);shown.add(n.id);
      item.el.hidden=false;item.el.style.left=`${position.x.toFixed(1)}px`;item.el.style.top=`${position.y.toFixed(1)}px`;
      item.el.style.opacity=(n.main?Math.max(phone?.74:.6,n.alpha):Math.max(.55,n.alpha)*Math.min(1,(n.reveal??1)*2)).toFixed(3);
      item.el.classList.toggle('is-selected',n.id===selected);item.el.setAttribute('aria-expanded',String(dialog.open&&n.id===selected));
      next.push({id:n.id,text:n.title,...rect,visible:true,node:n});
    }
    buttons.forEach(({el},id)=>{if(!shown.has(id))el.hidden=true;});layout=next;lastLayout=now;
  }
  function layoutImages() {
    const shown=new Set();
    for(const satellite of frame?.satellites||[]) {
      if(!satellite.visible||satellite.alpha<.3||satellite.width<1)continue;
      const pin=window.CYH.allPins[satellite.imageIndex];if(!pin)continue;
      let el=imageButtons.get(satellite.id);
      if(!el) {
        el=document.createElement('button');el.type='button';el.className='map-image';
        el.dataset.image=satellite.imageIndex;el.setAttribute('aria-haspopup','dialog');el.setAttribute('aria-controls','image-viewer');
        el.setAttribute('aria-label',`${pin.board} · ${pin.title}，放大图片`);el.title=`${pin.board} · ${pin.title}`;
        imagesHost.append(el);imageButtons.set(satellite.id,el);
      }
      shown.add(satellite.id);el.hidden=false;
      el.style.left=`${satellite.x}px`;el.style.top=`${satellite.y}px`;
      el.style.width=`${satellite.width}px`;el.style.height=`${satellite.height}px`;
    }
    imageButtons.forEach((el,id)=>{if(!shown.has(id))el.hidden=true;});
  }
  function drawLeaders() {
    const ctx=canvas.getContext('2d');ctx.save();ctx.lineWidth=.6;
    for(const l of layout){const n=frame.nodes.find(n=>n.id===l.id);if(!n||n.main)continue;
      const x=clamp(n.x,l.x,l.x+l.width),y=clamp(n.y,l.y,l.y+l.height);if(Math.hypot(x-n.x,y-n.y)<n.r+18)continue;
      ctx.strokeStyle=n.hue;ctx.globalAlpha=.19*n.alpha;ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(x,y);ctx.stroke();
    }ctx.restore();
  }
  function tick(now) {
    const dt=Math.min(.05,lastTime?(now-lastTime)/1000:1/60);lastTime=now;if(!motion.matches&&!dialog.open&&!imageViewer.open&&camera.z>=120)sceneTime+=dt;
    updateCamera(now,dt);
    const nearest=frame?.galaxies.reduce((a,n)=>!a||distance(n,scene.center)<distance(a,scene.center)?n:a,null);
    frame=scene.render(camera,sceneTime,{reducedMotion:motion.matches,hoverId:hovered,selectedId:selected,focusGalaxy:focusedGalaxy||nearest?.key});
    layoutImages();if(now-lastLayout>32||lastLayout<0)layoutLabels(now);drawLeaders();
    const zoom=1000/camera.z;document.querySelector('#zoom-level').value=`${zoom.toFixed(1)}×`;site.classList.toggle('is-exploring',zoom>1.35);
    document.querySelectorAll('[data-galaxy]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.galaxy===focusedGalaxy)));
    raf=requestAnimationFrame(tick);
  }
  function hitAt(x,y) {return frame?.nodes.filter(n=>n.visible&&n.alpha>.18&&Math.hypot(n.x-x,n.y-y)<=Math.max(22,n.r+7)).sort((a,b)=>distance(a,{x,y})-distance(b,{x,y}))[0]||null;}
  function imageAt(x,y) {return [...(frame?.satellites||[])].reverse().find(s=>s.visible&&s.alpha>.3&&Math.hypot(x-s.x-s.width/2,y-s.y-s.height/2)<=s.width/2);}
  const position=e=>({x:e.clientX,y:e.clientY});
  const pair=()=>{const [a,b]=[...pointers.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.max(8,distance(a,b))};};
  atlas.addEventListener('pointerdown',e=>{
    if(e.button!==0||dialog.open||imageViewer.open)return;e.preventDefault();flight=null;inertia.x=inertia.y=0;
    pointers.set(e.pointerId,position(e));atlas.setPointerCapture(e.pointerId);const label=e.target.closest('[data-node]');
    const anchor=imageAt(e.clientX,e.clientY)||hitAt(e.clientX,e.clientY);if(anchor?.world)navigationDepth=anchor.world.z;
    if(pointers.size===1)gesture={start:position(e),last:position(e),lastAt:performance.now(),moved:false,pinched:false,id:label?.dataset.node||hitAt(e.clientX,e.clientY)?.id,imageIndex:label?undefined:(e.target.closest('[data-image]')?.dataset.image??imageAt(e.clientX,e.clientY)?.imageIndex),trigger:e.target,type:e.pointerType};
    else{gesture.pinched=true;gesture.moved=true;gesture.pair=pair();}atlas.classList.add('is-dragging');
  });
  atlas.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId)){const label=e.target.closest('[data-node]');hovered=label?.dataset.node||hitAt(e.clientX,e.clientY)?.id||null;atlas.classList.toggle('is-hovering',Boolean(hovered||e.target.closest('[data-image]')));return;}
    const now=performance.now(),p=position(e);pointers.set(e.pointerId,p);
    if(pointers.size>=2){const next=pair(),prev=gesture.pair||next;zoomAt(prev.d/next.d,prev.x,prev.y);const scale=scene.projectionScale(target,navigationDepth);target.x-=(next.x-prev.x)/scale;target.y-=(next.y-prev.y)/scale;gesture.pair=next;gesture.pinched=true;gesture.moved=true;}
    else{const dx=p.x-gesture.last.x,dy=p.y-gesture.last.y;if(distance(p,gesture.start)>6)gesture.moved=true;
      if(gesture.moved){focusedGalaxy=null;const scale=scene.projectionScale(target,navigationDepth),dt=Math.max(.008,(now-gesture.lastAt)/1000);target.x-=dx/scale;target.y-=dy/scale;inertia.x=clamp(-dx/scale/dt,-2400,2400);inertia.y=clamp(-dy/scale/dt,-2400,2400);boundTarget(true);}
    }gesture.last=p;gesture.lastAt=now;
  });
  function endPointer(e,cancelled=false){
    if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(atlas.hasPointerCapture(e.pointerId))atlas.releasePointerCapture(e.pointerId);
    if(pointers.size){gesture.last=[...pointers.values()][0];gesture.lastAt=performance.now();gesture.pair=null;return;}
    atlas.classList.remove('is-dragging');suppressClickUntil=performance.now()+400;
    if(cancelled||gesture.pinched||performance.now()-gesture.lastAt>100)inertia.x=inertia.y=0;
    if(!cancelled&&!gesture.moved&&!gesture.pinched){
      if(gesture.imageIndex!==undefined){openImage(Number(gesture.imageIndex),gesture.trigger);lastTap=null;}
      else if(gesture.id){const [key,index]=gesture.id.split(':');previewTarget(key,Number(index),buttons.get(gesture.id)?.el);lastTap=null;}
      else if(gesture.type==='touch'){const now=performance.now();if(lastTap&&now-lastTap.at<330&&distance(lastTap,position(e))<28){reset();lastTap=null;}else lastTap={...position(e),at:now};}
    }gesture=null;
  }
  atlas.addEventListener('pointerup',e=>endPointer(e));atlas.addEventListener('pointercancel',e=>endPointer(e,true));
  atlas.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))endPointer(e,true);});
  atlas.addEventListener('dblclick',e=>{if(!e.target.closest('[data-node]')&&!hitAt(e.clientX,e.clientY)){e.preventDefault();reset();}});
  atlas.addEventListener('wheel',e=>{if(dialog.open)return;e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);zoomAt(Math.exp(clamp(delta*(e.ctrlKey?.009:.0018),-.55,.55)),e.clientX,e.clientY);},{passive:false});
  let safariScale=1;
  atlas.addEventListener('gesturestart',e=>{e.preventDefault();safariScale=e.scale;},{passive:false});
  atlas.addEventListener('gesturechange',e=>{e.preventDefault();if(pointers.size<2)zoomAt(safariScale/e.scale,e.clientX||scene.center.x,e.clientY||scene.center.y);safariScale=e.scale;},{passive:false});

  function renderPanel(keepScroll=false){
    const pn=getPanel(current.k,current.i,category);if(!pn)return;const scroll=content.scrollTop;dialog.style.setProperty('--hue',pn.hue);
    document.querySelector('#preview-kicker').textContent=pn.kicker;document.querySelector('#preview-title').textContent=pn.title;content.innerHTML=renderPanelBody(pn);
    const link=document.querySelector('#preview-link');link.hidden=!pn.href;if(pn.href){link.href=pn.href;link.textContent=pn.hrefLabel||'查看原始报告 ↗';}else{link.removeAttribute('href');link.textContent='';}
    backButton.textContent=trail.length?'← 返回上一层':'← 返回星空';content.scrollTop=keepScroll?scroll:0;
  }
  function openPanel(key,index=0,trigger){
    const next={k:key,i:Number(index)};if(!getPanel(next.k,next.i,category))return;
    if(dialog.open&&current)trail.push({...current});else{trail=[];opener=trigger||opener||document.activeElement;}
    current=next;selected=idOf(key,index);renderPanel();if(!dialog.open){dialog.showModal();closeButton.focus({preventScroll:true});}else content.focus({preventScroll:true});
    announce(`已打开${document.querySelector('#preview-title').textContent}预览`);
  }
  function renderImage(index) {
    const pin=window.CYH.allPins[index];if(!pin)return;
    const group=window.CYH.boardPins.find(items=>items.some(item=>item.index===index))||[pin];
    imageSelection={index,group,position:group.findIndex(item=>item.index===index)};
    const img=document.querySelector('#image-viewer-image');
    img.src=pin.file;img.alt=`${pin.title} · 所属画板：${pin.board}`;
    document.querySelector('#image-viewer-board').textContent=`画板 / ${pin.board}`;
    document.querySelector('#image-viewer-title').textContent=pin.title;
    document.querySelector('#image-viewer-counter').textContent=`${imageSelection.position+1} / ${group.length}`;
    document.querySelector('#image-viewer-link').href=pin.pin_url;
    document.querySelector('#image-viewer-prev').disabled=group.length<2;
    document.querySelector('#image-viewer-next').disabled=group.length<2;
  }
  function openImage(index,trigger) {
    if(!window.CYH.allPins[index])return;
    if(!dialog.open) {
      const boardIndex=window.CYH.boardPins.findIndex(items=>items.some(pin=>pin.index===index));
      if(boardIndex>=0)openPanel('board',boardIndex,trigger);
    }
    imageOpener=trigger||document.activeElement;renderImage(index);
    if(!imageViewer.open)imageViewer.showModal();imageClose.focus({preventScroll:true});
  }
  function stepImage(direction) {
    if(!imageSelection)return;
    const {group,position}=imageSelection;renderImage(group[(position+direction+group.length)%group.length].index);
  }
  imageClose.addEventListener('click',()=>imageViewer.close());
  document.querySelector('#image-viewer-prev').addEventListener('click',()=>stepImage(-1));
  document.querySelector('#image-viewer-next').addEventListener('click',()=>stepImage(1));
  imageViewer.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();imageViewer.close();});
  imageViewer.addEventListener('close',()=>{
    const fallback=content.querySelector(`[data-image="${imageSelection?.index}"]`);
    const returnTo=imageOpener?.isConnected&&dialog.contains(imageOpener)?imageOpener:fallback||closeButton;
    if(dialog.open)returnTo.focus({preventScroll:true});imageSelection=null;
  });
  let imageBackdropDown=false;
  const outsideImage=e=>{const r=imageViewer.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
  imageViewer.addEventListener('pointerdown',e=>{imageBackdropDown=e.target===imageViewer&&outsideImage(e);});
  imageViewer.addEventListener('click',e=>{if(imageBackdropDown&&e.target===imageViewer&&outsideImage(e))imageViewer.close();imageBackdropDown=false;});
  closeButton.addEventListener('click',()=>dialog.close());
  backButton.addEventListener('click',()=>{if(trail.length){current=trail.pop();selected=idOf(current.k,current.i);renderPanel();content.focus({preventScroll:true});}else dialog.close();});
  dialog.addEventListener('cancel',e=>{e.preventDefault();reset();});
  dialog.addEventListener('close',()=>{current=null;trail=[];selected=null;if(opener?.isConnected&&!opener.hidden)opener.focus({preventScroll:true});});
  const outside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
  let backdropDown=false;dialog.addEventListener('pointerdown',e=>{backdropDown=e.target===dialog&&outside(e);});
  dialog.addEventListener('click',e=>{if(backdropDown&&e.target===dialog&&outside(e))dialog.close();backdropDown=false;});
  document.addEventListener('click',e=>{
    const picture=e.target.closest('[data-image]');if(picture){if(atlas.contains(picture)&&e.detail!==0&&performance.now()<suppressClickUntil)return;openImage(Number(picture.dataset.image),picture);return;}
    const nav=e.target.closest('[data-galaxy]');if(nav){focusGalaxy(nav.dataset.galaxy);return;}
    const button=e.target.closest('[data-open]');if(button){if(atlas.contains(button)&&e.detail!==0&&performance.now()<suppressClickUntil)return;previewTarget(button.dataset.open,button.dataset.index||0,button);return;}
    const filter=e.target.closest('[data-category]');if(filter){category=filter.dataset.category;renderPanel(true);[...content.querySelectorAll('[data-category]')].find(el=>el.dataset.category===category)?.focus({preventScroll:true});}
  });
  document.querySelector('#zoom-in').addEventListener('click',()=>zoomAt(.78));document.querySelector('#zoom-out').addEventListener('click',()=>zoomAt(1/.78));document.querySelector('#reset-view').addEventListener('click',()=>reset());
  document.addEventListener('keydown',e=>{
    if(imageViewer.open){
      if(e.key==='Escape'){e.preventDefault();imageViewer.close();}
      else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();stepImage(e.key==='ArrowLeft'?-1:1);}
      return;
    }
    if(e.key==='Escape'){e.preventDefault();reset();return;}if(dialog.open||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key==='+'||e.key==='='){e.preventDefault();zoomAt(.8);}if(e.key==='-'){e.preventDefault();zoomAt(1.25);}if(e.key==='Home'||e.key==='0'){e.preventDefault();reset();}
    const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(dirs[e.key]&&!e.target.closest('button,a')){e.preventDefault();flight=null;const d=dirs[e.key],scale=scene.projectionScale(camera,navigationDepth);target.x+=d[0]*80/scale;target.y+=d[1]*80/scale;boundTarget();}
  });
  window.addEventListener('blur',()=>{pointers.clear();gesture=null;inertia.x=inertia.y=0;atlas.classList.remove('is-dragging');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);pointers.clear();gesture=null;inertia.x=inertia.y=0;}else{lastTime=0;raf=requestAnimationFrame(tick);}});
  window.addEventListener('resize',resize,{passive:true});
  motion.addEventListener('change',()=>{if(motion.matches&&flight){const f=flight;flight=null;Object.assign(camera,f.to);Object.assign(target,f.to);f.done?.();}});
  window.CYHAtlas={focusGalaxy,reset,snapshot:()=>({camera:{...camera},target:{...target},zoom:1000/camera.z,phone,flight:Boolean(flight),selected,focusedGalaxy,labels:layout.map(({node,...label})=>label),nodes:(frame?.nodes||[]).map(n=>({...n})),satellites:frame?.satellites||[],orbits:frame?.orbits||[],imageSelection:imageSelection?.index??null,focal:scene.focal,center:scene.center,range:limits(),reducedMotion:motion.matches})};
  resize();raf=requestAnimationFrame(tick);
})();
