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



async function createUserdb(username, password, title, name, email, phone, address, roleIds) {
  const hashedPassword = await bcrypt.hash(password, 10);

  // Start a transaction to ensure atomicity in creating a user and assigning roles
  const client = await poolpimd.connect();
  try {
    await client.query('BEGIN');

    // Insert the new user
    const insertUserQuery = `
      INSERT INTO users(username, password, title, name, email, phone, address, "created_by")
      VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, title, name, email, phone, address, "created_by"
    `;
    const userResult = await client.query(insertUserQuery, [
      username, hashedPassword, title, name, email, phone, address, new Date()
    ]);

    const newUser = userResult.rows[0];

    // Check if the roles are provided
    if (!roleIds || roleIds.length === 0) {
      throw new Error("User creation failed: at least one role must be assigned.");
    }

    // Insert roles for the user in the userroles table
    const insertrolePromises = roleIds.map(roleId => {
      const insertUserroleQuery = `
        INSERT INTO userroles(user_id, role_id) VALUES($1, $2)
      `;
      return client.query(insertUserroleQuery, [newUser.id, roleId]);
    });
    await Promise.all(insertrolePromises);

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

async function  getUserdb(){
 const user=await poolpimd.query(`SELECT username, title, name, email, phone, address,"created_by"  FROM users `)
if (user.rows.length === 0) {
  return {
    error: true,
    errorCode: 405,
    errorMessage: `unable to get user`,
  };
}
 return user.rows;
}
async function getUserByUsernameDb(username) {
  const user = await poolpimd.query(
    `SELECT username, title, name, email, phone, address, "created_by" FROM users WHERE username = $1`,
    [username]
  );
  if (user.rows.length === 0) {
    return {
      error: true,
      errorCode: 404,
      errorMessage: `User not found`,
    };
  }
  return user.rows[0];
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
async function updateUserDb(username, title, name, email, phno, address, password) {
  let hashedPassword;
  
  if (password) {
    hashedPassword = await bcrypt.hash(password, 10); // Hash the new password if provided
  }

  const query = `UPDATE pimdusers SET 
                  title = $1, 
                  name = $2, 
                  email = $3, 
                  phno = $4, 
                  address = $5,
                  password = COALESCE($6, password) -- Only update password if a new one is provided
                WHERE username = $7 
                RETURNING *`;

  const user = await poolpimd.query(query, [
    title, name, email, phno, address, hashedPassword, username
  ]);

  if (user.rows.length === 0) {
    return {
      error: true,
      errorCode: 404,
      errorMessage: `User not found`,
    };
  }
  return user.rows[0];
}

async function updateuserroles(username, roleIds) {
  let client;

  try {
    // Get a client from the pool
    client = await poolpimd.connect();
  
    // First, check if the user exists
    const userCheckQuery = `SELECT * FROM pimdusers WHERE username = $1`;
    const userCheck = await client.query(userCheckQuery, [username]);

    if (userCheck.rows.length === 0) {
      return {
        error: true,
        errorCode: 404,
        errorMessage: `User not found`,
      };
    }

    // Delete existing roles associated with this user (if any)
    const deleterolesQuery = `DELETE FROM "userroles" WHERE userId = (SELECT id FROM pimdusers WHERE username = $1)`;
    await client.query(deleterolesQuery, [username]);

    // Now, insert the new roles for the user
    const insertrolesQuery = `INSERT INTO "userroles" (userId, roleId) 
                               SELECT id, unnest($1::int[]) FROM pimdusers WHERE username = $2`;
    await client.query(insertrolesQuery, [roleIds, username]);

    // Return success message or the updated roles (optional)
    return {
      success: true,
      message: 'User roles updated successfully',
    };

  } catch (error) {
    console.error('Error updating user roles:', error);
    return {
      error: true,
      errorCode: 500,
      errorMessage: 'Something went wrong while updating user roles',
    };
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release();
    }
  }
}

async function EmailValidation(username) {
  const query = "SELECT * FROM users WHERE username = $1";
  const result = await poolpimd.query(query, [username]);
  return result.rows[0];
}

// async function createProductdb(
//   id,
//   title,
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

//     const productQuery = `INSERT INTO product(id, title, count, icon, period, tooltip, type, url, "table", swagger, viz, "authorId", "createdDate") VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
//     await poolpimd.query(productQuery, [
//       id,
//       title,
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

async function createagencydb(agency_name) {
  try {
    const sqlQuery = `INSERT INTO agency(agency_name) VALUES($1)`;
    await poolpimd.query(sqlQuery, [agency_name]);
    const result = await poolpimd.query(
      "SELECT * FROM agency WHERE agency_name=$1",
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

async function createMetadatadb({ agency_id, product_id, product_name, data, user_created_id, status, created_by }) {
  try {
    // Step 1: Update previous records for this product_id to set latest=false
    const updateQuery = `
      UPDATE metadata 
      SET latest=false 
      WHERE "product_id" = $1 AND latest=true;
    `;

    await poolpimd.query(updateQuery, [product_id]);

    // Step 2: Insert new metadata with latest=true
    const metaQuery = `
      INSERT INTO metadata(
        "agency_id", 
        "product_id", 
        "product_name", 
        data, 
        "user_created_id", 
        status, 
        "created_by", 
        "created_at", 
        "updated_at", 
        latest
      ) 
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $8, true)
      RETURNING *;
    `;

    const result = await poolpimd.query(metaQuery, [
      agency_id,
      product_id,
      product_name,
      data,
      user_created_id,
      status,
      created_by,
      new Date()
    ]);

    // If no row is inserted or returned, handle it as an error
    if (result.rows.length == 0) {
      return {
        error: true,
        errorCode: 400,
        errorMessage: 'Error in creating metadata',
      };
    }

    return result.rows[0]; // Return the newly inserted metadata
  } catch (error) {
    return {
      error: true,
      errorCode: 500,
      errorMessage: `Error in createMetadatadb: ${error.message}`,
    };
  }
}

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

async function getMetaDatadb() {
  try {
    const getQuery = `SELECT * FROM metadata WHERE latest=true ORDER BY "created_at" DESC`;
    const data = await poolpimd.query(getQuery);

    if (data.rows.length === 0) {
      return {
        error: true,
        errorCode: 402,
        errorMessage: "No data found in metaTable",
      };
    }

    // Return consistent object structure on success
    return {
      error: false,
      data: data.rows,
    };
  } catch (error) {
    // Return detailed error message
    return {
      error: true,
      errorCode: 500,
      errorMessage: `Database error: ${error.message}`,
    };
  }
}

async function getMetaDataByProductNamedb(Product) {
  const getQuery = `SELECT * FROM  metadata where "product_name"=$1  AND  latest=true`;
  const data = await poolpimd.query(getQuery, [Product]);
  if (data.rows.length == 0) {
    return {
      error: true,
      errorCode: 402,
      errorMessage: `Unable to fetch data from metaTable`,
    };
  }
  return data.rows[0];
}
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

async function getagencydb() {
  try {
    const getQuery = `SELECT * FROM agency `;
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

async function getagencyByIddb(agency_name) {
  const getQuery = `SELECT * FROM agency where agency_name=$1`;
  const data = await poolpimd.query(getQuery, [agency_name]);

  if (data.rows.length == 0) {
    return {
      error: true,
      errorCode: 402,
      errorMessage: `Unable to fetch data from agency Table`,
    };
  }
  return data.rows[0];
}

// async function updateProductDomdb(
//   id,
//   title,
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
//           title = $1, 
//           count = $2, 
//           period = $3, 
//           tooltip = $4, 
//           type = $5, 
//           viz = $6 
//           WHERE id = $7`;
//     await poolpimd.query(productQuery, [
//       title,
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
//   title,
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
//             title = $1, 
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
//       title,
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

async function updateagencydb(name, agency_name) {
  const updateQuery = `UPDATE agency SET name=$1 where agency_name=$2 `;
  await poolpimd.query(updateQuery, [name, agency_name]);
  const getQuery = `SELECT * FROM agency where agency_name=$1`;
  const data = await poolpimd.query(getQuery, [agency_name]);
  if (data.rows.length == 0) {
    return {
      error: true,
      errorCode: 402,
      errorMessage: `Unable to fetch data from agency Table`,
    };
  }
  return data.rows[0];
}

async function updateMetadatadb(
  Product,
  metadata,
  user_id
) {

  try {
    await poolpimd.query("BEGIN");
    const getQuery=`SELECT * FROM metadata where latest=true AND "Product"=$1`
    const data=await poolpimd.query(getQuery,[Product])
    if(data.rowCount==0){
      return {
        error: true,
        errorCode: 400,
        errorMessage: `Error in getting metadata`,
      };
    }
    const {version}=data.rows[0];
    const newVersion=version+1;
    await poolpimd.query(`Update metadata SET latest=$1 where "Product"=$2 ANd version=$3 `,[false,Product,version])
    const metaQuery = `INSERT INTO metadata("Product",data,version,latest,user_id,"createdDate") VALUES($1,$2,$3,$4,$5,$6)`;

    await poolpimd.query(metaQuery, [
      Product,
      metadata,
      newVersion,
      true,
      user_id,
      new Date()
    ]);
    const result = await poolpimd.query(
      `SELECT * FROM metadata where "version"=$1 And "Product"=$2`,
      [newVersion,Product]
    );
    if (result.rows.length == 0) {
      return {
        error: true,
        errorCode: 400,
        errorMessage: `Error in update metadata`,
      };
    }
    await poolpimd.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await poolpimd.query("ROLLBACK");
    return {
      error: true,
      errorCode: 500,
      errorMessage: `Error in createMetadatadb ${error}`,
    };
  }
}

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

async function deleteMetadatadb(product) {
  try {
    // Ensure the SQL query matches the actual column storing the product name
    const metaDataQuery = `DELETE FROM metadata WHERE "product_name" = $1;`;
    const result = await poolpimd.query(metaDataQuery, [product]);

    // If no rows were deleted, handle it as an error
    if (result.rowCount === 0) {
      return {
        error: true,
        errorCode: 404,
        errorMessage: `No metadata found for product: ${product}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Database error:", error);
    return {
      error: true,
      errorCode: 500,
      errorMessage: `Error deleting metadata: ${error.message || error}`,
    };
  }
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

async function getMetadataByAgencydb(agency_name) {
  if (!agency_name) {
    throw new Error("Agency name is required");
  }
  
  const query = 'SELECT * FROM metadata WHERE agency_id = (SELECT agency_id FROM agency WHERE agency_name = $1) AND latest=true'; 
  const values = [agency_name];

  try {
    const result = await poolpimd.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`No data found for agency_name: ${agency_name}`);
    }

    return result.rows[0]; 
  } catch (error) {
    console.error("Error fetching agency data:", error.message);
    throw error;
  }
}




module.exports = {
  poolpimd,
  EmailValidation,
  deleteagencydb,
  deleteMetadatadb,
  // deleteProductdb,
  updateuserroles,
  // updateMetadataDevdb,
  // updateMetadataDomdb,
  updateMetadatadb,
  // getMetaDataByVersionP,
  // getMetaDataByVersionPV,
  updateagencydb,
  // updateProductDevdb,
  // updateProductDomdb,
  getagencyByIddb,
  getMetaDataByProductNamedb,
  // getProductByIddb,
  createMetadatadb,
  createagencydb,
  // createProductdb,
  getMetaDatadb,
  getagencydb,
  // getProductdb,
  // searchMetaDatadb,
  createUserdb,
  getUserdb,
  getUserByUsernameDb,
  deleteUserDb,
  updateUserDb,
  getMetadataByAgencydb
};
