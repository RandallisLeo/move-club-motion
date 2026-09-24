'use client';
import { ColorFlow } from './color-flow';
import type { FlowStudy } from './color-flow-engine';
export const printStudy: FlowStudy = {
  slug: 'print-drift',
  index: '024',
  title: 'Print / Drift',
  label: 'Moving print',
  heading: 'Tiny dots.\nRestless color.',
  description: 'Overlapping ink colors move through a fixed dot pattern.',
  note: 'Adjust Dot size to change the print texture',
  parameter: 'Dot size',
  defaultDetail: 0.5,
  defaultSpeed: 1,
  palettes: [
    { label: 'Bluebell', ink: '#7088dc', paper: '#f0f5ff', accent: '#6fc9c2' },
    { label: 'Lilac', ink: '#ab85cc', paper: '#f8f0ff', accent: '#79b6dc' },
    { label: 'Watermelon', ink: '#ee6279', paper: '#fff4ce', accent: '#f5c24c' },
    { label: 'Papaya', ink: '#f08b4d', paper: '#fff8da', accent: '#ed829d' },
  ],
  fragment: `
float dotLayer(vec2 pixel,float angle,float pitch,float phase){
  mat2 rot=rotate(angle);vec2 grid=rot*pixel/pitch;
  vec2 cell=floor(grid)+.5;
  vec2 samplePoint=rotate(-angle)*cell*pitch/resolution;
  float t=time*.6;
  float density=.5+.31*sin(samplePoint.x*5.+sin(samplePoint.y*5.-t*.61+phase)*1.8+t*.72+phase)
                       +.16*cos(samplePoint.y*7.+t*.48+phase*1.7);
  float radius=sqrt(clamp(density,.025,.98))*.61;
  float distanceToDot=length(fract(grid)-.5);
  return 1.-smoothstep(radius-.035,radius+.035,distanceToDot);
}
void main(){
  vec2 px=uv*resolution;float pitch=mix(3.4,10.,detail);
  float c=dotLayer(px,.26,pitch,0.);
  float m=dotLayer(px,1.31,pitch,2.1);
  float y=dotLayer(px,.78,pitch,4.2)*.6;
  vec3 color=paper;
  color*=mix(vec3(1.),ink,c*.87);
  color*=mix(vec3(1.),accent,m*.83);
  color*=mix(vec3(1.),mix(paper,vec3(1.),.35),y*.72);
  color+=(hash(floor(px*2.))-.5)*.035;
  gl_FragColor=vec4(color,1.);
}`,
};
export function PrintDrift({
  replayKey,
  expanded = false,
}: {
  replayKey: number;
  expanded?: boolean;
}) {
  return <ColorFlow key={replayKey} study={printStudy} expanded={expanded} />;
}
