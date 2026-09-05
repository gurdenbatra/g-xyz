import { describe, expect, it, vi } from 'vitest';
import { VERT_SRC, FRAG_SRC, compileShader, createShaderProgram } from './shader';

// Minimal stub of the WebGL calls the helpers use.
function stubGL(opts: { compileOk?: boolean; linkOk?: boolean; makeNull?: boolean } = {}) {
  const { compileOk = true, linkOk = true, makeNull = false } = opts;
  return {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    createShader: vi.fn(() => (makeNull ? null : {})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => compileOk),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => (makeNull ? null : {})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => linkOk),
    deleteProgram: vi.fn(),
  } as unknown as WebGLRenderingContext;
}

describe('shader', () => {
  it('exposes non-empty GLSL sources', () => {
    expect(VERT_SRC.length).toBeGreaterThan(0);
    expect(FRAG_SRC).toContain('gl_FragColor');
  });
  it('compileShader returns a shader when compilation succeeds', () => {
    const gl = stubGL();
    expect(compileShader(gl, (gl as unknown as { VERTEX_SHADER: number }).VERTEX_SHADER, VERT_SRC)).not.toBeNull();
  });
  it('compileShader returns null (no throw) when compilation fails', () => {
    const gl = stubGL({ compileOk: false });
    expect(compileShader(gl, (gl as unknown as { VERTEX_SHADER: number }).VERTEX_SHADER, VERT_SRC)).toBeNull();
  });
  it('createShaderProgram returns a program on success', () => {
    expect(createShaderProgram(stubGL(), VERT_SRC, FRAG_SRC)).not.toBeNull();
  });
  it('createShaderProgram returns null (no throw) when link fails', () => {
    expect(createShaderProgram(stubGL({ linkOk: false }), VERT_SRC, FRAG_SRC)).toBeNull();
  });
  it('createShaderProgram returns null when GL cannot allocate objects', () => {
    expect(createShaderProgram(stubGL({ makeNull: true }), VERT_SRC, FRAG_SRC)).toBeNull();
  });
});
