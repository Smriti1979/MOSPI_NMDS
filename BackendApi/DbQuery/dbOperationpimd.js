/** @format */
const db = require("../models/index.js");
const { Pool } = require("pg");
require("dotenv").config();
const bcrypt = require("bcrypt");
// DB connection for ASI
const poolpimd = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASETPM,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT, // Default PostgreSQL port
});


poolpimd.connect((err, client, release) => {
  if (err) {
    return console.error("Error acquiring client", err.stack);
  }
  console.log("Database connected successfully");
  release();
});

async function EmailValidation(username) {
  const query = "SELECT * FROM users WHERE username = $1";
  const result = await poolpimd.query(query, [username]);
  return result.rows[0];
}

async function updatePassword(userId, hashedPassword){
  const query = `
    UPDATE users
    SET password = $1, newuser = false
    WHERE user_id = $2
    RETURNING user_id, username;
  `;

  const result = await poolpimd.query(query, [hashedPassword, userId]);
  return result.rows[0]; // Returns updated user details or undefined if no match
};


async function createUserdb(agency_id, username, password, usertype, name, email, phone, address) {
  const hashedPassword = await bcrypt.hash(password, 10);

  // Start a transaction to ensure atomicity in creating a user and assigning roles
  const client = await poolpimd.connect();
  try {
    await client.query('BEGIN');

    // Insert the new user
    const insertUserQuery = `
      INSERT INTO users(agency_id, username, password, usertype, name, email, phone, address)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING agency_id, username, password, usertype, name, email, phone, address
    `;
    const userResult = await client.query(insertUserQuery, [
      agency_id, username, hashedPassword, usertype, name, email, phone, address
    ]);

    const newUser = userResult.rows[0];

    await client.query('COMMIT');
    return newUser;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error in createUserdb:", error.message);
    return { error: true, errorMessage: `Unable to create user: ${error.message}` };
  } finally {
    client.release();
  }
}
async function getUserdb() {
  try {
    const query = `
      SELECT 
        users.username, 
        users.agency_id, 
        users.usertype, 
        users.name, 
        users.email, 
        users.phone, 
        users.address, 
        users.created_by, 
        agencies.agency_name
      FROM 
        users
      INNER JOIN 
        agencies 
      ON 
        users.agency_id = agencies.agency_id
    `;

    const user = await poolpimd.query(query);

    if (user.rows.length === 0) {
      return {
        error: true,
        errorCode: 405,
        errorMessage: "Unable to get user",
      };
    }

    return user.rows;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return {
      error: true,
      errorCode: 500,
      errorMessage: "Internal server error",
    };
  }
}

async function updateUserDb(username, name, email, phone, address) {
  const query = `
    UPDATE users SET 
      username = $1, 
      name = $2, 
      email = $3,
      phone = $4,
      address = $5
    WHERE username = $6
    RETURNING *`;

  const user = await poolpimd.query(query, [
    username, name, email, phone, address, username  // Added username to the query parameters
  ]);

  if (user.rows.length === 0) {
    return {
      error: true,
      errorCode: 404,
      errorMessage: `User not found`,
    };
  }
  return user.rows[0]; // Return the updated user data
}

async function deleteUserDb(username) {
  const query = `DELETE FROM users WHERE username = $1 RETURNING *`;
  const user = await poolpimd.query(query, [username]);

  if (user.rows.length === 0) {
    return {
      error: true,
      errorCode: 404,
      errorMessage: `User not found`,
    };
  }
  return user.rows[0];
}


