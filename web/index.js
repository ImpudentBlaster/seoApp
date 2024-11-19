import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import sqlite3 from "sqlite3";
import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";
import axios from "axios";
import cors from "cors";
import mongoose from "mongoose";
import mongodb from "mongodb";
import cron from "node-cron";

console.log(process.env)

mongoose
  .connect(
    "mongodb+srv://spuspam111:Sp123456@cluster0.0taaaup.mongodb.net/scripttag?retryWrites=true&w=majority"
  )
  .then(() => console.log("connected"))
  .catch((err) => console.log("not connected"));
const scriptUrl = "https://server-page-xo9v.onrender.com/newschema-script.js";
const Shop = mongoose.model(
  "Shop",
  new mongoose.Schema({
    shop: { type: String, required: true, unique: true },
    accessToken: { type: String, required: true },
    isEnabled: { type: String, default: "false" },
    collection_isEnabled: { type: String, default: "false" },
    article_isEnabled: { type: String, default: "false" },
    organization_isEnabled: { type: String, default: "false" },
    breadcrumb_isEnabled: { type: String, default: "false" },
    video_isEnabled: { type: String, default: "false" },
    searchbox_isEnabled: { type: String, default: "false" },
    recipe_isEnabled: { type: String, default: "false" },
  })
);

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);
console.log(
  `server is running at ${
    process.env.BACKEND_PORT || process.env.PORT || "3000"
  }`
);
const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();
app.use(cors());
const DB_PATH = `${process.cwd()}/database.sqlite`;
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);
app.use(express.json());
/////-----API to get every page-----/////
app.get("/api/seoAudit", async (req, res) => {
  const arrayOfPages = ["products", "custom_collections", "blogs", "pages"];

  try {
    const shopData = await accessToken(req.query.shop);
    console.log(shopData);
    const promises = arrayOfPages.map((url) =>
      getUrlData(url, shopData.shop, shopData.accessToken)
    );
    const result = await Promise.all(promises);

    const structuredResult = {
      products: result[0],
      collections: result[1],
      blogs: result[2],
      pages: result[3],
    };

    const count =
      structuredResult.products[0].count +
      structuredResult.blogs[0].count +
      structuredResult.collections[0].count +
      structuredResult.pages[0].count;
    res.send({ ...structuredResult, totalPages: count });
  } catch (error) {
    res.status(500).send("Failed to fetch data");
  }
});

async function postdata(req, res) {

  const DB_PATH = `${process.cwd()}/database.sqlite`;

  const db = new sqlite3.Database(DB_PATH);

  db.all("SELECT shop, accessToken FROM shopify_sessions", async (err, rows) => {
    if (err) {
      console.log('Failed to retrieve store tokens from SQLite:', err);
      return;
    }

    try {
      // Iterate through each shop from SQLite
      for (const row of rows) {
        const existingShop = await Shop.findOne({ shop: row.shop });

        // If shop is not found in MongoDB, add it
        if (!existingShop) {
          const newShop = new Shop({
            shop: row.shop,
            accessToken: row.accessToken,
          });
          await newShop.save();
          // res.status(200).send(`Stored new shop: ${row.shop}`);
        }
        // } else {
        //   console.log(`Shop ${row.shop} already exists in MongoDB`);
        //   // res.status(200).send(`Shop ${row.shop} already exists in MongoDB`);
        // }
      }
    } catch (error) {
      res.status(500).send('Error storing shops in MongoDB:', error);
    } finally {
      // Close the SQLite connection
      db.close();
    }
  });
}


app.post('/api/store', postdata);


cron.schedule("* * * * * *", () => {
  // console.log("Running scheduled task to create script tags for all stores every second");
  // createScriptTagsForAllStores();
  postdata();
});

async function getUrlData(urlEndpoint, shop, accessToken) {
  try {
    console.log(urlEndpoint, shop, accessToken);
    const pagesResponse = await axios.get(
      `https://${shop}/admin/api/2024-10/${urlEndpoint}.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );
    const result = await Promise.all(
      pagesResponse.data[urlEndpoint].map(async (item) => {
        const pageUrl =
          urlEndpoint === "custom_collections"
            ? `https://${shop}/collections/${item.handle}`
            : `https://${shop}/${urlEndpoint}/${item.handle}`;

        return {
          id: item.id,
          handle: item.handle,
          title: item.title,
          pageUrl: pageUrl,
          count: pagesResponse.data[urlEndpoint].length,
        };
      })
    );

    return result;
  } catch (error) {
    console.error(`Error fetching data for ${urlEndpoint}:`, error.message);
    return [];
  }
}
/////-----API to get every page-----/////

