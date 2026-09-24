import assert from 'node:assert/strict';
import test from 'node:test';
import { createCakeState, advanceCakeTurn, dragCakeTurn, dragCakeView, populateCakes, MIRROR_COUNTS, MIN_CAKE_ELEVATION, MAX_CAKE_ELEVATION } from '../components/demos/cake-reflect-model.ts';

test('the unattended stand rotates clockwise with a gentle start', () => {
  const state=createCakeState(), start=state.angle;
  advanceCakeTurn(state,1/60);
  assert.ok(state.angle>start);
  assert.ok(state.angularVelocity>0 && state.angularVelocity<.03);
  for(let i=0;i<180;i++) advanceCakeTurn(state,1/60);
  assert.ok(state.angularVelocity>.179 && state.angularVelocity<=.18);
});
for(const hold of ['hovered','focused','dragging','inspecting','reducedMotion']) {
  test(`${hold} immediately holds the stand without drift`, () => {
    const state=createCakeState();
    for(let i=0;i<60;i++) advanceCakeTurn(state,1/60);
    state[hold]=true;const heldAngle=state.angle;
    for(let i=0;i<60;i++) advanceCakeTurn(state,1/60);
    assert.equal(state.angle,heldAngle);assert.equal(state.angularVelocity,0);
    state[hold]=false;advanceCakeTurn(state,1/60);
    assert.ok(state.angle>heldAngle);
  });
}
test('pointer release cannot restart a stand that is still hovered', () => {
  const state=createCakeState();state.hovered=true;state.dragging=true;
  state.angle=dragCakeTurn(state.angle,75);state.dragging=false;
  const angle=state.angle;advanceCakeTurn(state,.05);assert.equal(state.angle,angle);
});
test('manual movement follows both directions and wraps across zero', () => {
  const start=1;
  assert.ok(dragCakeTurn(start,20)<start);
  assert.ok(dragCakeTurn(start,-20)>start);
  assert.ok(dragCakeTurn(.01,20)>6);
  for(const dx of [-10000,-200,0,200,10000]) assert.ok(dragCakeTurn(start,dx)>=0 && dragCakeTurn(start,dx)<2*Math.PI);
});
test('3, 6 and 8 mirrors refill every slot, including previously removed cakes', () => {
  const state=createCakeState();
  assert.deepEqual(MIRROR_COUNTS,[3,6,8]);
  for(const count of MIRROR_COUNTS) {
    state.present.fill(false);populateCakes(state,count);
    assert.equal(state.count,count);assert.equal(state.present.length,8);
    assert.equal(state.present.slice(0,count).filter(Boolean).length,count);
  }
});
test('vertical dragging explores the view without flipping underneath the stand', () => {
  const start=createCakeState().elevation;
  assert.ok(dragCakeView(start,-30)<start);
  assert.ok(dragCakeView(start,30)>start);
  assert.equal(dragCakeView(start,-10000),MIN_CAKE_ELEVATION);
  assert.equal(dragCakeView(start,10000),MAX_CAKE_ELEVATION);
});