async function createagencydb(agency_name) {
  try {
    const sqlQuery = `INSERT INTO agencies (agency_name) VALUES($1)`;
    await poolpimd.query(sqlQuery, [agency_name]);
    const result = await poolpimd.query(
      "SELECT * FROM agencies WHERE agency_name=$1",
      [agency_name]
    );
    if (result.rows.length === 0) {
      return {
        error: true,
        errorCode: 405,
        errorMessage: `product not found after insertion`,
      };
    }
    return result.rows[0];
  } catch (error) {
    return {
      error: true,
      errorCode: 405,
      errorMessage: `Problem in db unable to create agency`,
    };
  }
}
async function getagencydb() {
  try {
    const getQuery = `SELECT * FROM agencies `;
    const data = await poolpimd.query(getQuery);
    if (data.rows.length == 0) {
      return {
        error: true,
        errorCode: 402,
        errorMessage: `Unable to fetch data from agency Table`,
      };
    }
    return data.rows;
  } catch (error) {
    return {
      error: true,
      errorCode: 402,
      errorMessage: `Unable to fetch data from agency=${error}`,
    };
  }
}
async function updateagencydb(agency_name, new_agency_name) {
  // Update the agency_name in the agency table
  const updateQuery = `UPDATE agencies SET agency_name=$1 WHERE agency_name=$2`;
  await poolpimd.query(updateQuery, [new_agency_name, agency_name]);

  // Fetch the updated record to return as a response
  const getQuery = `SELECT * FROM agencies WHERE agency_name=$1`;
  const data = await poolpimd.query(getQuery, [new_agency_name]);

  if (data.rows.length === 0) {
    return {
      error: true,
      errorCode: 402,
      errorMessage: `Unable to fetch updated data from the agency table`,
    };
  }
  return data.rows[0];
}
async function deleteagencydb(agency_name) {
  try {
    // // Start a transaction
    // await poolpimd.query("BEGIN");

    // Get associated products from the productagency table
    const getProductsQuery = `SELECT "product_id" FROM metadata WHERE agency_id = (SELECT agency_id FROM agency WHERE agency_name = $1)`;
    const productsResult = await poolpimd.query(getProductsQuery, [agency_name]);
    const productIds = productsResult.rows.map((row) => row.product_id);

    // Remove associated entries from the productagency table
    const deleteProductagencyQuery = `DELETE FROM agency WHERE agency_name = $1`;
    await poolpimd.query(deleteProductagencyQuery, [agency_name]);

    if (productIds.length > 0) {
      await poolpimd.query("ROLLBACK");
      return {
        error: true,
        errorCode: 500,
        errorMessage: `Error deleting agency Product already exist`,
      };
    }

    // Finally, remove the agency itself
    const deleteagencyQuery = `DELETE FROM agency WHERE agency_name = $1`;
    await poolpimd.query(deleteagencyQuery, [agency_name]);

    // Commit the transaction
    await poolpimd.query("COMMIT");

    return {
      success: true,
      message: `agency and associated products deleted successfully.`,
    };
  } catch (error) {
    // Rollback transaction in case of an error
    await poolpimd.query("ROLLBACK");
    return {
      error: true,
      errorCode: 500,
      errorMessage: `Error deleting agency: ${error}`,
    };
  }
}

async function getMetadataByAgencyIddb(agencyId) {
  try {
    const query = `
      SELECT * 
      FROM metadata 
      WHERE agency_id = $1
    `;

    const result = await poolpimd.query(query, [agencyId]);

    if (result.rows.length === 0) {
      return {
        error: true,
        errorCode: 404,
        errorMessage: "No metadata found for this agency.",
      };
    }

    return {
      error: false,
      data: result.rows,
    };
  } catch (error) {
    console.error("Database error:", error);
    return {
      error: true,
      errorCode: 500,
      errorMessage: "Internal server error.",
    };
  }
}


// async function createProductdb(
//   id,
//   usertype,
//   count,
//   icon,
//   period,
//   tooltip,
//   type,
//   url,
//   table,
//   swagger,
//   viz,
//   agency_name,
//   authorId,
//   userRoles // Added userRoles parameter
// ) {
//   try {
//     // Check if the user has roleId 1 or 2
//     const hasRole1or2 = userRoles.includes(1) || userRoles.includes(2);
//     if (!hasRole1or2) {
//       return {
//         error: true,
//         errorCode: 405,
//         errorMessage: `User doesn't have permission to create a product`
//       };
//     }

//     await poolpimd.query("BEGIN");

//     const productQuery = `INSERT INTO product(id, usertype, count, icon, period, tooltip, type, url, "table", swagger, viz, "authorId", "createdDate") VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
//     await poolpimd.query(productQuery, [
//       id,
//       usertype,
//       count,
//       icon,
//       period,
//       tooltip,
//       type,
//       url,
//       table,
//       swagger,
//       viz,
//       authorId,
//       new Date()
//     ]);

//     const categories = agency_name.split(",").map((cat) => cat.trim());

