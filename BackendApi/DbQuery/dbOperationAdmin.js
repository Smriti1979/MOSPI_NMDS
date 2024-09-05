
const db = require("../models/index.js");
const { Pool } = require("pg");
require("dotenv").config();
// DB connection for ASI
const pooladmin = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASEASI,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT, // Default PostgreSQL port
});

async function EmailValidation(email) {
  const query = "SELECT * FROM AdminUsers WHERE email = $1";
  const result = await pooladmin.query(query, [email]);
  return result.rows[0];
}


async function createProductdb(
  id,
  title,
  count,
  icon,
  period,
  tooltip,
  type,
  url,
  tables,
  swagger,
  viz,
  category
) {
  try {
    await pooladmin.query("BEGIN");

    const productQuery = `INSERT INTO product(id, title, count, icon, period, tooltip, type, url, tables, swagger, viz) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;
    await pooladmin.query(productQuery, [
      id,
      title,
      count,
      icon,
      period,
      tooltip,
      type,
      url,
      tables,
      swagger,
      viz,
    ]);

    const categories = category.split(",").map((cat) => cat.trim());

    for (const cat of categories) {
      const categoryExistsQuery = `SELECT 1 FROM theme WHERE category = $1`;
      const categoryExistsResult = await pooladmin.query(categoryExistsQuery, [
        cat,
      ]);

      if (categoryExistsResult.rows.length === 0) {
        return {
          error: true,
          errorCode: 405,
          errorMessage: `Category '${cat}' not found in theme table`,
        };
      }

    
      const productThemeQuery = `INSERT INTO ProductTheme(productId, category) VALUES($1, $2)`;
      await pooladmin.query(productThemeQuery, [id, cat]);
    }

    await pooladmin.query("COMMIT");
    return categories;
  } catch (error) {
    await pooladmin.query("ROLLBACK");
    console.error(error);
    return {
      error: true,
      errorCode: 500,
      errorMessage: `Problem in db unable to create product: ${error.message}`,
    };
  }
}
/**
 * create Theme
 */
async function createThemedb(category, name) {
  try {
    const sqlQuery = `INSERT INTO theme(category,name) VALUES($1,$2)`;
    await pooladmin.query(sqlQuery, [category, name]);
    const result = await pooladmin.query(
      "SELECT * FROM theme WHERE category=$1",
      [category]
    );
    if (result.rows.length === 0) {
      return {
        error: true,
        errorCode: 405,
        errorMessage: `Product not found after insertion`,
      };
    }
    return result.rows[0];
  } catch (error) {
    return {
      error: true,
      errorCode: 405,
      errorMessage: `Problem in db unable to create Theme`,
    };
  }
}
/**
 * Metadata
 */
async function createMetadatadb(
  Product,
  title,
  category,
  geography,
  frequency,
  timePeriod,
  dataSource,
  description,
  lastUpdateDate,
  futureRelease,
  basePeriod,
  keystatistics,
  NMDS,
  nmdslink,
  remarks
) {
  try {
    const metaQuery = `INSERT INTO MetaData(product,title,category,geography,frequency,timePeriod,dataSource,description,lastUpdateDate,futureRelease,basePeriod,keystatistics,NMDS,nmdslink,remarks) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`;
    await pooladmin.query(metaQuery, [
      Product,
      title,
      category,
      geography,
      frequency,
      timePeriod,
      dataSource,
      description,
      lastUpdateDate,
      futureRelease,
      basePeriod,
      keystatistics,
      NMDS,
      nmdslink,
      remarks,
    ]);
    const result = await pooladmin.query(
      `SELECT * FROM MetaData where product=$1`,
      [Product]
    );
    if (result.rows.length == 0) {
      return {
        error: true,
        errorCode: 400,
        errorMessage: `Error in creating metaData`,
      };
    }
    return result.rows[0];
  } catch (error) {
    return {
      error: true,
      errorCode: 500,
      errorMessage: `Error in createMetadatadb ${error}`,
    };
  }
}


async function getProuductdb(productId) {
  const getQuery = `SELECT * FROM product WHERE id = $1`;
  const productResult = await pooladmin.query(getQuery, [productId]);
  if (productResult.rows.length === 0) {
    return {
      error: true,
      errorCode: 400,
      errorMessage: `Unable to fetch data from ProductTable`,
    };
  }
  const getQueryCategory = `SELECT category FROM ProductTheme WHERE productId = $1`;
  const categoriesResult = await pooladmin.query(getQueryCategory, [productId]);
  const product = productResult.rows[0];
  const categories = categoriesResult.rows.map((row) => row.category);
  product["category"] = categories;
  return product;
}
async function getMetaDatadb(Product) {
  const getQuery = `SELECT * FROM  MetaData where product=$1`;
  const data = await pooladmin.query(getQuery, [Product]);
  if (data.rows.length == 0) {
    return {
      error: true,
      errorCode: 402,
      errorMessage: `Unable to fetch data from metaTable`,
    };
  }
  return data.rows[0];
}
async function getThemedb(category) {
  const getQuery = `SELECT * FROM Theme where category=$1`;
  const data = await pooladmin.query(getQuery, [category]);
  if (data.rows.length == 0) {
    return {
      error: true,
      errorCode: 402,
      errorMessage: `Unable to fetch data from Theme Table`,
    };
  }
  return data.rows[0];
}
async function updateProductDomdb(
  id,
  title,
  count,
  period,
  tooltip,
  type,
  viz,
  category
) {
  try {
    await pooladmin.query("BEGIN");

    // Update product details
    const productQuery = `UPDATE product SET 
          title = $1, 
          count = $2, 
          period = $3, 
          tooltip = $4, 
          type = $5, 
          viz = $6 
          WHERE id = $7`;
    await pooladmin.query(productQuery, [
      title,
      count,
      period,
      tooltip,
      type,
      viz,
      id,
    ]);

    // Handle categories
    const categories = category.split(",").map((cat) => cat.trim());
    const existingCategories = await pooladmin.query(
      `SELECT category FROM ProductTheme WHERE productId = $1`,
      [id]
    );
    const existingCategoryList = existingCategories.rows.map(
      (row) => row.category
    );

    // Add new categories
    for (const cat of categories) {
      if (!existingCategoryList.includes(cat)) {
        const categoryExistsQuery = `SELECT 1 FROM Theme WHERE category = $1`;
        const categoryExistsResult = await pooladmin.query(
          categoryExistsQuery,
          [cat]
        );

        if (categoryExistsResult.rows.length === 0) {
          return {
            error: true,
            errorCode: 402,
            errorMessage: `Category '${cat}' not found in Theme table`,
          };
        }
        const productThemeQuery = `INSERT INTO ProductTheme(productId, category) VALUES($1, $2)`;
        await pooladmin.query(productThemeQuery, [id, cat]);
      }
    }

    const getQuery = `SELECT * FROM product WHERE id = $1`;
    const productResult = await pooladmin.query(getQuery, [id]);
    if (productResult.rows.length === 0) {
      return {
        error: true,
        errorCode: 402,
        errorMessage: `Unable to fetch data from ProductTable`,
      };
    }

    const getQueryCategory = `SELECT category FROM ProductTheme WHERE productId = $1`;
    const categoriesResult = await pooladmin.query(getQueryCategory, [id]);
    const product = productResult.rows[0];
    const Allcategory = categoriesResult.rows.map((row) => row.category);
    product["category"] = Allcategory;

    await pooladmin.query("COMMIT");
    return product;
  } catch (error) {
    await pooladmin.query("ROLLBACK");
  }
}
async function updateProductDevdb(
  id,
  title,
  count,
  icon,
  period,
  tooltip,
  type,
  url,
  tables,
  swagger,
  viz,
  category
) {
  try {
    await pooladmin.query("BEGIN");

    // Update product details
    const productQuery = `UPDATE product SET 
            title = $1, 
            count = $2, 
            icon = $3, 
            period = $4, 
            tooltip = $5, 
            type = $6, 
            url = $7, 
            tables = $8, 
            swagger = $9, 
            viz = $10 
            WHERE id = $11`;

    await pooladmin.query(productQuery, [
      title,
      count,
      icon,
      period,
      tooltip,
      type,
      url,
      tables,
      swagger,
      viz,
      id,
    ]);

    // Handle categories
    const categories = category.split(",").map((cat) => cat.trim());
    const existingCategories = await pooladmin.query(
      `SELECT category FROM ProductTheme WHERE productId = $1`,
      [id]
    );
    const existingCategoryList = existingCategories.rows.map(
      (row) => row.category
    );

    // Add new categories
    for (const cat of categories) {
      if (!existingCategoryList.includes(cat)) {
        const categoryExistsQuery = `SELECT 1 FROM Theme WHERE category = $1`;
        const categoryExistsResult = await pooladmin.query(
          categoryExistsQuery,
          [cat]
        );

        if (categoryExistsResult.rows.length === 0) {
          return {
            error: true,
            errorCode: 402,
            errorMessage: `Category '${cat}' not found in Theme table`,
          };
        }
        const productThemeQuery = `INSERT INTO ProductTheme(productId, category) VALUES($1, $2)`;
        await pooladmin.query(productThemeQuery, [id, cat]);
      }
    }
    const getQuery = `SELECT * FROM product WHERE id = $1`;
    const productResult = await pooladmin.query(getQuery, [id]);
    if (productResult.rows.length === 0) {
      return {
        error: true,
        errorCode: 402,
        errorMessage: `Unable to fetch data from ProductTable`,
      };
    }

    const getQueryCategory = `SELECT category FROM ProductTheme WHERE productId = $1`;
    const categoriesResult = await pooladmin.query(getQueryCategory, [id]);
    const product = productResult.rows[0];
    const Allcategory = categoriesResult.rows.map((row) => row.category);
    product["category"] = Allcategory;

    await pooladmin.query("COMMIT");
    return product;
  } catch (error) {
    await pooladmin.query("ROLLBACK");
  }
}
async function updateThemedb(name, category) {
  const updateQuery = `UPDATE Theme SET name=$1 where category=$2 `;
  await pooladmin.query(updateQuery, [name, category]);
  const getQuery = `SELECT * FROM Theme where category=$1`;
  const data = await pooladmin.query(getQuery, [category]);
  if (data.rows.length == 0) {
    return {
      error: true,
      errorCode: 402,
      errorMessage: `Unable to fetch data from Theme Table`,
    };
  }
  return data.rows[0];
}
async function updateMetadataDomdb(
  title,
  category,
  geography,
  frequency,
  timePeriod,
  dataSource,
  description,
  lastUpdateDate,
  futureRelease,
  basePeriod,
  keystatistics,
  NMDS,

  remarks,
  Product
) {
  const metaQuery = `
    UPDATE MetaData
    SET title = $1,
        category = $2,            
        geography = $3,
        frequency = $4,
        timePeriod = $5,
        dataSource = $6,
        description = $7,
        lastUpdateDate = $8,
        futureRelease = $9,
        basePeriod = $10,
        keystatistics = $11,
        NMDS = $12,
        remarks = $13
    WHERE product = $14
  `;
  const result = await pooladmin.query(metaQuery, [
    title,
    category,
    geography,
    frequency,
    timePeriod,
    dataSource,
    description,
    lastUpdateDate,
    futureRelease,
    basePeriod,
    keystatistics,
    NMDS,

    remarks,
    Product,
  ]);

  if (result.rowCount === 0) {
    return {
      error: true,
      errorCode: 402,
      errorMessage: `MetaData not found for the given product`,
    };
  }

  const updatedResult = await pooladmin.query(
    `SELECT * FROM MetaData WHERE product = $1`,
    [Product]
  );
  return updatedResult.rows[0];
}
async function updateMetadataDevdb(
  title,
  category,
  geography,
  frequency,
  timePeriod,
  dataSource,
  description,
  lastUpdateDate,
  futureRelease,
  basePeriod,
  keystatistics,
  NMDS,
  nmdslink,
  remarks,
  Product
) {
  // Update MetaData record
  const metaQuery = `
       UPDATE MetaData
       SET title = $1,
           category = $2,            
           geography = $3,
           frequency = $4,
           timePeriod = $5,
           dataSource = $6,
           description = $7,
           lastUpdateDate = $8,
           futureRelease = $9,
           basePeriod = $10,
           keystatistics = $11,
           NMDS = $12,
           nmdslink = $13,
           remarks = $14
       WHERE product = $15
     `;
  const result = await pooladmin.query(metaQuery, [
    title,
    category,
    geography,
    frequency,
    timePeriod,
    dataSource,
    description,
    lastUpdateDate,
    futureRelease,
    basePeriod,
    keystatistics,
    NMDS,
    nmdslink,
    remarks,
    Product,
  ]);

  if (result.rowCount === 0) {
    return {
      error: true,
      errorCode: 402,
      errorMessage: `no metadata to found`,
    };
  }

  const updatedResult = await pooladmin.query(
    `SELECT * FROM MetaData WHERE product = $1`,
    [Product]
  );
  return updatedResult.rows[0];
}
async function deleteProductdb(id) {
  const productQuery = `DELETE FROM product  WHERE id=$1;`;
  const metaDataQuery = `DELETE FROM MetaData  WHERE product=$1;`;
  const CategoryQuery = `DELETE FROM ProductTheme  WHERE productId=$1;`;
  await pooladmin.query(metaDataQuery, [id]);
  await pooladmin.query(CategoryQuery, [id]);
  await pooladmin.query(productQuery, [id]);
}
async function deleteMetadatadb(Product) {
  const metaDataQuery = `DELETE FROM MetaData  WHERE product=$1;`;
  await pooladmin.query(metaDataQuery, [Product]);
}
async function deleteThemedb(category) {
  try {
    await pooladmin.query("BEGIN");
    // Get associated products
    const getProductsQuery = `SELECT productId FROM ProductTheme WHERE category = $1`;
    const productsResult = await pooladmin.query(getProductsQuery, [category]);
    const productIds = productsResult.rows.map((row) => row.productId);
    // Remove associated entries from ProductTheme
    const deleteProductThemeQuery = `DELETE FROM ProductTheme WHERE category = $1`;
    await pooladmin.query(deleteProductThemeQuery, [category]);
    // Remove associated entries from MetaData
    const deleteMetaDataQuery = `DELETE FROM MetaData WHERE category = $1`;
    await pooladmin.query(deleteMetaDataQuery, [category]);

    // Remove products if they are not associated with any other category
    if (productIds.length > 0) {
      const checkProductCategoryQuery = `
              SELECT p.id FROM product p
              LEFT JOIN ProductTheme pt ON p.id = pt.productId
              WHERE p.id = ANY($1::varchar[]) AND pt.productId IS NULL
            `;

      const remainingProductsResult = await pooladmin.query(
        checkProductCategoryQuery,
        [productIds]
      );
      const remainingProductIds = remainingProductsResult.rows.map(
        (row) => row.id
      );
      if (remainingProductIds.length > 0) {
        const deleteProductQuery = `DELETE FROM product WHERE id = ANY($1::varchar[])`;
        await pooladmin.query(deleteProductQuery, [remainingProductIds]);
      }
    }

    // Remove the theme itself
    const deleteThemeQuery = `DELETE FROM Theme WHERE category = $1`;
    await pooladmin.query(deleteThemeQuery, [category]);

    await pooladmin.query("COMMIT");
  } catch (error) {
    await pooladmin.query("ROLLBACK");
  }
}
module.exports = {
  EmailValidation,
  deleteThemedb,
  deleteMetadatadb,
  deleteProductdb,
  updateMetadataDevdb,
  updateMetadataDomdb,
  updateThemedb,
  updateProductDevdb,
  updateProductDomdb,
  getThemedb,
  getMetaDatadb,
  getProuductdb,
  createMetadatadb,
  createThemedb,
  createProductdb,
};