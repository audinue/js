
export default class Serializer {
  /**
   * Notes:
   * - Constructor should be parameterless.
   * - Order of the constructors is significant.
   */
  constructor (constructors = []) {
    this.constructors = constructors
  }

  serialize (object) {
    const map = new Map()
    const traverse = value => {
      if (typeof value !== 'object' || value === null) {
        return value
      }
      if (Array.isArray(value)) {
        return value.map(traverse)
      }
      if (map.has(value)) {
        return {$ref: map.get(value)}
      }
      map.set(value, map.size)
      const copy = {$id: map.size - 1}
      if (value.constructor !== Object) {
        const type = this.constructors.indexOf(value.constructor)
        if (type === -1) {
          throw new Error(`Unspecified constructor '${value.constructor.name}'.`)
        }
        copy.$type = type
      }
      for (let key in value) {
        if (!value.hasOwnProperty(key)) {
          continue
        }
        copy[key] = traverse(value[key])
      }
      return copy
    }
    return JSON.stringify(traverse(object))
  }

  _revive (value) {
    if (!value.hasOwnProperty('$type')) {
      return {}
    }
    const type = parseInt(value.$type)
    if (type < 0 || type > this.constructors.length - 1) {
      throw new Error(`Invalid json.`)
    }
    return new this.constructors[type]()
  }

  deserialize (json) {
    const map = new Map()
    const traverse = value => {
      if (typeof value !== 'object' || value === null) {
        return value
      }
      if (Array.isArray(value)) {
        return value.map(traverse)
      }
      if (value.hasOwnProperty('$ref')) {
        return map.get(value.$ref)
      }
      const copy = this._revive(value)
      map.set(value.$id, copy)
      for (let key in value) {
        if (key === '$id' || key === '$type') {
          continue
        }
        copy[key] = traverse(value[key])
      }
      return copy
    }
    return traverse(JSON.parse(json))
  }
}
