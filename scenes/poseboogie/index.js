import api from '../../src/scene/api.js';
// TODO(markmcd): Move dat.gui to a devDependency and conditionally import
import * as dat from 'dat.gui';
import * as posenet from '@tensorflow-models/posenet';
import { detectAndDrawPose } from './js/pose.js';
import { Elf } from './js/elf.js';
import { World } from './js/world.js';

const videoWidth = 700;
const videoHeight = 500;
const [minHumanSize, maxHumanSize] = [0.25, 1.5];
const humanSizeStep = 0.25;

const appConfig = {
  debug: true,
  mobileNetArchitecture: 0.75,
  minPartConfidence: 0.7,
  minPoseConfidence: 0.6,
  flipHorizontal: true, // Default to web-cam source, which flips video
  imageScaleFactor: 0.5,
  outputStride: 16,
  enableJointLimits: true,
  resizeBodyParts: true,
  smoothLimbs: true,
  humanSize: 1,
  quadraticElbows: true,
};

api.preload.images(
  'img/svg/rudolph-dancing2_2.svg',
  'img/svg/elf_silhouette.svg',
  'img/svg/mirror.svg',
  'img/facehat.png',
  'img/body.png',
  'img/arm.png',
  'img/hand_cuff.png',
  'img/leftshoe.png',
  'img/rightshoe.png',
);
const posePromise = posenet.load(appConfig.mobileNetArchitecture);
api.preload.wait(posePromise);

/**
 * Loads a the camera to be used in the demo
 */
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
        'Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const video = document.getElementById('video');
  video.width = videoWidth;
  video.height = videoHeight;

  // TODO(markmcd): this may be cropped, try and preserve camera's aspect ratio
  video.srcObject = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      width: videoWidth,
      height: videoHeight,
    },
  });

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();

  return video;
}

function setUpDebugControls() {
  const gui = new dat.GUI();
  gui.add(appConfig, 'mobileNetArchitecture', ['1.01', '1.00', '0.75', '0.50']).onChange((val) => {
    appConfig.modelReload = val;
  });
  gui.add(appConfig, 'minPartConfidence', 0.0, 1.0);
  gui.add(appConfig, 'minPoseConfidence', 0.0, 1.0);
  gui.add(appConfig, 'flipHorizontal').listen();
  gui.add(appConfig, 'imageScaleFactor').min(0.2).max(1.0);
  gui.add(appConfig, 'outputStride', [8, 16, 32]);
  gui.add(appConfig, 'enableJointLimits');
  gui.add(appConfig, 'resizeBodyParts');
  gui.add(appConfig, 'smoothLimbs');
  gui.add(appConfig, 'humanSize').min(minHumanSize).max(maxHumanSize).step(humanSizeStep).listen();
  gui.add(appConfig, 'quadraticElbows');
}

/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectAndDrawPose function.
 */
export async function bindPage() {
  document.getElementById('mirror').addEventListener('change', (evt) =>
      appConfig.flipHorizontal = !evt.srcElement.checked);
  document.getElementById('skeleton-smaller').addEventListener('click', () =>
      appConfig.humanSize = Math.max(minHumanSize, appConfig.humanSize - humanSizeStep));
  document.getElementById('skeleton-larger').addEventListener('click', () =>
      appConfig.humanSize = Math.min(maxHumanSize, appConfig.humanSize + humanSizeStep));

  // Load the PoseNet model weights with architecture - the preload API will have already loaded
  // the resources so this should be quick.
  const net = await posePromise;

  // Start the camera
  let video;
  try {
    video = await loadVideo();
  } catch (e) {
    // TODO(markmcd): build error flow for when camera isn't available
    console.error('this browser does not support video capture, ' +
        'or this device does not have a camera');
    throw e;
  }

  const videoConfig = {video, net, videoWidth, videoHeight};

  const world = new World(appConfig);
  const elf = new Elf(world);

  const badPoseElement = document.getElementById('bad-pose');
  elf.addEventListener('pose-change', (evt) => {
    badPoseElement.hidden = Boolean(evt.detail);
    world.paused = !evt.detail;
  });

  world.animate(document.getElementById('scene'));
  elf.track(videoConfig, appConfig);

  if (debug) {
    document.getElementById('debug').style.display = 'block';
    setUpDebugControls();
    detectAndDrawPose(videoConfig, appConfig);
  }
}


navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

api.ready(bindPage).catch((reason) => {
  // TODO(markmcd): display an error page with link back to village
  console.error(`beep boop, something broke. ${reason}`);
});