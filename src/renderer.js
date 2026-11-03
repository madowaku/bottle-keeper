import { VIEW, TUNING, toScreen } from './config.js';
import { clamp } from './math.js';

function roundedRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}
function shadowText(ctx, text, x, y, size, color, align = 'center') {
  ctx.textAlign = align; ctx.font = `900 ${size}px 'Trebuchet MS',sans-serif`;
  ctx.fillStyle = '#04111e'; ctx.fillText(text, x + 2, y + 3);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

function bottle(ctx, item, debug) {
  const { body, tint } = item;
  const center = toScreen(body.getPosition());
  const S = VIEW.scale;
  ctx.save(); ctx.translate(center.x, center.y); ctx.rotate(-body.getAngle());
  const p = (x, y) => [x * S, -y * S];
  // Exactly the silhouette of the four Planck collision fixtures.
  const points = [[-.42,-.85],[.42,-.85],[.42,.24],[.18,.57],[.18,.96],[.25,.96],[.25,1.1],[-.25,1.1],[-.25,.96],[-.18,.96],[-.18,.57],[-.42,.24]];
  ctx.beginPath();
  points.forEach(([x,y],i) => { const [sx,sy]=p(x,y); if (i===0) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy); });
  ctx.closePath();
  const glass = ctx.createLinearGradient(-19,-14,20,14);
  glass.addColorStop(0,'#dbffe7'); glass.addColorStop(.16,tint); glass.addColorStop(.38,'#2c857d'); glass.addColorStop(.76,'#164b63'); glass.addColorStop(1,tint);
  ctx.fillStyle=glass; ctx.fill(); ctx.strokeStyle='#d7ffe1';ctx.lineWidth=2.1;ctx.stroke();
  ctx.fillStyle='#e9f9df78';ctx.fillRect(-13,-26,5,48);
  ctx.fillStyle='#235968aa';ctx.fillRect(9,-25,3,48);
  roundedRect(ctx,-14,-2,28,20,3,'#f9e8b7');
  ctx.strokeStyle='#a38959';ctx.lineWidth=1;ctx.strokeRect(-12,0,24,16);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 11px sans-serif';ctx.fillStyle='#225364';ctx.fillText('BK',0,8);
  if (debug) {
    ctx.strokeStyle='#ff8e88';ctx.lineWidth=1.1;
    for (const fixture of body.getFixtureList() ? fixtureIter(body) : []) {
      const shape=fixture.getShape();const vertices=shape.m_vertices;
      if (!vertices) continue;
      ctx.beginPath();vertices.forEach((v,i)=>{const [sx,sy]=p(v.x,v.y);if(i===0)ctx.moveTo(sx,sy);else ctx.lineTo(sx,sy)});ctx.closePath();ctx.stroke();
    }
    const com = body.getLocalPoint(body.getWorldCenter());
    ctx.fillStyle='#ff9a8f';ctx.beginPath();ctx.arc(com.x*S,-com.y*S,3,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function* fixtureIter(body) { for(let fixture=body.getFixtureList();fixture;fixture=fixture.getNext()) yield fixture; }

export class Renderer {
  constructor(canvas) {
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d');
    this.debug=false;
    this.flash=0;
    this.shards=[];
    this.stars=Array.from({length:38},(_,i)=>({x:(i*91+17)%355,y:(i*67+37)%530,size:i%7===0?2:1}));
    this.resize();
    window.addEventListener('resize',()=>this.resize());
  }
  resize() {
    const ratio=clamp(window.devicePixelRatio||1,1,2);
    this.canvas.width=Math.round(VIEW.width*ratio);
    this.canvas.height=Math.round(VIEW.height*ratio);
    this.ctx.setTransform(ratio,0,0,ratio,0,0);
  }
  crash(x) {
    this.flash=.52;
    this.shards=Array.from({length:22},(_,i)=>({x,y:VIEW.floorY-16,vx:Math.cos(i*2.4)*(35+(i%6)*25),vy:-75-(i%5)*35,age:0,spin:i*.8}));
  }
  update(dt) {
    this.flash=Math.max(0,this.flash-dt);
    this.shards=this.shards.filter(s=>{s.age+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=580*dt;return s.age<1.1;});
  }
  draw(game) {
    const ctx=this.ctx;ctx.clearRect(0,0,VIEW.width,VIEW.height);
    const bg=ctx.createLinearGradient(0,0,0,640);bg.addColorStop(0,'#0a172e');bg.addColorStop(.58,'#153347');bg.addColorStop(1,'#0c1b2e');ctx.fillStyle=bg;ctx.fillRect(0,0,360,640);
    ctx.fillStyle='#b8fbe622'; for(const s of this.stars) ctx.fillRect(s.x,s.y,s.size,s.size);
    ctx.strokeStyle='#8ec8bb0c';ctx.lineWidth=1;
    for(let x=30;x<360;x+=30) {ctx.beginPath();ctx.moveTo(x,83);ctx.lineTo(x,548);ctx.stroke();}
    for(let y=95;y<548;y+=30) {ctx.beginPath();ctx.moveTo(24,y);ctx.lineTo(336,y);ctx.stroke();}
    ctx.fillStyle='#f7d79814';ctx.fillRect(18,0,4,548);ctx.fillRect(338,0,4,548);
    ctx.fillStyle='#bdf3da';ctx.font='900 11px sans-serif';ctx.textAlign='left';ctx.fillText('SCORE',25,23);
    shadowText(ctx,String(game.score).padStart(4,'0'),25,59,32,'#f9ebbd','left');
    ctx.font='800 11px sans-serif';ctx.fillStyle='#90c0c6';ctx.textAlign='right';ctx.fillText(`BEST ${String(game.best).padStart(4,'0')}`,331,30);
    ctx.fillText(`BOTTLES ${game.bottles.length} / 3`,331,50);
    ctx.strokeStyle='#5d9a9d77';ctx.beginPath();ctx.moveTo(25,72);ctx.lineTo(335,72);ctx.stroke();
    ctx.fillStyle='#ffb47c24';ctx.fillRect(22,VIEW.floorY-7,316,7);
    ctx.strokeStyle='#ffac81';ctx.setLineDash([8,5]);ctx.beginPath();ctx.moveTo(23,VIEW.floorY);ctx.lineTo(337,VIEW.floorY);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#fbc39f';ctx.font='800 10px sans-serif';ctx.textAlign='center';ctx.fillText('DANGER · DON’T DROP',180,VIEW.floorY-13);
    for(const item of game.bottles) bottle(ctx,item,this.debug);
    for(const b of game.bullets) {const p=toScreen(b.position);ctx.fillStyle='#affaff';ctx.shadowColor='#8afcff';ctx.shadowBlur=11;roundedRect(ctx,p.x-3,p.y-12,6,17,3,'#c4fdff');ctx.shadowBlur=0;}
    for(const f of game.feedback) {
      ctx.globalAlpha=1-f.age/f.life;
      shadowText(ctx,f.text,f.x,f.y-f.age*34-20,f.text==='+1'?13:18,f.save?'#ffdd87':'#c4ffdf');
      ctx.globalAlpha=1;
    }
    if(game.pendingSpawn) {const pulse=.8+.2*Math.sin(game.elapsed*12);ctx.globalAlpha=pulse;shadowText(ctx,`BOTTLE ${game.pendingSpawn} INCOMING`,180,105,14,'#ffe3ab');ctx.globalAlpha=1;}
    const cannon=game.cannonX;
    ctx.fillStyle='#142c3c';ctx.fillRect(0,558,360,82);
    ctx.fillStyle='#325468';ctx.fillRect(0,558,360,2);
    ctx.save();ctx.translate(cannon,570);
    ctx.fillStyle='#91bed3';ctx.beginPath();ctx.moveTo(-10,22);ctx.lineTo(-6,-3);ctx.lineTo(6,-3);ctx.lineTo(10,22);ctx.closePath();ctx.fill();
    ctx.fillStyle='#eff9d6';ctx.fillRect(-4,-9,8,9);
    roundedRect(ctx,-23,20,46,17,7,'#7fc8b8');
    ctx.fillStyle='#1b4459';ctx.beginPath();ctx.arc(-13,38,5,0,Math.PI*2);ctx.arc(13,38,5,0,Math.PI*2);ctx.fill();ctx.restore();
    if(game.mode==='playing' && game.cooldown>0) {roundedRect(ctx,cannon-22,617,44*(1-game.cooldown/TUNING.cooldown),3,2,'#a9f2c9');}
    ctx.fillStyle='#7293a1';ctx.font='700 10px sans-serif';ctx.textAlign='left';ctx.fillText('BOTTLE KEEPER / 0.1',14,629);
    if(this.debug) {
      ctx.font='11px monospace';ctx.fillStyle='#fff3b7';ctx.textAlign='right';
      ctx.fillText(`H:${game.hits} V:${game.bottles.map(b=>b.body.getAngularVelocity().toFixed(1)).join(',')}`,348,84);
    }
    for(const s of this.shards) {ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.spin+s.age*5);ctx.fillStyle='#adffe3';ctx.globalAlpha=1-s.age/1.1;ctx.fillRect(-3,-1,6,3);ctx.restore();}
    if(this.flash>0) {ctx.fillStyle=`rgba(255,202,156,${this.flash*.45})`;ctx.fillRect(0,0,360,640);}
  }
}
