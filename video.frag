/*{
  pixelRatio: 1,
  camera: true,
  audio: true,
  midi: true,
  glslify: true,
  osc: 3333,
  "IMPORTED": {
    v1: { PATH: "./vj/beeple/beeple00173.mp4" },
    v2: { PATH: "./vj/tatsuya/tatsuya00087.mov" },
    v3: { PATH: "./vj/beeple/beeple0016(4.mp4" },
  },
  PASSES: [
    { fs: "mem.frag", TARGET: "mem", FLOAT: true },
    { TARGET: "renderBuffer" },
    {},
  ],
}*/
precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform sampler2D renderBuffer;
uniform sampler2D backbuffer;
uniform sampler2D v1;
uniform sampler2D v2;
uniform sampler2D v3;
uniform sampler2D camera;
uniform sampler2D midi;
uniform sampler2D osc_cc;
uniform sampler2D osc_note;
uniform sampler2D mem;
uniform float volume;
uniform int PASSINDEX;
#pragma glslify: blur = require('glsl-fast-gaussian-blur')
#pragma glslify: noise2 = require('glsl-noise/simplex/2d')
#pragma glslify: noise3 = require('glsl-noise/simplex/3d')
#pragma glslify: import('./utils/utils')
#pragma glslify: import('./utils/post')
#define SQRT3 1.7320508

vec2 scale(in vec2 st, in float r) {
  return (st - .5) * r + .5;
}

float osc(in float ch) {
  return texture2D(osc_note, vec2(ch / 64.)).r;
}

vec2 pre(in vec2 uv) {
  vec2 p = (gl_FragCoord.xy * 2. - resolution) / min(resolution.x, resolution.y);

  // wiggle
  float owiggle = osc(8.);
  if (owiggle > 0.) {
    uv.x += noise2(vec2(time * 5.)) * .03 * owiggle;
    uv.y += noise2(vec2(time * 3. + 1.)) * .03 * owiggle;
  }

  float osplit = osc(9.);
  if (osplit > 0.) {
    float ntt = noise2(vec2(time));
    if (ntt > .1) {
        uv.x = fract(uv.x * 2.);
    }
    if (ntt > .2) {
        uv.x = fract(uv.x * 1.2 +sin(time));
    }
  }

  float orot = osc(10.);
  if (orot > 0.) {
    uv = rot(uv - .5, time * orot) + .5;
  }

  // x glitch
  float oxg = osc(4.);
  if (oxg > 0.) {
    float ny = noise3(vec3(floor(uv.yy * 40.), time* 30.));
    uv.x += step(1., ny * 4. * osc(4.)) * ny * .04 * oxg *oxg;
  }

  // kaleido
  float okal = osc(7.) * 2.;
  if (okal > 0.0) {
    float l = length(uv);
    uv -=.5;

    uv = abs(uv);
    uv = rot(uv, time * .2);

    if (okal >= 0.5) {
      uv = fract(uv * 1.2 +.2);
      uv = abs(uv);
      uv = rot(uv, -time * .4);
    }

    if (okal > 0.75) {
      uv = fract(uv * 1.3 + .2);
      uv = abs(uv);
      uv = rot(uv, time);
    }

    uv += .5;
  }

  // Random zoom
  float ozoom = osc(5.) * 2.;
  float nt = noise2(vec2(time));
  if (nt * ozoom > .1) {
    float zoom = sin(time * 1.4) * sin(time * 2.37) * .5 + .5;
    uv = uv + vec2(
      sin(time * 2.8) + cos(time * 3.7),
      sin(time * 1.3) + cos(time * 1.9)
    ) * (1. - zoom) * .5;
    uv = (uv - .5) * zoom + .5;
  }

  // dia
  float odia = osc(6.) * 2.;
  if (odia > 0.0) {
    float ll = abs(uv.x - .5) + abs(uv.y - .5) - time * .3;
    float ls = sin(floor(ll * 10.)) * .5 + .5;
    uv = (uv - .5) * (1. - ls * .8 * odia) + .5;
  }

  float obor = osc(13.);
  if (obor > .0) {
    uv.x = uv.y;
  }

  return uv;
}