//     for (const cat of categories) {
//       const agency_nameExistsQuery = `SELECT 1 FROM agency WHERE agency_name = $1`;
//       const agency_nameExistsResult = await poolpimd.query(agency_nameExistsQuery, [
//         cat,
//       ]);

//       if (agency_nameExistsResult.rows.length === 0) {
//         return {
//           error: true,
//           errorCode: 405,
//           errorMessage: `agency_name '${cat}' not found in agency table`,
//         };
//       }

//       const productagencyQuery = `INSERT INTO productagency("productId", agency_name) VALUES($1, $2)`;
//       await poolpimd.query(productagencyQuery, [id, cat]);
//     }

//     await poolpimd.query("COMMIT");
//     return categories;
//   } catch (error) {
//     await poolpimd.query("ROLLBACK");
//     console.error(error);
//     return {
//       error: true,
//       errorCode: 500,
//       errorMessage: `Problem in db unable to create product: ${error}`,
//     };
//   }
// }



// async function createMetadatadb({ agency_id, product_id, product_name, data, user_created_id, status, created_by }) {
//   try {
//     // Step 1: Update previous records for this product_id to set latest=false
//     const updateQuery = `
//       UPDATE metadata 
//       SET latest=false 
//       WHERE "product_id" = $1 AND latest=true;
//     `;

//     await poolpimd.query(updateQuery, [product_id]);

//     // Step 2: Insert new metadata with latest=true
//     const metaQuery = `
//       INSERT INTO metadata(
//         "agency_id", 
//         "product_id", 
//         "product_name", 
//         data, 
//         "user_created_id", 
//         status, 
//         "created_by", 
//         "created_at", 
//         "updated_at", 
//         latest
//       ) 
//       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $8, true)
//       RETURNING *;
//     `;

//     const result = await poolpimd.query(metaQuery, [
//       agency_id,
//       product_id,
//       product_name,
//       data,
//       user_created_id,
//       status,
//       created_by,
//       new Date()
//     ]);

//     // If no row is inserted or returned, handle it as an error
//     if (result.rows.length == 0) {
//       return {
//         error: true,
//         errorCode: 400,
//         errorMessage: 'Error in creating metadata',
//       };
//     }

//     return result.rows[0]; // Return the newly inserted metadata
//   } catch (error) {
//     return {
//       error: true,
//       errorCode: 500,
//       errorMessage: `Error in createMetadatadb: ${error.message}`,
//     };
//   }
// }

// async function getProductdb() {
//   try {
//     const getQuery = `SELECT * FROM product`;
//     const productResult = await poolpimd.query(getQuery);
//     if (productResult.rows.length === 0) {
//       return {
//         error: true,
//         errorCode: 400,
//         errorMessage: `Unable to fetch data from ProductTable`,
//       };
//     }
//     return productResult.rows;
//   } catch (error) {
//     return {
//       error: true,
//       errorCode: 400,
//       errorMessage: `Unable to fetch data from ProductTable=${error}`,
//     };
//   }
// }

// async function getProductByIddb(productId) {
//   try {
//     const getQuery = `SELECT * FROM product WHERE id = $1`;
//     const productResult = await poolpimd.query(getQuery, [productId]);
//     if (productResult.rows.length === 0) {
//       return {
//         error: true,
//         errorCode: 400,
//         errorMessage: `Unable to fetch data from ProductTable`,
//       };
//     }
//     const getQueryagency_name = `SELECT agency_name FROM productagency WHERE "productId" = $1`;
//     const categoriesResult = await poolpimd.query(getQueryagency_name, [
//       productId,
//     ]);
//     const product = productResult.rows[0];
//     const categories = categoriesResult.rows.map((row) => row.agency_name);
//     product["agency_name"] = categories;
//     return product;
//   } catch (error) {
//     return {
//       error: true,
//       errorCode: 400,
//       errorMessage: `Unable to fetch data from ProductTable=${error}`,
//     };
//   }
// }

// async function getMetaDatadb() {
//   try {
//     const getQuery = `SELECT * FROM metadata WHERE latest=true ORDER BY "created_at" DESC`;
//     const data = await poolpimd.query(getQuery);

//     if (data.rows.length === 0) {
//       return {
//         error: true,
//         errorCode: 402,
//         errorMessage: "No data found in metaTable",
//       };
//     }

