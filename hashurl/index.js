export class HashUrl {
  constructor (path, params = {}) {
    if (typeof path === 'string') {
      if (!/^\//.test(path)) {
        throw new Error('Invalid path.')
      }
      path = path.split('/').filter(token => token !== '')
    }
    this.path = path
    this.params = params
  }
  toString () {
    let params = new URLSearchParams(this.params).toString()
    return '#/' + this.path.join('/') + (params && '?' + params || '')
  }
  static parse (url) {
    url = new URL(url)
    if (!/^#\//.test(url.hash)) {
      throw new Error('Invalid URL.')
    }
    url = new URL('http://localhost' + url.hash.slice(1))
    return new HashUrl(url.pathname, Object.fromEntries(url.searchParams))
  }
}