vec4 post(in vec4 c) {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 p = (gl_FragCoord.xy * 2. - resolution) / min(resolution.x, resolution.y);

  // glichy noise
  float oscrgb = osc(2.);
  if (oscrgb > 0.) {
    c.r += step(.99, blockNoise(uv *1.7, fract(time * .1 * oscrgb)));
    c.gb += step(.99, blockNoise(uv *2.4, fract(time * .1 * oscrgb)));
  }

  // mosh
  float oscmosh = osc(3.);
  if (oscmosh > 0.) {
    float nx = blockNoise(uv * 2.7, fract(time * .1)) *.1;
    float ny = blockNoise(uv * 1.8, fract(time * .2)) *.1;
    c.rgb = mix(c.rgb, vec3(
      c.r * oscmosh / texture2D(renderBuffer, fract(uv + vec2(nx, ny) + .01)).b,
      c.g * oscmosh / texture2D(renderBuffer, fract(uv + vec2(nx, ny) + .03)).b,
      c.b / texture2D(renderBuffer, fract(uv + vec2(nx, ny) + .01)).r
    ), oscmosh * .2);
  }

  // c = vec4(step(0.05, fwidth(c.r))); // edge

  // invert
  float oscinv = osc(0.);
  if (oscinv == 1.) {
    c.rgb = 1. - c.rgb;
  } else {
    c.rgb = mix(c.rgb, 1. - c.rgb, step(.4, noise3(vec3(uv.xx, time * 3. * oscinv) * oscinv * 3.)));
  }

  // hueshift
  float oschue = osc(1.);
  if (oschue > 0.0) {
    c.rgb = hueRot(c.rgb, time * oschue - length(p) * .7 * oschue);
  }

  // rainbow
  float oscrain = osc(11.);
  if (oscrain > 0.) {
    c.rgb = hueRot(c.rgb, time * oscrain + uv.y + uv.x);
  }

  float oscrgl = osc(12.);
  if (oscrgl > 0.) {
    c.r = texture2D(renderBuffer, fract(uv + vec2(sin(time * 30.) * sin(time * 183.) * sin(time * 73.) * .1, 0) + .01)).g;
  }

  return c;
}


vec2 hexCenter(in vec2 p) {
    mat2 skew = mat2(1. / 1.1457, 0, 0.5, 1);
    mat2 inv = 2. * mat2(1., 0, -0.5, 1. / 1.1457);

    vec2 cellP = skew * p;

    // Decide which lane the cell is in
    vec2 cellOrigin = floor(cellP); // -10 to 10, skewed
    float celltype = mod(cellOrigin.x + cellOrigin.y, 3.0);
    vec2 cellCenter = cellOrigin; // -10 to -10, skewed

    if (celltype < 1.) {
        // do nothing
    }
    else if (celltype < 2.) {
        cellCenter = cellOrigin + 1.;
    }
    else if (celltype < 3.) {
        cellP = fract(cellP);
        if (cellP.x > cellP.y) {
            cellCenter = cellOrigin + vec2(1, 0);
        }
        else {
            cellCenter = cellOrigin + vec2(0, 1);
        }
    }

    return inv * (cellCenter / SQRT3);
}

float hexLine(in vec2 p, in float width) {
    p = abs(p);

    if (p.y < p.x * SQRT3) {
        p = rot(p, -1.06);
    }

    return smoothstep(1. - width, 1. - width + .05, p.y) * smoothstep(1., .95, p.y);
}

vec2 hexP(in vec2 p) {
  vec2 hc = hexCenter(p);
  return p - hc;
}