//     // Return consistent object structure on success
//     return {
//       error: false,
//       data: data.rows,
//     };
//   } catch (error) {
//     // Return detailed error message
//     return {
//       error: true,
//       errorCode: 500,
//       errorMessage: `Database error: ${error.message}`,
//     };
//   }
// }

// async function getMetaDataByProductNamedb(Product) {
//   const getQuery = `SELECT * FROM  metadata where "product_name"=$1  AND  latest=true`;
//   const data = await poolpimd.query(getQuery, [Product]);
//   if (data.rows.length == 0) {
//     return {
//       error: true,
//       errorCode: 402,
//       errorMessage: `Unable to fetch data from metaTable`,
//     };
//   }
//   return data.rows[0];
// }
// async function searchMetaDatadb(searchParams) {
//   try {
  
//     let getQuery = 'SELECT * FROM metadata WHERE true';
    
//     // Dynamically add conditions for regular table fields
//     if (searchParams.version) {
//       getQuery += ` AND version = ${searchParams.version}`;
//     }
//     if (searchParams.Product) {
//       getQuery += ` AND "Product" = '${searchParams.Product}'`;
//     }
//     if (searchParams.latest) {
//       getQuery += ` AND latest = ${searchParams.latest}`;
//     }
//     if (searchParams.user_id) {
//       getQuery += ` AND user_id = ${searchParams.user_id}`;
//     }
//     Object.keys(searchParams).forEach((key) => {
//       if (!['version', 'Product', 'latest', 'user_id'].includes(key)) {
//         getQuery += ` AND data->>'${key}' ILIKE '%${searchParams[key]}%'`;
//       }
//     });
//     getQuery += ' ORDER BY "createdDate" DESC';
    
//     const data = await poolpimd.query(getQuery);

//     if (data.rows.length === 0) {
//       return {
//         error: true,
//         errorCode: 402,
//         errorMessage: `No metadata found`,
//       };
//     }

//     return data.rows;
//   } catch (error) {
//     return {
//       error: true,
//       errorCode: 500,
//       errorMessage: `Error fetching metadata: ${error}`,
//     };
//   }
// }

// async function  getMetaDataByVersionP(product) {
//   const getQuery=`SELECT * FROM metadata where "Product"=$1`;
//   const data = await poolpimd.query(getQuery, [product]);
//   if (data.rows.length == 0) {
//     return {
//       error: true,
//       errorCode: 402,
//       errorMessage: `Unable to fetch data from metaTable`,
//     };
//   }
//   return data.rows;
// }

// async function  getMetaDataByVersionPV(product,version) {
//   const getQuery=`SELECT * FROM metadata where "Product"=$1 AND version=$2`;
//   const data = await poolpimd.query(getQuery, [product,version]);
//   if (data.rows.length == 0) {
//     return {
//       error: true,
//       errorCode: 402,
//       errorMessage: `Unable to fetch data from metaTable`,
//     };
//   }
//   return data.rows;
// }
// async function updateProductDomdb(
//   id,
//   usertype,
//   count,
//   period,
//   tooltip,
//   type,
//   viz,
//   agency_name
// ) {
//   try {
//     await poolpimd.query("BEGIN");

//     // Update product details
//     const productQuery = `UPDATE product SET 
//           usertype = $1, 
//           count = $2, 
//           period = $3, 
//           tooltip = $4, 
//           type = $5, 
//           viz = $6 
//           WHERE id = $7`;
//     await poolpimd.query(productQuery, [
//       usertype,
//       count,
//       period,
//       tooltip,
//       type,
//       viz,
//       id,
//     ]);

//     // Handle categories
//     const categories = agency_name.split(",").map((cat) => cat.trim());
//     const existingCategories = await poolpimd.query(
//       `SELECT agency_name FROM productagency WHERE "productId" = $1`,
//       [id]
//     );
//     const existingagency_nameList = existingCategories.rows.map(
//       (row) => row.agency_name
//     );

//     // Add new categories
//     for (const cat of categories) {
//       if (!existingagency_nameList.includes(cat)) {
//         const agency_nameExistsQuery = `SELECT 1 FROM agency WHERE agency_name = $1`;
//         const agency_nameExistsResult = await poolpimd.query(
//           agency_nameExistsQuery,
//           [cat]
//         );

