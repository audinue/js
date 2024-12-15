var router = (function () {
  var hashed = location.origin === 'file://'

  var hash = function () {
    hashed = true
    return this
  }

  var redirect = function (location) {
    return { _response: true, location: location }
  }

  var current = function () {
    if (hashed) {
      return new URL(location.hash.substring(1), location.origin)
    } else {
      return new URL(location.href)
    }
  }

  var routes = []

  var add = function (methods) {
    return function (path, fetch) {
      var regExp = new RegExp(
        '^' +
          path.replace(/\//g, '\\$&').replace(/\[(.+?)\]/g, '(?<$1>[^/]+)') +
          '$'
      )
      routes.push({
        path: path,
        fetch: fetch,
        match: function (request) {
          if (methods.indexOf(request.method) > -1) {
            var match = regExp.exec(request.url.pathname)
            if (match) {
              return match.groups || {}
            }
          }
        }
      })
      return this
    }
  }

  var get = add(['GET'])
  var post = add(['POST'])
  var all = add(['GET', 'POST'])

  var defaults = [
    {
      path: '/404',
      fetch: function (request) {
        return (
          '<pre>Unable to ' +
          request.method +
          ' ' +
          request.url.pathname +
          '</pre>'
        )
      }
    },
    {
      path: '/500',
      fetch: function (request) {
        console.error(request.error)
        return '<pre>' + request.error.stack + '</pre>'
      }
    }
  ]

  var fetch = function (request) {
    request = Object.assign({ method: 'GET' }, request)
    var promise = new Promise(function (resolve) {
      for (var i = 0; i < routes.length; i++) {
        var route = routes[i]
        var params = route.match(request)
        if (params) {
          resolve(
            route.fetch(
              Object.assign({}, request, {
                query: request.url.searchParams,
                params: params
              })
            )
          )
          return
        }
      }
      resolve(
        routes
          .concat(defaults)
          .find(function (route) {
            return route.path === '/404'
          })
          .fetch(request)
      )
    })
    return promise
      .catch(function (error) {
        return routes
          .concat(defaults)
          .find(function (route) {
            return route.path === '/500'
          })
          .fetch(Object.assign({}, request, { error: error }))
      })
      .then(function (response) {
        if (
          response !== null &&
          response !== undefined &&
          response._response === true
        ) {
          return response
        }
        return { body: response, url: request.url }
      })
      .then(function (response) {
        if (response.location) {
          return fetch({ url: new URL(response.location, request.url) })
        }
        return response
      })
  }

  var loading = false

  var route = function (request) {
    if (!loading) {
      loading = true
      document.body.classList.add('loading')
      return fetch(request).then(function (response) {
        var body = response.body
        var url = hashed ? '#' + response.url.pathname : response.url
        document.body.innerHTML = body
        if (request._state === 'REPLACE') {
          history.replaceState(body, '', url)
        } else {
          history.pushState(body, '', url)
        }
        var element = document.querySelector('[autofocus]')
        if (element) {
          element.focus()
        }
        loading = false
        document.body.classList.remove('loading')
      })
    }
    return this
  }

  var reload = function () {
    route({ url: current(), _state: 'REPLACE' })
    return this
  }

  var push = function (path) {
    route({ url: new URL(path, current()) })
    return this
  }

  var replace = function (path) {
    route({ url: new URL(path, current()), _state: 'REPLACE' })
    return this
  }

  addEventListener('DOMContentLoaded', reload)

  addEventListener('popstate', function (event) {
    if (event.state !== null) {
      document.body.innerHTML = event.state
    }
  })

  addEventListener('hashchange', function () {
    if (history._state === null) {
      reload()
    }
  })

  addEventListener('click', function (event) {
    if (
      event.target.nodeName === 'A' &&
      (event.target.target === '' || event.target.target === '_self')
    ) {
      var href = event.target.getAttribute('href')
      if (href !== null) {
        var url = new URL(href, current())
        if (url.origin === location.origin) {
          event.preventDefault()
          route({ url: url })
        }
      }
    }
  })

  addEventListener('submit', function (event) {
    if (event.target.target === '' || event.target.target === '_self') {
      var url = new URL(event.target.getAttribute('action') || '', current())
      if (url.origin === location.origin) {
        event.preventDefault()
        var body = new FormData(event.target, event.submitter)
        if (event.target.method === 'get') {
          var entries = body.entries()
          while (true) {
            var entry = entries.next()
            if (entry.done) {
              break
            }
            url.searchParams.set(entry.value[0], entry.value[1])
          }
          route({ url: url })
        } else {
          route({ method: 'POST', url: url, body: body })
        }
      }
    }
  })

  return {
    hash: hash,
    redirect: redirect,
    get: get,
    post: post,
    all: all,
    fetch: fetch,
    reload: reload,
    push: push,
    replace: replace
  }
})()
