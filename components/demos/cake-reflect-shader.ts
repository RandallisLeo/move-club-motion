// Finite double-sided mirrors reflect rays through actual separated cake solids.
export const cakeVertexShader = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
export const cakeFragmentShader = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform vec3 uBackground;
uniform float uRotation, uElevation, uCount, uMirrors;
uniform float uPicking;
uniform vec2 uPickPoints[9];
uniform vec3 uBody[8], uIcing[8];
uniform float uHeight[8], uPresent[8];
const float PI=3.14159265359;
const float FAR=100.0;
const float GAP=.060;
const float MIRROR_REACH=1.76, MIRROR_BOTTOM=.283, MIRROR_TOP=2.20, MIRROR_CORNER=.18;
const vec2 STRAWBERRY_SEAT=vec2(-.024,.80);
const float MACARON_PITCH=.16, MACARON_ROLL=.22, MACARON_CAP_CENTER=.215;
const vec3 MACARON_CAP_RADIUS=vec3(.975,.38,.945);
struct Hit { float t; vec3 n; vec3 color; float mirror; float shine; float slot; };
Hit hit;
float activeSlot=0.0;
mat2 rot(float a) { return mat2(cos(a),-sin(a),sin(a),cos(a)); }
vec3 macaronToLocal(vec3 p) {
  p.yz=rot(MACARON_PITCH)*p.yz;p.xy=rot(MACARON_ROLL)*p.xy;return p;
}
vec3 macaronToCake(vec3 p) {
  p.xy=rot(-MACARON_ROLL)*p.xy;p.yz=rot(-MACARON_PITCH)*p.yz;return p;
}
vec3 macaronContactPoint() {
  vec3 up=macaronToLocal(vec3(0,1,0)),radius=MACARON_CAP_RADIUS*.98;
  vec3 lowerCenter=vec3(-.012,-MACARON_CAP_CENTER,.009);
  return macaronToCake(lowerCenter-radius*radius*up/length(radius*up));
}
float macaronSizeFor(float halfAngle) { return clamp(.195+halfAngle*.10,.234,.285); }
vec3 macaronCenterFor(float halfAngle,float cakeTop) {
  float spread=min(.36,.78*tan(halfAngle)-.13),size=macaronSizeFor(halfAngle);
  // Ground the rotated lower shell, then nest it slightly into soft icing.
  return vec3(-spread*.20,cakeTop-macaronContactPoint().y*size-.025,.94);
}
void save(float t,vec3 n,vec3 color,float mirror,float shine) {
  if(t>.0003 && t<hit.t) hit=Hit(t,n,color,mirror,shine,activeSlot);
}
float hash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
vec3 point(vec3 p,vec3 radial,vec3 tangent) { return tangent*p.x+vec3(0,p.y,0)+radial*p.z; }
bool bounds(vec3 ro,vec3 rd,vec3 c,float r) {
  vec3 q=ro-c; float b=dot(q,rd); return b*b-dot(q,q)+r*r>=0.0;
}
bool insideMirror(float radial,float height) {
  if(radial<=0.0 || radial>=MIRROR_REACH || height<=MIRROR_BOTTOM || height>=MIRROR_TOP) return false;
  // Only the exposed outer top corner is rounded. The same silhouette is used
  // by every reflection bounce and by physical-object picking.
  vec2 corner=max(vec2(radial-MIRROR_REACH+MIRROR_CORNER,height-MIRROR_TOP+MIRROR_CORNER),0.0);
  return dot(corner,corner)<MIRROR_CORNER*MIRROR_CORNER;
}
void ellip(vec3 ro,vec3 rd,vec3 center,vec3 radius,vec3 color,float shine,float detail,float yaw) {
  vec3 q=ro-center,d=rd;
  q.xz=rot(yaw)*q.xz; d.xz=rot(yaw)*d.xz;
  vec3 o=q/radius,v=d/radius;
  float a=dot(v,v),b=dot(o,v),det=b*b-a*(dot(o,o)-1.0);
  if(det<0.0) return;
  float t=(-b-sqrt(det))/a;
  if(t<.0003 || t>=hit.t) return;
  vec3 p=q+d*t, n=normalize(p/(radius*radius));
  float az=atan(p.z/radius.z,p.x/radius.x);
  if(detail==1.0) {
    float flute=sin(az*7.0+p.y/radius.y*1.2);
    n=normalize(n+vec3(-sin(az),0,cos(az))*flute*.28);
    color*=.97+.03*cos(az*7.0+p.y*20.0);
  }
  if(detail==2.0) {
    vec2 uv=vec2(az/6.28318+.5,acos(clamp(p.y/radius.y,-1.0,1.0))/PI);
    vec2 cell=fract(uv*vec2(13,9)+vec2(floor(uv.y*9.0)*.5,0))-.5;
    float seed=1.0-smoothstep(.05,.16,length(cell*vec2(1.0,.6)));
    color=mix(color,vec3(.99,.73,.32),seed*.7);
    n=normalize(n+vec3(cell,0)*seed*.08);
  }
  if(detail==3.0) color*=.96+.04*sin(az*5.0);
  n.xz=rot(-yaw)*n.xz;
  save(t,n,color,0.0,shine);
}
// A capped cylinder, with striped wafer, citrus cross-section or plain finish.
void rod(vec3 ro,vec3 rd,vec3 start,vec3 end,float r,vec3 color,float pattern) {
  vec3 axis=normalize(end-start),q=ro-start;
  float len=length(end-start), oy=dot(q,axis),dy=dot(rd,axis);
  vec3 o=q-axis*oy,d=rd-axis*dy;
  float a=dot(d,d),b=dot(o,d),det=b*b-a*(dot(o,o)-r*r);
  if(det>=0.0 && a>.00001) {
    float t=(-b-sqrt(det))/a,y=oy+t*dy;
    if(y>0.0 && y<len) {
      vec3 n=normalize(o+d*t),col=color;
      if(pattern==1.0) col=mix(color,vec3(.96,.85,.65),smoothstep(.75,.82,fract(y*8.0+atan(n.x,n.z)*.24)));
      save(t,n,col,0.0,pattern==2.0?.22:.08);
    }
  }
  for(int cap=0;cap<2;cap++) {
    if(abs(dy)<.00001) break;
    float y=float(cap)*len,t=(y-oy)/dy; vec3 p=o+d*t;
    float rr=length(p);
    if(rr<r) {
      vec3 col=color;
      if(pattern==1.0) col=rr<r*.67?vec3(.15,.075,.04):vec3(.75,.52,.29);
      if(pattern==2.0) {
        vec3 basis=normalize(cross(axis,vec3(0,0,1)));
        float angle=atan(dot(p,cross(axis,basis)),dot(p,basis));
        float seams=1.0-smoothstep(.025,.09,abs(sin(angle*5.0)));
        col=mix(vec3(1.0,.77,.17),vec3(1.0,.96,.70),max(seams*.8,smoothstep(r*.8,r*.9,rr)));
        col=mix(col,vec3(.94,.66,.06),smoothstep(r*.95,r,rr));
      }
      save(t,axis*(cap==0?-1.0:1.0),col,0.0,.15);
    }
  }
}
bool clipPlane(vec3 ro,vec3 rd,vec3 normal,float distance,inout float enter,inout float leave,inout vec3 en,inout vec3 ln) {
  float origin=dot(ro,normal)-distance,den=dot(rd,normal);
  if(abs(den)<.000001) return origin<=0.0;
  float t=-origin/den;
  if(den<0.0 && t>enter) { enter=t; en=normal; }
  if(den>0.0 && t<leave) { leave=t; ln=normal; }
  return enter<=leave;
}
// Intersection of a disk, two offset side planes, and top/bottom planes.
// Offsetting the side planes creates real air gaps, including visible cut faces.
void cake(vec3 ro,vec3 rd,int index,vec3 radial,vec3 tangent,float halfAngle) {
  vec3 o=vec3(dot(ro,tangent),ro.y,dot(ro,radial));
  vec3 d=vec3(dot(rd,tangent),rd.y,dot(rd,radial));
  float radius=index==4?1.18:1.24, top=uHeight[index];
  float a=dot(d.xz,d.xz),b=dot(o.xz,d.xz),det=b*b-a*(dot(o.xz,o.xz)-radius*radius);
  float enter=-FAR,leave=FAR; vec3 en=vec3(0),ln=vec3(0);
  if(a>.000001) {
    if(det<0.0) return;
    enter=(-b-sqrt(det))/a; leave=(-b+sqrt(det))/a;
    en=normalize(vec3(o.x+d.x*enter,0,o.z+d.z*enter));
    ln=normalize(vec3(o.x+d.x*leave,0,o.z+d.z*leave));
  } else if(dot(o.xz,o.xz)>radius*radius) return;
  float sh=sin(halfAngle),ch=cos(halfAngle);
  if(!clipPlane(o,d,vec3(ch,0,-sh),-GAP,enter,leave,en,ln)) return;
  if(!clipPlane(o,d,vec3(-ch,0,-sh),-GAP,enter,leave,en,ln)) return;
  if(!clipPlane(o,d,vec3(0,1,0),top,enter,leave,en,ln)) return;
  if(!clipPlane(o,d,vec3(0,-1,0),-.31,enter,leave,en,ln)) return;
  float t=enter>.0003?enter:leave;
  if(t<.0003 || t>=hit.t) return;
  vec3 n=enter>.0003?en:ln,p=o+d*t,col=uBody[index];
  float height=(p.y-.31)/(top-.31),shine=.08;
  bool isTop=n.y>.9;
  float edge=min(p.z*sh-p.x*ch,p.z*sh+p.x*ch)-GAP;
  bool outer=length(p.xz)>radius-.004;
  if(isTop) {
    col=uIcing[index];
    float rim=1.0-smoothstep(.013,.04,min(edge,radius-length(p.xz)));
    col=mix(col,uBody[index],rim);
    shine=(index==0 || index==4 || index==6)?.4:.12;
    n=normalize(n+vec3(p.x,0,p.z)*smoothstep(radius-.05,radius,length(p.xz))*.3);
  } else {
    if(index==0 || index==1 || index==2) {
      float seam=1.0-smoothstep(.007,.014,abs(height-.46));
      col=mix(col,col*.83,seam*.5);
      // Fine combed frosting, without the old high-frequency screen moiré.
      col*=.985+.015*cos(p.y*100.0);
    }
    if(index==3) {
      float band=fract(height*3.0);
      col=mix(vec3(.87,.65,.38),vec3(1,.94,.81),smoothstep(.53,.57,band));
      col=mix(col,vec3(.75,.15,.26),smoothstep(.43,.46,band)*(1.0-smoothstep(.54,.57,band)));
    }
    if(index==4) {
      float band=fract(height*5.0);
      col=mix(vec3(.30,.145,.085),vec3(.80,.60,.38),smoothstep(.43,.46,band));
    }
    if(index==5) {
      float band=fract(height*12.0);
      col=mix(vec3(.40,.53,.23),vec3(.91,.87,.64),smoothstep(.40,.52,band));
    }
    if(index==6) {
      col=mix(vec3(.67,.13,.24),uBody[index],smoothstep(.04,.12,height)); shine=.5;
    }
    if(index==7) {
      float band=floor(height*5.0);
      col=band<1.0?vec3(.75,.62,.87):band<2.0?vec3(.62,.80,.73):band<3.0?vec3(.98,.86,.58):band<4.0?vec3(.94,.61,.67):vec3(.96,.79,.83);
      col=mix(col,vec3(1,.96,.88),1.0-smoothstep(.05,.10,fract(height*5.0)));
    }
    if(!outer && index<3) {
      float band=fract(height*3.0);
      col=mix(vec3(.84,.64,.40),vec3(1,.94,.80),smoothstep(.64,.70,band));
      if(index==1) col=mix(col,uBody[index],.38);
    }
    if(height>.96) col=mix(col,uIcing[index],smoothstep(.96,.99,height));
  }
  if(index==3 || index==4 || index==5 || (!outer && !isTop)) col*=.965+.035*hash(floor(p*110.0));
  // Local occlusion from decorations seats them onto their frosting.
  if(isTop) col*=1.0-.075*exp(-pow((p.z-.85)*5.0,2.0)-p.x*p.x*12.0);
  if(isTop && index==3) {
    vec2 contact=(p.xz-STRAWBERRY_SEAT)/vec2(.079,.073);
    col*=1.0-.19*exp(-dot(contact,contact)*1.7);
  }
  if(isTop && index==1) {
    float size=macaronSizeFor(halfAngle);
    vec2 seat=macaronCenterFor(halfAngle,top).xz+macaronContactPoint().xz*size;
    vec2 contact=(p.xz-seat)/(vec2(.52,.43)*size);
    col*=1.0-.18*exp(-dot(contact,contact)*1.7);
  }
  save(t,point(n,radial,tangent),col,0.0,shine);
}
// One continuous piped surface: broad shoulders, deep nozzle folds and a soft
// bent crown. The flutes change the silhouette, not just the surface normals.
float pipingField(vec3 p,float height,float petals,float twist) {
  float h=clamp(p.y/height,0.0,1.0);
  p.xz-=vec2(.10,-.065)*h*h;
  float az=atan(p.z,p.x),fold=.84+.16*cos(az*petals+twist*h);
  float shoulder=pow(max(1.0-h*h,0.0),.62);
  float radial=(length(p.xz)-shoulder*fold)*.34;
  return max(radial,max(-p.y,p.y-height)*.6);
}
void piping(vec3 ro,vec3 rd,vec3 c,float s,vec3 color,float height,float petals,float twist) {
  vec3 origin=(ro-c)/s,q=origin-vec3(0,height*.40,0);
  float b=dot(q,rd),det=b*b-dot(q,q)+1.14*1.14;
  if(det<0.0) return;
  float t=max(.0004/s,-b-sqrt(det)),end=min(hit.t/s,-b+sqrt(det));
  if(t>=end) return;
  for(int j=0;j<64;j++) {
    vec3 p=origin+rd*t;
    float distance=pipingField(p,height,petals,twist);
    if(distance<.0025) {
      vec2 e=vec2(.003,0);
      vec3 n=normalize(vec3(
        pipingField(p+e.xyy,height,petals,twist)-pipingField(p-e.xyy,height,petals,twist),
        pipingField(p+e.yxy,height,petals,twist)-pipingField(p-e.yxy,height,petals,twist),
        pipingField(p+e.yyx,height,petals,twist)-pipingField(p-e.yyx,height,petals,twist)));
      save(t*s,n,color,0.0,.04);
      return;
    }
    t+=distance;
    if(t>=end) return;
  }
}
void cream(vec3 ro,vec3 rd,vec3 c,float s,vec3 color) {
  piping(ro,rd,c,s,color,.95,7.0,1.35);
}
void rose(vec3 ro,vec3 rd,vec3 c,float s) {
  piping(ro,rd,c,s,vec3(.84,.70,.94),.60,5.0,2.3);
}
void blueberry(vec3 ro,vec3 rd,vec3 c,float r) {
  ellip(ro,rd,c,vec3(r),vec3(.32,.39,.69),.23,3.0,0.0);
  ellip(ro,rd,c+vec3(0,r*.91,0),vec3(r*.35,r*.09,r*.35),vec3(.20,.24,.46),.06,0.0,0.0);
}
float organicField(vec3 p,int kind) {
  if(kind==0) {
    float h=clamp((p.y+1.0)*.5,0.0,1.0);
    p.x-=.075*p.y*p.y;
    float az=atan(p.z,p.x);
    float shoulder=pow(max(sin(PI*pow(h,1.65)),0.0),.54);
    shoulder*=1.0+.035*sin(az*3.0+1.1)+.018*cos(az*7.0+h*4.0);
    return max((length(p.xz)-shoulder)*.45,max(-1.0-p.y,p.y-.86)*.65);
  }
  if(kind==1) {
    p.x-=.035*p.y;
    float body=length(p)-1.0+.025*cos(atan(p.z,p.x)*2.0)*exp(-p.y*p.y*3.0);
    float stemDimple=.19-length((p-vec3(.035,.98,0))*vec3(1,1.25,1));
    return max(body,stemDimple)*.65;
  }
  float z=clamp(p.z,-1.0,1.0);
  float width=.46*pow(max(1.0-abs(z),0.0),.68)*(1.0+.035*sin(z*48.0));
  float arch=.09*(1.0-z*z)+.085*z-.18*p.x*p.x;
  return max(abs(p.y-arch)-.012,max(abs(p.x)-width,abs(p.z)-1.0))*.5;
}
void organic(vec3 ro,vec3 rd,vec3 c,vec3 radius,vec3 color,int kind,float yaw) {
  vec3 o=ro-c,d=rd; o.xz=rot(yaw)*o.xz; d.xz=rot(yaw)*d.xz;
  float extent=max(radius.x,max(radius.y,radius.z))*1.22;
  float b=dot(o,d),det=b*b-dot(o,o)+extent*extent;
  if(det<0.0) return;
  float t=max(.0004,-b-sqrt(det)),end=min(hit.t,-b+sqrt(det));
  float stepScale=min(radius.x,min(radius.y,radius.z));
  for(int j=0;j<72;j++) {
    if(t>=end) return;
    vec3 p=(o+d*t)/radius;
    float distance=organicField(p,kind)*stepScale;
    if(distance<.00025) {
      vec2 e=vec2(.003,0);
      vec3 n=normalize(vec3(organicField(p+e.xyy,kind)-organicField(p-e.xyy,kind),
        organicField(p+e.yxy,kind)-organicField(p-e.yxy,kind),
        organicField(p+e.yyx,kind)-organicField(p-e.yyx,kind))/radius);
      vec3 col=color;
      float shine=.23;
      if(kind==0) {
        float az=atan(p.z,p.x);
        vec2 grid=vec2((az/(2.0*PI)+.5)*17.0,(p.y+1.0)*5.0);
        grid.x+=floor(grid.y)*.43;
        vec2 id=floor(grid),cell=fract(grid)-.5;
        cell-=(vec2(hash(vec3(id,1)),hash(vec3(id,2)))-.5)*.38;
        float r=length(cell*vec2(1.25,.83));
        float seed=(1.0-smoothstep(.055,.115,r))*step(.13,hash(vec3(id,3)));
        float dimple=exp(-r*r*44.0);
        col*=.91+.065*sin(p.x*8.0+sin(p.z*11.0))+.025*cos(p.y*19.0);
        col=mix(col,vec3(.88,.65,.33),seed*.86);
        n=normalize(n+vec3(-sin(az)*cell.x,cell.y*.4,cos(az)*cell.x)*dimple*.28);
        col*=.86+.14*smoothstep(-.70,-.20,p.y);
        shine=.20;
      } else if(kind==1) {
        col*=.90+.07*sin(p.x*4.0+p.z*2.0)+.025*cos(p.y*7.0);
        col*=1.0-.10*exp(-dot(p.xz,p.xz)*25.0)*smoothstep(.55,.95,p.y);
        shine=.42;
      } else {
        float mid=1.0-smoothstep(.012,.033,abs(p.x));
        float vein=1.0-smoothstep(.022,.07,abs(fract((p.z-abs(p.x)*.92)*6.0+sin(p.z*4.0)*.13)-.5));
        float edge=1.0-smoothstep(.0,.055,.46*pow(max(1.0-abs(p.z),0.0),.68)-abs(p.x));
        col=mix(col,vec3(.47,.62,.28),max(mid*.62,vein*.30));
        col*=.92+.08*cos(p.z*7.0+p.x*12.0);
        col=mix(col,col*1.17,edge*.4);
        shine=.045;
      }
      col*=.985+.015*hash(floor(p*155.0));
      n.xz=rot(-yaw)*n.xz;
      save(t,n,col,0.0,shine); return;
    }
    t+=distance;
  }
}
void leaf(vec3 ro,vec3 rd,vec3 c,float yaw,float size) {
  organic(ro,rd,c,vec3(size),vec3(.25,.43,.16),2,yaw);
}
void lemonSlice(vec3 ro,vec3 rd,vec3 c,vec3 radial,vec3 tangent) {
  vec3 q=ro-c,o=vec3(dot(q,tangent),q.y,dot(q,radial));
  vec3 d=vec3(dot(rd,tangent),rd.y,dot(rd,radial));
  o.xy=rot(.14)*o.xy; d.xy=rot(.14)*d.xy;
  o.yz=rot(.20)*o.yz; d.yz=rot(.20)*d.yz;
  float radius=.225,a=dot(d.xy,d.xy),b=dot(o.xy,d.xy),det=b*b-a*(dot(o.xy,o.xy)-radius*radius);
  if(det<0.0 || a<.000001) return;
  float enter=(-b-sqrt(det))/a,leave=(-b+sqrt(det))/a;
  vec3 en=normalize(vec3(o.xy+d.xy*enter,0)),ln=normalize(vec3(o.xy+d.xy*leave,0));
  if(!clipPlane(o,d,vec3(0,0,1),.024,enter,leave,en,ln)) return;
  if(!clipPlane(o,d,vec3(0,0,-1),.024,enter,leave,en,ln)) return;
  if(!clipPlane(o,d,vec3(0,-1,0),.055,enter,leave,en,ln)) return;
  float t=enter>.0003?enter:leave; if(t>=hit.t) return;
  vec3 p=o+d*t,n=enter>.0003?en:ln,col=vec3(.94,.73,.11);
  float r=length(p.xy)/radius,az=atan(p.y,p.x);
  if(abs(n.z)>.9) {
    float seam=1.0-smoothstep(.025,.075,abs(sin(az*4.5+.025*sin(az*13.0))));
    vec2 cells=fract(vec2(az*24.0+floor(r*19.0)*.37,r*19.0))-.5;
    float pulp=exp(-dot(cells*vec2(1.5,.65),cells*vec2(1.5,.65))*7.0);
    col=mix(vec3(.99,.83,.28),vec3(1.0,.955,.67),.45+pulp*.28);
    col=mix(col,vec3(1.0,.975,.83),seam*.72);
    col=mix(col,vec3(.99,.97,.79),smoothstep(.80,.86,r));
    col=mix(col,vec3(.96,.77,.12),smoothstep(.95,.985,r));
    col*=.975+.025*hash(floor(p*850.0));
  } else col*=.91+.09*hash(floor(p*600.0));
  n.yz=rot(-.20)*n.yz; n.xy=rot(-.14)*n.xy;
  save(t,point(n,radial,tangent),col,0.0,.12);
}
float pastryNoise(vec3 p) {
  vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
    mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
    mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
// Plump baked caps sit above ragged feet, with a soft berry filling.
// The upper and lower shells differ slightly instead of sharing perfect molds.
vec2 macaronField(vec3 p) {
  float side=p.y<0.0?-1.0:1.0;
  vec3 shell=p;shell.y=abs(p.y);
  shell.x-=.012*side;shell.z+=.009*side;
  float az=atan(shell.z,shell.x),rho=length(shell.xz*vec2(1.0,1.035));
  float uneven=.012*sin(az*3.0+side)+.007*sin(az*7.0-side*.6);
  vec3 cap=shell-vec3(0,MACARON_CAP_CENTER,0);
  vec3 capRadius=(MACARON_CAP_RADIUS+vec3(uneven,0,uneven))*(side>0.0?1.0:.98);
  float k0=length(cap/capRadius),k1=length(cap/(capRadius*capRadius));
  float dome=max(k0*(k0-1.0)/max(k1,.001),.225-shell.y);
  float ruffle=.014*sin(az*29.0+shell.y*28.0+side)
    +.010*sin(az*47.0-shell.y*41.0)+.008*sin(az*13.0+side*2.0);
  float footRadius=.969+uneven+ruffle+.013*sin(shell.y*58.0+az*5.0);
  float foot=max((rho-footRadius)*.58,abs(shell.y-.162)-.082);
  float fillingR=.922+.012*sin(az*5.0+.8)+.008*cos(az*9.0);
  vec2 filling=vec2(length(p.xz*vec2(1.0,1.035))-fillingR,
    abs(p.y-.009*sin(az*4.0)-p.x*.012)-.102);
  float mousse=length(max(filling,0.0))+min(max(filling.x,filling.y),0.0)-.028;
  float crust=min(dome,foot);
  return mousse<crust?vec2(mousse,2):vec2(crust,foot<dome?1:0);
}
void macaron(vec3 ro,vec3 rd,vec3 c,vec3 radial,vec3 tangent,float size) {
  vec3 q=ro-c,o=vec3(dot(q,tangent),q.y,dot(q,radial));
  vec3 d=vec3(dot(rd,tangent),rd.y,dot(rd,radial));
  o=macaronToLocal(o);d=macaronToLocal(d);
  o/=size;
  float b=dot(o,d),det=b*b-dot(o,o)+1.18*1.18;
  if(det<0.0) return;
  float t=max(.0004/size,-b-sqrt(det)),end=min(hit.t/size,-b+sqrt(det));
  for(int stepIndex=0;stepIndex<80;stepIndex++) {
    if(t>=end) return;
    vec3 p=o+d*t;vec2 field=macaronField(p);
    if(field.x<.0012) {
      vec2 e=vec2(.002,0);
      vec3 n=normalize(vec3(
        macaronField(p+e.xyy).x-macaronField(p-e.xyy).x,
        macaronField(p+e.yxy).x-macaronField(p-e.yxy).x,
        macaronField(p+e.yyx).x-macaronField(p-e.yyx).x));
      float grain=pastryNoise(p*78.0),mottle=pastryNoise(p*9.0);
      vec3 color=p.y>0.0?vec3(.84,.69,.87):vec3(.78,.61,.81);
      float shine=.035;
      if(field.y>1.5) {
        color=mix(vec3(.43,.21,.39),vec3(.59,.34,.50),mottle);
        color*=.93+.07*smoothstep(.055,.12,abs(p.y));
        shine=.10;
      } else if(field.y>.5) {
        float pores=pastryNoise(p*37.0);
        color*=.88+.15*pores;
        color=mix(color,vec3(.61,.40,.60),smoothstep(.69,.85,pores)*.26);
      } else {
        color*=.965+.025*mottle+.018*grain;
        color=mix(color,color*.87,smoothstep(.71,.84,grain)*.3);
      }
      float aboveSeat=(macaronToCake(p).y-macaronContactPoint().y)*size;
      color*=.90+.10*smoothstep(.01,.08,aboveSeat);
      n=macaronToCake(n);
      save(t*size,point(n,radial,tangent),color,0.0,shine);return;
    }
    t+=max(field.x*.75,.0004);
  }
}
void blackberry(vec3 ro,vec3 rd,vec3 c,float size) {
  for(int k=0;k<11;k++) {
    float a=float(k)*2.39996,h=float(k)/10.0;
    vec3 p=c+vec3(cos(a)*.049*(1.0-h*.48),h*.085,sin(a)*.045*(1.0-h*.48))*size;
    ellip(ro,rd,p,vec3(.032,.036,.031)*size,vec3(.20,.12,.24)*(1.0+h*.2),.24,0.0,0.0);
  }
}
void chocolateShard(vec3 ro,vec3 rd,vec3 c,float yaw,float lean) {
  vec3 o=ro-c,d=rd;
  o.xz=rot(yaw)*o.xz; d.xz=rot(yaw)*d.xz;
  o.xy=rot(lean)*o.xy; d.xy=rot(lean)*d.xy;
  float enter=-FAR,leave=FAR; vec3 en=vec3(0),ln=vec3(0);
  if(!clipPlane(o,d,vec3(1,0,0),.095,enter,leave,en,ln)) return;
  if(!clipPlane(o,d,vec3(-1,0,0),.095,enter,leave,en,ln)) return;
  if(!clipPlane(o,d,vec3(0,-1,0),.24,enter,leave,en,ln)) return;
  if(!clipPlane(o,d,normalize(vec3(.8,1,0)),.19,enter,leave,en,ln)) return;
  if(!clipPlane(o,d,vec3(0,0,1),.015,enter,leave,en,ln)) return;
  if(!clipPlane(o,d,vec3(0,0,-1),.015,enter,leave,en,ln)) return;
  float t=enter>.0003?enter:leave;
  vec3 n=enter>.0003?en:ln;
  vec3 color=abs(n.z)>.9?vec3(.29,.15,.10):vec3(.43,.26,.17);
  n.xy=rot(-lean)*n.xy; n.xz=rot(-yaw)*n.xz;
  save(t,n,color,0.0,.26);
}
void decoration(vec3 ro,vec3 rd,int i,vec3 radial,vec3 tangent,float halfAngle) {
  float y=uHeight[i], spread=min(.36,.78*tan(halfAngle)-.13);
  vec3 white=vec3(1,.985,.955);
  if(i==0) {
    cream(ro,rd,point(vec3(-spread*.75,y,.96),radial,tangent),.13,white);
    cream(ro,rd,point(vec3(.05,y,.52),radial,tangent),.10,white);
    vec3 cherry=point(vec3(.027,y+.128,.81),radial,tangent);
    organic(ro,rd,cherry,vec3(.133,.128,.126),vec3(.83,.065,.13),1,.15);
    vec3 stemStart=cherry+vec3(.004,.109,0),stemMiddle=cherry-tangent*.045+vec3(0,.31,0),stemEnd=cherry+tangent*.12+radial*.025+vec3(0,.35,0);
    for(int k=0;k<6;k++) {
      float a=float(k)/6.0,b=float(k+1)/6.0;
      vec3 p=mix(mix(stemStart,stemMiddle,a),mix(stemMiddle,stemEnd,a),a);
      vec3 q=mix(mix(stemStart,stemMiddle,b),mix(stemMiddle,stemEnd,b),b);
      rod(ro,rd,p,q,.0065*(1.0-a*.35),vec3(.29,.27,.10),0.0);
    }
    rod(ro,rd,point(vec3(spread*.60,y,1.01),radial,tangent),point(vec3(spread*.85,y+.60,1.07),radial,tangent),.055,vec3(.37,.21,.13),1.0);
    rod(ro,rd,point(vec3(-spread*.43,y,1.04),radial,tangent),point(vec3(-spread*.65,y+.40,1.14),radial,tangent),.047,vec3(.44,.26,.16),1.0);
  }
  if(i==1) {
    float macaronSize=macaronSizeFor(halfAngle);
    macaron(ro,rd,point(macaronCenterFor(halfAngle,y),radial,tangent),radial,tangent,macaronSize);
    blackberry(ro,rd,point(vec3(.036,y+.032,.48),radial,tangent),1.0);
    blackberry(ro,rd,point(vec3(spread*.73,y+.028,.72),radial,tangent),.78);
    cream(ro,rd,point(vec3(spread*.63,y,.57),radial,tangent),.072,white);
    // A few crumbs trail away from the macaron instead of a uniform pearl row.
    for(int k=0;k<5;k++) {
      float a=float(k)*2.4,r=.013+float(k%3)*.005;
      vec3 c=point(vec3(sin(a)*spread*.5,y+r,.53+float(k)*.037),radial,tangent);
      ellip(ro,rd,c,vec3(r,r*.6,r*.8),vec3(.77,.58,.78),.035,0.0,0.0);
    }
  }
  if(i==2) {
    lemonSlice(ro,rd,point(vec3(.02,y+.072,.94),radial,tangent),radial,tangent);
    blueberry(ro,rd,point(vec3(-.085,y+.078,.60),radial,tangent),.078);
    blueberry(ro,rd,point(vec3(.069,y+.064,.65),radial,tangent),.064);
    cream(ro,rd,point(vec3(-spread*.65,y,1.055),radial,tangent),.106,white);
  }
  if(i==3) {
    // Seat the tapered tip inside the icing: a visible cross-section must meet
    // the cake, not an almost zero-width point that vanishes between pixels.
    vec3 c=point(vec3(STRAWBERRY_SEAT.x,y+.120,STRAWBERRY_SEAT.y),radial,tangent);
    organic(ro,rd,c,vec3(.14,.185,.128),vec3(.94,.16,.20),0,-.24);
    for(int k=0;k<5;k++) {
      float a=float(k)*2.39996;
      leaf(ro,rd,c+vec3(cos(a)*.024,.15+float(k%2)*.004,sin(a)*.024),a,.074+float(k%3)*.007);
    }
    cream(ro,rd,point(vec3(spread*.65,y,1.06),radial,tangent),.13,white);
    cream(ro,rd,point(vec3(-.02,y,.45),radial,tangent),.08,white);
  }
  if(i==4) {
    for(int k=0;k<2;k++) {
      float x=(float(k)-.5)*spread;
      vec3 c=point(vec3(x,y+.21,.86+float(k)*.12),radial,tangent);
      chocolateShard(ro,rd,c,float(k)*.8,.22-float(k)*.35);
    }
    ellip(ro,rd,point(vec3(0,y+.025,.5),radial,tangent),vec3(.085,.025,.055),vec3(.84,.67,.33),.75,0.0,0.0);
  }
  if(i==5) {
    cream(ro,rd,point(vec3(0,y,.79),radial,tangent),.15,vec3(.87,.91,.70));
    leaf(ro,rd,point(vec3(-.054,y+.122,.84),radial,tangent),.82,.16);
    leaf(ro,rd,point(vec3(.061,y+.137,.83),radial,tangent),-.91,.125);
  }
  if(i==6) {
    // A raised chocolate ribbon loops above a glossy raspberry mousse.
    for(int k=0;k<12;k++) {
      float a=float(k)*PI*2.0/12.0,b=float(k+1)*PI*2.0/12.0;
      vec3 p=point(vec3(sin(a)*.14,y+.32+cos(a)*.30,.88+sin(a)*.08),radial,tangent);
      vec3 q=point(vec3(sin(b)*.14,y+.32+cos(b)*.30,.88+sin(b)*.08),radial,tangent);
      rod(ro,rd,p,q,.019,vec3(.92,.75,.40),0.0);
    }
    for(int k=0;k<5;k++) {
      float a=float(k)*2.4;
      ellip(ro,rd,point(vec3(cos(a)*.055,y+.075,.51+sin(a)*.055),radial,tangent),vec3(.052),vec3(.71,.09,.24),.2,0.0,0.0);
    }
  }
  if(i==7) {
    cream(ro,rd,point(vec3(0,y,.83),radial,tangent),.13,white);
    vec3 c=point(vec3(0,y+.08,.83),radial,tangent);
    rod(ro,rd,c,c+vec3(0,.48,0),.033,vec3(.67,.49,.84),1.0);
    ellip(ro,rd,c+vec3(.008,.55,0),vec3(.029,.075,.029),vec3(1,.68,.22),.3,0.0,0.0);
    for(int k=0;k<9;k++) {
      float a=float(k)*2.39996,z=.47+float(k%3)*.24,x=sin(a)*spread*.6;
      vec3 p=point(vec3(x,y+.016,z),radial,tangent);
      vec3 col=k%3==0?vec3(.94,.42,.59):k%3==1?vec3(.42,.75,.68):vec3(.74,.60,.89);
      rod(ro,rd,p,p+tangent*cos(a)*.045+radial*sin(a)*.045,.012,col,0.0);
    }
  }
  // Piped borders belong to the floral and fruit cakes, not every recipe.
  if(i==2 || i==3) {
    for(int k=0;k<3;k++) {
      float a=(float(k)*.30-.36+.045*sin(float(k)*4.2+float(i)))*halfAngle;
      float r=1.13+.018*sin(float(k)*2.1);
      vec3 p=point(vec3(sin(a)*r,y,cos(a)*r),radial,tangent);
      cream(ro,rd,p,.050+.009*sin(float(k)*1.8+float(i)),white);
    }
  }
}
void scene(vec3 ro,vec3 rd) {
  hit=Hit(FAR,vec3(0,1,0),vec3(0),0.0,0.0,0.0);
  activeSlot=0.0;
  rod(ro,rd,vec3(0,.025,0),vec3(0,.13,0),1.56,vec3(.61,.64,.69),0.0);
  rod(ro,rd,vec3(0,.13,0),vec3(0,.28,0),1.91,vec3(.78,.80,.84),0.0);
  if(abs(rd.y)>.00001) {
    float t=(.282-ro.y)/rd.y;vec3 p=ro+rd*t;
    if(length(p.xz)<1.88) save(t,vec3(0,1,0),vec3(.88,.90,.93),1.0,.7);
  }
  float wedge=PI*2.0/uCount;
  for(int i=0;i<8;i++) {
    if(float(i)>=uCount) break;
    float a=(float(i)+.5)*wedge;
    vec3 radial=vec3(cos(a),0,sin(a)),tangent=vec3(-sin(a),0,cos(a));
    // Restore-anchor queries include the absent body so + has the same position
    // and mirror occlusion as ×. Ordinary hover still sees only real geometry.
    if((uPresent[i]>.5 || uPicking>1.5) && bounds(ro,rd,radial*.73+vec3(0,1.0,0),uCount<4.0?1.35:.99)) {
      activeSlot=float(i+1);
      cake(ro,rd,i,radial,tangent,wedge*.5);
      if(uPresent[i]>.5) decoration(ro,rd,i,radial,tangent,wedge*.5);
    }
    // Picking-only floor footprints locate physical empty compartments.
    // They never enter the beauty render or continue through a mirror.
    if(uPicking>.5 && uPicking<1.5 && uPresent[i]<.5 && abs(rd.y)>.00001) {
      float t=(.34-ro.y)/rd.y; vec3 p=ro+rd*t;
      float x=dot(p,tangent),z=dot(p,radial),halfAngle=wedge*.5;
      if(length(p.xz)<1.24 && z*sin(halfAngle)-abs(x)*cos(halfAngle)>GAP) {
        activeSlot=float(i+1);
        save(t,vec3(0,1,0),vec3(0),0.0,0.0);
      }
    }
    activeSlot=0.0;
    if(uMirrors>.5) {
      float ma=float(i)*wedge;
      vec3 along=vec3(cos(ma),0,sin(ma)),normal=vec3(-sin(ma),0,cos(ma));
      float den=dot(rd,normal);
      if(abs(den)>.00001) {
        float t=-dot(ro,normal)/den;vec3 p=ro+rd*t;float r=dot(p,along);
        if(insideMirror(r,p.y)) {
          if(den>0.0) normal=-normal;
          save(t,normal,vec3(.977,.988,.995),1.0,.9);
        }
      }
    }
  }
  if(uMirrors>.5) rod(ro,rd,vec3(0,.28,0),vec3(0,2.21,0),.022,vec3(.70,.75,.80),0.0);
}
vec3 background(vec3 ro,vec3 rd) {
  vec3 col=uBackground;
  if(rd.y<-.0001) {
    vec3 p=ro+rd*(-ro.y/rd.y);
    float contact=exp(-dot(p.xz,p.xz)*.65);
    col*=1.0-.16*contact;
  }
  return col;
}
vec3 shade(vec3 p,vec3 n,vec3 direction,vec3 color,float shine) {
  vec3 light=normalize(vec3(-3,6,4)); light.xz=rot(uRotation)*light.xz;
  float diffuse=max(0.0,dot(n,light)),ambient=.65+.12*n.y;
  float spec=pow(max(0.0,dot(n,normalize(light-direction))),45.0)*shine*.72;
  float ao=1.0;
  if(p.y<.31) ao*=.84+.16*smoothstep(1.2,1.8,length(p.xz));
  return color*(ambient+.33*diffuse)*ao+spec;
}
// Filter the projected edge over a pixel footprint, including pixels just
// outside the panel. A hard, subpixel strip inside the mirror broke into dashes
// as the stand turned; this continuous coverage keeps its apparent weight stable.
float edgeCoverage(vec3 ro,vec3 rd,vec3 a,vec3 b,float firstDepth,float radius,float filterWidth) {
  vec3 q=a-ro,v=b-a;
  vec3 planeQ=q-rd*dot(q,rd),planeV=v-rd*dot(v,rd);
  float s=clamp(-dot(planeQ,planeV)/max(dot(planeV,planeV),.000001),0.0,1.0);
  vec3 p=q+v*s;float depth=dot(p,rd);
  if(depth<0.0 || depth>firstDepth+.006) return 0.0;
  float distance=length(p-rd*depth);
  return 1.0-smoothstep(max(0.0,radius-filterWidth),radius+filterWidth,distance);
}
float mirrorEdges(vec3 ro,vec3 rd,float firstDepth,float cssPixel,float pixelFootprint) {
  float coverage=0.0,radius=max(.0035,cssPixel*.55),filterWidth=pixelFootprint*.65;
  for(int i=0;i<8;i++) {
    if(float(i)>=uCount) break;
    float a=float(i)*PI*2.0/uCount;
    vec3 along=vec3(cos(a),0,sin(a)),outer=along*MIRROR_REACH;
    vec3 bottom=vec3(0,MIRROR_BOTTOM,0),top=vec3(0,MIRROR_TOP,0);
    vec3 bend=along*(MIRROR_REACH-MIRROR_CORNER)+vec3(0,MIRROR_TOP-MIRROR_CORNER,0);
    coverage=max(coverage,edgeCoverage(ro,rd,bottom+outer,top+outer-vec3(0,MIRROR_CORNER,0),firstDepth,radius,filterWidth));
    coverage=max(coverage,edgeCoverage(ro,rd,top,top+outer-along*MIRROR_CORNER,firstDepth,radius,filterWidth));
    coverage=max(coverage,edgeCoverage(ro,rd,bottom,bottom+outer,firstDepth,radius,filterWidth));
    // Filter the curved outline with the same footprint as its straight edges.
    // Restrict arc work to nearby rays so eight mirrors stay inexpensive to turn.
    if(bounds(ro,rd,bend,MIRROR_CORNER+radius+filterWidth)) {
      for(int segment=0;segment<10;segment++) {
        float from=float(segment)*PI/20.0,to=float(segment+1)*PI/20.0;
        vec3 p=bend+(along*cos(from)+vec3(0,sin(from),0))*MIRROR_CORNER;
        vec3 q=bend+(along*cos(to)+vec3(0,sin(to),0))*MIRROR_CORNER;
        coverage=max(coverage,edgeCoverage(ro,rd,p,q,firstDepth,radius,filterWidth));
      }
    }
  }
  return coverage;
}
void main() {
  vec2 sourceUv=uPicking>.5?uPickPoints[int(gl_FragCoord.x)]:vUv;
  vec2 uv=(sourceUv-.5)*2.0;float aspect=uResolution.x/uResolution.y;uv.x*=aspect;
  vec3 camera=vec3(0,sin(uElevation)*7.0,cos(uElevation)*7.0),target=vec3(0,1.0,0);
  vec3 forward=normalize(target-camera),right=normalize(cross(forward,vec3(0,1,0))),up=cross(right,forward);
  float frame=2.18;if(aspect<1.05) frame*=1.05/aspect;
  vec3 ro=camera+(right*uv.x+up*uv.y)*frame,rd=forward;
  ro.xz=rot(uRotation)*ro.xz;rd.xz=rot(uRotation)*rd.xz;
  vec3 primaryOrigin=ro,primaryDirection=rd;
  float firstDepth=FAR,pixelFootprint=2.0*frame*fwidth(vUv.y);
  vec3 throughput=vec3(1),result=vec3(0); float selectedSlot=0.0;
  for(int bounce=0;bounce<10;bounce++) {
    scene(ro,rd);
    if(bounce==0) firstDepth=hit.t;
    if(hit.t>=FAR) {result+=throughput*background(ro,rd);break;}
    vec3 p=ro+rd*hit.t;
    if(hit.mirror>.5) {
      // Editing controls belong to physical objects. Mirrors and the mirrored
      // platter occlude picking instead of forwarding it to optical copies.
      if(uPicking>.5) break;
      throughput*=hit.color;rd=reflect(rd,hit.n);ro=p+rd*.001;
      if(bounce==9) result+=throughput*background(ro,rd);
    } else {selectedSlot=hit.slot;result+=throughput*shade(p,hit.n,rd,hit.color,hit.shine);break;}
  }
  // Red identifies an editable real cake; green identifies any visible part
  // of the stand. Background pixels cannot pause rotation.
  if(uPicking>.5) {gl_FragColor=vec4(selectedSlot/255.0,firstDepth<FAR?1.0:0.0,0,1);return;}
  if(uMirrors>.5) {
    float coverage=mirrorEdges(primaryOrigin,primaryDirection,firstDepth,2.0*frame/uResolution.y,pixelFootprint);
    result=mix(result,vec3(.66,.73,.77),coverage*.82);
  }
  gl_FragColor=vec4(clamp(result,0.0,1.0),1.0);
}
`;
