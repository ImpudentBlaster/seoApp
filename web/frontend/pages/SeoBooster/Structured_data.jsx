import React, { useEffect, useState } from "react";
import {
  Banner,
  Page,
  LegacyCard,
  Grid,
  Stack,
  Button,
  Divider,
  Checkbox,
  Spinner,
} from "@shopify/polaris";
import "./ProductShippingForm.css";
import { useNavigate } from "react-router-dom";

const calloutCards = [
  // Sample data for the cards
  {
    title: "Collections",
    illustration:
      "https://d25xupuijjr19x.cloudfront.net/assets/business.88d77363.png",
    url: "/LocalBusinessForm",
    schemaKey: "collection_isEnabled",
    description:
      "With Local Business structured data, you can tell Google about your business hours, different departments within a business, reviews for your business, and more.",
    insertAPI: "/api/insert-collection-schema/",
    removeAPI: "/api/remove-collection-schema/",
  },

  {
    title: "Organization",
    illustration:
      "https://d25xupuijjr19x.cloudfront.net/assets/product.8a90433f.png",
    url: "#",
    schemaKey: "organization_isEnabled",
    description:
      "You can use organization structured data to let Google know about your organization's administrative details, for example, logo, address, contact information, and business identifiers.",
    insertAPI: "/api/insert-organization-schema/",
    removeAPI: "/api/remove-organization-schema/",
  },
  {
    title: "Breadcrumb",
    illustration:
      "https://d25xupuijjr19x.cloudfront.net/assets/breadcrumb.e8a1d2f3.png",
    url: "#",
    schemaKey: "breadcrumb_isEnabled",
    description:
      "Google Search uses breadcrumb markup in the body of a web page to categorize the information from the page in search results.",
    insertAPI: "/api/insert-breadcrumb-schema/",
    removeAPI: "/api/remove-breadcrumb-schema/",
  },
  {
    title: "Video",
    illustration:
      "https://d25xupuijjr19x.cloudfront.net/assets/video.0c69d1ca.png",
    url: "#",
    schemaKey: "video_isEnabled",
    description:
      "Google Search is an entry point for people to discover and watch videos. Videos can appear in Google Search results, video search results, Google Images, and Google Discover.",
    insertAPI: "/api/insert-video-schema/",
    removeAPI: "/api/remove-video-schema/",
  },
  {
    title: "Product",
    illustration:
      "https://d25xupuijjr19x.cloudfront.net/assets/product.8a90433f.png",
    url: "/ProductShippingForm",
    schemaKey: "isEnabled",
    description:
      "When you add Product structured data, Google search results can show product information in richer ways.",
    insertAPI: "/api/update/",
    removeAPI: "/api/remove-schema/",
  },
  {
    title: "Article",
    illustration:
      "https://d25xupuijjr19x.cloudfront.net/assets/article.d7e9b992.png",
    url: "#",
    schemaKey: "article_isEnabled",
    description:
      "Adding Article structured data can help Google understand more about the web page and show better title text, images, and date information.",
    insertAPI: "/api/insert-article-schema/",
    removeAPI: "/api/remove-article-schema/",
  },
  {
    title: "Search box & Site name",
    illustration:
      "https://d25xupuijjr19x.cloudfront.net/assets/link.58def06e.png",
    url: "#",
    schemaKey: "searchbox_isEnabled",
    description:
      "A search box is a quick way for people to search your site or app immediately on the search results page.",
    insertAPI: "/api/insert-searchbox-sitename-schema/",
    removeAPI: "/api/remove-searchbox-sitename-schema/",
  },
  {
    title: "Recipe",
    illustration:
      "https://d25xupuijjr19x.cloudfront.net/assets/recipe.541a8fbd.png",
    url: "#",
    schemaKey: "recipe_isEnabled",
    description:
      "Help users find your recipe content by telling Google about your recipe with structured data.",
    insertAPI: "/api/insert-recipe-schema/",
    removeAPI: "/api/remove-recipe-schema/",
  },
  // Add other schemas similarly here
];

