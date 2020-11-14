export let ready = new Promise(
  resolve =>
    document.readyState !== 'loading'
      ? resolve()
      : document.addEventListener('DOMContentLoaded', resolve)
)
