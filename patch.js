function patch (current, next) {
  if (current.isEqualNode(next)) {
    return
  }
  if (current.nodeName !== next.nodeName) {
    current.parentNode.replaceChild(current, next)
    return
  }
  if (current.nodeType === 3) {
    if (current.data !== next.data) {
      current.data = next.data
    }
    return
  }
  if (current.nodeType === 1) {
    for (var i = 0; i < next.attributes.length; i++) {
      var attribute = next.attributes[i]
      if (current.getAttribute(attribute.name) !== attribute.value) {
        current.setAttribute(attribute.name, attribute.value)
      }
    }
    for (var i = current.attributes.length - 1; i > -1; i--) {
      var attribute = current.attributes[i]
      if (!next.hasAttribute(attribute.name)) {
        current.removeAttributeNode(attribute)
      }
    }
    if (current.checked !== next.checked) {
      current.checked = next.checked
    }
    if (current.value !== next.value) {
      current.value = next.value
    }
    var currentLength = current.childNodes.length
    var nextLength = next.childNodes.length
    if (currentLength < nextLength) {
      for (var i = currentLength; i < nextLength; i++) {
        current.appendChild(next.childNodes[currentLength])
      }
    } else if (nextLength < currentLength) {
      for (var i = nextLength; i < currentLength; i++) {
        current.removeChild(current.childNodes[nextLength])
      }
    }
    for (var i = 0; i < Math.min(currentLength, nextLength); i++) {
      patch(current.childNodes[i], next.childNodes[i])
    }
    return
  }
  throw new Error('Unsupported node')
}
