/** @format */
const db = require("../models/index.js");
const { Pool } = require("pg");
require("dotenv").config();
const bcrypt = require("bcrypt");

const poolmwp = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASETPM,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT, 
});


poolmwp.connect((err, client, release) => {
  if (err) {
    return console.error("Error acquiring client", err.stack);
  }
  console.log("Database connected successfully");
  release();
});

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

    // Query to fetch agency_id for active users only
    const query = `SELECT agency_id FROM users WHERE username = $1 AND is_active = true`;
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
        errorMessage: `${duplicateField} already exists, please provide a unique ${duplicateField}.`,
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
        users.user_id,
        users.username, 
        users.agency_id, 
        users.usertype, 
        users.name, 
        users.email, 
        users.phone, 
        users.address, 
        users.created_by, 
        users.is_active,
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
        errorMessage: "No active users found for the allowed user types",
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
async function updateUserDb(username, fieldsToUpdate) {
  // Ensure there are fields to update
  if (Object.keys(fieldsToUpdate).length === 0) {
    return {
      error: true,
      errorCode: 400,
      errorMessage: "No fields provided to update",
    };
  }

  // Dynamically construct query
  const setClause = Object.keys(fieldsToUpdate)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", ");

  const values = [...Object.values(fieldsToUpdate), username];
  const query = `
    UPDATE users
    SET ${setClause}
    WHERE username = $${values.length}
    RETURNING *;
  `;

  try {
    const user = await poolmwp.query(query, values);

    if (user.rows.length === 0) {
      return {
        error: true,
        errorCode: 404,
        errorMessage: `User not found`,
      };
    }

    return user.rows[0]; // Return the updated user data
  } catch (error) {
    return {
      error: true,
      errorCode: 500,
      errorMessage: `Database error: ${error.message}`,
    };
  }
}
async function activateUserDb (userId) {
  const query = "UPDATE users SET is_active = TRUE WHERE id = $1 RETURNING *";
  const values = [userId];

  try {
      const result = await pool.query(query, values);
      return result.rows[0]; // Return updated user data
  } catch (error) {
      throw error;
  }
};
async function deactivateUserDb(userId) {
  const query = "UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING *";
  const values = [userId];

  try {
      const result = await pool.query(query, values);
      return result.rows[0]; // Return updated user data
  } catch (error) {
      throw error;
  }
};
async function getUsertypeFromUsername(username) {
  const query = `SELECT usertype FROM users WHERE username = $1`;
  
  try {
    const result = await poolmwp.query(query, [username]);

    if (result.rows.length === 0) {
      return { error: true, errorMessage: "Active user not found." };
    }

    return result.rows[0]; // Returns { usertype: "some_usertype" }
  } catch (error) {
    console.error("Error fetching usertype:", error.message);
    return { error: true, errorMessage: "Internal server error." };
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
    const getQuery = `SELECT * FROM agencies where agency_id != 1 `; // Fetch only active agencies
    const data = await poolmwp.query(getQuery);

    if (data.rows.length === 0) {
      return {
        error: true,
        errorCode: 402,
        errorMessage: `No active agencies found.`,
      };
    }

    return data.rows;
  } catch (error) {
    console.error("Error fetching agencies:", error);
    return {
      error: true,
      errorCode: 500,
      errorMessage: `Internal server error: ${error.message}`,
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
async function activeAgencydb(agencyId) {
    const query = "UPDATE agencies SET is_active = TRUE WHERE id = $1 RETURNING *";
    const values = [agencyId];

    try {
        const result = await pool.query(query, values);
        return result.rows[0]; // Return updated agency data
    } catch (error) {
        throw error;
    }
};
async function deactiveAgencydb (agencyId){
    const query = "UPDATE agencies SET is_active = FALSE WHERE id = $1 RETURNING *";
    const values = [agencyId];

    try {
        const result = await pool.query(query, values);
        return result.rows[0]; // Return updated agency data
    } catch (error) {
        throw error;
    }
};
async function createMetadatadb({
  agency_id,
  product_name,
  contact_organisation,
  compiling_agency,
  contact_details,
  data_description,
  classification_system,
  sector_coverage,
  statistical_concepts_and_definitions,
  statistical_unit,
  statistical_population,
  reference_period,
  data_confidentiality,
  legal_acts_and_other_agreements,
  data_sharing,
  release_policy,
  release_calendar,
  frequency_of_dissemination,
  data_access,
  documentation_on_methodology,
  quality_documentation,
  quality_assurance,
  quality_assessment,
  sampling_error,
  timeliness,
  comparability_overtime,
  coherence,
  source_data_type,
  frequency_of_data_collection,
  data_collection_method,
  data_validation,
  data_compilation,
  metadata_last_posted,
  metadata_last_update,
  version,
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

    // Step 3: Insert the new metadata record
    const insertQuery = `
      INSERT INTO metadata (
        metadata_id,
        agency_id,
        product_name,
        contact_organisation,
        compiling_agency,
        contact_details,
        data_description,
        classification_system,
        sector_coverage,
        statistical_concepts_and_definitions,
        statistical_unit,
        statistical_population,
        reference_period,
        data_confidentiality,
        legal_acts_and_other_agreements,
        data_sharing,
        release_policy,
        release_calendar,
        frequency_of_dissemination,
        data_access,
        documentation_on_methodology,
        quality_documentation,
        quality_assurance,
        quality_assessment,
        sampling_error,
        timeliness,
        comparability_overtime,
        coherence,
        source_data_type,
        frequency_of_data_collection,
        data_collection_method,
        data_validation,
        data_compilation,
        metadata_last_posted,
        metadata_last_update,
        version,
        latest_version,
        released_data_link,
        created_by,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39
      )
      RETURNING *;
    `;

    const result = await poolmwp.query(insertQuery, [
      metadataId,
      agency_id,
      product_name,
      contact_organisation,
      compiling_agency,
      contact_details,
      data_description,
      classification_system,
      sector_coverage,
      statistical_concepts_and_definitions,
      statistical_unit,
      statistical_population,
      reference_period,
      data_confidentiality,
      legal_acts_and_other_agreements,
      data_sharing,
      release_policy,
      release_calendar,
      frequency_of_dissemination,
      data_access,
      documentation_on_methodology,
      quality_documentation,
      quality_assurance,
      quality_assessment,
      sampling_error,
      timeliness,
      comparability_overtime,
      coherence,
      source_data_type,
      frequency_of_data_collection,
      data_collection_method,
      data_validation,
      data_compilation,
      metadata_last_posted,
      metadata_last_update,
      version,
      true, // latest_version
      released_data_link,
      created_by,
      new Date(), // created_at
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
async function updateMetadatadb(id, updatedData) {
  const client = await poolmwp.connect();
  try {
    await client.query("BEGIN");

    // Fetch the most recent row for the given metadata ID
    const { rows } = await client.query(
      `SELECT * FROM metadata 
       WHERE id = $1 AND latest_version = true 
       ORDER BY version DESC 
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return { error: true, errorMessage: "Metadata not found." };
    }

    const previousData = rows[0];

    // Check if updatedData contains any changes
    const hasUpdates = Object.keys(updatedData).some(
      (key) =>
        updatedData[key] !== undefined &&
        updatedData[key] !== previousData[key]
    );

    if (!hasUpdates) {
      await client.query("ROLLBACK");
      return { error: true, errorMessage: "No updates provided or no changes detected." };
    }

    const newVersion = previousData.version + 1;

    // Merge provided fields with the previous data
    const newData = {
      metadata_id: previousData.metadata_id,
      agency_id: previousData.agency_id,
      product_name: updatedData.product_name ?? previousData.product_name,
      contact_organisation: updatedData.contact_organisation ?? previousData.contact_organisation,
      compiling_agency: updatedData.compiling_agency ?? previousData.compiling_agency,
      contact_details: updatedData.contact_details ?? previousData.contact_details,
      data_description: updatedData.data_description ?? previousData.data_description,
      classification_system: updatedData.classification_system ?? previousData.classification_system,
      sector_coverage: updatedData.sector_coverage ?? previousData.sector_coverage,
      statistical_concepts_and_definitions: updatedData.statistical_concepts_and_definitions ?? previousData.statistical_concepts_and_definitions,
      statistical_unit: updatedData.statistical_unit ?? previousData.statistical_unit,
      statistical_population: updatedData.statistical_population ?? previousData.statistical_population,
      reference_period: updatedData.reference_period ?? previousData.reference_period,
      data_confidentiality: updatedData.data_confidentiality ?? previousData.data_confidentiality,
      legal_acts_and_other_agreements: updatedData.legal_acts_and_other_agreements ?? previousData.legal_acts_and_other_agreements,
      data_sharing: updatedData.data_sharing ?? previousData.data_sharing,
      release_policy: updatedData.release_policy ?? previousData.release_policy,
      release_calendar: updatedData.release_calendar ?? previousData.release_calendar,
      frequency_of_dissemination: updatedData.frequency_of_dissemination ?? previousData.frequency_of_dissemination,
      data_access: updatedData.data_access ?? previousData.data_access,
      documentation_on_methodology: updatedData.documentation_on_methodology ?? previousData.documentation_on_methodology,
      quality_documentation: updatedData.quality_documentation ?? previousData.quality_documentation,
      quality_assurance: updatedData.quality_assurance ?? previousData.quality_assurance,
      quality_assessment: updatedData.quality_assessment ?? previousData.quality_assessment,
      sampling_error: updatedData.sampling_error ?? previousData.sampling_error,
      timeliness: updatedData.timeliness ?? previousData.timeliness,
      comparability_overtime: updatedData.comparability_overtime ?? previousData.comparability_overtime,
      coherence: updatedData.coherence ?? previousData.coherence,
      source_data_type: updatedData.source_data_type ?? previousData.source_data_type,
      frequency_of_data_collection: updatedData.frequency_of_data_collection ?? previousData.frequency_of_data_collection,
      data_collection_method: updatedData.data_collection_method ?? previousData.data_collection_method,
      data_validation: updatedData.data_validation ?? previousData.data_validation,
      data_compilation: updatedData.data_compilation ?? previousData.data_compilation,
      metadata_last_posted: updatedData.metadata_last_posted ?? previousData.metadata_last_posted,
      metadata_last_update: updatedData.metadata_last_update ?? previousData.metadata_last_update,
      released_data_link: updatedData.released_data_link ?? previousData.released_data_link,
      is_active: previousData.is_active,
      version: newVersion,
      latest_version: true,
      created_by: updatedData.created_by || previousData.created_by,
    };

    // Ensure the previous row is not marked as the latest version
    await client.query(
      `UPDATE metadata 
       SET latest_version = false 
       WHERE id = $1 AND version = $2`,
      [id, previousData.version]
    );

    const columns = Object.keys(newData).join(", ");
    const placeholders = Object.keys(newData)
      .map((_, index) => `$${index + 1}`)
      .join(", ");
    const values = Object.values(newData);

    const insertQuery = `
      INSERT INTO metadata (${columns})
      VALUES (${placeholders}) 
      RETURNING *`;

    const insertResult = await client.query(insertQuery, values);

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
async function getMetadataAllVersiondb(){
  try{
    const query= `SELECT * FROM metadata WHERE is_active = true ORDER BY created_at DESC`;
    const result = await poolmwp.query(query);
    return {
      error: false,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error in getMetadataAllVersiondb:", error);
    return {
      error: true,
      errorMessage: `Error in getMetadataAllVersiondb: ${error.message}`,
    };
  }
}
async function getAllMetadatadb() {
  try {
    const query = `
      SELECT 
        id, metadata_id, agency_id, product_name, contact_organisation, compiling_agency,
        contact_details, data_description, classification_system, sector_coverage,
        statistical_concepts_and_definitions, statistical_unit, statistical_population,
        reference_period, data_confidentiality, Legal_acts_and_other_agreements,
        data_sharing, release_policy, release_calendar, frequency_of_dissemination,
        data_access, documentation_on_methodology, quality_documentation,
        quality_assurance, quality_assessment, sampling_error, timeliness,
        Comparability_overtime, coherence, source_data_type, frequency_of_data_collection,
        data_collection_method, data_validation, data_compilation, metadata_last_posted,
        metadata_last_update, version, latest_version, released_data_link,
        created_by, created_at, updated_by, updated_at
      FROM metadata
      WHERE is_active = true AND latest_version= true -- Only fetch active metadata entries
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
    const getQuery = `SELECT 1 FROM agencies WHERE agency_id = $1 AND is_active = TRUE`;
    const result = await poolmwp.query(getQuery, [agency_id]);

    // If rowCount is greater than 0, it means the agency exists and is inactive
    return result.rowCount > 0;
  } catch (error) {
    console.error("Error checking if agency is inactive:", error);
    return false; // Return false in case of error
  }
}



module.exports = {
  poolmwp,

  EmailValidation,
  updatePassword,
  createUserdb,
  getUserdb,
  updateUserDb,
  activateUserDb,
  deactivateUserDb,
  
  createagencydb,
  getagencydb,
  updateagencydb,
  activeAgencydb,
  deactiveAgencydb,

  createMetadatadb,
  getAllMetadatadb,
  getMetadataAllVersiondb,
  updateMetadatadb,
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
