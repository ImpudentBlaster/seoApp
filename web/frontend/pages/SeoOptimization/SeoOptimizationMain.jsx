import React, { useState, useEffect } from "react";
import { Page, Card, Tabs, IndexTable, Button, TextField, Stack } from "@shopify/polaris";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import SeoOptimizationButton from "./SeoOptimizationButton";
import '../OnPageSeoAudit/OnPageSeoAudit.css'

const SeoOptimizationMain = () => {
  console.log("SeoOptimizationMain.jsx");
  const [totalPages, setTotalPages] = useState(0);
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [auditData, setAuditData] = useState({
    home: [],
    products: [],
    collections: [],
    blogs: [],
    others: [],
  });
  const urlParams = new URLSearchParams(window.location.search);
  const storeName = urlParams.get('shop');

  const TABS = [
    { id: "home", content: "Home", badge: auditData.home.length },
    { id: "products", content: "Products", badge: auditData.products.length },
    { id: "collections", content: "Collections" },
    { id: "blogs", content: "Blogs", badge: auditData.blogs.length },
    { id: "others", content: "Others", badge: auditData.others.length },
  ];

  useEffect(() => {
    const fetchData = async (shop) => {
      try {
        const response = await axios.get(`/api/seoAudit?shop=${shop}`);
        const data = response.data;
        console.log(data, "Fetched audit data");
        setAuditData({
          home: [{ pageUrl: "https://demosaurav.myshopify.com/", title: "HomePage" }],
          products: data.products || [],
          collections: data.collections || [],
          blogs: data.blogs || [],
          others: data.pages || [],
        });
        setTotalPages(data.totalPages + 1);
      } catch (error) {
        console.error("Failed to fetch audit data", error);
      }
    };

    fetchData(storeName);
  }, []);

  const handleTabChange = (selectedTabIndex) => setSelectedTab(selectedTabIndex);

  const filteredData = auditData[TABS[selectedTab].id].filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderAuditTable = (sectionData) => {
    return (
      <IndexTable
        resourceName={{ singular: "audit", plural: "audits" }}
        itemCount={sectionData.length}
        headings={[{ title: "Page" }, { title: "Status" }, { title: "Actions" }]}
        selectable={false}
      >
        {sectionData.map(({ id, title, handle, pageUrl }) => (
          <IndexTable.Row id={id} key={id}>
            <IndexTable.Cell>
              <Button plain>
                <a
                  style={{ textDecoration: "none" }}
                  target="_blank"
                  rel="noopener noreferrer"
                  href={pageUrl}
                >
                  {title}
                </a>
              </Button>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <p
                style={{
                  backgroundColor: "rgba(0, 245, 128, 0.8)",
                  width: "fit-content",
                  padding: "0.25rem 0.4rem",
                  borderRadius: "0.75rem",
                }}
              >
                selected
              </p>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <SeoOptimizationButton productId={id} /> {/* Pass productId here */}
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>
    );
  };

  const handleBack = () => {
    navigate(`/MetaOptimization?shop=${storeName}`);
  };

  return (
    <Page
      title="Meta"
      backAction={{ content: 'Products', onAction: handleBack }}
    >
      <Stack alignment="center" spacing="tight" distribution="equalSpacing">
        <Tabs tabs={TABS} selected={selectedTab} onSelect={handleTabChange} />
        <TextField
          placeholder="Search"
          value={searchTerm}
          onChange={setSearchTerm}
          style={{ width: '200px' }}
        />
      </Stack>
      <Card sectioned>
        {renderAuditTable(filteredData)}
      </Card>
    </Page>
  );
};

export default SeoOptimizationMain;