//         if (agency_nameExistsResult.rows.length === 0) {
//           return {
//             error: true,
//             errorCode: 402,
//             errorMessage: `agency_name '${cat}' not found in agency table`,
//           };
//         }
//         const productagencyQuery = `INSERT INTO productagency("productId", agency_name) VALUES($1, $2)`;
//         await poolpimd.query(productagencyQuery, [id, cat]);
//       }
//     }

//     const getQuery = `SELECT * FROM product WHERE id = $1`;
//     const productResult = await poolpimd.query(getQuery, [id]);
//     if (productResult.rows.length === 0) {
//       return {
//         error: true,
//         errorCode: 402,
//         errorMessage: `Unable to fetch data from ProductTable`,
//       };
//     }

//     const getQueryagency_name = `SELECT agency_name FROM productagency WHERE "productId" = $1`;
//     const categoriesResult = await poolpimd.query(getQueryagency_name, [id]);
//     const product = productResult.rows[0];
//     const Allagency_name = categoriesResult.rows.map((row) => row.agency_name);
//     product["agency_name"] = Allagency_name;

//     await poolpimd.query("COMMIT");
//     return product;
//   } catch (error) {
//     await poolpimd.query("ROLLBACK");
//     return {
//       error: true,
//       errorCode: 402,
//       errorMessage: error,
//     };
//   }
// }

// async function updateProductDevdb(
//   id,
//   usertype,
//   count,
//   icon,
//   period,
//   tooltip,
//   type,
//   url,
//   table,
//   swagger,
//   viz,
//   agency_name
// ) {
//   try {
//     await poolpimd.query("BEGIN");

//     // Update product details
//     const productQuery = `UPDATE product SET 
//             usertype = $1, 
//             count = $2, 
//             icon = $3, 
//             period = $4, 
//             tooltip = $5, 
//             type = $6, 
//             url = $7, 
//             "table" = $8, 
//             swagger = $9, 
//             viz = $10 
//             WHERE id = $11`;

//     await poolpimd.query(productQuery, [
//       usertype,
//       count,
//       icon,
//       period,
//       tooltip,
//       type,
//       url,
//       table,
//       swagger,
//       viz,
//       id,
//     ]);

//     // Handle categories
//     const categories = agency_name.split(",").map((cat) => cat.trim());
//     const existingCategories = await poolpimd.query(
//       `SELECT agency_name FROM productagency WHERE "productId" = $1`,
//       [id]
//     );
//     const existingagency_nameList = existingCategories.rows.map(
//       (row) => row.agency_name
//     );

//     // Add new categories
//     for (const cat of categories) {
//       if (!existingagency_nameList.includes(cat)) {
//         const agency_nameExistsQuery = `SELECT 1 FROM agency WHERE agency_name = $1`;
//         const agency_nameExistsResult = await poolpimd.query(
//           agency_nameExistsQuery,
//           [cat]
//         );

//         if (agency_nameExistsResult.rows.length === 0) {
//           return {
//             error: true,
//             errorCode: 402,
//             errorMessage: `agency_name '${cat}' not found in agency table`,
//           };
//         }
//         const productagencyQuery = `INSERT INTO productagency("productId", agency_name) VALUES($1, $2)`;
//         await poolpimd.query(productagencyQuery, [id, cat]);
//       }
//     }
//     const getQuery = `SELECT * FROM product WHERE id = $1`;
//     const productResult = await poolpimd.query(getQuery, [id]);
//     if (productResult.rows.length === 0) {
//       return {
//         error: true,
//         errorCode: 402,
//         errorMessage: `Unable to fetch data from ProductTable`,
//       };
//     }

//     const getQueryagency_name = `SELECT agency_name FROM productagency WHERE "productId" = $1`;
//     const categoriesResult = await poolpimd.query(getQueryagency_name, [id]);
//     const product = productResult.rows[0];
//     const Allagency_name = categoriesResult.rows.map((row) => row.agency_name);
//     product["agency_name"] = Allagency_name;

//     await poolpimd.query("COMMIT");
//     return product;
//   } catch (error) {
//     await poolpimd.query("ROLLBACK");
//   }
// }




// async function updateMetadatadb(
//   Product,
//   metadata,
//   user_id
// ) {

