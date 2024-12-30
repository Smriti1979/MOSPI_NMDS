/** @format */
const db = require("../models/index.js");
const { Pool } = require("pg");
require("dotenv").config();
const bcrypt = require("bcrypt");
// DB connection for ASI
const poolmwp = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASETPM,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT, // Default PostgreSQL port
});


poolmwp.connect((err, client, release) => {
  if (err) {
    return console.error("Error acquiring client", err.stack);
  }
  console.log("Database connected successfully");
  release();
});

// const getAllowedRoles = async (usertype) => {
//   try {
//     // Query to fetch allowed roles for the logged-in user's usertype
//     const result = await poolmwp.query(
//       `SELECT ur.role_name 
//        FROM userroles ur
//        JOIN roles r ON ur.role_name = r.role_name
//        WHERE ur.usertype = $1`,
//       [usertype]
//     );

//     // Extract role names
//     return result.rows.map((row) => row.role_name);
//   } catch (error) {
//     console.error("Error fetching allowed roles:", error);
//     throw new Error("Failed to fetch allowed roles");
//   }
// };

// const getRoleNameByUsertype = async (usertype) => {
//   try {
//     // Query to fetch role name for the specified usertype
//     const result = await poolmwp.query(
//       `SELECT r.role_name 
//        FROM roles r
//        WHERE r.usertype = $1`,
//       [usertype]
//     );

//     // Return the role name (or null if not found)
//     return result.rows[0]?.role_name || null;
//   } catch (error) {
//     console.error("Error fetching role name for usertype:", error);
//     throw new Error("Failed to fetch role name for usertype");
//   }
// };

const allowedCreateOperations = async (usertype) => {
  try {
    // Execute the query with a parameterized usertype
    const result = await poolmwp.query(
      `SELECT cancreate
       FROM userroles
       WHERE usertype = $1;`,
      [usertype]
    );

    // Return the rows (or an empty array if no results)
    return result.rows.map(row => row.cancreate);
  } catch (error) {
    console.error("Error fetching allowed create operations:", error);
    throw new Error("Failed to fetch allowed create operations");
  }
};

const allowedUpdateOperations = async (usertype) => {
  try {
    // Execute the query with a parameterized usertype
    const result = await poolmwp.query(
      `SELECT canupdate
       FROM userroles
       WHERE usertype = $1;`,
      [usertype]
    );

    // Return the rows (or an empty array if no results)
    return result.rows.map(row => row.canupdate);
  } catch (error) {
    console.error("Error fetching allowed update operations:", error);
    throw new Error("Failed to fetch allowed update operations");
  }
};


const allowedReadOperations = async (usertype) => {
  try {
    const result = await poolmwp.query(
      `SELECT canread
       FROM userroles
       WHERE usertype = $1;`,
      [usertype]
    );

    // Extract 'canread' permissions into an array
    return result.rows.map((row) => row.canread);
  } catch (error) {
    console.error("Error fetching allowed read operations:", error);
    throw new Error("Failed to fetch allowed read operations");
  }
};

const allowedDeleteOperations = async (usertype) => {
  try {
    // Execute the query with a parameterized usertype
    const result = await poolmwp.query(
      `SELECT candelete
       FROM userroles
       WHERE usertype = $1;`,
      [usertype]
    );

    // Return the rows (or an empty array if no results)
    return result.rows.map(row => row.candelete);
  } catch (error) {
    console.error("Error fetching allowed delete operations:", error);
    throw new Error("Failed to fetch allowed delete operations");
  }
};



async function EmailValidation(username) {
  const query = "SELECT * FROM users WHERE username = $1";
  const result = await poolmwp.query(query, [username]);
  return result.rows[0];
}

async function updatePassword(userId, hashedPassword) {
  const query = `
    UPDATE users
    SET password = $1, newuser = false
    WHERE user_id = $2
    RETURNING user_id, username;
  `;

  const result = await poolmwp.query(query, [hashedPassword, userId]);
  return result.rows[0]; // Returns updated user details or undefined if no match
}

