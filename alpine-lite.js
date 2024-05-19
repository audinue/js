addEventListener("DOMContentLoaded", () => {
  let assignProxy = (proxy, source) => {
    for (let key in Object.getOwnPropertyDescriptors(source)) {
      Object.defineProperty(proxy, key, {
        get() {
          return source[key];
        },
        set(value) {
          source[key] = value;
        },
      });
    }
  };

  let createProxy = (parent, child) => {
    let proxy = {};
    assignProxy(proxy, parent);
    assignProxy(proxy, child);
    return proxy;
  };

  let eval = (expression, scope) =>
    new Function("scope", `with(scope)return(${expression})`)(scope);

  let assertTemplate = (element, name) => {
    if (element.localName !== "template") {
      throw new Error(`Template element is required for ${name}.`);
    }
    if (element.content.children.length !== 1) {
      throw new Error(`Template must have exactly 1 child element.`);
    }
  };

  let createCopy = (template) => {
    let copy = template.content.children[0].cloneNode(true);
    copy.isCopy = true;
    return copy;
  };

  let render = (element, scope) => {
    for (let { name, value } of element.attributes) {
      // --------- x-text ---------
      if (name === "x-text") {
        element.textContent = eval(value, scope);
      }
      // --------- x-html ---------
      if (name === "x-html") {
        element.innerHTML = eval(value, scope);
      }
      // --------- x-show ---------
      if (name === "x-show") {
        element.hidden = !eval(value, scope);
      }
      // --------- x-on ---------
      if (name.startsWith("x-on:") || name.startsWith("@")) {
        let match = name.match(/^(?:x-on:|@)(.+?)$/);
        element[`on${match[1]}`] = new Function(
          "scope",
          `return function(){with(scope){${value}}tick()}`
        )(scope);
      }
      // --------- x-model ---------
      if (name === "x-model") {
        element.value = eval(value, scope);
        element.oninput = new Function(
          "scope",
          `return function(){with(scope){${value}=this.value}tick()}`
        )(scope);
      }
      // --------- x-bind ---------
      if (name.startsWith("x-bind:") || name.startsWith(":")) {
        let match = name.match(/^(?:x-bind:|:)(.+?)$/);
        let key = match[1];
        if (/^(value|checked|selected)$/.test(key)) {
          element[key] = eval(value, scope);
        } else if (key === "class") {
          let className = eval(value, scope);
          if (typeof className === "object") {
            for (let key in className) {
              if (className[key]) {
                element.classList.add(key);
              } else {
                element.classList.remove(key);
              }
            }
          } else {
            //TODO Implement additional class names.
          }
        } else {
          element.setAttribute(key, eval(value, scope));
        }
      }
      // --------- x-data ---------
      if (name === "x-data") {
        if (!element.data) {
          let data = eval(value, scope);
          if (data.init) {
            data.init();
          }
          element.data = data;
        }
        scope = createProxy(scope, element.data);
      }
      // --------- x-if ---------
      if (name === "x-if") {
        assertTemplate(element, name);
        if (eval(value, scope)) {
          if (!element.copy || !element.copy.parentNode) {
            element.copy = createCopy(element);
            element.before(element.copy);
          }
          render(element.copy, scope);
        } else {
          if (element.copy) {
            element.copy.remove();
            delete element.copy;
          }
        }
      }
      // --------- x-for ---------
      if (name === "x-for") {
        assertTemplate(element, name);
        let match;
        let forValue;
        let forIndex = "index";
        let forExpression;
        match = value.match(/^\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)\s*in\s+(.+?)\s*$/);
        if (match) {
          forValue = match[1];
          forIndex = match[2];
          forExpression = match[3];
        } else {
          match = value.match(/^\s*(.+?)\s+in\s+(\d+)\s*$/);
          if (match) {
            forValue = match[1];
            forExpression = `[...Array(${match[2]})].map((x,i)=>i+1)`;
          } else {
            match = value.match(/^\s*(.+?)\s+in\s+(.+?)\s*$/);
            if (match) {
              forValue = match[1];
              forExpression = match[2];
            } else {
              throw new Error(`Invalid x-for.`);
            }
          }
        }
        if (
          !element.copies ||
          element.copies.some((copy) => !copy.parentNode)
        ) {
          element.copies = eval(forExpression, scope).map(
            (copyValue, copyIndex) => {
              let copy = createCopy(element);
              render(
                copy,
                createProxy(scope, {
                  [forValue]: copyValue,
                  [forIndex]: copyIndex,
                })
              );
              return copy;
            }
          );
          element.before(...element.copies);
        } else {
          let array = eval(forExpression, scope);
          let current = element.copies.length;
          let next = array.length;
          if (current < next) {
            for (let i = current; i < next; i++) {
              let copy = createCopy(element);
              render(
                copy,
                createProxy(scope, {
                  [forValue]: array[i],
                  [forIndex]: i,
                })
              );
              element.copies.push(copy);
              element.before(copy);
            }
          }
          if (next < current) {
            element.copies.splice(next).forEach((copy) => copy.remove());
          }
          for (let i = Math.min(current, next) - 1; i > -1; i--) {
            render(
              element.copies[i],
              createProxy(scope, {
                [forValue]: array[i],
                [forIndex]: i,
              })
            );
          }
        }
      }
    }
    for (let i = element.children.length - 1; i > -1; i--) {
      let child = element.children[i];
      if (!child.isCopy) {
        render(child, scope);
      }
    }
  };

  let tick = (window.tick = () => {
    let nextTicks = [];
    render(document.body, { $nextTick: (f) => nextTicks.push(f) });
    nextTicks.forEach((nextTick) => nextTick());
  });

  tick();
});
