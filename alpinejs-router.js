let useHash =
  document.currentScript.hasAttribute("usehash") ||
  location.origin === "file://";

addEventListener("alpine:init", () => {
  let updateURL = () => {
    router.url = useHash
      ? new URL(location.hash.substring(1), location.origin)
      : new URL(location.href);
    router.params = undefined;
  };
  let pathToRegex = (path) => {
    return new RegExp(
      `^${path
        .replace(/\//g, "\\$&")
        .replace(/:([^\/]+)/g, "(?<$1>[^/]+)")
        .replace(/\*(.+)/, "(?<$1>.*)")
        .replace(/\*/, "(.*?)")}$`
    );
  };
  let match = (path) => {
    let match = pathToRegex(path).exec(router.url.pathname);
    if (match) {
      return (router.params = match.groups ?? {});
    }
  };
  let statePath = (path) => {
    return useHash ? "#" + path : path;
  };
  let push = (path) => {
    history.pushState(null, "", statePath(path));
    updateURL();
  };
  let replace = (path) => {
    history.replaceState(null, "", statePath(path));
    updateURL();
  };
  let router = Alpine.reactive({
    url: new URL(location.href),
    params: undefined,
    push,
    replace,
  });
  Alpine.magic("router", () => router);
  addEventListener("popstate", updateURL);
  addEventListener("hashchange", updateURL);
  Alpine.directive(
    "route",
    (element, { modifiers, expression }, { Alpine, effect, cleanup }) => {
      let {
        addScopeToNode,
        mutateDom,
        skipDuringClone,
        initTree,
        destroyTree,
      } = Alpine;
      effect(() => {
        if (
          modifiers.includes("404")
            ? router.params === undefined
            : match(expression)
        ) {
          if (element._x_currentRouteEl) {
            return element._x_currentRouteEl;
          }
          let clone = element.content.cloneNode(true).firstElementChild;
          addScopeToNode(clone, {}, element);
          mutateDom(() => {
            element.after(clone);
            skipDuringClone(() => initTree(clone))();
          });
          element._x_currentRouteEl = clone;
          element._x_undoRoute = () => {
            mutateDom(() => {
              destroyTree(clone);
              clone.remove();
            });
            delete element._x_currentRouteEl;
          };
        } else {
          if (!element._x_undoRoute) {
            return;
          }
          element._x_undoRoute();
          delete element._x_undoRoute;
        }
      });
      cleanup(() => {
        if (element._x_undoIf) {
          element._x_undoIf();
        }
      });
    }
  );
  Alpine.directive("link", (element, { modifiers }, { cleanup }) => {
    let click = (e) => {
      e.preventDefault();
      let path = element.getAttribute("href");
      if (modifiers.includes("replace")) {
        replace(path);
      } else {
        push(path);
      }
    };
    element.addEventListener("click", click);
    cleanup(() => {
      element.removeEventListener("click", click);
    });
  });
  if (useHash && !location.hash) {
    location.replace("#/");
  }
  updateURL();
});
