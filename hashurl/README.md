# hashurl

```js
export class HashUrl {
  constructor (path, params = {}) {}
  toString () {}
  static parse (url) {}
}
```

## Usage

```js
let url = new HashUrl('/foo/bar', { baz: 'qux' })

console.log(url)
// {
//   path: ['foo', 'bar'],
//   params: { baz: 'qux' }
// }

console.log(url.toString())
// #/foo/bar?baz=qux
```

```js
HashUrl.parse('http://localhost#/foo/bar?baz=qux')
```
