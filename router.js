import { serve, Response } from "./server.js";

const compile = (routes) =>
  routes.map((route) => ({
    loader() {},
    page() {},
    action() {},
    async respond({ request, ...more }) {
      if (request.method === "POST") {
        return this.action({ request, ...more });
      }
      return this.page({
        request,
        ...more,
        data: await this.loader(),
      });
    },
    ...route,
    regExp: new RegExp(
      `^${route.path
        .replace(/\//g, "\\$&")
        .replace(/\[(.+?)\]/g, "(?<$1>[^/]+)")}$`
    ),
  }));

export const route = (options) => {
  const routes = { value: [] };
  const reset = (value) => {
    routes.value = compile([
      ...value,
      {
        path: "/404",
        page({ request }) {
          return `<pre>Unable to ${request.method} ${request.url.pathname}</pre>`;
        },
      },
      {
        path: "/500",
        page({ error }) {
          console.error(error);
          return `<pre>${error.stack}</pre>`;
        },
      },
    ]);
  };
  const findEqual = (path) => routes.value.find((route) => route.path === path);
  const respond = async (request) => {
    const context = { request };
    try {
      for (const route of routes.value) {
        const match = route.regExp.exec(request.url.pathname);
        if (match) {
          return await route.respond({ ...context, params: match.groups });
        }
      }
      return await findEqual("/404").respond(context);
    } catch (error) {
      return await findEqual("/500").respond({ ...context, error });
    }
  };
  reset(options.routes);
  return {
    reset,
    server: serve({
      ...options,
      async fetch(request) {
        const response = await respond(request);
        if (response instanceof Response) {
          return response;
        }
        return new Response(response);
      },
    }),
  };
};

export * from "./server.js";
