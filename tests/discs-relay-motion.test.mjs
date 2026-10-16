import test from 'node:test';
import assert from 'node:assert/strict';
import { relayCadence, relayCircle, relayNearestAngle, relayWave, RELAY_BURST_TURN, RELAY_BURST_DURATION, relayBurstProgress, relayBurstVelocity } from '../components/demos/discs-relay-motion.ts';

test('the transition starts immediately and joins without a velocity discontinuity', () => {
  assert.equal(relayCadence(0), 0);
  assert.equal(relayCadence(1), 1);
  assert.ok(relayCadence(.03) > 0);
  const h = 1e-5;
  const slope = t => (relayCadence(t + h) - relayCadence(t - h)) / (2 * h);
  assert.ok(Math.abs(slope(.24 - h) - slope(.24 + h)) < .001);
  assert.ok(Math.abs(slope(0)) < .001);
  assert.ok(Math.abs(slope(1)) < .001);
  let previous = 0;
  for (let i=1; i<=1000; i++) { const p=relayCadence(i/1000); assert.ok(p >= previous); previous=p; }
});
test('all centers stay on a true circle throughout a changing radius and turn', () => {
  for (let step=0;step<=100;step++) {
    const radius=102+(172-102)*relayCadence(step/100);
    for(let i=0;i<12;i++) {
      const p=relayCircle(radius, i*Math.PI/6+step*.13);
      assert.ok(Math.abs(Math.hypot(p.x,p.z)-radius)<1e-9);
    }
  }
});
test('rotation targets cross the angle seam using the shorter turn', () => {
  const nearest=relayNearestAngle(-Math.PI+.02,Math.PI-.02);
  assert.ok(Math.abs(nearest-(Math.PI-.02))<.05);
});
test('the depth route is fixed in space, with the same high and low points for every card', () => {
  for (let i=0;i<100;i++) {
    const angle=i*.13;
    assert.deepEqual(relayWave(angle,0),{y:0,rx:0,rz:0});
    const a=relayWave(angle,1), b=relayWave(angle+Math.PI*2,1);
    assert.ok(Math.abs(a.y-b.y)<1e-10);
    assert.ok(Math.abs(a.y)<=46 && a.rx===0 && Math.abs(a.rz)<=.018);
  }
  // Different cards arriving at the same world angle share exactly one track.
  const cardA=relayWave(.35+1.1,1), cardB=relayWave(2.2-.75,1);
  assert.ok(Math.abs(cardA.y-cardB.y)<1e-10);
  // Left endpoint -> left crest -> center -> right trough -> right endpoint.
  const heights=[-1,-.5,0,.5,1].map(x=>relayWave(Math.asin(x),1).y);
  assert.ok(Math.abs(heights[0])<1e-10 && Math.abs(heights[4])<1e-10);
  assert.ok(heights[1]<-45 && Math.abs(heights[2])<1e-10 && heights[3]>45);
  // The back half must mirror the front at the same projected horizontal
  // position, instead of collapsing both halves onto one overlapping wave.
  for(const projectedX of [-.7,-.3,.2,.65]) {
    const p=.16, b=projectedX/Math.sqrt(1-p*p);
    const root=Math.sqrt(1+b*b*p*p-b*b);
    const zs=[(b*b*p+root)/(1+b*b*p*p),(b*b*p-root)/(1+b*b*p*p)];
    const ys=zs.map(z=>{const a=Math.atan2(b*(1-p*z),z);return relayWave(a,1,p).y/(1-p*z);});
    assert.ok(Math.abs(ys[0]+ys[1])<1e-8);
    assert.ok(ys[0]*projectedX>0 && ys[1]*projectedX<0);
  }
});
test('the switch keeps its peak and decelerates continuously after arrival', () => {
  assert.equal(relayBurstProgress(0),0);
  assert.equal(relayBurstProgress(RELAY_BURST_DURATION),1);
  assert.equal(relayBurstVelocity(0),0);
  assert.equal(relayBurstVelocity(RELAY_BURST_DURATION),0);
  const speeds=Array.from({length:321},(_,i)=>RELAY_BURST_TURN*relayBurstVelocity(i*.01));
  assert.ok(Math.max(...speeds)>2.6 && Math.max(...speeds)<2.8);
  // The new route is already established while orbital velocity is still
  // decaying. Speed then gently returns to its steady baseline.
  assert.ok(RELAY_BURST_TURN*relayBurstVelocity(1.18)>2.69);
  assert.ok(Math.abs(relayBurstVelocity(.8)-relayBurstVelocity(1.18))<1e-10);
  assert.ok(relayBurstVelocity(1.2)>relayBurstVelocity(1.6));
  assert.ok(relayBurstVelocity(1.6)>relayBurstVelocity(2.6));
  const speedAtThree=RELAY_BURST_TURN*relayBurstVelocity(3);
  assert.ok(speedAtThree>0 && speedAtThree<.1);
  // No frame-sized speed drop when the path morph finishes.
  for(let t=.41;t<RELAY_BURST_DURATION;t+=1/120) {
    const drop=RELAY_BURST_TURN*(relayBurstVelocity(t)-relayBurstVelocity(t+1/120));
    assert.ok(drop>=0 && drop<.019);
  }
  assert.equal(relayBurstProgress(0),0);
  assert.equal(relayBurstProgress(RELAY_BURST_DURATION),1);
  let previous=0;
  for(let i=0;i<=1000;i++) { const p=relayBurstProgress(RELAY_BURST_DURATION*i/1000); assert.ok(p>=previous); previous=p; }
});
test('a second mode switch inherits live orbital velocity instead of resetting it', () => {
  for(const interruptedAt of [.2,.8,1.4,2.4,3]) {
    const entry=relayBurstVelocity(interruptedAt);
    assert.equal(relayBurstVelocity(0,entry),entry);
    assert.equal(relayBurstProgress(0,entry),0);
    assert.equal(relayBurstVelocity(RELAY_BURST_DURATION,entry),0);
    for(const t of [.1,.4,.8,1.2,2.8,3.1]) {
      const h=1e-5;
      const derivative=(relayBurstProgress(t+h,entry)-relayBurstProgress(t-h,entry))/(2*h);
      assert.ok(Math.abs(derivative-relayBurstVelocity(t,entry))<1e-6);
    }
  }
});
