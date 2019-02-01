float blockNoise(in vec2 uv, float t) {
  float n = 0.;
  float k = .8;
  float l = 3.7;
  uv += .3;
  for (int i = 0; i < 3; i++) {
    l += 2.2;
    n += noise3(vec3(floor(uv * l), t)) * k;
    k *= .8;
  }

  return fract(n);
}