export default function StructuredDataPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/SeoBooster/SEO_Booster");
  };

  return (
    <Page
      title="Structured data/Google schemas/rich snippets/JSON-LD"
      backAction={{ content: "Products", onAction: handleBack }}
    >
      <div className="banner_container">
        <Banner
          title="You need to enable this setting first"
          onDismiss={() => {}}
        >
          <p>Please go to Theme Settings and enable Tapita SEO & Speed</p>
          <Button>Enable</Button>
        </Banner>
      </div>
      <div className="grid_container">
        <Grid>
          {calloutCards.map((card, index) => (
            <Grid.Cell key={index} columnSpan={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
              <LegacyCard sectioned>
                <Stack vertical spacing="tight">
                  <Stack distribution="equalSpacing" alignment="center">
                    <h2 className="custom-heading">{card.title}</h2>
                    <img
                      alt={card.title}
                      src={card.illustration}
                      style={{ width: "40px", height: "40px" }}
                    />
                  </Stack>
                  <DescriptionWithToggle description={card.description} />
                  <Divider
                    borderColor="border"
                    style={{ borderWidth: "10px" }}
                  />
                  <ToggleConfigButton card={card} />
                </Stack>
              </LegacyCard>
            </Grid.Cell>
          ))}
        </Grid>
      </div>
    </Page>
  );
}

const DescriptionWithToggle = ({ description }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const charLimit = 154;
  const wordLimit = 24;

  const isTruncated =
    description.length > charLimit || description.split(" ").length > wordLimit;

  const truncatedDescription = isTruncated
    ? truncateText(description, charLimit, wordLimit)
    : description;

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <div>
      <p>{isExpanded ? description : truncatedDescription}</p>
      {isTruncated && (
        <Button plain onClick={toggleExpand}>
          {isExpanded ? "🔽" : "🔼"}
        </Button>
      )}
    </div>
  );
};

const truncateText = (text, charLimit, wordLimit) => {
  const words = text.split(" ");
  if (text.length > charLimit) {
    return text.substring(0, charLimit) + "...";
  } else if (words.length > wordLimit) {
    return words.slice(0, wordLimit).join(" ") + "...";
  }
  return text;
};

const ToggleConfigButton = ({ card }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shopName, setShopName] = useState(null);

  // Initial load to get the shop name and schema state
  useEffect(() => {
  
    const urlParams = new URLSearchParams(window.location.search);
    const extractedShopName = urlParams.get("shop");

    if (extractedShopName) {
      setShopName(extractedShopName);
      fetchEnabledState(extractedShopName);
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch initial state from API
  const fetchEnabledState = async (shopName) => {
    try {
      const response = await fetch(
        `https://server-page-xo9v.onrender.com/check-state/${shopName}`
      );
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setIsEnabled(data.shop[card.schemaKey] === "true");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // // Handle enabling or disabling schema
  // const handleToggle = async () => {
  //   setLoading(true);
  //   try {
  //     const newEnabledState = !isEnabled;
  //     setIsEnabled(newEnabledState);

  //     const apiEndpoint = newEnabledState ? card.insertAPI : card.removeAPI;
  //     const response = await fetch(`${apiEndpoint}${shopName}`, { method: "POST" });
  //     console.log(response);
  //     if (!response.ok) throw new Error("Failed to update schema state");

  //     // Update localStorage
  //     localStorage.setItem(`${card.schemaKey}-${shopName}`, JSON.stringify(newEnabledState));
  //   } catch (error) {
  //     console.error("Error updating schema state:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleToggle = async () => {
    setLoading(true);
    try {
      const newEnabledState = !isEnabled;
      setIsEnabled(newEnabledState);

      // Call the appropriate insert or remove API
      const apiEndpoint = newEnabledState ? card.insertAPI : card.removeAPI;
      console.log(apiEndpoint)
      const response = await fetch(`${apiEndpoint}${shopName}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to update schema state");

      // Additional API call to update the state
      const updateStateResponse = await fetch(
        `https://server-page-xo9v.onrender.com/update-state/${shopName}/${card.schemaKey}/${newEnabledState}`,
        { method: "POST" }
      );
      if (!updateStateResponse.ok) {
        throw new Error("Failed to update the state via update-state API");
      }

      // Update localStorage after both APIs succeed
      localStorage.setItem(
        `${card.schemaKey}-${shopName}`,
        JSON.stringify(newEnabledState)
      );
    } catch (error) {
      console.error("Error updating schema state:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner size="small" />;
  if (error) return <div>Error: {error}</div>;

  return (
    <Stack distribution="equalSpacing" alignment="center">
      <Checkbox
        checked={isEnabled}
        onChange={handleToggle}
        label="Enable access"
      />
    </Stack>
  );
};
