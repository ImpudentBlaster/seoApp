import { Routes as ReactRouterRoutes, Route } from "react-router-dom";
import SingleUrlSeoSummary from "./pages/SingleUrlSeoSummary/SingleUrlSeoSummary";
import HomePageMain from './pages/HomePage/HomePageMain'
import OnPageSeoAudit from "./pages/OnPageSeoAudit/OnPageSeoAudit";
import StructuredDataPage from "./pages/SeoBooster/Structured_data";
import SeoOptimizationMain from "./pages/SeoOptimization/SeoOptimizationMain";
import SEO_Booster from "./pages/SeoBooster/SEO_Booster";
import MetaOptimization from "./pages/MetaOptimization/MetaOptimization";

/**
 * File-based routing.
 * @desc File-based routing that uses React Router under the hood.
 * To create a new route create a new .jsx file in `/pages` with a default export.
 *
 * Some examples:
 * * `/pages/index.jsx` matches `/`
 * * `/pages/blog/[id].jsx` matches `/blog/123`
 * * `/pages/[...catchAll].jsx` matches any URL not explicitly matched
 *
 * @param {object} pages value of import.meta.glob(). See https://vitejs.dev/guide/features.html#glob-import
 *
 * @return {Routes} `<Routes/>` from React Router, with a `<Route/>` for each file in `pages`
 */
export default function Routes({ pages }) {
  const routes = useRoutes(pages);
  const routeComponents = routes.map(({ path, component: Component }) => (
    <Route key={path} path={path} element={<Component />} />
  ));

  const NotFound = routes.find(({ path }) => path === "/notFound").component;

  return (
    <ReactRouterRoutes>
      {routeComponents}
      <Route path="*" element={<NotFound />} />
      <Route path="/HomePageMain" element={<HomePageMain/>}/>
      <Route path="/SingleUrlSeoSummary" element={<SingleUrlSeoSummary/>}/>
      <Route path="/OnPageSeoAudit/OnPageSeoAudit" element={<OnPageSeoAudit/>}/>
      <Route path="/Structured_data" element={<StructuredDataPage/>}/>
      <Route path="/SeoOptimization" element={<SeoOptimizationMain/>}/>
      <Route path="/SeoBooster/SEO_Booster" element={<SEO_Booster/>}/>
      <Route path="/MetaOptimization" element={<MetaOptimization/>}/>
    </ReactRouterRoutes>
  );
}

function useRoutes(pages) {
  const routes = Object.keys(pages)
    .map((key) => {
      let path = key
        .replace("./pages", "")
        .replace(/\.(t|j)sx?$/, "")
        /**
         * Replace /index with /
         */
        .replace(/\/index$/i, "/")
        /**
         * Only lowercase the first letter. This allows the developer to use camelCase
         * dynamic paths while ensuring their standard routes are normalized to lowercase.
         */
        .replace(/\b[A-Z]/, (firstLetter) => firstLetter.toLowerCase())
        /**
         * Convert /[handle].jsx and /[...handle].jsx to /:handle.jsx for react-router-dom
         */
        .replace(/\[(?:[.]{3})?(\w+?)\]/g, (_match, param) => `:${param}`);

      if (path.endsWith("/") && path !== "/") {
        path = path.substring(0, path.length - 1);
      }

      if (!pages[key].default) {
        console.warn(`${key} doesn't export a default React component`);
      }

      return {
        path,
        component: pages[key].default,
      };
    })
    .filter((route) => route.component);

  return routes;
}
