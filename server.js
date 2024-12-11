export class Request {
  constructor(url, { method = "GET", body = null, state = "push" } = {}) {
    this.method = method;
    this.url = url;
    this.body = body;
    this.state = state;
  }
}

export class Response {
  constructor(body, { url = null, state = null, location = null } = {}) {
    this.body = body;
    this.url = url;
    this.state = state;
    this.location = location;
  }
  static redirect(location) {
    return new Response(null, { location });
  }
}

export const serve = (options) => {
  const isTargetingSelf = (element) =>
    element.target === "" || element.target === "_self";
  const useHash = () => options.hash || origin() === "file://";
  const hashPath = () => (location.hash ? location.hash.substring(1) : "/");
  const origin = () => document.location.origin;
  const currentUrl = () =>
    useHash() ? new URL(hashPath(), origin()) : new URL(location.href);
  const navigateUrl = (url) => new URL(url, currentUrl());
  const stateUrl = (url) => (useHash() ? "#" + new URL(url).pathname : url);
  const isSameOrigin = (url) => url.origin === origin();
  const listeners = [];
  const listen = (type, callback) => {
    addEventListener(type, callback);
    listeners.push([type, callback]);
  };
  const fetch = async (request) => {
    const response = await options.fetch(request);
    if (response.location) {
      return fetch(
        new Request(new URL(response.location, request.url), {
          state: request.state,
        })
      );
    }
    return new Response(response.body, {
      url: stateUrl(request.url),
      state: request.state,
    });
  };
  const initialize = () => {
    const root = document.querySelector(options.root ?? "body");
    const navigate = async (request) => {
      try {
        root.classList.add("loading");
        const { body, url } = await fetch(request);
        root.innerHTML = body;
        if (request.state === "replace") {
          history.replaceState(body, "", url);
        } else {
          history.pushState(body, "", url);
        }
      } finally {
        root.classList.remove("loading");
      }
    };
    const navigateOnLoad = () =>
      navigate(new Request(currentUrl(), { state: "replace" }));
    const navigateOnClick = (event) => {
      const element = event.target;
      if (element.nodeName !== "A") {
        return;
      }
      if (!isTargetingSelf(element)) {
        return;
      }
      const href = element.getAttribute("href");
      if (href === null) {
        return;
      }
      const url = navigateUrl(href);
      if (!isSameOrigin(url)) {
        return;
      }
      event.preventDefault();
      navigate(new Request(url));
    };
    const navigateOnSubmit = (event) => {
      const element = event.target;
      if (!isTargetingSelf(element)) {
        return;
      }
      const url = navigateUrl(element.getAttribute("action") ?? "");
      if (!isSameOrigin(url)) {
        return;
      }
      event.preventDefault();
      const body = new FormData(element, event.submitter);
      if (element.method === "get") {
        for (const [name, value] of body) {
          url.searchParams.set(name, value);
        }
        navigate(new Request(url));
        return;
      }
      navigate(new Request(url, { method: "POST", body }));
    };
    const navigateOnHashChange = () => {
      if (history.state !== null) {
        return;
      }
      navigateOnLoad();
    };
    const popState = (event) => {
      if (event.state === null) {
        return;
      }
      root.innerHTML = event.state;
      if (options.revalidate) {
        navigateOnLoad();
      }
    };
    listen("click", navigateOnClick);
    listen("submit", navigateOnSubmit);
    listen("hashchange", navigateOnHashChange);
    listen("popstate", popState);
    navigateOnLoad();
  };
  if (document.readyState === "loading") {
    listen("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
  return {
    fetch(...args) {
      return fetch(new Request(...args));
    },
    navigate(...args) {
      return navigate(new Request(...args));
    },
    dispose() {
      for (const [type, callback] of listeners) {
        removeEventListener(type, callback);
      }
    },
  };
};