async function getagencyidbyusernamedb(username) {
  try {
    // Validate the input
    if (!username) {
      throw new Error("Username is required to fetch agency data.");
    }

    // Query to fetch agency_id from the users table
    const query = `SELECT agency_id FROM users WHERE username = $1`;
    const result = await poolmwp.query(query, [username]);

    // Handle case where no rows are returned
    if (result.rows.length === 0) {
      throw new Error(`No agency found for username: ${username}`);
    }

    // Return the agency_id from the result
    return result.rows[0].agency_id;
  } catch (error) {
    console.error("Error fetching agency data:", error.message);
    throw new Error(`Error fetching agency ID for username: ${username}. ${error.message}`);
  }
}



async function createUserdb(agency_id, username, password, usertype, name, email, phone, address, created_by) {
  if (!agency_id || !username || !password || !usertype || !name || !email || !phone || !address) {
      return { error: true, errorMessage: "All fields are required" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const client = await poolmwp.connect();

  try {
      await client.query('BEGIN');

      const insertUserQuery = `
          INSERT INTO users(agency_id, username, password, usertype, name, email, phone, address, created_by)
          VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
      `;
      const userResult = await client.query(insertUserQuery, [
          agency_id, username, hashedPassword, usertype, name, email, phone, address, created_by
      ]);

      const newUser = userResult.rows[0];
      await client.query('COMMIT');
      return newUser;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error in createUserdb:", error.message);

    // Check for duplicate values based on PostgreSQL unique constraint error
    if (error.code === '23505') {
      const duplicateField = error.detail.match(/\((.*?)\)/)?.[1];
      return {
        error: true,
        errorMessage: `Duplicate value for ${duplicateField}. Please provide a unique value.`,
      };
    }

    return { error: true, errorMessage: "Unable to create user" };
  } finally {
      client.release();
  }
}

async function getUserdb(allowedUsertypes) {
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
      WHERE 
        users.usertype = ANY($1); -- Filter by allowed user types
    `;

    const users = await poolmwp.query(query, [allowedUsertypes]);

    if (users.rows.length === 0) {
      return {
        error: true,
        errorCode: 405,
        errorMessage: "No users found for the allowed user types",
      };
    }

    return users.rows;
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

  const user = await poolmwp.query(query, [
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
  const query = `DELETE FROM users WHERE username = $1`; 
  try {
    const user = await poolmwp.query(query, [username]);

    if (user.rowCount === 0) {
      return {
        error: true,
        errorCode: 404,
        errorMessage: `User not found`,
      };
    }

    return {
      error: false,
      data: user.rows[0], // Return the deleted user information
    };
  } catch (err) {
    return {
      error: true,
      errorCode: 500,
      errorMessage: `Database error: ${err.message}`,
    };
  }
}


async function getUsertypeFromUsername(username) {
  const query = `SELECT usertype FROM users WHERE username = $1`;
  try {
    const result = await poolmwp.query(query, [username]);
    if (result.rows.length === 0) {
      return { error: true, errorMessage: "User not found." };
    }
    return result.rows[0]; // This will return { usertype: "some_usertype" }
  } catch (error) {
    return { error: true, errorMessage: error.message };
  }
}

async function getAllUserTypesDb() {
  const client = await poolmwp.connect(); // Ensure you're using the proper database connection
  try {
    const query = `SELECT usertype FROM userroles`; // Adjust columns as necessary
    const { rows } = await client.query(query);

    if (rows.length === 0) {
      return { success: false, data: [] };
    }

    return { success: true, data: rows };
  } catch (error) {
    console.error("Error retrieving user types:", error);
    return { success: false, data: [], message: "Failed to retrieve user types" };
  } finally {
    client.release();
  }
}


async function createagencydb(agency_name, created_by) {
  try {
    const sqlQuery = `INSERT INTO agencies (agency_name, created_by) VALUES($1, $2) RETURNING *`;
    const result = await poolmwp.query(sqlQuery, [agency_name, created_by]);

    // Check if insertion was successful
    if (result.rows.length === 0) {
      return {
        error: true,
        errorCode: 405,
        errorMessage: `Agency not found after insertion`,
      };
    }
    return result.rows[0];
  } catch (error) {
    // Log the actual error for debugging purposes
    console.error('Error in DB query:', error);
    return {
      error: true,
      errorCode: 405,
      errorMessage: `Problem in DB, unable to create agency: ${error.message}`,
    };
  }
}


async function getagencydb() {
  try {
    const getQuery = `SELECT * FROM agencies `;
    const data = await poolmwp.query(getQuery);
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
  await poolmwp.query(updateQuery, [new_agency_name, agency_name]);

  // Fetch the updated record to return as a response
  const getQuery = `SELECT * FROM agencies WHERE agency_name=$1`;
  const data = await poolmwp.query(getQuery, [new_agency_name]);

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
    await poolmwp.query("BEGIN");

    // Fetch the agency_id for the given agency_name
    const getAgencyIdQuery = `SELECT agency_id FROM agencies WHERE agency_name = $1`;
    const agencyResult = await poolmwp.query(getAgencyIdQuery, [agency_name]);

    if (agencyResult.rows.length === 0) {
      // Rollback if the agency does not exist
      await poolmwp.query("ROLLBACK");
      return {
        error: true,
        errorCode: 404,
        errorMessage: `Agency with name "${agency_name}" not found.`,
      };
    }

    const agencyId = agencyResult.rows[0].agency_id;

    // Delete associated metadata
    const deleteMetadataQuery = `DELETE FROM metadata WHERE agency_id = $1`;
    await poolmwp.query(deleteMetadataQuery, [agencyId]);

    // Delete associated users
    const deleteUsersQuery = `DELETE FROM users WHERE agency_id = $1`;
    await poolmwp.query(deleteUsersQuery, [agencyId]);

    // Delete the agency
    const deleteAgencyQuery = `DELETE FROM agencies WHERE agency_name = $1`;
    await poolmwp.query(deleteAgencyQuery, [agency_name]);

    // Commit the transaction
    await poolmwp.query("COMMIT");

    return {
      success: true,
      message: `Agency and all associated records deleted successfully.`,
    };
  } catch (error) {
    // Rollback transaction in case of an error
    await poolmwp.query("ROLLBACK");
    return {
      error: true,
      errorCode: 500,
      errorMessage: `Error deleting agency: ${error.message}`,
    };
  }
}
async function createMetadatadb({
  agency_id,
  product_name,
  contact,
  statistical_presentation_and_description,
  institutional_mandate,
  quality_management,
  accuracy_and_reliability,
  timeliness,
  coherence_and_comparability,
  statistical_processing,
  metadata_update,
  released_data_link,
  created_by,
}) {
  try {
    // Step 1: Check if the product with the same agency_id and product_name already exists
    const existingProductQuery = `
      SELECT metadata_id FROM metadata
      WHERE agency_id = $1 AND product_name = $2;
    `;
    const existingProductResult = await poolmwp.query(existingProductQuery, [agency_id, product_name]);

    if (existingProductResult.rows.length > 0) {
      return {
        error: true,
        errorMessage: "Metadata with the same agency_id and product_name already exists.",
      };
    }

    // Step 2: Find the max metadata_id
    const maxMetadataQuery = `SELECT MAX(metadata_id) AS max_metadata_id FROM metadata;`;
    const maxMetadataResult = await poolmwp.query(maxMetadataQuery);
    const maxMetadataId = maxMetadataResult.rows[0]?.max_metadata_id || 0;
    const metadataId = maxMetadataId + 1;
    const version = 1; // Starting version for new metadata

    // Step 3: Insert the new metadata record
    const insertQuery = `
      INSERT INTO metadata (
        metadata_id,
        agency_id,
        product_name,
        contact,
        statistical_presentation_and_description,
        institutional_mandate,
        quality_management,
        accuracy_and_reliability,
        timeliness,
        coherence_and_comparability,
        statistical_processing,
        metadata_update,
        released_data_link,
        created_by,
        created_at,
        latest_version,
        version
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
      RETURNING *;
    `;
    const result = await poolmwp.query(insertQuery, [
      metadataId,
      agency_id,
      product_name,
      contact,
      statistical_presentation_and_description,
      institutional_mandate,
      quality_management,
      accuracy_and_reliability,
      timeliness,
      coherence_and_comparability,
      statistical_processing,
      metadata_update,
      released_data_link,
      created_by,
      new Date(), // created_at
      true, // latest_version
      version,
    ]);

    // Handle case where no rows are inserted
    if (result.rows.length === 0) {
      return {
        error: true,
        errorMessage: "Failed to create metadata.",
      };
    }

    return result.rows[0]; // Return the created metadata
  } catch (error) {
    console.error("Error in createMetadatadb:", error);
    return {
      error: true,
      errorMessage: `Error in createMetadatadb: ${error.message}`,
    };
  }
}

async function updateMetadatadb(metadataId, updatedData) {
  const client = await poolmwp.connect(); // Ensure you're using the proper database connection
  try {
    await client.query("BEGIN");

    // Fetch the most recent row for the given metadata ID
    const { rows } = await client.query(
      `SELECT * FROM metadata 
       WHERE metadata_id = $1 AND latest_version = true 
       ORDER BY version DESC 
       LIMIT 1`,
      [metadataId]
    );

    if (rows.length === 0) {
      return { error: true, errorMessage: "Metadata not found." };
    }

    const previousData = rows[0];
    const newVersion = previousData.version + 1;

    // Merge provided fields with the previous data
    const newData = {
      product_name: updatedData.product_name ?? previousData.product_name,
      contact: updatedData.contact ?? previousData.contact,
      statistical_presentation_and_description:
        updatedData.statistical_presentation_and_description ??
        previousData.statistical_presentation_and_description,
      institutional_mandate:
        updatedData.institutional_mandate ?? previousData.institutional_mandate,
      quality_management: updatedData.quality_management ?? previousData.quality_management,
      accuracy_and_reliability:
        updatedData.accuracy_and_reliability ?? previousData.accuracy_and_reliability,
      timeliness: updatedData.timeliness ?? previousData.timeliness,
      coherence_and_comparability:
        updatedData.coherence_and_comparability ?? previousData.coherence_and_comparability,
      statistical_processing:
        updatedData.statistical_processing ?? previousData.statistical_processing,
      metadata_update: updatedData.metadata_update ?? previousData.metadata_update,
      released_data_link:
        updatedData.released_data_link ?? previousData.released_data_link,
      metadata_id: metadataId,
      agency_id: previousData.agency_id, // Keep the same agency_id as previous
      version: newVersion,
      latest_version: true,
      created_by: updatedData.created_by || previousData.created_by,
    };

    // Mark the previous row as not the latest
    await client.query(
      `UPDATE metadata 
       SET latest_version = false 
       WHERE metadata_id = $1 AND version = $2`,
      [metadataId, previousData.version]
    );

    // Insert the new version
    const insertQuery = `
      INSERT INTO metadata (
        metadata_id, agency_id, product_name, contact, 
        statistical_presentation_and_description, institutional_mandate, 
        quality_management, accuracy_and_reliability, timeliness, 
        coherence_and_comparability, statistical_processing, metadata_update, 
        released_data_link, version, latest_version, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING *`;

    const insertValues = [
      newData.metadata_id,
      newData.agency_id,
      newData.product_name,
      newData.contact,
      newData.statistical_presentation_and_description,
      newData.institutional_mandate,
      newData.quality_management,
      newData.accuracy_and_reliability,
      newData.timeliness,
      newData.coherence_and_comparability,
      newData.statistical_processing,
      newData.metadata_update,
      newData.released_data_link,
      newData.version,
      newData.latest_version,
      newData.created_by,
    ];

    const insertResult = await client.query(insertQuery, insertValues);

    await client.query("COMMIT");
    return { success: true, data: insertResult.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating metadata:", error);
    return { error: true, errorMessage: "Failed to update metadata." };
  } finally {
    client.release();
  }
}
async function getAllMetadatadb() {
  try {
    const query = `
      SELECT metadata_id, agency_id, product_name, contact, statistical_presentation_and_description, institutional_mandate, quality_management,
  accuracy_and_reliability, timeliness, coherence_and_comparability, statistical_processing, metadata_update, released_data_link
 version, latest_version, released_data_link, created_by, created_at, updated_by, updated_at
      FROM metadata
      ORDER BY created_at DESC; -- Sort by created_at
    `;

    const result = await poolmwp.query(query);

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
      WHERE metadata_id = $1;
    `;

    const result = await poolmwp.query(deleteQuery, [id]);

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

async function searchMetadataDb(filters) {
  const { product_name, version, agency_id } = filters;
  const client = await poolmwp.connect(); // Ensure you're using the proper database connection
  try {
    const conditions = [];
    const values = [];
    let query = `SELECT * FROM metadata WHERE 1=1`;

    // Add conditions based on the provided filters
    if (product_name) {
      conditions.push(`product_name ILIKE $${conditions.length + 1}`);
      values.push(`%${product_name}%`); // Use ILIKE for case-insensitive partial match
    }
    if (version) {
      conditions.push(`version = $${conditions.length + 1}`);
      values.push(version);
    }
    if (agency_id) {
      conditions.push(`agency_id = $${conditions.length + 1}`);
      values.push(agency_id);
    }

    // Combine query with conditions
    if (conditions.length > 0) {
      query += ` AND ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY version DESC`; // Optional: Order by version for clarity

    // Execute the query
    const { rows } = await client.query(query, values);

    if (rows.length === 0) {
      return { success: false, data: [] };
    }

    return { success: true, data: rows };
  } catch (error) {
    console.error("Error retrieving metadata:", error);
    return { success: false, data: [], message: "Failed to retrieve metadata" };
  } finally {
    client.release();
  }
}

const getNextMetadataId = async () => {
  const client = await poolmwp.connect();
  try {
    const result = await client.query(
      `SELECT COALESCE(MAX(metadata_id), 0) AS max_id FROM metadata`
    );
    const maxMetadataId = result.rows[0].max_id;
    return maxMetadataId + 1; // Increment the max ID by 1
  } catch (error) {
    console.error("Error fetching next metadata ID:", error);
    throw new Error("Failed to calculate next metadata ID.");
  } finally {
    client.release();
  }
};
async function checkAgencyExists(agency_id) {
  try {
    const getQuery = `SELECT 1 FROM agencies WHERE agency_id = $1`;
    const result = await poolmwp.query(getQuery, [agency_id]);

    // If the result row count is 0, the agency_id doesn't exist
    return result.rowCount > 0; // Return true if agency_id exists, false otherwise
  } catch (error) {
    console.error("Error checking agency existence:", error);
    return false; // Return false in case of error
  }
}

// async function getMetaDataByProductNamedb(Product) {
//   const getQuery = `SELECT * FROM  metadata where "product_name"=$1  AND  latest=true`;
//   const data = await poolmwp.query(getQuery, [Product]);
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
    
//     const data = await poolmwp.query(getQuery);

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
//   const data = await poolmwp.query(getQuery, [product]);
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
//   const data = await poolmwp.query(getQuery, [product,version]);
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
//     await poolmwp.query("BEGIN");
//     const getQuery=`SELECT * FROM metadata where latest=true AND "Product"=$1`
//     const data=await poolmwp.query(getQuery,[Product])
//     if(data.rowCount==0){
//       return {
//         error: true,
//         errorCode: 400,
//         errorMessage: `Error in getting metadata`,
//       };
//     }
//     const {version}=data.rows[0];
//     const newVersion=version+1;
//     await poolmwp.query(`Update metadata SET latest=$1 where "Product"=$2 ANd version=$3 `,[false,Product,version])
//     const metaQuery = `INSERT INTO metadata("Product",data,version,latest,user_id,"createdDate") VALUES($1,$2,$3,$4,$5,$6)`;

//     await poolmwp.query(metaQuery, [
//       Product,
//       metadata,
//       newVersion,
//       true,
//       user_id,
//       new Date()
//     ]);
//     const result = await poolmwp.query(
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
//     await poolmwp.query("COMMIT");
//     return result.rows[0];
//   } catch (error) {
//     await poolmwp.query("ROLLBACK");
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
//     const result = await poolmwp.query(metaDataQuery, [product]);

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
//     const result = await poolmwp.query(query, values);

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
  poolmwp,

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
  updateMetadatadb,
  deleteMetadatadb,
  searchMetadataDb,
  getUsertypeFromUsername,

  allowedCreateOperations,
  allowedDeleteOperations,
  allowedUpdateOperations,
  allowedReadOperations,

  getagencyidbyusernamedb,
  getAllUserTypesDb,
  getNextMetadataId,
  checkAgencyExists 

  // getAllowedRoles,
  // getRoleNameByUsertype

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
