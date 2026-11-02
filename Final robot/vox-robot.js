/* VoxRobot — drop-in 3D mascot for the VoxSphere hero.
   Load three.js r128 (cdnjs UMD build) first, then this file, then:
       const bot = VoxRobot.mount(document.getElementById('vox-robot'), { brand:'#5b3df5', brand2:'#1a9e86' });
   bot.setMood('curious' | 'happy' | 'annoyed')
   bot.gesture('wink' | 'nod' | 'shake' | 'surprise' | 'think' | 'sleepy' | 'excited' | 'tilt' | 'turn' | 'trick')
   bot.trick() -> a quick double spin (the reference's nav-hover trick)
   bot.yes()  -> turns green and nods      bot.no() -> shakes its head      bot.grumpy() -> orange angry face for a moment
   bot.destroy()      options: autoplay:false stops the random behaviour loop; onUpdate(state) runs each frame.
   It follows the pointer anywhere on the page, blinks and drifts, and gets grumpy if you hover or click between its eyes. */
(function(global){
  function hex(h){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(function(c){return c+c;}).join(''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
  function rgb(c){ return 'rgb('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+')'; }
  function toHsl(c){ var r=c[0]/255,g=c[1]/255,b=c[2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),h=0,s=0,l=(mx+mn)/2,d=mx-mn;
    if(d){ s=l>0.5?d/(2-mx-mn):d/(mx+mn); h=mx===r?((g-b)/d+(g<b?6:0)):mx===g?((b-r)/d+2):((r-g)/d+4); h*=60; } return [h,s,l]; }
  function fromHsl(h){ var H=((h[0]%360)+360)%360/360,S=h[1],L=h[2]; function f(p,q,t){ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; }
    if(!S) return [L*255,L*255,L*255]; var q=L<0.5?L*(1+S):L+S-L*S,p=2*L-q; return [f(p,q,H+1/3)*255,f(p,q,H)*255,f(p,q,H-1/3)*255]; }
  // move colour a toward b by t, shortest way round the hue wheel (purple→orange passes through magenta and red)
  function mixHue(a,b,t){ var A=toHsl(a),B=toHsl(b); var dh=((B[0]-A[0]+540)%360)-180; return fromHsl([A[0]+dh*t, A[1]+(B[1]-A[1])*t, A[2]+(B[2]-A[2])*t]); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function easeInOut(t){ return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2; }
  function bump(t){ return Math.sin(Math.max(0,Math.min(1,t))*Math.PI); }   // 0→1→0
  // critically-damped-ish spring: smooth settle with a hint of overshoot, like the reference motion
  function Spring(v,k,z){ this.v=v; this.target=v; this.vel=0; this.k=k||40; this.z=z||0.85; }
  Spring.prototype.step=function(dt){ var d=2*Math.sqrt(this.k)*this.z; var a=this.k*(this.target-this.v)-d*this.vel; this.vel+=a*dt; this.v+=this.vel*dt; return this.v; };

  function mount(el, opts){
    opts = opts || {};
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:pointer';
    canvas.setAttribute('aria-label','VoxSphere robot mascot');
    el.appendChild(canvas);

    var renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.outputEncoding = THREE.sRGBEncoding;
        var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100); camera.position.set(0, 0.1, 7.6); camera.lookAt(0, -0.42, 0);   // aim a little low so the shadow has room under the sphere
    scene.add(new THREE.HemisphereLight(0xffffff, 0xa0a6b0, 1.05));
    var key = new THREE.DirectionalLight(0xffffff, 0.55); key.position.set(1.5,4,3); scene.add(key);
    var fill = new THREE.DirectionalLight(0xe4ecff, 0.25); fill.position.set(-3,0.5,2); scene.add(fill);
    // soft contact shadow: a blurred radial blob that squashes, shifts and fades as the robot moves and lifts
    var sc_=document.createElement('canvas'); sc_.width=sc_.height=256; var sg=sc_.getContext('2d');
    var grd=sg.createRadialGradient(128,128,0,128,128,128);
    grd.addColorStop(0,'rgba(36,42,56,0.75)'); grd.addColorStop(0.35,'rgba(36,42,56,0.5)'); grd.addColorStop(0.7,'rgba(36,42,56,0.14)'); grd.addColorStop(1,'rgba(40,46,60,0)');
    sg.fillStyle=grd; sg.fillRect(0,0,256,256);
    var shadowTex=new THREE.CanvasTexture(sc_);
    var shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.4,3.4), new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));
    shadow.position.set(0.1,-1.5,0.4); scene.add(shadow);   // camera-facing ellipse just under the sphere, like the reference render

    // ---- face painted onto the sphere so it wraps around the curve ----
    var W=1536,H=768, fc=document.createElement('canvas'); fc.width=W; fc.height=H; var g=fc.getContext('2d');
    var faceTex=new THREE.CanvasTexture(fc); faceTex.encoding=THREE.sRGBEncoding; faceTex.anisotropy=4;
    var rc=document.createElement('canvas'); rc.width=W; rc.height=H; var rg=rc.getContext('2d');
    var roughTex=new THREE.CanvasTexture(rc);
    var VW=490,VH=300,VR=126,RIM=32, CX=W/2, CY=H/2-6;
    function squircle(ctx,x,y,w,h,r){ r=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+r,y);
      ctx.lineTo(x+w-r,y); ctx.bezierCurveTo(x+w-r*0.45,y,x+w,y+r*0.45,x+w,y+r);
      ctx.lineTo(x+w,y+h-r); ctx.bezierCurveTo(x+w,y+h-r*0.45,x+w-r*0.45,y+h,x+w-r,y+h);
      ctx.lineTo(x+r,y+h); ctx.bezierCurveTo(x+r*0.45,y+h,x,y+h-r*0.45,x,y+h-r);
      ctx.lineTo(x,y+r); ctx.bezierCurveTo(x,y+r*0.45,x+r*0.45,y,x+r,y); ctx.closePath(); }
    rg.fillStyle='#9a9a9a'; rg.fillRect(0,0,W,H);
    squircle(rg,CX-VW/2-RIM,CY-VH/2-RIM,VW+RIM*2,VH+RIM*2,VR+RIM); rg.fillStyle='#707070'; rg.fill();
    squircle(rg,CX-VW/2,CY-VH/2,VW,VH,VR); rg.fillStyle='#5a5a5a'; rg.fill(); roughTex.needsUpdate=true;

    var brand = hex(opts.brand||'#c84dff'), brand2 = hex(opts.brand2||'#4bb86f');
    // three-stop rim gradients (left → middle → right), as in the reference
    var moods={
      curious:{c:[brand,[111,91,255],[56,200,255]], eyeW:0.16,eyeH:0.40,eyeY:-0.05,anger:0,visor:1.0},
      happy:  {c:[brand2,[110,196,96],[160,214,80]], eyeW:0.22,eyeH:0.52,eyeY:-0.03,anger:0,visor:1.04},
      annoyed:{c:[[255,70,60],[255,122,47],[255,172,50]], eyeW:0.20,eyeH:0.42,eyeY:-0.08,anger:1,visor:0.96}
    };
    var cur={c:[brand.slice(),[111,91,255],[56,200,255]],eyeW:0.16,eyeH:0.40,eyeY:-0.05,anger:0,visor:1}, mood='curious';

    function drawFace(f){   // f = {ex,ey,openL,openR,scale,glint}
      g.fillStyle='#f7f8fa'; g.fillRect(0,0,W,H);
      var sh=g.createLinearGradient(0,0,0,H); sh.addColorStop(0,'rgba(255,255,255,0)'); sh.addColorStop(1,'rgba(140,146,158,.28)'); g.fillStyle=sh; g.fillRect(0,0,W,H);
      var vs=cur.visor,vw=VW*vs,vh=VH*vs,vr=VR*vs,x=CX-vw/2,y=CY-vh/2;
      // rim: diagonal three-stop gradient
      var gr=g.createLinearGradient(x-RIM,y,x+vw+RIM,y+vh); gr.addColorStop(0,rgb(cur.c[0])); gr.addColorStop(0.5,rgb(cur.c[1])); gr.addColorStop(1,rgb(cur.c[2]));
      squircle(g,x-RIM,y-RIM,vw+RIM*2,vh+RIM*2,vr+RIM); g.fillStyle=gr; g.fill();
      // soft outer shadow where the rim meets the shell
      g.save(); g.shadowColor='rgba(60,70,90,.25)'; g.shadowBlur=18; g.shadowOffsetY=6; g.fillStyle=gr; g.fill(); g.restore();
      // rim top highlight
      var hl=g.createLinearGradient(0,y-RIM,0,y+vh*0.4); hl.addColorStop(0,'rgba(255,255,255,.35)'); hl.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=hl; g.fill();
      // visor: near-black with a faint recess shadow around the inside edge and a cool sheen on top
      squircle(g,x,y,vw,vh,vr); g.fillStyle='#0a0b0f'; g.fill();
      g.save(); g.clip(); var inner=g.createRadialGradient(CX,CY,vh*0.2,CX,CY,vw*0.62); inner.addColorStop(0,'rgba(0,0,0,0)'); inner.addColorStop(1,'rgba(0,0,0,.35)'); g.fillStyle=inner; g.fillRect(x,y,vw,vh);
      var sheen=g.createLinearGradient(0,y,0,y+vh*0.55); sheen.addColorStop(0,'rgba(170,190,230,.16)'); sheen.addColorStop(1,'rgba(170,190,230,0)'); g.fillStyle=sheen; g.fillRect(x,y,vw,vh);
      // eyes
      var ew=vw*cur.eyeW*f.scale, ehBase=vh*cur.eyeH*f.scale, cy=CY+vh*cur.eyeY+f.ey*vh*0.16, sep=vw*0.26, a=cur.anger;
      g.fillStyle='#ffffff';
      [-1,1].forEach(function(s,i){ var open=Math.max(0.05, i?f.openR:f.openL), eh=ehBase*open, cx=CX+s*sep+f.ex*vw*0.15;
        g.save(); g.translate(cx,cy); g.rotate(s*0.06);
        g.beginPath(); g.ellipse(0,0,ew/2,eh/2,0,0,Math.PI*2); g.fillStyle='#fff'; g.fill();
        if(a>0.002){ // slanted upper lid slides down, lower on the inner side, so the eye becomes an angry wedge
          g.clip(); var top=-eh/2, outerY=top+eh*0.1*a, innerY=top+eh*0.68*a;
          g.beginPath(); g.moveTo(s*ew, top-eh); g.lineTo(-s*ew, top-eh); g.lineTo(-s*ew, innerY+eh*0.12*a); g.lineTo(-s*ew*0.5, innerY);
          g.lineTo(s*ew*0.5, outerY); g.lineTo(s*ew, outerY-eh*0.12*a); g.closePath(); g.fillStyle='#0a0b0f'; g.fill(); }
        g.restore(); });
      g.restore();
      faceTex.needsUpdate=true;
    }

    var head=new THREE.Group(); scene.add(head); var body=new THREE.Group(); head.add(body);
    var shell=new THREE.Mesh(new THREE.SphereGeometry(1.2,128,96), new THREE.MeshPhysicalMaterial({map:faceTex,roughnessMap:roughTex,roughness:1,metalness:0,clearcoat:0.3,clearcoatRoughness:0.45}));
    shell.rotation.y=-Math.PI/2; body.add(shell);

    // ---- state ----
    var pointer=new THREE.Vector2(0,0), hasPointer=false, rect=el.getBoundingClientRect();
    var tYaw=0,tPitch=0, sYaw=new Spring(0,34,0.8), sPitch=new Spring(0,34,0.8), sRoll=new Spring(0,30,0.9),
        sX=new Spring(0,22,0.9), sY=new Spring(0,22,0.9), sScale=new Spring(1,26,0.9), yaw=0,pitch=0,roll=0,
        blink=0,nextBlink=2+Math.random()*3, near=0, eyesHover=false, baseMood='curious', clickGrump=0, blinkedOut=false, prevMood='curious', happyT=0;
    var glance={t:0,dur:0,yaw:0,pitch:0}, nextGlance=5+Math.random()*4, gesture=null,gT=0, nextAuto=7, visible=true, alive=true;
    var eyeOpenL=1, eyeOpenR=1, eyeScale=1;
    var clock=new THREE.Clock(), ray=new THREE.Raycaster(), pokes=[], moodTimer=null;
    var DUR={wink:0.9,nod:1.3,shake:1.2,surprise:1.4,think:2.4,sleepy:3.2,excited:1.8,tilt:1.6,turn:2.4,trick:1.5,yes:1.6};

    function setMood(m){ if(moods[m]){ baseMood=m; mood=m; if(!flashing) {} } }
    var flashing=false;
    function flash(m,ms){ setMood(m); flashing=true; clearTimeout(moodTimer); moodTimer=setTimeout(function(){ flashing=false; if(baseMood===m) setMood('curious'); },ms); }
    function startGesture(n){ if(!gesture && DUR[n]){ gesture=n; gT=0; if(n==='excited') flash('happy',2500); } }
    function yes(){ flash('happy',3000); gesture=null; startGesture('yes'); }
    function trick(){ gesture=null; startGesture('trick'); }
    function no(){ gesture=null; startGesture('shake'); }
    function grumpy(){ clickGrump=1.2; }
    // is the pointer on the spot between the eyes?
    function betweenEyes(e){ rect=el.getBoundingClientRect();
      var p=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
      ray.setFromCamera(p,camera); var hit=ray.intersectObject(shell)[0]; if(!hit||!hit.uv) return false;
      var du=hit.uv.x-0.5, dv=hit.uv.y-(1-CY/H); var ex=cur.visor*VW*0.26/W;
      return Math.abs(du) < ex*0.55 && Math.abs(dv) < VH*cur.visor*0.22/H; }
    var hoverT=0;
    function onMove(x,y){ rect=el.getBoundingClientRect(); var cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
      pointer.set(Math.max(-1,Math.min(1,(x-cx)/(window.innerWidth*0.55))), Math.max(-1,Math.min(1,-(y-cy)/(window.innerHeight*0.5)))); hasPointer=true;
      var dist=Math.hypot(x-cx,y-cy)/(Math.max(rect.width,rect.height)*0.9); near=Math.max(0,1-dist); }
    function move(e){ onMove(e.clientX,e.clientY); if(e.target!==canvas){ hoverT=0; eyesHover=false; } }
    function leave(){ hasPointer=false; }
    function down(e){ if(betweenEyes(e)) grumpy(); }
    function over(e){ var b=betweenEyes(e); if(b){ hoverT+=1; if(hoverT>2) eyesHover=true; } else { hoverT=0; eyesHover=false; } }
    function out(){ hoverT=0; eyesHover=false; }
    window.addEventListener('pointermove',move,{passive:true});
    document.addEventListener('pointerleave',leave);
    canvas.addEventListener('pointerdown',down); canvas.addEventListener('pointermove',over,{passive:true}); canvas.addEventListener('pointerleave',out);
    function resize(){ rect=el.getBoundingClientRect(); var w=Math.max(1,rect.width), h=Math.max(1,rect.height);
      renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); camera.position.z = w/h<1 ? 7.6*Math.max(1,1/(w/h))*0.9 : 7.6; }
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null; if(ro) ro.observe(el); window.addEventListener('resize',resize); resize();
    var io = window.IntersectionObserver ? new IntersectionObserver(function(en){ visible=en[0].isIntersecting; }) : null; if(io) io.observe(el);

    var fwd=new THREE.Vector3(), Z=new THREE.Vector3(0,0,1), contact=0;
    var AUTO=['happy','happy','turn','wink','tilt','nod'];

    function frame(){
      if(!alive) return; requestAnimationFrame(frame); if(!visible) return;
      var dt=Math.min(clock.getDelta(),0.05), t=clock.elapsedTime, idle=reduce?0:1, k=1-Math.pow(0.0015,dt);
      // grumpy only while the pointer sits between the eyes (or briefly after a click there)
      clickGrump=Math.max(0,clickGrump-dt);
      mood = (eyesHover||clickGrump>0) ? 'annoyed' : baseMood; var m=moods[mood];
      var viaHue = mood==='annoyed' || prevMood==='annoyed';
      var crate = (prevMood==='happy' && mood!=='happy') ? k*1.6 : k*0.7;
      for(var j=0;j<3;j++) cur.c[j]= viaHue ? mixHue(cur.c[j],m.c[j],crate) : [lerp(cur.c[j][0],m.c[j][0],crate),lerp(cur.c[j][1],m.c[j][1],crate),lerp(cur.c[j][2],m.c[j][2],crate)];
      if(mood!==prevMood){ if(mood==='happy' && blink<=0 && !gesture) blink=0.18; happyT=0; }
      happyT+=dt;
      var ek = blink>0 ? k*3 : k*0.5; cur.eyeW=lerp(cur.eyeW,m.eyeW,ek); cur.eyeH=lerp(cur.eyeH,m.eyeH,ek); cur.eyeY=lerp(cur.eyeY,m.eyeY,ek); var wasAngry=cur.anger>0.5; cur.anger=lerp(cur.anger,m.anger,k*0.8); if(wasAngry && m.anger===0 && blink<=0 && !blinkedOut){ blink=0.2; blinkedOut=true; } if(m.anger===1) blinkedOut=false; cur.visor=lerp(cur.visor,m.visor,k*0.8);

      // autonomous behaviour loop
      if(!reduce && opts.autoplay!==false){ nextAuto-=dt; if(nextAuto<=0&&!gesture){ nextAuto=9+Math.random()*7; var pick=AUTO[Math.floor(Math.random()*AUTO.length)];
        if(pick==='happy'){ if(!flashing) flash('happy',4500); } else startGesture(pick); } }

      // look target: pointer, else wander
      if(hasPointer){ tYaw=pointer.x*0.55; tPitch=-pointer.y*0.3; } else { tYaw=Math.sin(t*0.35)*0.4; tPitch=Math.cos(t*0.5)*0.12; }
      nextGlance-=dt; if(nextGlance<=0&&glance.t<=0&&!gesture){ glance.t=glance.dur=0.8+Math.random()*0.6; glance.yaw=(Math.random()-0.5)*1.4; glance.pitch=(Math.random()-0.5)*0.5; nextGlance=6+Math.random()*6; }
      if(glance.t>0){ glance.t-=dt; var gg=bump(glance.t/glance.dur); tYaw+=glance.yaw*gg; tPitch+=glance.pitch*gg; }
      if(mood==='annoyed'){ tYaw*=0.3; tPitch=tPitch*0.3+0.08; }
      if(mood==='happy' && happyT<2.2){ var hf=1-Math.min(1,happyT/2.2); tYaw*=1-0.85*hf; tPitch*=1-0.85*hf; }   // when it turns green it faces you first

      // gesture overrides
      var gYaw=0,gPitch=0,gRoll=0,gY=0,extraYaw=0,squash=1, oL=1,oR=1,eS=1;
      if(gesture){ gT+=dt; var p=Math.min(1,gT/DUR[gesture]);
        switch(gesture){
          case 'wink':     oR = 1-bump(Math.min(1,p*1.25))*0.98; gRoll=-bump(p)*0.14; gPitch=bump(p)*0.05; break;
          case 'nod':      gPitch=Math.sin(p*Math.PI*4)*0.18*bump(p*0.9+0.05); break;
          case 'yes':      // the reference "Adopt Me" yes: face front, then three quick whole-body bobs with a blink, then hold
                           if(gT>0.5 && gT<1.4){ var q=(gT-0.5)/0.9; gY=-Math.abs(Math.sin(q*Math.PI*3))*0.2*bump(q*0.8+0.1); gPitch=Math.sin(q*Math.PI*6)*0.05; }
                           if(gT>0.72 && gT<0.76 && blink<=0) blink=0.16;
                           break;
          case 'shake':    gYaw=Math.sin(p*Math.PI*5)*0.22*bump(p*0.9+0.05); break;
          case 'surprise': eS=1+bump(Math.min(1,p*1.6))*0.28; gY=bump(Math.min(1,p*2.5))*0.25; gPitch=-bump(p)*0.1; break;
          case 'think':    gYaw=-bump(p)*0.5; gPitch=-bump(p)*0.35; gRoll=bump(p)*0.12; oL=oR=1-bump(p)*0.35; break;
          case 'sleepy':   var d=bump(Math.min(1,p*1.1)); oL=oR=1-d*0.72; gPitch=d*0.22; gRoll=Math.sin(t*2)*0.03; if(p>0.85){ var w=(p-0.85)/0.15; gYaw=Math.sin(w*Math.PI*3)*0.12; oL=oR=1; } break;
          case 'excited':  gY=Math.abs(Math.sin(p*Math.PI*3))*0.32; squash=1+Math.sin(p*Math.PI*6)*0.05; gRoll=Math.sin(p*Math.PI*3)*0.08; break;
          case 'tilt':     gRoll=Math.sin(p*Math.PI)*0.38; gYaw=Math.sin(p*Math.PI)*0.1; break;
          case 'turn':     extraYaw=Math.PI*2*easeInOut(p); break;
          case 'trick':    // one fast full spin, a short beat, then a slower spin the other way
                           if(gT<0.45) extraYaw=Math.PI*2*easeInOut(gT/0.45);
                           else if(gT<0.65) extraYaw=0;
                           else extraYaw=-Math.PI*2*easeInOut(Math.min(1,(gT-0.65)/0.8));
                           break; }
        if(p>=1) gesture=null; }

      var ny=(Math.sin(t*0.9)*0.5+Math.sin(t*1.7)*0.3)*0.06*idle, np=Math.sin(t*1.1+1)*0.02*idle;
      sYaw.target=tYaw+ny+gYaw; sPitch.target=tPitch+np+gPitch; yaw=sYaw.step(dt); pitch=sPitch.step(dt);
      sRoll.target=-yaw*0.16+Math.sin(t*0.6)*0.03*idle+gRoll; roll=sRoll.step(dt);
      // the whole body leans toward the pointer and sits a little lower when annoyed
      sX.target=(hasPointer?pointer.x:Math.sin(t*0.35))*0.28; sY.target=(hasPointer?pointer.y:0)*0.14+(mood==='annoyed'?-0.08:0)+(mood==='happy'?0.04:0);
      // size: bigger when happy, smaller when annoyed, and it swells slightly as the pointer comes close
      sScale.target=(mood==='happy'?1.1:mood==='annoyed'?0.9:1)*(1+near*0.06);
      var sc=sScale.step(dt);
      head.rotation.set(pitch,yaw,roll); body.rotation.y=extraYaw;
      head.position.set(sX.step(dt), sY.step(dt), 0);
      body.position.y=Math.sin(t*1.3)*0.05*idle+gY;
      body.scale.set(sc/Math.sqrt(squash),sc*squash,sc/Math.sqrt(squash));
      var lift=Math.max(0,(body.position.y+head.position.y+0.05)*0.9+0.05);      // how high it is floating
      var ss=sc*(1-lift*0.35);
      shadow.position.x=head.position.x*0.9+0.1; shadow.scale.set(ss*1.0,ss*0.26,1);
      shadow.material.opacity=Math.max(0.3,1-lift*0.9);

      // blink (both eyes, ~150 ms) layered under gesture eye states
      nextBlink-=dt; if(nextBlink<=0&&gesture!=='wink'&&gesture!=='sleepy'){ blink=0.16; nextBlink=2.5+Math.random()*3.5; }
      var b=1; if(blink>0){ blink-=dt; b=1-Math.sin((blink/0.16)*Math.PI)*0.95; }
      eyeOpenL=lerp(eyeOpenL,Math.min(oL,b),k*2.0); eyeOpenR=lerp(eyeOpenR,Math.min(oR,b),k*2.0); eyeScale=lerp(eyeScale,eS,k*1.2);
      drawFace({ex:(tYaw-yaw)*0.6+yaw*0.12, ey:(tPitch-pitch)*0.9, openL:eyeOpenL, openR:eyeOpenR, scale:eyeScale});

      fwd.copy(Z).applyEuler(new THREE.Euler(0,body.rotation.y,0)).applyEuler(head.rotation);
      contact=Math.max(0,Math.min(1,(fwd.z-0.45)/0.55));
      prevMood=mood;
      if(opts.onUpdate) opts.onUpdate({mood:mood,gesture:gesture,eyeContact:contact});
      renderer.render(scene,camera);
    }
    drawFace({ex:0,ey:0,openL:1,openR:1,scale:1}); frame();

    return { setMood:setMood, gesture:startGesture, yes:yes, no:no, grumpy:grumpy, trick:trick, gestures:Object.keys(DUR), get mood(){return mood;}, get baseMood(){return baseMood;}, get eyeContact(){return contact;},
      destroy:function(){ alive=false; clearTimeout(moodTimer); window.removeEventListener('pointermove',move); document.removeEventListener('pointerleave',leave); canvas.removeEventListener('pointerdown',down); canvas.removeEventListener('pointermove',over); canvas.removeEventListener('pointerleave',out);
        if(ro) ro.disconnect(); if(io) io.disconnect(); window.removeEventListener('resize',resize); renderer.dispose(); canvas.remove(); } };
  }
  global.VoxRobot = { mount: mount };
})(window);
