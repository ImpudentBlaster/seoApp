import { BrowserRouter } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NavMenu } from "@shopify/app-bridge-react";
import Routes from "./Routes";
import { ContextProvider } from "./components/DataContext";
import { QueryProvider, PolarisProvider } from "./components";

export default function App() {
  // Any .tsx or .jsx files in /pages will become a route
  // See documentation for <Routes /> for more info
  const pages = import.meta.glob("./pages/**/!(*.test.[jt]sx)*.([jt]sx)", {
    eager: true,
  });
  const { t } = useTranslation();

  return (
    <PolarisProvider>
      <BrowserRouter>
        <QueryProvider>
          <ContextProvider>

          <NavMenu>
            
            <a href="/HomePage/HomePageMain" rel="home">Seo Audit</a>
            <a href="/SeoBooster/SEO_Booster">SEO BOOSTER</a>
            <a href="/SeoOptimization/SeoOptimizationMain">SEO Optimization</a>
          </NavMenu>
          <Routes pages={pages} />
          </ContextProvider>
        </QueryProvider>
      </BrowserRouter>
    </PolarisProvider>
  );
}
