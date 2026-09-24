'use client';
import { ColorFlow } from './color-flow';
import type { FlowStudy } from './color-flow-engine';
export const metalStudy: FlowStudy = {
  slug: 'metal-melt',
  index: '023',
  title: 'Metal / Melt',
  label: 'Liquid metal',
  heading: 'A reflection\nloses its shape.',
  description: 'Moving reflections over an adjustable liquid-metal surface.',
  note: 'Adjust Relief to change the surface depth',
  parameter: 'Relief',
  defaultDetail: 0.6,
  defaultSpeed: 1,
  palettes: [
    { label: 'Champagne', ink: '#835337', paper: '#fff7d9', accent: '#e5ba79' },
    { label: 'Rose gold', ink: '#874952', paper: '#fff1dc', accent: '#e5a799' },
    { label: 'Glacier', ink: '#315d78', paper: '#ecfffd', accent: '#88bfd0' },
    { label: 'Lavender', ink: '#61567f', paper: '#f5efff', accent: '#b4a9d3' },
  ],
  fragment: `
float heightField(vec2 p,float t){
  p+=.32*vec2(sin(p.y*3.2+t*.7),cos(p.x*2.8-t*.58));
  return sin(p.x*3.+p.y*1.5+t*.6)*.43+sin(p.y*4.7-p.x*1.2-t*.42)*.25+sin(p.x*5.8+p.y*3.2+t*.28)*.12;
}
void main(){
  vec2 p=(uv-.5)*2.;float t=time*.46,e=.006;
  float h=heightField(p,t);
  vec2 slope=vec2(heightField(p+vec2(e,0),t)-h,heightField(p+vec2(0,e),t)-h)/e;
  vec3 n=normalize(vec3(-slope*mix(.3,1.1,detail),1.));
  vec3 r=reflect(vec3(0,0,-1),n);
  float env=r.x*.7+r.y*.5+r.z*.2;
  float strip=pow(.5+.5*sin(env*9.+.5),12.);
  float broad=smoothstep(-.35,.85,r.y);
  vec3 color=mix(ink,accent,broad*.7);
  color=mix(color,paper,strip*.94);
  float edge=pow(1.-max(n.z,0.),2.);
  color=mix(color,paper,edge*.42);
  color+=pow(max(dot(n,normalize(vec3(-.5,.8,1.))),0.),48.)*.38;
  gl_FragColor=vec4(color,1.);
}`,
};
export function MetalMelt({
  replayKey,
  expanded = false,
}: {
  replayKey: number;
  expanded?: boolean;
}) {
  return <ColorFlow key={replayKey} study={metalStudy} expanded={expanded} />;
}
