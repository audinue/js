var respond = function () {
  var responders = []
  var post

  addEventListener('DOMContentLoaded', domContentLoaded)
  addEventListener('hashchange', hashchange)
  addEventListener('submit', submit)

  function domContentLoaded () {
    removeEventListener('DOMContentLoaded', domContentLoaded)
    if (location.hash === '') {
      location.hash = '/'
    } else {
      hashchange()
    }
  }

  function hashchange () {
    var url = new URL('http://localhost' + location.hash.substr(1))
    var request = {
      method: 'GET',
      path: url.pathname,
      get: toObject(url.searchParams),
      post: {}
    }
    if (post !== undefined) {
      Object.assign(request, {
        method: 'POST',
        post: post
      })
      post = undefined
    }
    var responder = responders.find(function (responder) {
      return responder.accept(request)
    })
    if (responder) {
      document.body.innerHTML = responder.respond(request)
    }
  }

  function submit (e) {
    var form = e.target
    var action = form.getAttribute('action')
    if (action && action.substr(0, 2) === '#/') {
      var url = new URL('http://localhost' + action.substr(1))
      var data = new FormData(form)
      if (form.method === 'get') {
        data.forEach(function (value, key) {
          url.searchParams.append(key, value)
        })
      } else {
        post = toObject(data)
      }
      var hash = '#' + url.pathname + url.search
      if (location.hash !== hash) {
        if (post !== undefined) {
          location.replace(hash)
        } else {
          location.hash = hash
        }
      } else {
        hashchange()
      }
      e.preventDefault()
    }
  }

  function toObject (data) {
    return Array.from(data).reduce(function (object, entry) {
      var key = entry[0]
      var value = entry[1]
      if (object.hasOwnProperty(key)) {
        if (!Array.isArray(object[key])) {
          object[key] = [object[key]]
        }
        object[key].push(value)
      } else {
        object[key] = value
      }
      return object
    }, {})
  }

  return function (method, path, callback) {
    responders.push({
      accept: function (request) {
        return request.method === method && request.path === path
      },
      respond: callback
    })
  }
}()