/////-----Function to get accessToken and shop-----/////
const accessToken = (shop) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);

    db.all(
      "SELECT shop, accessToken FROM shopify_sessions",
      [],
      (err, rows) => {
        if (err) {
          console.error("Failed to retrieve tokens:", err);
          reject({ error: "failed to retrieve tokens" });
        } else {
          const storeToken = rows.find((row) => row.shop === shop);
          resolve(storeToken);
        }
      }
    );

    db.close();
  });
};
/////-----Function to get accessToken and shop-----/////
app.get("/api/getShopData", async (req, res) => {
  try {
    console.log("api/getShopData");
    const data = await accessToken(req.query.shop);
    res.status(200).send(data);
  } catch (error) {
    res.status(404).send(error.message);
  }
});

async function createScriptTagsForAllStores() {
  const db = new sqlite3.Database(DB_PATH);

  db.all(
    "SELECT shop, accessToken FROM shopify_sessions",
    [],
    async (err, rows) => {
      if (err) {
        console.error("Failed to retrieve store tokens:", err);
        return;
      }

      for (const row of rows) {
        const { shop, accessToken } = row;

        try {
          // Step 1: Check for existing script tags
          const existingResponse = await axios.get(
            `https://${shop}/admin/api/2024-10/script_tags.json`,
            {
              headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
              },
            }
          );

          // Step 2: Normalize URLs to avoid duplicates
          const normalizedScriptUrl = new URL(scriptUrl).href;
          const scriptTagExists = existingResponse.data.script_tags.some(
            (tag) => new URL(tag.src).href === normalizedScriptUrl
          );

          if (!scriptTagExists) {
            // Step 3: Create the script tag if it doesn’t exist
            await axios.post(
              `https://${shop}/admin/api/2024-10/script_tags.json`,
              {
                script_tag: {
                  event: "onload",
                  src: scriptUrl,
                },
              },
              {
                headers: {
                  "X-Shopify-Access-Token": accessToken,
                  "Content-Type": "application/json",
                },
              }
            );

            console.log(`Script tag created for store ${shop}`);
          } else {
            console.log(
              `Script tag with the same URL already exists for store ${shop}`
            );
          }
        } catch (error) {
          console.error(
            `Error creating script tag for store ${shop}:`,
            error.message
          );
        }
      }

      db.close();
    }
  );
}
app.get("/api/create-script-tags", async (req, res) => {
  await createScriptTagsForAllStores();
  res.send("Script tags creation triggered manually.");
});

