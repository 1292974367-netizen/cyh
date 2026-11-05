/* cyh · Native perspective universe. No imports, network, or runtime dependencies. */
(() => {
  'use strict';
  const { C, boards, pins, projects, plans, moons } = window.CYH;
  const TAU = Math.PI * 2;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const smooth = value => { const t=clamp(value,0,1); return t*t*(3-2*t); };
  const lerp = (a,b,t) => a+(b-a)*t;
  const random = seed => () => ((seed = seed * 16807 % 2147483647) / 2147483647);
  const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
  const specs = [
    { key:'s1', title:'工作复盘', sub:'01 / REVIEW', caption:'把每一天，留在轨道上。', hue:C.amber, kind:'amber', r:30, rx:200, ry:150 },
    { key:'s2', title:'视觉灵感', sub:'02 / INSPIRATION', caption:`${boards.length} 个画板 · ${window.CYH.allPins.length} 个灵感切片`, hue:C.violet, kind:'violet', r:20, rx:254, ry:158 },
    { key:'s3', title:'AI 工作流', sub:'03 / WORKFLOW', caption:'让工具，成为创作的引力。', hue:C.teal, kind:'teal', r:40, rx:210, ry:94 },
    { key:'s4', title:'接下来', sub:'04 / YET TO EXPLORE', caption:'尚未点亮的，还有很多。', hue:C.grey, kind:'grey', r:16, rx:146, ry:100 }
  ];

  class CYHUniverse {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha:false });
      if (!this.ctx) throw new Error('浏览器无法创建 Canvas 画布。');
      const rand = random(73419);
      this.stars = Array.from({length:560}, (_, i) => ({
        x:(rand()-.5)*7000, y:(rand()-.5)*4600,
        z:[520,1200,2400,4400][i%4]+rand()*260,
        radius:.45+rand()*.9, alpha:.15+rand()*.48,
        phase:rand()*TAU, layer:i%4
      }));
      this.dust = Array.from({length:260}, (_, i) => {
        const a = i*.21;
        const radius = 14+i*.89;
        return { x:Math.cos(a)*radius+(rand()-.5)*35,
          y:Math.sin(a)*radius*.55+(rand()-.5)*30,
          z:Math.sin(a)*42+(rand()-.5)*35, r:.32+rand()*.75,
          alpha:.1+rand()*.36 };
      });
      this.grain = Array.from({length:350}, () => ({x:rand()*2-1,y:rand()*2-1,r:.25+rand()*.65,a:rand()*.12}));
      this.glows = new Map();
      this.imageCache = new Map();
      this.satelliteAngles = new Map();
      this.detail = 0;
      this.resize(innerWidth, innerHeight, innerWidth < 760 || innerHeight > innerWidth);
    }

    resize(width, height, phone) {
      this.width = width; this.height = height; this.phone = phone;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(width*this.dpr);
      this.canvas.height = Math.round(height*this.dpr);
      this.canvas.style.width = `${width}px`; this.canvas.style.height = `${height}px`;
      this.safe = { top:phone ? Math.min(176,height*.23) : Math.min(165,height*.22),
        bottom:phone ? Math.min(144,height*.2) : Math.min(104,height*.15), left:phone?18:36, right:phone?18:36 };
      this.center = { x:width/2, y:this.safe.top+(height-this.safe.top-this.safe.bottom)/2 };
      this.focal = phone ? Math.min(width/990,(height-this.safe.top-this.safe.bottom)/1690)*1000 : Math.min(width/1600,height/900)*1000;
      this.bounds = { minX:phone?-900:-1100, maxX:phone?900:1100, minY:phone?-1200:-650, maxY:phone?1200:650, minZ:phone?95:160, maxZ:1650 };
      this.zoomRange = { min:1, max:1550 };
      this.build();
    }

    build() {
      const desktop = [[-400,-135,0],[315,-135,65],[-190,205,35],[470,220,130]];
      const portrait = [[-30,-650,0],[20,-215,45],[-20,225,20],[30,655,65]];
      this.galaxies = specs.map((s, i) => {
        const [x,y,z] = (this.phone ? portrait : desktop)[i];
        return { ...s, id:`${s.key}:0`, index:0, main:true, galaxy:s.key, x,y,z,
          r:this.phone ? [38,38,65,30][i] : s.r,
          rx:this.phone ? [230,220,235,210][i] : s.rx,
          ry:this.phone ? [155,155,145,140][i] : s.ry };
      });
      this.nodes = [];
      const add = (galaxy, key,index,title,sub,angle,rx,ry,r,extra={}) => {
        const g = this.galaxies.find(g => g.key===galaxy);
        this.nodes.push({id:`${key}:${index}`,key,index,galaxy,title,sub,hue:g.hue,main:false,
          angle,rx,ry,r,kind:g.kind, ...extra});
      };
      for (const g of this.galaxies) this.nodes.push({...g});
      const review = this.galaxies[0];
      const latestDate=window.CYH.latestReview?.date;
      const dateParts=/^(\d{4})-(\d{2})-\d{2}$/.exec(latestDate||'');
      const monthDays=dateParts?new Date(Number(dateParts[1]),Number(dateParts[2]),0).getDate():31;
      this.reviewTracks=[
        {type:'daily',label:'日报 · 外圈',factor:1,slots:monthDays},
        {type:'weekly',label:'周报 · 中圈',factor:.68,slots:4},
        {type:'monthly',label:'月报 · 内圈',factor:.38,slots:1}
      ].map(track=>{
        const entries=moons.filter(m=>m.type===track.type).sort((a,b)=>String(a.review?.date||'').localeCompare(String(b.review?.date||''))||String(a.reviewId).localeCompare(String(b.reviewId)));
        entries.forEach((m,i)=>add('s1',m.k.k,0,m.label,m.sub,-Math.PI/2+i*TAU/entries.length,
          review.rx*track.factor,review.ry*track.factor,track.type==='daily'?8:track.type==='weekly'?9:10,
          {reviewId:m.reviewId,reviewType:m.type,review:m.review,track:track.type,priority:m.reviewId===window.CYH.latestReview?.id?30:10}));
        return {...track,count:entries.length,slots:Math.max(track.slots,entries.length)};
      });
      const overviews=moons.filter(m=>!this.reviewTracks.some(track=>track.type===m.type));
      overviews.forEach((m,i)=>add('s1',m.k.k,0,m.label,m.sub,0,0,0,5,
        {reviewId:m.reviewId,reviewType:m.type,review:m.review,overviewOffset:{x:(i-(overviews.length-1)/2)*.5,y:1.28},dim:true}));
      const inspiration = this.galaxies[1];
      boards.forEach((b,i) => add('s2','board',i,b.n,`${String(window.CYH.boardPins?.[i]?.length??b.c).padStart(2,'0')} IMAGES`,i*TAU/boards.length-1.85,
        inspiration.rx*(.88+(i%3)*.07),inspiration.ry*(.9+(i%3)*.06),2.7+Math.sqrt(b.c)*1.12,{hue:b.n==='AGIBOT'?C.amber:C.violet,priority:b.c}));
      pins.forEach((p,i) => add('s2','pin',i,p.t,`PIN ${String(i+1).padStart(2,'0')}`,i*TAU/Math.max(1,pins.length)-Math.PI/2,
        this.phone?80:95,this.phone?85:72,5.2));
      const workflow=this.galaxies[2];
      projects.forEach((p,i) => add('s3','gh',i,p.name.split('/')[1]||p.name,p.top?'FIRST PICK':p.cat,i*TAU/Math.max(1,projects.length)-Math.PI/2,workflow.rx,workflow.ry,p.top?7:4.5,{dim:!p.top,priority:p.top?20:1}));
      const upcoming=this.galaxies[3];
      plans.forEach(([title],i) => add('s4','plan',i,title,`P.${String(i+1).padStart(2,'0')}`,i*TAU/Math.max(1,plans.length)-2.25,upcoming.rx,upcoming.ry,4.5,{dim:true}));
      this.nodeMap = new Map(this.nodes.map(n=>[n.id,n]));
    }

    home() { return { x:0, y:0, z:1000 }; }

    shape(g, detail=this.detail) {
      // The mobile overview has four separate, compact orbits. The inspiration
      // orbit unfolds vertically only when approached, making room for its boards.
      if(this.phone&&g.key==='s2')return {rx:lerp(g.rx,170,detail),ry:lerp(g.ry,295,detail)};
      if(this.phone&&g.key==='s1')return {rx:lerp(g.rx,165,detail),ry:lerp(g.ry,205,detail)};
      return {rx:g.rx,ry:g.ry};
    }

    focusPose(key) {
      const g = this.galaxies.find(g => g.key===key || g.id===key);
      if (!g) return this.home();
      if(g.key==='s1') {
        const shape=this.shape(g,1);
        const availableW=this.width-(this.phone?78:260);
        const availableH=this.height-this.safe.top-this.safe.bottom-(this.phone?100:110);
        const scale=Math.min(availableW/(2*(shape.rx+14)),availableH/(2.5*shape.ry),this.phone?.86:1.8);
        return {x:g.x,y:g.y+shape.ry*.08,z:Math.max(this.zoomRange.min,this.focal/Math.max(.2,scale)-g.z)};
      }
      if(g.key==='s2') {
        const shape=this.shape(g,1),margin=this.phone?40:48;
        const scale=Math.min((this.width-(this.phone?48:180))/(2*(shape.rx+margin)),
          (this.height-this.safe.top-this.safe.bottom-(this.phone?32:35))/(2*(shape.ry+margin)));
        return {x:g.x,y:g.y,z:Math.max(this.zoomRange.min,this.focal/Math.max(.2,scale)-g.z)};
      }
      const availableW = this.width-(this.phone?114:230);
      const availableH = this.height-this.safe.top-this.safe.bottom-(this.phone?90:100);
      const scale = Math.min(availableW/(g.rx*2),availableH/(g.ry*2),this.phone?.88:2.1);
      return { x:g.x, y:g.y, z:Math.max(this.bounds.minZ,this.focal/Math.max(.2,scale)-g.z) };
    }

    focusReviewPose(id,time=0) {
      const node=this.nodes.find(n=>n.reviewId===id||n.id===id);
      if(!node||node.reviewType!=='daily')return this.focusPose('s1');
      // Resolve the fully unfolded position before flying; no stale overview
      // coordinates are carried into the close-up camera.
      const g=this.galaxies[0],shape=this.shape(g,1);
      const world={x:g.x+Math.cos(node.angle)*node.rx*shape.rx/g.rx,y:g.y+Math.sin(node.angle)*node.ry*shape.ry/g.ry,z:g.z};
      const scale=(this.phone?19:23)/(node.r*1.09);
      const directZ=this.focal/scale-world.z;
      const z=directZ>=120?directZ:120*this.focal/(scale*(120+world.z));
      return {x:world.x,y:world.y,z:clamp(z,this.zoomRange.min,this.zoomRange.max)};
    }

    getWorld(id, time=0) {
      const node=typeof id==='string'?this.nodeMap.get(id):id;
      if (!node) return null;
      const g=this.galaxies.find(g=>g.key===node.galaxy);
      if(node.galaxy==='s1') {
        const shape=this.shape(g);
        if(node.main)return {x:g.x,y:g.y,z:g.z};
        if(node.overviewOffset)return {x:g.x+node.overviewOffset.x*shape.rx,y:g.y+node.overviewOffset.y*shape.ry,z:g.z};
        return {x:g.x+Math.cos(node.angle)*node.rx*shape.rx/g.rx,y:g.y+Math.sin(node.angle)*node.ry*shape.ry/g.ry,z:g.z};
      }
      const gi=this.galaxies.indexOf(g);
      const floatX=Math.sin(time*.12+gi*1.7)*3.5;
      const floatY=Math.sin(time*.16+gi*1.3)*4;
      if (node.main) return {x:g.x+floatX,y:g.y+floatY,z:g.z+Math.sin(time*.1+gi)*3};
      const a=node.angle+Math.sin(time*.018+gi)*.045;
      const shape=this.shape(g),expansion=node.galaxy==='s2'?1:lerp(.58,1,this.detail);
      const localX=Math.cos(a)*node.rx*shape.rx/g.rx*expansion;
      const localY=Math.sin(a)*node.ry*shape.ry/g.ry*expansion;
      const twist=Math.sin(time*.025+gi)*.025;
      return {x:g.x+localX*Math.cos(twist)-localY*Math.sin(twist)+floatX,
        y:g.y+localX*Math.sin(twist)+localY*Math.cos(twist)+floatY,
        z:Math.max(-42,g.z+Math.sin(a)*38+Math.cos(a*2)*18)};
    }

    projectionScale(camera,worldZ=0) {
      // Continue beyond the original camera stop with optical magnification.
      // This preserves the existing overview and keeps every depth plane in front.
      return this.focal/Math.max(35,Math.max(120,camera.z)+worldZ)*Math.max(1,120/camera.z);
    }

    project(world,camera) {
      const depth=Math.max(120,camera.z)+world.z;
      const scale=this.projectionScale(camera,world.z);
      return {x:this.center.x+(world.x-camera.x)*scale,y:this.center.y+(world.y-camera.y)*scale,scale,depth};
    }

    watch(x,y) {
      const nx=(x-this.center.x)/(this.width*.55);
      const ny=(y-this.center.y)/((this.height-this.safe.top-this.safe.bottom)*.72);
      const edge=clamp((Math.hypot(nx,ny)-.08)/1.23,0,1);
      return {size:.61+.48*Math.pow(1-edge,1.2),alpha:.28+.72*Math.pow(1-edge,1.1)};
    }

    marginFade(y) {
      if(!this.phone)return 1;
      // The starfield remains continuous while foreground objects recede under chrome.
      const top=clamp((y-this.safe.top+52)/72,0,1);
      const bottom=clamp((this.height-this.safe.bottom+52-y)/72,0,1);
      return .08+.92*Math.min(top,bottom);
    }

    glow(hue) {
      if (this.glows.has(hue)) return this.glows.get(hue);
      const canvas=document.createElement('canvas'); canvas.width=256;canvas.height=256;
      const ctx=canvas.getContext('2d');
      const g=ctx.createRadialGradient(128,128,0,128,128,128);
      g.addColorStop(0,rgba(hue,.24));g.addColorStop(.22,rgba(hue,.115));g.addColorStop(.53,rgba(hue,.035));g.addColorStop(1,rgba(hue,0));
      ctx.fillStyle=g;ctx.fillRect(0,0,256,256);this.glows.set(hue,canvas);return canvas;
    }

    drawStars(camera,time) {
      const {ctx,width,height}=this;
      ctx.fillStyle=C.bg;ctx.fillRect(0,0,width,height);
      const sky=ctx.createRadialGradient(width*.52,height*.44,30,width*.52,height*.44,Math.max(width,height)*.65);
      sky.addColorStop(0,'rgba(27,37,70,.21)');sky.addColorStop(1,'rgba(10,15,30,0)');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
      const starFocal=Math.max(width,height)*1.1;
      for(const s of this.stars) {
        const depth=Math.max(120,camera.z+s.z);
        const scale=starFocal/depth;
        const sx=width/2+(s.x-camera.x*(.42+s.layer*.09))*scale;
        const sy=height/2+(s.y-camera.y*(.42+s.layer*.09))*scale;
        const x=((sx%(width+50))+width+50)%(width+50)-25;
        const y=((sy%(height+50))+height+50)%(height+50)-25;
        const twinkle=.8+Math.sin(time*.6+s.phase)*.2;
        ctx.fillStyle=`rgba(210,221,255,${s.alpha*twinkle})`;
        const r=clamp(s.radius*scale*.58,.35,1.65);
        ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
        if(s.layer===0 && s.radius>1.24) {
          ctx.strokeStyle=`rgba(187,207,255,${s.alpha*.23})`;ctx.lineWidth=.6;
          ctx.beginPath();ctx.moveTo(x-3.2,y);ctx.lineTo(x+3.2,y);ctx.moveTo(x,y-3.2);ctx.lineTo(x,y+3.2);ctx.stroke();
        }
      }
    }

    orbit(g,camera,time,rx,ry,alpha=.2,dashed=false) {
      const ctx=this.ctx;ctx.strokeStyle=rgba(g.hue,alpha);ctx.lineWidth=.7;
      if(dashed)ctx.setLineDash([1.7,6]);
      ctx.beginPath();let started=false;
      const turn=g.key==='s1'?0:Math.sin(time*.025+this.galaxies.findIndex(other=>other.key===g.key))*.025;
      for(let i=0;i<=100;i++) {
        const a=i/100*TAU;
        const lx=Math.cos(a)*rx,ly=Math.sin(a)*ry;
        const p=this.project({x:g.x+lx*Math.cos(turn)-ly*Math.sin(turn),y:g.y+lx*Math.sin(turn)+ly*Math.cos(turn),z:g.key==='s1'?g.z:g.z+Math.sin(a)*38+Math.cos(a*2)*18},camera);
        if(p.depth<35){started=false;continue;}
        if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);
      }
      ctx.stroke();ctx.setLineDash([]);
    }

    drawGalaxy(g,camera,time,projected) {
      const ctx=this.ctx;
      const center=projected.find(n=>n.id===g.id);
      if(center.depth<35)return;
      const shape=this.shape(g);g={...g,...shape};
      const radius=Math.min(1700,Math.max(g.rx,g.ry)*center.scale*1.65);
      ctx.globalAlpha=center.alpha*.85;
      ctx.drawImage(this.glow(g.hue),center.x-radius,center.y-radius*.75,radius*2,radius*1.5);
      ctx.globalAlpha=1;
      if(g.key==='s1') {
        for(const track of this.reviewTracks) {
          const rx=g.rx*track.factor,ry=g.ry*track.factor;
          this.orbit(g,camera,time,rx,ry,(track.type==='daily'?.4:.28)*center.alpha,track.count===0);
          // Capacity marks remain a scaffold, never clickable placeholder reports.
          for(let i=0;i<track.slots;i++) {
            const a=-Math.PI/2+i/track.slots*TAU;
            const p=this.project({x:g.x+Math.cos(a)*(rx+3),y:g.y+Math.sin(a)*(ry+3),z:g.z},camera);
            const q=this.project({x:g.x+Math.cos(a)*(rx+7),y:g.y+Math.sin(a)*(ry+7),z:g.z},camera);
            ctx.strokeStyle=rgba(g.hue,.32*center.alpha);ctx.lineWidth=.7;
            ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
          }
        }
        for(const node of projected.filter(n=>n.overviewOffset)) {
          ctx.strokeStyle=rgba(g.hue,.2*center.alpha);ctx.lineWidth=.7;ctx.setLineDash([2,5]);
          ctx.beginPath();ctx.moveTo(node.x,node.y-8);ctx.lineTo(node.x,node.y-24);ctx.stroke();ctx.setLineDash([]);
        }
      } else if(g.key==='s2') {
        this.orbit(g,camera,time,g.rx*1.09,g.ry*1.09,.09*center.alpha);
        this.orbit(g,camera,time,g.rx*.73,g.ry*.73,.11*center.alpha,true);
        const rotate=time*.008;
        for(const d of this.dust) {
          const mx=this.phone?lerp(.8,.7,this.detail):1,my=this.phone?lerp(.85,1.65,this.detail):1;
          const p=this.project({x:g.x+(d.x*Math.cos(rotate)-d.y*Math.sin(rotate))*mx,
            y:g.y+(d.x*Math.sin(rotate)+d.y*Math.cos(rotate))*my,z:g.z+d.z},camera);
          if(p.depth<35||p.x<0||p.x>this.width||p.y<0||p.y>this.height)continue;
          ctx.fillStyle=rgba(g.hue,d.alpha*center.alpha*this.marginFade(p.y));
          ctx.beginPath();ctx.arc(p.x,p.y,clamp(d.r*p.scale,.25,1.8),0,TAU);ctx.fill();
        }
        for(const kind of ['pin','board']) {
          const group=projected.filter(n=>n.key===kind);
          ctx.strokeStyle=rgba(C.violet,(kind==='pin'?.25:.15)*center.alpha);ctx.lineWidth=.65;
          ctx.beginPath();group.forEach((p,i)=>{if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.closePath();ctx.stroke();
        }
      } else if(g.key==='s3') {
        this.orbit(g,camera,time,g.rx,g.ry,.21*center.alpha);
        this.orbit(g,camera,time,g.rx+9,g.ry+9,.09*center.alpha,true);
      } else {
        const group=projected.filter(n=>n.galaxy==='s4'&&!n.main);
        ctx.strokeStyle=rgba(C.grey,.17*center.alpha);ctx.lineWidth=.65;ctx.setLineDash([2,6]);ctx.beginPath();
        group.forEach((p,i)=>{if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.closePath();ctx.stroke();ctx.setLineDash([]);
        const r=radius*.53;ctx.globalAlpha=.35*center.alpha;
        ctx.drawImage(this.glow(C.grey),center.x-r*1.6,center.y-r*.4,r*2,r);ctx.globalAlpha=1;
      }
    }

    ringedPlanet(node,front=false) {
      const ctx=this.ctx,{x,y,r}=node;
      ctx.save();ctx.translate(x,y);ctx.rotate(-.28);
      ctx.strokeStyle=rgba(C.teal,front?.77:.43);ctx.lineWidth=front?1.55:1;
      ctx.beginPath();ctx.ellipse(0,0,r*2.06,r*.51,0,front?0:Math.PI,front?Math.PI:TAU);ctx.stroke();
      ctx.strokeStyle=rgba(C.teal,.15);ctx.lineWidth=Math.max(1.4,r*.075);
      ctx.beginPath();ctx.ellipse(0,0,r*1.84,r*.4,0,front?0:Math.PI,front?Math.PI:TAU);ctx.stroke();ctx.restore();
    }

    drawBody(n,time,hoverId,selectedId) {
      const {ctx}=this,{x,y,r}=n;
      if(!n.visible||r<.25)return;
      ctx.save();ctx.globalAlpha=n.alpha;
      if(n.main&&n.key==='s3')this.ringedPlanet(n,false);
      if(n.main) {
        const gradient=ctx.createRadialGradient(x-r*.35,y-r*.4,r*.03,x+r*.13,y+r*.14,r*1.18);
        const colors=n.kind==='amber'?['#fff0cb','#edbd79','#b47742','#5d412d','#20232a']:
          n.kind==='teal'?['#d7f6e8','#91e4da','#438c91','#204654','#172634']:
          n.kind==='violet'?['#f0ebff','#bcb4ff','#8278c2','#494068','#24243c']:['#c3c9d9','#969cb4','#626a86','#3f455f','#242b3c'];
        colors.forEach((c,i)=>gradient.addColorStop([0,.26,.58,.84,1][i],c));
        ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
        ctx.strokeStyle=rgba(n.hue,.35);ctx.lineWidth=.65;ctx.stroke();
        if(n.key==='s1'||n.key==='s3'){
          ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.clip();
          const motion=Math.sin(time*.09)*r*.07;
          ctx.strokeStyle=n.key==='s1'?'rgba(255,227,178,.11)':'rgba(210,255,239,.1)';ctx.lineWidth=Math.max(.7,r*.045);
          for(let j=-2;j<3;j++){
            ctx.beginPath();ctx.moveTo(x-r,y+j*r*.23+motion);ctx.bezierCurveTo(x-r*.3,y+(j*.23+.26)*r+motion,x+r*.4,y+(j*.23+.38)*r+motion,x+r,y+(j*.23+.1)*r+motion);ctx.stroke();
          }
          for(const grain of this.grain){if(grain.x*grain.x+grain.y*grain.y>1)continue;ctx.fillStyle=`rgba(255,236,201,${grain.a})`;ctx.fillRect(x+grain.x*r,y+grain.y*r,grain.r,grain.r);}
          ctx.restore();
        }
        if(n.key==='s3')this.ringedPlanet(n,true);
        if(n.key==='s1'&&r>22) {
          const date=window.CYH.latestReview?.date?.slice(5).replace('-','—')||'';
          ctx.fillStyle='rgba(51,40,30,.8)';ctx.font=`${Math.min(12,r*.25)}px Consolas,monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(date,x,y+1);
        }
      } else {
        const glowRadius=r*3.5;
        ctx.drawImage(this.glow(n.hue),x-glowRadius,y-glowRadius,glowRadius*2,glowRadius*2);
        if(n.reveal>.02){ctx.strokeStyle=rgba(n.hue,(n.dim?.25:.4)*n.reveal);ctx.lineWidth=.7;ctx.beginPath();ctx.arc(x,y,r+3.5*n.reveal,0,TAU);ctx.stroke();}
        ctx.fillStyle=n.hue;ctx.globalAlpha=n.alpha*(n.dim?.7:1);ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
        if(r>4){ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.arc(x-r*.23,y-r*.25,r*.37,0,TAU);ctx.fill();}
      }
      if(n.id===hoverId||n.id===selectedId){ctx.strokeStyle=rgba(n.hue,.78);ctx.lineWidth=1;ctx.setLineDash([2,4]);ctx.beginPath();ctx.arc(x,y,r+10,0,TAU);ctx.stroke();}
      ctx.restore();
    }

    imageFor(pin) {
      if(this.imageCache.has(pin.index))return this.imageCache.get(pin.index);
      const image=new Image();image.decoding='async';image.src=pin.file;
      this.imageCache.set(pin.index,image);return image;
    }

    drawSatellites(projected,camera,options) {
      const {ctx}=this,zoom=1000/camera.z;
      if(this.detail<.005)return [];
      const closeUp=camera.z<120;
      const boardNodes=projected.filter(n=>n.key==='board'&&n.depth>35&&(closeUp||n.alpha>.12));
      const occupied=[],satellites=[];
      const intersects=(a,b,gap=3)=>a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;
      const baseZoom=this.phone?2.5:1.48;
      // First reveal the cover of every board, then progressively reveal the
      // surrounding pins. No image is fetched from Pinterest during navigation.
      const maxPins=Math.max(1,...(window.CYH.boardPins||[]).map(p=>p.length));
      for(let slot=0;slot<maxPins;slot++)for(const board of boardNodes) {
        const pin=window.CYH.boardPins?.[board.index]?.[slot];if(!pin)continue;
        const threshold=slot===0?0:(this.phone?1.04:.78)+Math.floor((slot-1)/3)*.43;
        const lod=slot===0?this.detail:this.detail*smooth((zoom/baseZoom-threshold)/.35);
        if(lod<.01)continue;
        const row=Math.floor(slot/6),angle=board.angle+(slot%6)*TAU/6;
        const radius=(this.phone?43:39)+row*(this.phone?48:34);
        // Keep every image subordinate to its own projected planet at every zoom.
        const width=Math.min((this.phone?20:18)*board.scale,board.r*1.1)*lod;
        const height=width;
        const offset=radius*board.scale*lod;
        const choices=[0,.42,-.42,.85,-.85,Math.PI];
        const orbitId=`image:${pin.index}`;
        let rect,orbitAngle=closeUp?(this.satelliteAngles.get(orbitId)??angle):angle;
        if(closeUp)rect={x:board.x+Math.cos(orbitAngle)*offset-width/2,y:board.y+Math.sin(orbitAngle)*offset-height/2,width,height};
        for(const delta of closeUp?[]:choices) {
          const a=angle+delta;
          const candidate={x:board.x+Math.cos(a)*offset-width/2,y:board.y+Math.sin(a)*offset-height/2,width,height};
          const within=candidate.x>9&&candidate.x+width<this.width-9&&candidate.y>this.safe.top-8&&candidate.y+height<this.height-this.safe.bottom+8;
          const blocksNode=projected.some(n=>n.visible&&n.alpha>.22&&Math.hypot(n.x-(candidate.x+width/2),n.y-(candidate.y+height/2))<Math.max(width,height)/2+n.r+2);
          if(within&&!occupied.some(r=>intersects(candidate,r,2))&&!blocksNode){rect=candidate;orbitAngle=a;break;}
        }
        // Primary covers always remain available. Higher-level pins are culled
        // when their screen rectangles collide, and return as the camera closes in.
        if(!rect&&slot===0)rect={x:board.x+Math.cos(angle)*offset-width/2,y:board.y+Math.sin(angle)*offset-height/2,width,height};
        if(!rect)continue;
        this.satelliteAngles.set(orbitId,orbitAngle);
        const visible=rect.x+width>0&&rect.x<this.width&&rect.y+height>this.safe.top-8&&rect.y<this.height-this.safe.bottom+8;
        // A close image remains visible even when its parent planet is offscreen.
        const alpha=lod*(closeUp?this.watch(rect.x+width/2,rect.y+height/2).alpha:Math.min(1,board.alpha*1.5));
        const world={x:board.world.x+Math.cos(orbitAngle)*radius*lod,y:board.world.y+Math.sin(orbitAngle)*radius*lod,z:board.world.z};
        const satellite={id:orbitId,imageIndex:pin.index,boardIndex:board.index,...rect,world,alpha,visible};
        if(!visible)continue;
        occupied.push(rect);satellites.push(satellite);
        const cx=rect.x+width/2,cy=rect.y+height/2;
        ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=rgba(board.hue,.23);ctx.lineWidth=.65;
        ctx.beginPath();ctx.moveTo(board.x,board.y);ctx.lineTo(cx,cy);ctx.stroke();
        ctx.shadowColor=rgba(board.hue,.18);ctx.shadowBlur=8;
        ctx.fillStyle='#141a30';ctx.beginPath();ctx.arc(cx,cy,width/2,0,TAU);ctx.fill();
        ctx.shadowBlur=0;ctx.clip();
        const image=this.imageFor(pin);
        if(image.complete&&image.naturalWidth) {
          const scale=Math.max(width/image.naturalWidth,height/image.naturalHeight);
          const iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;
          ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality=zoom>baseZoom*1.5?'high':'medium';
          ctx.drawImage(image,cx-iw/2,cy-ih/2,iw,ih);
        }
        ctx.restore();ctx.save();ctx.globalAlpha=alpha;
        ctx.strokeStyle=rgba(board.hue,options.hoverId===satellite.id?.95:.46);ctx.lineWidth=options.hoverId===satellite.id?1.4:.7;
        ctx.beginPath();ctx.arc(cx,cy,width/2,0,TAU);ctx.stroke();ctx.restore();
      }
      return satellites;
    }

    orbitBounds(g,camera,time) {
      const shape=this.shape(g),factor=g.key==='s2'?1.09:g.key==='s3'?1.06:1;
      const points=Array.from({length:64},(_,i)=>{
        const a=i/64*TAU;
        return this.project({x:g.x+Math.cos(a)*shape.rx*factor,y:g.y+Math.sin(a)*shape.ry*factor,z:g.key==='s1'?g.z:g.z+Math.sin(a)*38+Math.cos(a*2)*18},camera);
      });
      const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
      const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
      return {key:g.key,x:minX,y:minY,width:maxX-minX,height:maxY-minY};
    }

    reviewOrbitMetadata(camera) {
      const g=this.galaxies[0],shape=this.shape(g),center=this.project(g,camera);
      return this.reviewTracks.map(track=>{
        const rx=shape.rx*track.factor,ry=shape.ry*track.factor;
        return {...track,rx,ry,center:{x:center.x,y:center.y},screenRx:rx*center.scale,screenRy:ry*center.scale,
          anchor:this.project({x:g.x+rx*.72,y:g.y-ry*.69,z:g.z},camera)};
      });
    }

    render(camera,timeSeconds,options={}) {
      const time=options.reducedMotion?0:timeSeconds;
      const zoom=1000/camera.z;
      this.detail=smooth((zoom-(this.phone?1.35:1.1))/(this.phone?.95:.42));
      const ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.globalAlpha=1;ctx.setLineDash([]);
      this.drawStars(camera,time);
      const focus=options.focusGalaxy;
      const focusStrength=focus?clamp((1000/camera.z-1.25)/(this.phone?.4:.55),0,1):0;
      const backgroundAlpha=1-focusStrength*(this.phone?.92:.86);
      const projected=this.nodes.map(node=>{
        const world=this.getWorld(node,time),p=this.project(world,camera),watch=this.watch(p.x,p.y);
        const reveal=node.main?this.detail:this.detail*(node.galaxy==='s2'&&node.key==='pin'?.65:1);
        const r=node.main?node.r*p.scale*watch.size:lerp(this.phone?1.5:2.05,node.r*p.scale*watch.size,reveal);
        const closeUpAlpha=(options.focusReviewId&&node.reviewId!==options.focusReviewId) ? .16 : 1;
        const alpha=watch.alpha*(node.main&&node.key==='s4'?.85:1)*this.marginFade(p.y)*(focus&&node.galaxy!==focus?backgroundAlpha:1)*closeUpAlpha;
        const labelAnchor=node.main?this.project({x:world.x,y:world.y-this.shape(node).ry-55,z:world.z},camera):null;
        return {...node,...p,r,alpha,reveal,world,labelAnchor,visible:p.depth>35&&p.x+r>-20&&p.x-r<this.width+20&&p.y+r>-20&&p.y-r<this.height+20};
      });
      for(const galaxy of [...this.galaxies].sort((a,b)=>b.z-a.z))this.drawGalaxy(galaxy,camera,time,projected);
      for(const node of [...projected].sort((a,b)=>b.depth-a.depth))this.drawBody(node,time,options.hoverId,options.selectedId);
      const satellites=this.drawSatellites(projected,camera,options);
      return {nodes:projected,galaxies:projected.filter(n=>n.main),satellites,orbits:this.galaxies.map(g=>this.orbitBounds(g,camera,time)),reviewOrbits:this.reviewOrbitMetadata(camera),zoom,detail:this.detail};
    }
  }
  window.CYHUniverse=CYHUniverse;
})();
