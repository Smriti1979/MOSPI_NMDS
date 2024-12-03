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

async function updatePassword(userId, hashedPassword) {
  const query = `
    UPDATE users
    SET password = $1, newuser = false
    WHERE user_id = $2
    RETURNING user_id, username;
  `;

  const result = await poolpimd.query(query, [hashedPassword, userId]);
  return result.rows[0]; // Returns updated user details or undefined if no match
}


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


async function createagencydb(agency_name,created_by) {
  try {
    const sqlQuery = `INSERT INTO agencies (agency_name, created_by) VALUES($1,&2) RETURNING *`;
    await poolpimd.query(sqlQuery, [agency_name,created_by]);
    const result = await poolpimd.query(
      "SELECT * FROM agencies WHERE agency_name=$1",
      [agency_name,created_by]
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
    // Start a transaction
    await poolpimd.query("BEGIN");

    // Fetch the agency_id for the given agency_name
    const getAgencyIdQuery = `SELECT agency_id FROM agencies WHERE agency_name = $1`;
    const agencyResult = await poolpimd.query(getAgencyIdQuery, [agency_name]);

    if (agencyResult.rows.length === 0) {
      // Rollback if the agency does not exist
      await poolpimd.query("ROLLBACK");
      return {
        error: true,
        errorCode: 404,
        errorMessage: `Agency with name "${agency_name}" not found.`,
      };
    }

    const agencyId = agencyResult.rows[0].agency_id;

    // Delete associated metadata
    const deleteMetadataQuery = `DELETE FROM metadata WHERE agency_id = $1`;
    await poolpimd.query(deleteMetadataQuery, [agencyId]);

    // Delete associated users
    const deleteUsersQuery = `DELETE FROM users WHERE agency_id = $1`;
    await poolpimd.query(deleteUsersQuery, [agencyId]);

    // Delete the agency
    const deleteAgencyQuery = `DELETE FROM agencies WHERE agency_name = $1`;
    await poolpimd.query(deleteAgencyQuery, [agency_name]);

    // Commit the transaction
    await poolpimd.query("COMMIT");

    return {
      success: true,
      message: `Agency and all associated records deleted successfully.`,
    };
  } catch (error) {
    // Rollback transaction in case of an error
    await poolpimd.query("ROLLBACK");
    return {
      error: true,
      errorCode: 500,
      errorMessage: `Error deleting agency: ${error.message}`,
    };
  }
}
async function createMetadatadb({ agency_id, product_name, data, released_data_link, created_by }) {
  try {
    // Step 1: Check if the product with the same agency_id and product_name already exists
    const existingProductQuery = `
      SELECT metadata_id FROM metadata
      WHERE agency_id = $1 AND product_name = $2;
    `;

    const existingProductResult = await poolpimd.query(existingProductQuery, [agency_id, product_name]);

    if (existingProductResult.rows.length > 0) {
      // If the product exists, return an error
      return {
        error: true,
        errorMessage: "Metadata with the same agency_id and product_name already exists.",
      };
    }

    // Step 2: Find the max metadata_id for new products and initialize version
    const maxMetadataQuery = `
      SELECT MAX(metadata_id) AS max_metadata_id FROM metadata;
    `;

    const maxMetadataResult = await poolpimd.query(maxMetadataQuery);

    const maxMetadataId = maxMetadataResult.rows[0].max_metadata_id || 0; // Default to 0 if no records exist
    const metadataId = maxMetadataId + 1; // Increment for the new product
    const version = 1; // Start version at 1 for new products

    // Step 3: Insert the new metadata record with `latest_version = true`
    const insertQuery = `
      INSERT INTO metadata (
        metadata_id,
        agency_id,
        product_name,
        data,
        released_data_link,
        created_by,
        created_at,
        latest_version,
        version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
      RETURNING *;
    `;

    const result = await poolpimd.query(insertQuery, [
      metadataId,
      agency_id,
      product_name,
      data,
      released_data_link,
      created_by,
      new Date(),
      version,
    ]);

    // Handle case where no rows are inserted
    if (result.rows.length === 0) {
      return {
        error: true,
        errorMessage: "Failed to create metadata.",
      };
    }

    return result.rows[0]; // Return the newly created metadata
  } catch (error) {
    console.error("Error in createMetadatadb:", error);
    return {
      error: true,
      errorMessage: `Error in createMetadatadb: ${error.message}`,
    };
  }
}

async function getAllMetadatadb() {
  try {
    const query = `
      SELECT metadata_id, agency_id, product_name, version, latest_version, released_data_link, created_by, created_at, updated_by, updated_at
      FROM metadata
      ORDER BY created_at DESC; -- Sort by creation time
    `;

    const result = await poolpimd.query(query);

    // Return all rows fetched from the database
    return {
      error: false,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error in getAllMetadatadb:", error);
    return {
      error: true,
      errorMessage: `Error in getAllMetadatadb: ${error.message}`,
    };
  }
}
async function deleteMetadatadb(id) {
  try {
    const deleteQuery = `
      DELETE FROM metadata
      WHERE id = $1;
    `;

    const result = await poolpimd.query(deleteQuery, [id]);

    if (result.rowCount === 0) {
      return {
        error: true,
        errorMessage: "No metadata found with the given ID.",
      };
    }

    return {
      error: false,
      message: "Metadata deleted successfully.",
    };
  } catch (error) {
    console.error("Error in deleteMetadatadb:", error);
    return {
      error: true,
      errorMessage: `Error in deleteMetadatadb: ${error.message}`,
    };
  }
}


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

  createMetadatadb,
  getAllMetadatadb,
  deleteMetadatadb

  // getMetadataByAgencyIddb

  // deleteMetadatadb,
  // updateMetadataDevdb,
  // updateMetadataDomdb,
  // updateMetadatadb,
  // getMetaDataByVersionP,
  // getMetaDataByVersionPV,
  // getagencyByIddb,
  
  // searchMetaDatadb,
  // getMetadataByAgencydb
};