float hex(in vec2 p) {
  vec2 hc = hexCenter(p);
  vec2 hp = p - hc;

  float n = noise2(hc);
  float r = fract(-time * PI / 6. + n); // 15sec

  float a = atan(hp.y, hp.x);

  return hexLine(hp * r, .1);
}

float orb(vec2 p, vec2 c) {
  return .1 / length(p - c);
}

float drawLis(vec2 p, int i) {
  float fi = float(i) + t() * 0.3;
  return orb(p, vec2(sin(fi * 3.), cos(fi * 7.)));
}

float drawOrbit(vec2 p, int i, float offset) {
  float fi = float(i) + 3.;
  // fi = pow(fi / 23., 4.);
  float r = fi + offset + sin(fi + time * .003) * .1;

  float an = sin(1. / r) * 5. * t();
  return orb(p, vec2(sin(an), cos(an)) * r);
}

float drawFall(vec2 p, int i) {
  float fi = float(i);
  float x = fract(fi * 0.87 +.5) * 2. - 1.;
  float yt = fract(sin(fi) + time);
  float y = exp(yt *-5.) * 3. - 1.5;

  return orb(p, vec2(x * 3., y));
}

float drawHex(vec2 p) {
  vec2 hc2 = hexCenter(p);
  vec2 p2 = hc2 - p;
  float n2 = noise2(hc2);
  p2 = rot(p2, n2 * 7.);
  p2 *= p2;
  return step(.3, sin(p2.y * 7. + t() * PI / 3.) * n2); // 6sec
}

vec4 draw(in vec2 uv) {
  vec2 p = uv * 2. - 1.;
  p.x *= resolution.x / resolution.y;

  // p.x += noise2(floor(p.yy * 32. + time * .2)) * .08;

  if (osc(59.) > .0) {
    p *= p;
    p = rot(p, time * .2);
  }

  // float v = volume;
  float vv = volume * .03;

  vec4 c = vec4(0);

  // c += orb(p * .3, vec2(0)) * vv * .5;

  if (osc(58.) > .0) {
    p = hexP(p * 2.);
  }

  // orbits
  if (osc(48.) > .0) {
    for (int i = 0; i < 9; i++) {
      float size = 1. +noise2(vec2(time, float(i))) * 3.;
      c += drawOrbit(p * 10. * (1. - vv), i, .3) * 1.8 * vv * size;
    }
  }

  // lisajou
  if (osc(49.) > .0) {
    for (int i = 0; i < 6; i++) {
      c += drawLis(p, i) * vv * .5;
    }
  }

  float l = length(p);
  float al = l * .7 +.3;
  p = rot(p, al);
  // p *= .3;

  // falls
  if (osc(50.) > .0) {
    for (int i = 0; i < 30; i++) {
      c += drawFall(p * 1.3, i) * .4 * vv;
    }
  }

  // plasma
  if (osc(51.) > .0) {
    // c += .3/cos(p.x * 3.2 + sin(p.y * .93 + time * .2) + time) * sin(p.y * 2.3 + p.x* 4.1 +time * .3) * cos(p.y * 3.+ p.x * .7);
    c.r -= cos(p.x * 13.2 + time) * sin(p.y * 12.3 -time * .7) *  .3;
  }

  // hex eyes
  c += hex(p *4.) * osc(56.) * 2.;
  c += hex(p *12.) * osc(56.) * 2. * l;

  // hex lines
  c += drawHex(p * 4.) * osc(57.) * 2.;
  c += drawHex(p * 8.) * osc(57.) * 2.;

  return c;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  if (PASSINDEX == 1)  {
    uv = pre(uv);
    // gl_FragColor = draw(uv);
    gl_FragColor = vec4(
      draw(uv + vec2(.001, 0)).r,
      draw((uv - .5) * .98 +.5).r,
      draw((uv - .5) * .96 +.501).r,
      1.
    );
  }
  else if (PASSINDEX == 2) {
    vec4 c = texture2D(renderBuffer, uv);
    // gl_FragColor = c;
    gl_FragColor = post(c);
  }
}
