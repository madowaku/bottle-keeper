import '../style.css';
import { VIEW, TUNING, DT } from './config.js';
import { BottleGame } from './physics.js';
import { Renderer } from './renderer.js';
import { Sounds } from './audio.js';

const $ = id => document.getElementById(id);
const game = new BottleGame();
const view = new Renderer($('game'));
const audio = new Sounds();
const held = new Set();
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) $('touchControls').style.display = 'flex';

function start() {
  audio.unlock();
  held.clear();
  $('splash').classList.add('hidden');
  $('results').classList.add('hidden');
  game.start();
}
$('startBtn').addEventListener('click', start);
$('retryBtn').addEventListener('click', start);
$('soundBtn').addEventListener('click', () => { $('soundBtn').textContent = audio.toggle() ? '♪' : '×'; });

game.onShoot = () => audio.shoot();
game.onHit = reward => audio.hit(reward);
game.onBreak = result => {
  audio.break(); view.crash(result.x);
  $('finalScore').textContent = String(result.score);
  $('stats').textContent = `${result.hits} HITS   ·   ${result.maxBottles} BOTTLE${result.maxBottles === 1 ? '' : 'S'}`;
  $('recordLabel').textContent = result.record ? '★ NEW RECORD!' : `BEST ${result.best}`;
  // Hold the shattered frame briefly; no async simulation runs after game over.
  $('results').classList.remove('hidden');
};

function clientToCanvasX(clientX) {
  const rect = $('game').getBoundingClientRect();
  return (clientX - rect.left) / rect.width * VIEW.width;
}
$('game').addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') game.aimAt(clientToCanvasX(e.clientX));
});
$('game').addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button === 0) { audio.unlock(); game.shoot(); }
});

const movePad = $('movePad');
let drag = null;
movePad.addEventListener('pointerdown', e => {
  e.preventDefault();movePad.setPointerCapture(e.pointerId);
  drag={id:e.pointerId,startX:e.clientX,origin:game.cannonX};
});
movePad.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId) return;
  const rect=$('game').getBoundingClientRect();
  game.aimAt(drag.origin+(e.clientX-drag.startX)/rect.width*VIEW.width*1.8);
});
const releaseDrag = e => { if (drag?.id === e.pointerId) drag=null; };
movePad.addEventListener('pointerup',releaseDrag);
movePad.addEventListener('pointercancel',releaseDrag);
$('firePad').addEventListener('pointerdown',e=>{ e.preventDefault();audio.unlock();game.shoot(); });

window.addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','Space','KeyA','KeyD'].includes(e.code)) e.preventDefault();
  if (e.repeat && e.code==='Space') return;
  held.add(e.code);
  if (e.code === 'Space') { audio.unlock();game.shoot(); }
  if (e.code === 'Backquote') {view.debug=!view.debug;$('debugPanel').classList.toggle('hidden',!view.debug);}
});
window.addEventListener('keyup', e => held.delete(e.code));
window.addEventListener('blur',()=>held.clear());

for (const [id,key] of [['gravity','gravity'],['lift','lift'],['spin','spinCap']]) {
  $(id).value=TUNING[key];
  $(id).addEventListener('input',e=>{
    TUNING[key]=Number(e.target.value);
    if(key==='gravity') game.world.setGravity({x:0,y:-TUNING.gravity});
  });
}

let previous=0, accumulator=0;
function frame(time) {
  const dt=Math.min((time-previous)/1000 || 0,0.08); previous=time;
  accumulator+=dt;
  if (game.mode === 'playing') {
    game.setMove(held.has('ArrowLeft')||held.has('KeyA'),held.has('ArrowRight')||held.has('KeyD'));
    let steps=0;
    while(accumulator>=DT && steps<5) {game.step(DT); accumulator-=DT;steps++;}
    if(steps===5)accumulator=0;
  } else {accumulator=0;}
  view.update(dt); view.draw(game);
  if(view.debug) $('debugReadout').textContent=`hits: ${game.hits}\nshots: ${game.bullets.length}\nmode: ${game.mode}\nFPS: ${dt>0?Math.round(1/dt):0}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