//   try {
//     await poolpimd.query("BEGIN");
//     const getQuery=`SELECT * FROM metadata where latest=true AND "Product"=$1`
//     const data=await poolpimd.query(getQuery,[Product])
//     if(data.rowCount==0){
//       return {
//         error: true,
//         errorCode: 400,
//         errorMessage: `Error in getting metadata`,
//       };
//     }
//     const {version}=data.rows[0];
//     const newVersion=version+1;
//     await poolpimd.query(`Update metadata SET latest=$1 where "Product"=$2 ANd version=$3 `,[false,Product,version])
//     const metaQuery = `INSERT INTO metadata("Product",data,version,latest,user_id,"createdDate") VALUES($1,$2,$3,$4,$5,$6)`;

//     await poolpimd.query(metaQuery, [
//       Product,
//       metadata,
//       newVersion,
//       true,
//       user_id,
//       new Date()
//     ]);
//     const result = await poolpimd.query(
//       `SELECT * FROM metadata where "version"=$1 And "Product"=$2`,
//       [newVersion,Product]
//     );
//     if (result.rows.length == 0) {
//       return {
//         error: true,
//         errorCode: 400,
//         errorMessage: `Error in update metadata`,
//       };
//     }
//     await poolpimd.query("COMMIT");
//     return result.rows[0];
//   } catch (error) {
//     await poolpimd.query("ROLLBACK");
//     return {
//       error: true,
//       errorCode: 500,
//       errorMessage: `Error in createMetadatadb ${error}`,
//     };
//   }
// }

// async function deleteProductdb(id) {
//   try {
//     const productQuery = `DELETE FROM product  WHERE id=$1;`;
//     const metaDataQuery = `DELETE FROM metadata  WHERE "Product"=$1;`;
//     const agency_nameQuery = `DELETE FROM productagency  WHERE "productId"=$1;`;
//     await poolpimd.query(metaDataQuery, [id]);
//     await poolpimd.query(agency_nameQuery, [id]);
//     await poolpimd.query(productQuery, [id]);
//   } catch (error) {
//     return {
//       error: true,
//       errorCode: 500,
//       errorMessage: `Error deleting product: ${error}`,
//     };
//   }
// }

// async function deleteMetadatadb(product) {
//   try {
//     // Ensure the SQL query matches the actual column storing the product name
//     const metaDataQuery = `DELETE FROM metadata WHERE "product_name" = $1;`;
//     const result = await poolpimd.query(metaDataQuery, [product]);

//     // If no rows were deleted, handle it as an error
//     if (result.rowCount === 0) {
//       return {
//         error: true,
//         errorCode: 404,
//         errorMessage: `No metadata found for product: ${product}`,
//       };
//     }

//     return { success: true };
//   } catch (error) {
//     console.error("Database error:", error);
//     return {
//       error: true,
//       errorCode: 500,
//       errorMessage: `Error deleting metadata: ${error.message || error}`,
//     };
//   }
// }
// async function getMetadataByAgencydb(agency_name) {
//   if (!agency_name) {
//     throw new Error("Agency name is required");
//   }
  
//   const query = 'SELECT * FROM metadata WHERE agency_id = (SELECT agency_id FROM agency WHERE agency_name = $1) AND latest=true'; 
//   const values = [agency_name];

//   try {
//     const result = await poolpimd.query(query, values);

//     if (result.rows.length === 0) {
//       throw new Error(`No data found for agency_name: ${agency_name}`);
//     }

//     return result.rows[0]; 
//   } catch (error) {
//     console.error("Error fetching agency data:", error.message);
//     throw error;
//   }
// }




module.exports = {
  poolpimd,

  EmailValidation,
  updatePassword,
  createUserdb,
  getUserdb,
  updateUserDb,
  deleteUserDb,
  
  createagencydb,
  getagencydb,
  updateagencydb,
  deleteagencydb,

  // getMetadataByAgencyIddb

  // deleteMetadatadb,
  // deleteProductdb,
  // updateMetadataDevdb,
  // updateMetadataDomdb,
  // updateMetadatadb,
  // getMetaDataByVersionP,
  // getMetaDataByVersionPV,
  // updateProductDevdb,
  // updateProductDomdb,
  // getagencyByIddb,
  // getMetaDataByProductNamedb,
  // getProductByIddb,
  // createMetadatadb,
  // createProductdb,
  // getMetaDatadb,
  // getProductdb,
  // searchMetaDatadb,
  // getMetadataByAgencydb
};