app.get("/admin/api/products/:handle", async (req, res) => {
  const { handle } = req.params;

  // Open the database connection
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error("Failed to connect to the database:", err.message);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Retrieve the store name and access token from the database
  db.get(
    "SELECT shop, accessToken FROM shopify_sessions LIMIT 1",
    async (err, row) => {
      if (err) {
        console.error("Failed to retrieve store tokens:", err.message);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (!row) {
        console.error("No store found in the database.");
        return res.status(404).json({ message: "Store not found" });
      }

      const { shop, accessToken } = row;

      try {
        // Make API request to fetch product details by handle
        const response = await fetch(
          `https://${shop}/admin/api/2024-10/products.json?handle=${handle}`,
          {
            method: "GET",
            headers: {
              "X-Shopify-Access-Token": accessToken,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          // Check if the response was successful
          if (data.products.length > 0) {
            res.json(data.products[0]); // Return the first product
          } else {
            res.status(404).json({ message: "Product not found" });
          }
        } else {
          console.error("Error fetching product from Shopify:", data);
          res
            .status(response.status)
            .json({ message: data.errors || "Error fetching product" });
        }
      } catch (error) {
        console.error("Error fetching product:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
      } finally {
        // Close the database connection
        db.close();
      }
    }
  );
});

// Manually create script tag from postman:

app.get("/api/create-script-tags", async (req, res) => {
  const db = new sqlite3.Database(DB_PATH);

  db.all(
    "SELECT shop, accessToken FROM shopify_sessions",
    [],
    async (err, rows) => {
      if (err) {
        console.error("Failed to retrieve store tokens:", err);
        return res
          .status(500)
          .json({ error: "Failed to retrieve store tokens" });
      }

      const results = [];

      for (const row of rows) {
        const { shop, accessToken } = row;

        try {
          // Step 1: Check if the script tag already exists
          const existingResponse = await axios.get(
            `https://${shop}/admin/api/2024-10/script_tags.json`,
            {
              headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
              },
            }
          );

          const scriptTagExists = existingResponse.data.script_tags.some(
            (tag) => tag.src === scriptUrl
          );

          if (scriptTagExists) {
            results.push({ shop, status: "Script tag already exists" });
          } else {
            // Step 2: Create a new script tag if it doesn’t exist
            const response = await axios.post(
              `https://${shop}/admin/api/2024-10/script_tags.json`,
              {
                script_tag: {
                  event: "onload",
                  src: scriptUrl,
                },
              },
              {
                headers: {
                  "X-Shopify-Access-Token": accessToken,
                  "Content-Type": "application/json",
                },
              }
            );

            results.push({
              shop,
              status: "Script tag created successfully",
              data: response.data,
            });
          }
        } catch (error) {
          console.error(
            `Error creating script tag for store ${shop}:`,
            error.message
          );
          results.push({
            shop,
            status: "Failed to create script tag",
            error: error.message,
          });
        }
      }

      // Close the database after processing
      db.close();

      // Send the response with all results
      res.status(200).json({ results });
    }
  );
});
app.get("/api/create", async (req, res) => {
  try {
    const response = await axios.post(
      `https://${shopifyStore}.myshopify.com/admin/api/2024-10/script_tags.json`,
      {
        script_tag: {
          event: "onload",
          src: scriptUrl,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Script tag created:", response.data);
    res.status(200).json({
      message: "Script tag created successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("Error creating script tag:", error);
    res.status(500).json({ error: "Failed to create script tag" });
  }
});

// Health check route

app.get("/get-script-tags", async (req, res) => {
  try {
    const response = await axios.get(
      `https://${shopifyStore}.myshopify.com/admin/api/2024-10/script_tags.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    // Check if the script tag exists in the response
    const scriptTagExists = response.data.script_tags.some(
      (tag) => tag.src === scriptUrl
    );

    res.status(200).json({
      message: "Retrieved script tags successfully",
      data: response.data.script_tags,
      scriptTagExists: scriptTagExists,
    });
  } catch (error) {
    console.error("Error retrieving script tags:", error);
    res.status(500).json({ error: "Failed to retrieve script tags" });
  }
});

app.delete("/del-script/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // Send a DELETE request to the Shopify API
    const response = await axios.delete(
      `https://${shopifyStore}.myshopify.com/admin/api/2024-10/script_tags/${id}.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    // Check if the deletion was successful
    if (response.status === 200) {
      return res.status(200).json({
        message: "Script tag deleted successfully",
      });
    } else {
      return res
        .status(response.status)
        .json({ message: "Failed to delete script tag" });
    }
  } catch (error) {
    console.error("Error deleting script tag:", error);
    return res.status(500).json({ error: "Failed to delete script tag" });
  }
});

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

async function getAccessToken(shop) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    db.get(
      "SELECT accessToken FROM shopify_sessions WHERE shop = ?",
      [shop],
      (err, row) => {
        db.close();
        if (err) {
          return reject(err);
        }
        if (row) {
          console.log(row.accessToken);
          resolve(row.accessToken);
        } else {
          reject(new Error(`No access token found for shop: ${shop}`));
        }
      }
    );
  });
}

async function getMainThemeId(shop, accessToken) {
  const themesUrl = `https://${shop}/admin/api/2024-10/themes.json`;

  try {
    const response = await axios.get(themesUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    const themes = response.data.themes;
    const mainTheme = themes.find((theme) => theme.role === "main");
    if (mainTheme) {
      return mainTheme.id;
    } else {
      throw new Error("Main theme not found");
    }
  } catch (error) {
    console.error(
      "Error fetching main theme ID:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// add theme schema in theme.liquid
async function updateThemeLiquid(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    const PRODUCT_SCHEMA = `   
    {{ content_for_header }} 
    {% if template.name == 'product' %}
    <script type="application/ld+json+product">
{
 "@context": "https://schema.org/",
  "@type": "Product",
  "name": "{{ product.title | escape }}",
  "image": [{% for image in product.images %} 
          "{{ image.src }}"{% unless forloop.last %},{% endunless %}
          {% endfor %}],
  "description": "{{ product.description | strip_html | escape }}",
  "sku": "{{ product.variants.first.sku }}",
  "mpn": "54321",
  "brand": {
    "@type": "Brand",
    "name": "{{ shop.name | escape }}"
  },
  "offers": {
    "@type": "Offer",
    "url": "{{ shop.url }}{{ product.url }}",
    "priceCurrency": "{{ shop.currency }}",
    "price": "{{ product.price | divided_by: 100.0 }}",
    "itemCondition": "https://schema.org/NewCondition",
    "india":"Bharath",
    "availability": "https://schema.org/{% if product.available %}InStock{% else %}OutOfStock{% endif %}"
  }
}
</script>
{% endif %}
    `;

    // // Remove any existing <script type="application/ld+json"> block
    // themeLiquidContent = themeLiquidContent.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '');

    // Insert the new PRODUCT_SCHEMA
    const headTag = "</head>";
    themeLiquidContent = themeLiquidContent.replace(
      headTag,
      `${PRODUCT_SCHEMA}\n${headTag}`
    );

    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          // key: 'templates/product.liquid',
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log("Theme updated successfully:", putResponse.data);
  } catch (error) {
    console.error(
      "Error updating theme:",
      error.response?.data || error.message
    );
    throw error;
  }
}

app.post("/api/update/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    await updateThemeLiquid(shop);
    res.status(200).json({ message: "Theme updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating theme", error: error.message });
  }
});

// Function to remove product schema from theme.liquid
async function removeProductSchema(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    // Fetch the current theme.liquid content
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    // Remove any existing <script type="application/ld+json"> block (Product schema)
    const schemaRegex =
      /<script type="application\/ld\+json\+product">[\s\S]*?<\/script>/g;
    themeLiquidContent = themeLiquidContent.replace(schemaRegex, "");

    // Update the theme.liquid content on Shopify
    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          // key: 'sections/main-product.liquid',
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log("Product schema removed successfully:", putResponse.data);
  } catch (error) {
    console.error(
      "Error removing product schema:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Define route handler to remove product schema
app.post("/api/remove-schema/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    // Call the function to remove product schema and wait for it to complete
    await removeProductSchema(shop);
    res.status(200).json({ message: "Product schema removed successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error removing product schema", error: error.message });
  }
});

async function insertCollectionSchema(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    // Fetch the current theme.liquid content
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    // Define the collection schema
    const COLLECTION_SCHEMA = `         
        {% if template contains 'collection' %}

<script type="application/ld+json+collection">
{
  "@context": "https://schema.org/",
  "@type": "Collection",
  "name": "{{ collection.title | escape }}",
  "description": "{{ collection.description | strip_html | escape }}",
  "url": "{{ shop.url }}{{ collection.url }}",
  "image": "{{ collection.image.src | default: shop.logo | escape }}"
}
</script>
{% endif %}

    `;

    // Insert the new COLLECTION_SCHEMA
    const headTag = "</head>";
    const themeLiquidContent1 = themeLiquidContent.replace(
      headTag,
      `${COLLECTION_SCHEMA}\n${headTag}`
    );

    // Update the theme.liquid content on Shopify
    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent1,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log("Collection schema inserted successfully:", putResponse.data);
  } catch (error) {
    console.error(
      "Error inserting collection schema:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Define route handler to insert collection schema
app.post("/api/insert-collection-schema/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    // Call the function to insert collection schema and wait for it to complete
    await insertCollectionSchema(shop);
    res
      .status(200)
      .json({ message: "Collection schema inserted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error inserting collection schema",
      error: error.message,
    });
  }
});

async function removeCollectionSchema(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    // Fetch the current theme.liquid content
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    // Remove any existing <script type="application/ld+json+collection"> block (Collection schema)
    const schemaRegex =
      /<script type="application\/ld\+json\+collection">[\s\S]*?<\/script>/g;
    themeLiquidContent = themeLiquidContent.replace(schemaRegex, "");

    // Update the theme.liquid content on Shopify
    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log("Collection schema removed successfully:", putResponse.data);
  } catch (error) {
    console.error(
      "Error removing collection schema:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Define route handler to remove collection schema
app.post("/api/remove-collection-schema/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    // Call the function to remove collection schema and wait for it to complete
    await removeCollectionSchema(shop);
    res.status(200).json({ message: "Collection schema removed successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error removing collection schema",
      error: error.message,
    });
  }
});

async function insertArticleSchema(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    // Fetch the current theme.liquid content
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    // Define the article schema
    const ARTICLE_SCHEMA = `
            {% if template contains 'article' %}
<script type="application/ld+json+article">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{{ article.title | escape }}",
  "description": "{{ article.excerpt | strip_html | escape }}",
  "author": {
    "@type": "Person",
    "name": "{{ article.author | escape }}"
  },
  "datePublished": "{{ article.published_at | date: '%Y-%m-%d' }}",
  "url": "{{ shop.url }}{{ article.url }}",
  "mainEntityOfPage": "{{ shop.url }}{{ article.url }}",
  "image": "{{ article.image | img_url: 'master' | escape }}"
}
</script>
{% endif %}

    `;

    // Insert the new ARTICLE_SCHEMA
    const headTag = "</head>";
    themeLiquidContent = themeLiquidContent.replace(
      headTag,
      `${ARTICLE_SCHEMA}\n${headTag}`
    );

    // Update the theme.liquid content on Shopify
    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log("Article schema inserted successfully:", putResponse.data);
  } catch (error) {
    console.error(
      "Error inserting article schema:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Define route handler to insert article schema
app.post("/api/insert-article-schema/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    // Call the function to insert article schema and wait for it to complete
    await insertArticleSchema(shop);
    res.status(200).json({ message: "Article schema inserted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error inserting article schema",
      error: error.message,
    });
  }
});

async function removeArticleSchema(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    // Fetch the current theme.liquid content
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    // Remove any existing <script type="application/ld+json+article"> block (Article schema)
    const schemaRegex =
      /<script type="application\/ld\+json\+article">[\s\S]*?<\/script>/g;
    themeLiquidContent = themeLiquidContent.replace(schemaRegex, "");

    // Update the theme.liquid content on Shopify
    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log("Article schema removed successfully:", putResponse.data);
  } catch (error) {
    console.error(
      "Error removing article schema:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Define route handler to remove article schema
app.post("/api/remove-article-schema/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    // Call the function to remove article schema and wait for it to complete
    await removeArticleSchema(shop);
    res.status(200).json({ message: "Article schema removed successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error removing article schema", error: error.message });
  }
});

async function insertBreadcrumbSchema(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    // Fetch the current theme.liquid content
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    // Define the breadcrumb schema
    const BREADCRUMB_SCHEMA = `
                {% if template contains 'product' or 'collection' %}

<script type="application/ld+json+breadcrumb">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "{{ shop.url }}"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "{{ collection.title | escape }}",
      "item": "{{ shop.url }}/collections/{{ collection.handle }}"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "{{ product.title | escape }}",
      "item": "{{ shop.url }}/products/{{ product.handle }}"
    }
  ]
}
</script>
{% endif %}

    `;

    // Insert the new BREADCRUMB_SCHEMA
    const headTag = "</head>";
    themeLiquidContent = themeLiquidContent.replace(
      headTag,
      `${BREADCRUMB_SCHEMA}\n${headTag}`
    );

    // Update the theme.liquid content on Shopify
    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log("Breadcrumb schema inserted successfully:", putResponse.data);
  } catch (error) {
    console.error(
      "Error inserting breadcrumb schema:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Define route handler to insert breadcrumb schema
app.post("/api/insert-breadcrumb-schema/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    // Call the function to insert breadcrumb schema and wait for it to complete
    await insertBreadcrumbSchema(shop);
    res
      .status(200)
      .json({ message: "Breadcrumb schema inserted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error inserting breadcrumb schema",
      error: error.message,
    });
  }
});

async function removeBreadcrumbSchema(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    // Fetch the current theme.liquid content
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    // Remove any existing <script type="application/ld+json+breadcrumb"> block (Breadcrumb schema)
    const schemaRegex =
      /<script type="application\/ld\+json\+breadcrumb">[\s\S]*?<\/script>/g;
    themeLiquidContent = themeLiquidContent.replace(schemaRegex, "");

    // Update the theme.liquid content on Shopify
    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log("Breadcrumb schema removed successfully:", putResponse.data);
  } catch (error) {
    console.error(
      "Error removing breadcrumb schema:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Define route handler to remove breadcrumb schema
app.post("/api/remove-breadcrumb-schema/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    // Call the function to remove breadcrumb schema and wait for it to complete
    await removeBreadcrumbSchema(shop);
    res.status(200).json({ message: "Breadcrumb schema removed successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error removing breadcrumb schema",
      error: error.message,
    });
  }
});

async function insertVideoSchema(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    // Fetch the current theme.liquid content
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    // Define the video schema
    const VIDEO_SCHEMA = `
                {% if template contains 'product' %}

<script type="application/ld+json+video">
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "Your Video Title",
  "description": "A description of the video.",
  "thumbnailUrl": "https://your-cdn.com/thumbnail.jpg",
  "uploadDate": "2024-01-01T08:00:00+00:00",
  "contentUrl": "https://your-cdn.com/video.mp4",
  "embedUrl": "https://your-site.com/video-embed",
  "duration": "PT1M33S"
}
</script>
{% endif %}

    `;

    // Insert the new VIDEO_SCHEMA
    const headTag = "</head>";
    themeLiquidContent = themeLiquidContent.replace(
      headTag,
      `${VIDEO_SCHEMA}\n${headTag}`
    );

    // Update the theme.liquid content on Shopify
    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log("Video schema inserted successfully:", putResponse.data);
  } catch (error) {
    console.error(
      "Error inserting video schema:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Define route handler to insert video schema
app.post("/api/insert-video-schema/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    // Call the function to insert video schema and wait for it to complete
    await insertVideoSchema(shop);
    res.status(200).json({ message: "Video schema inserted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error inserting video schema", error: error.message });
  }
});

async function removeVideoSchema(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    // Fetch the current theme.liquid content
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    // Remove any existing <script type="application/ld+json+video"> block (Video schema)
    const schemaRegex =
      /<script type="application\/ld\+json\+video">[\s\S]*?<\/script>/g;
    themeLiquidContent = themeLiquidContent.replace(schemaRegex, "");

    // Update the theme.liquid content on Shopify
    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log("Video schema removed successfully:", putResponse.data);
  } catch (error) {
    console.error(
      "Error removing video schema:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Define route handler to remove video schema
app.post("/api/remove-video-schema/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    // Call the function to remove video schema and wait for it to complete
    await removeVideoSchema(shop);
    res.status(200).json({ message: "Video schema removed successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error removing video schema", error: error.message });
  }
});

async function insertRecipeSchema(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    // Fetch the current theme.liquid content
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    // Define the recipe schema
    const RECIPE_SCHEMA = `
<script type="application/ld+json+recipe">
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Chocolate Chip Cookies",
  "description": "The best chocolate chip cookies recipe ever!",
  "image": "https://your-cdn.com/chocolate-chip-cookies.jpg",
  "recipeIngredient": [
    "2 cups flour",
    "1 cup chocolate chips",
    "1 cup sugar",
    "2 eggs",
    "1 tsp vanilla extract"
  ],
  "recipeInstructions": [
    {
      "@type": "HowToStep",
      "text": "Preheat oven to 350°F (175°C)."
    },
    {
      "@type": "HowToStep",
      "text": "Mix flour and sugar in a bowl."
    },
    {
      "@type": "HowToStep",
      "text": "Add eggs and vanilla extract."
    },
    {
      "@type": "HowToStep",
      "text": "Stir in chocolate chips."
    },
    {
      "@type": "HowToStep",
      "text": "Bake for 10-12 minutes."
    }
  ],
  "prepTime": "PT15M",
  "cookTime": "PT12M",
  "totalTime": "PT27M",
  "recipeYield": "24 cookies",
  "nutrition": {
    "@type": "NutritionInformation",
    "calories": "200 calories"
  }
}
</script>
    `;

    // Insert the new RECIPE_SCHEMA
    const headTag = "</head>";
    themeLiquidContent = themeLiquidContent.replace(
      headTag,
      `${RECIPE_SCHEMA}\n${headTag}`
    );

    // Update the theme.liquid content on Shopify
    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log("Recipe schema inserted successfully:", putResponse.data);
  } catch (error) {
    console.error(
      "Error inserting recipe schema:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Define route handler to insert recipe schema
app.post("/api/insert-recipe-schema/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    // Call the function to insert recipe schema and wait for it to complete
    await insertRecipeSchema(shop);
    res.status(200).json({ message: "Recipe schema inserted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error inserting recipe schema", error: error.message });
  }
});

async function removeRecipeSchema(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    // Fetch the current theme.liquid content
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    // Remove any existing <script type="application/ld+json+recipe"> block (Recipe schema)
    const schemaRegex =
      /<script type="application\/ld\+json\+recipe">[\s\S]*?<\/script>/g;
    themeLiquidContent = themeLiquidContent.replace(schemaRegex, "");

    // Update the theme.liquid content on Shopify
    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log("Recipe schema removed successfully:", putResponse.data);
  } catch (error) {
    console.error(
      "Error removing recipe schema:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Define route handler to remove recipe schema
app.post("/api/remove-recipe-schema/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    // Call the function to remove recipe schema and wait for it to complete
    await removeRecipeSchema(shop);
    res.status(200).json({ message: "Recipe schema removed successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error removing recipe schema", error: error.message });
  }
});

async function insertSearchBoxAndSiteNameSchema(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    // Fetch the current theme.liquid content
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    // Define the Search Box and Site Name schema
    const SEARCH_BOX_SCHEMA = `
<script type="application/ld+json+searchbox">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "url": "https://your-site.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://your-site.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
</script>
    `;

    const SITE_NAME_SCHEMA = `
<script type="application/ld+json+sitename">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Your Site Name",
  "url": "https://your-site.com"
}
</script>
    `;

    // Insert the new schemas
    const headTag = "</head>";
    themeLiquidContent = themeLiquidContent.replace(
      headTag,
      `${SEARCH_BOX_SCHEMA}\n${SITE_NAME_SCHEMA}\n${headTag}`
    );

    // Update the theme.liquid content on Shopify
    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log(
      "Search Box and Site Name schemas inserted successfully:",
      putResponse.data
    );
  } catch (error) {
    console.error(
      "Error inserting Search Box and Site Name schemas:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Define route handler to insert Search Box & Site Name schemas
app.post("/api/insert-searchbox-sitename-schema/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    // Call the function to insert schema and wait for it to complete
    await insertSearchBoxAndSiteNameSchema(shop);
    res.status(200).json({
      message: "Search Box and Site Name schemas inserted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error inserting Search Box and Site Name schemas",
      error: error.message,
    });
  }
});

async function removeSearchBoxAndSiteNameSchema(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    // Fetch the current theme.liquid content
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    // Remove any existing Search Box and Site Name schema blocks
    const searchBoxRegex =
      /<script type="application\/ld\+json\+searchbox">[\s\S]*?<\/script>/g;
    const siteNameRegex =
      /<script type="application\/ld\+json\+sitename">[\s\S]*?<\/script>/g;
    themeLiquidContent = themeLiquidContent
      .replace(searchBoxRegex, "")
      .replace(siteNameRegex, "");

    // Update the theme.liquid content on Shopify
    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log(
      "Search Box and Site Name schemas removed successfully:",
      putResponse.data
    );
  } catch (error) {
    console.error(
      "Error removing Search Box and Site Name schemas:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Define route handler to remove Search Box & Site Name schemas
app.post("/api/remove-searchbox-sitename-schema/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    // Call the function to remove schema and wait for it to complete
    await removeSearchBoxAndSiteNameSchema(shop);
    res.status(200).json({
      message: "Search Box and Site Name schemas removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error removing Search Box and Site Name schemas",
      error: error.message,
    });
  }
});

async function insertOrganizationSchema(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    // Fetch the current theme.liquid content
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    // Define the organization schema
    const ORGANIZATION_SCHEMA = `
<script type="application/ld+json+organization">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Organization Name",
  "url": "https://yourwebsite.com",
  "logo": "https://your-cdn.com/logo.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-800-555-5555",
    "contactType": "Customer Service"
  },
  "sameAs": [
    "https://www.facebook.com/yourpage",
    "https://twitter.com/yourprofile",
    "https://www.instagram.com/yourprofile"
  ]
}
</script>
    `;

    // Insert the ORGANIZATION_SCHEMA before the closing </head> tag
    const headTag = "</head>";
    themeLiquidContent = themeLiquidContent.replace(
      headTag,
      `${ORGANIZATION_SCHEMA}\n${headTag}`
    );

    // Update the theme.liquid content on Shopify
    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log("Organization schema inserted successfully:", putResponse.data);
  } catch (error) {
    console.error(
      "Error inserting organization schema:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Define route handler to insert organization schema
app.post("/api/insert-organization-schema/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    // Call the function to insert organization schema and wait for it to complete
    await insertOrganizationSchema(shop);
    res
      .status(200)
      .json({ message: "Organization schema inserted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error inserting organization schema",
      error: error.message,
    });
  }
});

async function removeOrganizationSchema(shop) {
  try {
    const accessToken = await getAccessToken(shop);
    const themeId = await getMainThemeId(shop, accessToken);

    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    // Fetch the current theme.liquid content
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    let themeLiquidContent = response.data.asset.value;

    // Remove any existing <script type="application/ld+json+organization"> block
    const schemaRegex =
      /<script type="application\/ld\+json\+organization">[\s\S]*?<\/script>/g;
    themeLiquidContent = themeLiquidContent.replace(schemaRegex, "");

    // Update the theme.liquid content on Shopify
    const putResponse = await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log("Organization schema removed successfully:", putResponse.data);
  } catch (error) {
    console.error(
      "Error removing organization schema:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Define route handler to remove organization schema
app.post("/api/remove-organization-schema/:shop", async (req, res) => {
  try {
    const shop = req.params.shop;
    if (!shop) {
      return res
        .status(400)
        .json({ message: "Shop name is required in the header" });
    }

    // Call the function to remove organization schema and wait for it to complete
    await removeOrganizationSchema(shop);
    res
      .status(200)
      .json({ message: "Organization schema removed successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error removing organization schema",
      error: error.message,
    });
  }
});

// Function to remove existing meta tags and insert new ones
const updateMetaTags = async (shop, accessToken, title, description) => {
  try {
    const themeId = await getMainThemeId(shop, accessToken);

    // Get the current theme.liquid content
    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });

    let themeLiquidContent = response.data.asset.value;

    // Regex to find and remove the old <script>, <meta>, and <title> tags
    const metaTagRegex =
      /<script>\s*var\s*tapita_meta_page_title\s*=\s*`.*?`;\s*var\s*tapita_meta_page_description\s*=\s*`.*?`;\s*<\/script>\s*<title>.*?<\/title>\s*<meta\s*name="description"\s*content=".*?">\s*<meta\s*property="og:title"\s*content=".*?">\s*<meta\s*property="og:description"\s*content=".*?">\s*<meta\s*name="twitter:title"\s*content=".*?">\s*<meta\s*name="twitter:description"\s*content=".*?">/gs;

    // Remove the matched tags
    themeLiquidContent = themeLiquidContent.replace(metaTagRegex, "");

    // Insert new meta tags into the content
    const newMetaTags = `
      <script>
        var tapita_meta_page_title = \`${title}\`;
        var tapita_meta_page_description = \`${description}\`;
      </script>
      <title>${title} &ndash; myusersstore</title>
      <meta name="description" content="${description}">
      <meta property="og:title" content="${title}">
      <meta property="og:description" content="${description}">
      <meta name="twitter:title" content="${title}">
      <meta name="twitter:description" content="${description}">
    `;

    // Insert the new meta tags at the end of the <head> section
    const headTagIndex = themeLiquidContent.indexOf("</head>");
    if (headTagIndex !== -1) {
      themeLiquidContent =
        themeLiquidContent.substring(0, headTagIndex) +
        newMetaTags +
        themeLiquidContent.substring(headTagIndex);
    }

    // Update the theme with the modified content
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    return "Meta tags updated successfully";
  } catch (error) {
    console.error("Error updating meta tags:", error);
    throw new Error("Failed to update meta tags");
  }
};

// Example Express API route
app.post("/api/update-product-meta/:shop", async (req, res) => {
  const { shop } = req.params;
  const { metaTitle, metaDescription } = req.body;

  if (!metaTitle || !metaDescription) {
    return res
      .status(400)
      .json({ message: "Meta title and description are required" });
  }

  try {
    const accessToken = await getAccessToken(shop);
    await updateMetaTags(shop, accessToken, metaTitle, metaDescription);
    res.status(200).json({ message: "Meta tags updated successfully" });
  } catch (error) {
    console.error("Error updating meta tags:", error.message);
    res
      .status(500)
      .json({ message: "Failed to update meta tags", error: error.message });
  }
});

// Function to remove meta tags from theme.liquid
const removeMetaTags = async (shop, accessToken) => {
  try {
    const themeId = await getMainThemeId(shop, accessToken);

    // Get the current theme.liquid content
    const getAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=layout/theme.liquid`;
    const response = await axios.get(getAssetUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });

    let themeLiquidContent = response.data.asset.value;

    // Regex to find and remove the <script>, <meta>, and <title> tags
    const metaTagRegex =
      /<script>\s*var\s*tapita_meta_page_title\s*=\s*`.*?`;\s*var\s*tapita_meta_page_description\s*=\s*`.*?`;\s*<\/script>\s*<title>.*?<\/title>\s*<meta\s*name="description"\s*content=".*?">\s*<meta\s*property="og:title"\s*content=".*?">\s*<meta\s*property="og:description"\s*content=".*?">\s*<meta\s*name="twitter:title"\s*content=".*?">\s*<meta\s*name="twitter:description"\s*content=".*?">/gs;

    // Remove the matched tags
    themeLiquidContent = themeLiquidContent.replace(metaTagRegex, "");

    // Update the theme with the modified content
    const putAssetUrl = `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`;

    await axios.put(
      putAssetUrl,
      {
        asset: {
          key: "layout/theme.liquid",
          value: themeLiquidContent,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    return "Meta tags removed successfully";
  } catch (error) {
    console.error("Error removing meta tags:", error);
    throw new Error("Failed to remove meta tags");
  }
};

// Example route to remove meta tags when requested
app.delete("/remove-meta-tags", async (req, res) => {
  const { shop, accessToken } = req.query;

  if (!shop || !accessToken) {
    return res.status(400).send("Missing shop or access token");
  }

  try {
    const result = await removeMetaTags(shop, accessToken);
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send("Error removing meta tags");
  }
});
app.use("/api/*", shopify.validateAuthenticatedSession());
app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});
app.listen(PORT);
