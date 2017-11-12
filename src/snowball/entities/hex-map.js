import { Entity } from '../../engine/core/entity.js';
import { HexCoord } from '../../engine/utils/hex-coord.js';
import { MagicHexGrid } from '../utils/magic-hex-grid.js';
import { constants, rotate2d, fade, shake, sink } from '../shader-partials.js';

const {
  Vector2,
  Mesh,
  Object3D,
  MeshBasicMaterial,
  BufferAttribute,
  RawShaderMaterial,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  PlaneBufferGeometry,
  CylinderBufferGeometry
} = self.THREE;


const vertexShader = `
precision highp float;

${constants}

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float tileScale;
uniform float time;

attribute vec3 position;
attribute vec2 uv;
attribute vec3 tileOffset;
attribute vec2 tileState;
attribute float tileSprite;

varying vec2 vTileState;
varying vec3 vPosition;
varying vec3 vFinalPosition;
varying float vTileScale;

${rotate2d}
${shake}
${sink}

void main() {


  vec3 offsetPosition = tileOffset * tileScale;

  vec3 scaledPosition = position * (tileScale / 2.0);

  scaledPosition.xy = rotate2d(PI / 2.0, scaledPosition.xy);
  scaledPosition.xz = rotate2d(PI / -2.0, scaledPosition.xz);

  vec3 finalPosition = scaledPosition + offsetPosition;

  if (tileState.x == 5.0 && finalPosition.z > 0.0) {
    finalPosition.z *= 3.0;
  }

  finalPosition = shake(tileState, time, finalPosition);
  finalPosition = sink(tileState, time, finalPosition);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPosition, 1.0);

  vPosition = position;
  vFinalPosition = finalPosition;
  vTileState = tileState;
  vTileScale = tileScale;
}
`;

const fragmentShader = `
precision highp float;

uniform float time;

varying vec2 vUv;
varying vec2 vTileState;
varying vec3 vPosition;
varying vec3 vFinalPosition;
varying float vTileScale;

${fade}

void main() {

  if (vTileState.x < 1.0) {
    discard;
  }

  float shouldHighlight = vTileState.x == 2.0 ? 1.0 : 0.0;
  float toneScale = 0.15 + abs(sin(time / 300.0)) * 0.15;
  float rScale = 0.45 * toneScale;
  float gScale = 0.75 * toneScale;

  vec3 colorTone = vec3(
      1.0 - shouldHighlight * rScale,
      1.0 - shouldHighlight * gScale,
      1.0);

  vec4 color = vTileState.x == 5.0
      ? vec4(0.94, 0.97, 1.0, 1.0)
      : vec4(1.0, 1.0, 1.0, 1.0);

  if (vPosition.y < 0.5) {
    color = vec4(0.80, 0.87, 0.86, 1.0) + vPosition.y / 7.0;
    //color = vec4(0.80, 0.87, 0.86, 1.0) + vFinalPosition.z / vTileScale / 6.0;
  }

  float aScale = fade(vTileState, time);

  if (aScale < 0.0) {
    discard;
  }

  gl_FragColor = vec4(color.rgb * colorTone, color.a * aScale);
}
`;

export class HexMap extends Entity(Object3D) {
  constructor() {
    super();

    this.pickHandlers = [];
    this.map = null;
    this.inputSurface = null;
    this.tileCount = 0;
  }

  setup(game) {
    const { mapSystem, inputSystem } = game;
    const { grid, map } = mapSystem;

    const uniforms = {
      tileScale: {
        value: grid.cellSize
      },
      time: {
        value: 0
      }
    };

    const geometry = new InstancedBufferGeometry();
    const material = new RawShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true
    });

    const hexGeometry = new CylinderBufferGeometry(1, 1, 1, 6);
    const tileCount = grid.width * grid.height;

    Object.assign(geometry.attributes, hexGeometry.attributes);
    geometry.setIndex(hexGeometry.index);

    geometry.addAttribute('tileOffset', map.tileOffsets);
    geometry.addAttribute('tileState', map.tileStates);

    this.uniforms = uniforms;

    const hexes = new Mesh(geometry, material);
    this.hexes = hexes;
    this.hexes.position.x -= grid.pixelWidth / 2.0;
    this.hexes.position.y += grid.pixelHeight / 2.0;
    this.hexes.frustumCulled = false;
    this.add(this.hexes);

    const inputSurface = new Mesh(
        new PlaneBufferGeometry(grid.pixelWidth, grid.pixelHeight),
        new MeshBasicMaterial({
          transparent: true,
          visible: false,
          wireframe: false
        }));

    this.inputSurface = inputSurface;
    this.inputSurface.position.z = 8;
    this.inputSurface.position.y = -2;
    this.inputSurface.position.x = 2;

    this.inputSurface.frustumCulled = false;
    this.add(inputSurface);

    this.pickHandlers = [];

    this.unsubscribe = inputSystem.on('pick',
          event => this.pickHandlers.forEach(
              handler => handler(event)), this.inputSurface);

  }

  teardown(game) {
    this.remove(this.inputSurface);
    this.remove(this.hexes);
    this.unsubscribe();
  }

  update(game) {
    this.uniforms.time.value = performance.now();
  }

  handlePick(handler) {
    this.pickHandlers.push(handler);

    return () => {
      this.pickHandlers.splice(this.pickHandlers.indexOf(handler), 1);
    };
  }
}
