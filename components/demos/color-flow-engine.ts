export type FlowPalette = {
  label: string;
  ink: string;
  paper: string;
  accent: string;
};
export type FlowRenderer = {
  canvas: HTMLCanvasElement;
  resize: () => void;
  draw: (
    time: number,
    grain: number,
    detail: number,
    palette: FlowPalette,
  ) => void;
  dispose: () => void;
  setPlayback?: (speed: number) => void;
  restart?: () => void;
};
export type FlowStudy = {
  slug: string;
  index: string;
  title: string;
  label: string;
  heading: string;
  description: string;
  note: string;
  parameter: string;
  defaultDetail: number;
  defaultSpeed: number;
  speedLabel?: string;
  palettes: readonly FlowPalette[];
  fragment?: string;
  mount?: (surface: HTMLElement) => Promise<FlowRenderer | null>;
  sourceCredit?: { label: string; url: string };
  granular?: boolean;
};
const vertexSource = `attribute vec2 position; varying vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const common = `precision highp float;
varying vec2 uv;
uniform vec2 resolution;
uniform float time;
uniform float grain;
uniform float detail;
uniform vec3 ink;
uniform vec3 paper;
uniform vec3 accent;
float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
mat2 rotate(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=a*noise(p);p=rotate(.53)*p*2.07+3.1;a*=.5;}return n;}
`;
const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

// Surface coordinates are fixed to the card. No pointer/camera uniform exists.
export function createColorFlow(canvas: HTMLCanvasElement, fragment: string) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  function compile(type: number, source: string) {
    const shader = gl!.createShader(type);
    if (!shader) throw new Error('Unable to create material shader');
    shaders.push(shader);
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS))
      throw new Error(
        gl!.getShaderInfoLog(shader) || 'Shader compilation failed',
      );
    return shader;
  }
  const program = gl.createProgram();
  if (!program) return null;
  let buffer: WebGLBuffer | null = null;
  try {
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, common + fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(program) || 'Shader linking failed');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    if (!buffer) throw new Error('Unable to create material geometry');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  } catch (error) {
    console.error(error);
    shaders.forEach((shader) => gl.deleteShader(shader));
    gl.deleteProgram(program);
    if (buffer) gl.deleteBuffer(buffer);
    return null;
  }
  const uniforms = Object.fromEntries(
    ['resolution', 'time', 'grain', 'detail', 'ink', 'paper', 'accent'].map(
      (name) => [name, gl.getUniformLocation(program, name)],
    ),
  );
  return {
    resize() {
      // Layout dimensions deliberately exclude the card's CSS perspective transform.
      const width = canvas.clientWidth,
        height = canvas.clientHeight,
        dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.resolution, width, height);
    },
    draw(time: number, grain: number, detail: number, palette: FlowPalette) {
      gl.uniform1f(uniforms.time, time);
      gl.uniform1f(uniforms.grain, grain);
      gl.uniform1f(uniforms.detail, detail);
      gl.uniform3fv(uniforms.ink, rgb(palette.ink));
      gl.uniform3fv(uniforms.paper, rgb(palette.paper));
      gl.uniform3fv(uniforms.accent, rgb(palette.accent));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    dispose() {
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
