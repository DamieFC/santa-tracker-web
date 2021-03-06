/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Obj from '../index.js'
import LoaderManager from '../../../managers/LoaderManager.js'

// Config
import GLOBAL_CONFIG from '../../Scene/config.js'
import CONFIG from './config.js'

class Sphere extends Obj {
  constructor(scene, world, material) {
    // Physics
    super(scene, world)

    // Props
    this.material = material
    this.selectable = CONFIG.SELECTABLE
    this.mass = CONFIG.MASS
    this.size = CONFIG.SIZE
    this.name = CONFIG.NAME
    this.normalMap = CONFIG.NORMAL_MAP
    this.obj = CONFIG.OBJ
  }

  init() {
    const { obj, normalMap } = LoaderManager.subjects[this.name]

    // Materials
    const defaultMaterial = new THREE.MeshToonMaterial({
      color: GLOBAL_CONFIG.COLORS.ICE,
      shininess: GLOBAL_CONFIG.SHININESS,
      normalMap
    })
    defaultMaterial.needsUpdate = true

    for (let i = 0; i < obj.children.length; i++) {
      const geometry = obj.children[i].geometry
      geometry.center()
      this.geoMats.push({
        geometry,
        material: defaultMaterial,
      })
    }

    this.setShape(defaultMaterial)
  }

  createShapes(scale = 1) {
    const shape = new CANNON.Sphere((CONFIG.SIZE / 2) * scale)
    this.body.addShape(shape)
  }
}

export default Sphere
