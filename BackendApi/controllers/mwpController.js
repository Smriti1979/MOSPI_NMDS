/** @format */

const { generateAccessToken } = require("../helper_utils/generateAccessToken");
const bcrypt = require("bcrypt");
const mwpdb = require("../DbQuery/dbOperationmwp");
const { poolmwp } = require('../DbQuery/dbOperationmwp');
const validator = require('validator');
// var AES = require("crypto-js/aes");
const {
  EmailValidation,
  updatePassword,
  createagencydb,
  getagencydb,
  updateagencydb,
  deleteagencydb,
  getUsertypeFromUsername,
  createUserdb,
  getUserdb,
  updateUserDb,
  deleteUserDb,
  createMetadatadb,
  updateMetadatadb,
  getAllMetadatadb,
  deleteMetadatadb,
  searchMetadataDb,

  allowedCreateOperations,
  allowedDeleteOperations,
  allowedUpdateOperations,
  allowedReadOperations,

  getagencyidbyusernamedb,
  getAllUserTypesDb,
  getNextMetadataId,
  checkAgencyExists 
  
  // getMetadataByAgencyIddb,
  // getMetaDataByProductNamedb,
  // getMetaDataByVersionP,
  // getMetaDataByVersionPV,
  // updateMetadatadb,
  // deleteMetadatadb,
 
  // getMetaDatadb,
  // searchMetaDatadb,
  // getMetadataByAgencydb
} = mwpdb;



function validateUserInput(data) {
  const errors = [];

  // Validate email format
  if (!validator.isEmail(data.email)) {
    errors.push("Invalid email format. Email should contain @ and a domain name.");
  }

  // Validate phone number (basic example, can be enhanced)
  const phoneRegex = /^[0-9]{7,10}$/;
  if (!phoneRegex.test(data.phone)) {
    errors.push("Invalid phone number.");
  }

  // // Validate username (no spaces, no special characters)
  // const usernameRegex = /^[a-zA-Z0-9_]+$/;
  // if (!usernameRegex.test(data.username)) {
  //   errors.push("Invalid username. Only alphanumeric characters and underscores are allowed.");
  // }

  // // Validate password (minimum 8 characters, at least one number, one special character)
  // const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  // if (!passwordRegex.test(data.password)) {
  //   errors.push(
  //     "Invalid password. It must be at least 8 characters long and include one letter, one number, and one special character."
  //   );
  // }

  return errors;
}

//SIGNIN

const signin = async (req, res) => {
  const userAgents = req.headers['x-from-swagger'];
  const userAgent = req.headers['user-agent'] || '';
  let { username, password } = req.body;

  try {
    const key = process.env.PASSWORD_KEY;

    if (!userAgents && !userAgent.includes('Postman')) {
      // Uncomment and handle decryption properly if needed
      // password = AES.decrypt(password, key).toString(CryptoJS.enc.Utf8);
    }

    // Validate email and fetch user details
    const UsersDetail = await EmailValidation(username);
    if (!UsersDetail || UsersDetail.error) {
      return res.status(403).json({ error: 'Invalid credentials' , statuscode: 403});
    }

    if (UsersDetail.newuser) {
      const matchpassword = await bcrypt.compare(password, UsersDetail.password);
      if(matchpassword){
        return res.status(200).json({ userverified: false, statuscode: 200 });
      }
      else {
        return res.status(403).json({ error: 'Password did not match.', statuscode:403 });
      }
    }

    if (!UsersDetail.password) {
      return res.status(403).json({ error: 'Invalid credentials', statuscode:403 });
    }

    const correctpassword = await bcrypt.compare(password, UsersDetail.password);
    if (!correctpassword) {
      return res.status(403).json({ error: 'Incorrect password.', statuscode:403 });
    }

    const mwpAccessToken = generateAccessToken({
      username: UsersDetail.username,
      user_id: UsersDetail.user_id,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000,
    };

    res.cookie('mwpAccessToken', mwpAccessToken, cookieOptions);

    return res.status(200).json({
      message: 'Sign-in successful',
      data: {
        username,
        usertype : UsersDetail.usertype,
        agency_id: UsersDetail.agency_id,
        token: mwpAccessToken,
      },
      userverified: true,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'An error occurred during sign-in.', statuscode:500 });
  }
};
const changePassword = async (req, res) => {
  const { username, oldPassword, password, confirmPassword } = req.body;

  try {
    // Validate input
    if (!username || !oldPassword || !password || !confirmPassword) {
      return res.status(400).json({
        error: "All fields (username, old password, password, confirm password) are required.",
        statuscode: 400
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "New password and confirm password did not match.", statuscode:400 });
    }

    // Fetch the user based on the username
    const userQuery = "SELECT * FROM users WHERE username = $1";
    const userResult = await poolmwp.query(userQuery, [username]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found.", statuscode:404 });
    }

    // Verify the old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Old password is incorrect.", statuscode:400 });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update the password using the `updatePassword` function
    const updatedUser = await updatePassword(user.user_id, hashedPassword);

    if (!updatedUser) {
      return res.status(500).json({ error: "Failed to update the password.", statuscode:500 });
    }

    return res.status(200).json({
      message: "Password updated successfully.",
      statuscode:200,
      user: { user_id: updatedUser.user_id, username: updatedUser.username },
    });
  } catch (error) {
    console.error("Error changing password:", error.message);
    return res.status(500).json({ error: "Server error during password change.", statuscode:500 });
  }
};

//USER

const createUser = async (req, res) => {
  const { agency_id, username, password, usertype, name, email, phone, address } = req.body;
  const user = req.user;

  const requiredFields = ["agency_id", "username", "password", "usertype", "name", "email", "phone", "address"];
  const missingFields = requiredFields.filter(field => !req.body[field]);

  // Check for missing required fields
  if (missingFields.length > 0) {
    return res.status(400).json({ error: `Missing required fields: ${missingFields.join(", ")}`, statuscode:400 });
  }

  // Validate input data
  const validationErrors = validateUserInput(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: `Validation errors: ${validationErrors.join(", ")}`, statuscode:400 });
  }
 
  try {

    const agencyExists = await checkAgencyExists(agency_id);
    if (!agencyExists) {
      return res.status(404).json({ error: `Agency with ID ${agency_id} does not exist`, statuscode: 404 });
    }

    // Fetch allowed roles for the logged-in user
    const allowed = await allowedCreateOperations(user.usertype);
    console.log("Allowed operations:", allowed);

    // Check if the logged-in user is allowed to create the requested user type
    if (!allowed || !allowed.includes(usertype)) {
      return res.status(403).json({
        error: `You don't have access to create a user with usertype: ${usertype}`,
        statuscode:403
      });
    }
    const created_by = user.username || "System";  // Default to "System" if no username
    // Call the database function to create the user
    const newUser = await createUserdb(agency_id, username, password, usertype, name, email, phone, address, created_by);

    // Check for errors from createUserdb
    if (newUser.error) {
      return res.status(403).json({ error: newUser.errorMessage, statuscode:403 });
    }

    // Success response with the new user (excluding password)
    return res.status(201).json({
      data: newUser,
      message: "User created successfully",
      statusCode: 201,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ error: `Error creating user: ${error.message}`, statuscode:500 });
  }
};
const getUser = async (req, res) => {
  try {
    const { usertype } = req.user; 

    const allowed = await allowedReadOperations(usertype);
    if (!allowed || allowed.length === 0) {
      return res.status(403).json({
        error: "You do not have permission to view any user data",
        statuscode:403
      });
    }

    const users = await getUserdb(allowed);
    if (users.error) {
      return res.status(400).json({ error: `Unable to fetch user data`, statuscode:400 });
    }

    return res.status(200).send({
      data: users,
      message: "Users fetched successfully",
      statusCode: 200
    });
  } catch (error) {
    console.error("Error in getUser controller:", error);
    return res
      .status(500)
      .json({ error: `Internal server error: ${error.message}`, statuscode:500 });
  }
};
const updateUser = async (req, res) => {
  let { username } = req.params;
  const { name, email, phone, address } = req.body;
  const user = req.user;

  try {
    const userResult = await getUsertypeFromUsername(username);
    if (!userResult || userResult.error) {
      return res.status(404).json({
        error: `User with username "${username}" not found.`,
        statuscode: 404,
      });
    }

    const { usertype } = userResult;

    const allowed = await allowedUpdateOperations(user.usertype);

    if (Array.isArray(allowed) && allowed.length > 0) {
      const parsedAllowed = JSON.parse(allowed[0]);

      if (!parsedAllowed.includes(usertype)) {
        return res.status(405).json({
          error: `You don't have access to update a user with usertype: ${usertype}`,
          statuscode: 405,
        });
      }
    } else {
      return res.status(500).json({
        error: "Invalid allowed operations data",
        statuscode: 500,
      });
    }

    // Build the fieldsToUpdate object from the request body
    const fieldsToUpdate = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (email !== undefined) fieldsToUpdate.email = email;
    if (phone !== undefined) fieldsToUpdate.phone = phone;
    if (address !== undefined) fieldsToUpdate.address = address;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({
        error: "No valid fields provided for update",
        statuscode: 400,
      });
    }

    // Call the updateUserDb function
    const updatedUser = await updateUserDb(username, fieldsToUpdate);

    if (updatedUser.error) {
      return res
        .status(updatedUser.errorCode || 500)
        .json({ error: updatedUser.errorMessage, statuscode: updatedUser.errorCode || 500 });
    }

    return res.status(200).json({
      data: updatedUser,
      message: "User updated successfully",
      statusCode: 200,
    });
  } catch (error) {
    return res.status(500).json({
      error: `Error updating user: ${error.message || error}`,
      statuscode: 500,
    });
  }
};
const deleteUser = async (req, res) => {
  let { username } = req.params;
  const user = req.user;

  try {
    const userResult = await getUsertypeFromUsername(username);
    if (!userResult || userResult.error) {
      return res.status(404).json({
        error: `User with username "${username}" not found.`,
        statuscode:404
      });
    }

    const { usertype } = userResult;

    const allowed = await allowedDeleteOperations(user.usertype);
    console.log("Allowed operations:", allowed);

    if (!allowed || !allowed.includes(usertype)) {
      return res.status(405).json({
        error: `You don't have access to delete a user with usertype: ${usertype}`,
        statuscode:405
      });
    }

    const deletedUser = await deleteUserDb(username);
    if (deletedUser.error) {
      return res.status(deletedUser.errorCode).json({ error: deletedUser.errorMessage });
    }

    return res.status(200).send({
      message: "User deleted successfully",
      deletedUser: deletedUser.data, // Optionally include deleted user info
      statusCode: 200
    });
  } catch (error) {
    return res.status(500).json({ error: `Error deleting user: ${error.message}`, statuscode:500 });
  }
};
const getallusertypes = async (req, res) => {
  try {
    // Call the database query function to get all user types
    const result = await getAllUserTypesDb();

    if (result.success) {
      return res.status(200).json({ message: "User types retrieved successfully", data: result.data, statusCode: 200 });
    } else {
      return res.status(404).json({ message: "No user types found", statusCode: 404 });
    }
  } catch (error) {
    console.error("Error retrieving user types:", error);
    return res.status(500).json({ message: "Internal server error", statusCode: 500 });
  }
};


//AGENCY

const createagency = async (req, res) => {
  const { agency_name } = req.body;
  try {
    const user = req.user;  // Assuming the JWT middleware is setting the `user` object

    if (user.usertype !== "mwp_admin") {
      return res
        .status(405)
        .json({ error: `Only mwp_admin can create agency`, statuscode:405 });
    }

    const agencyDetails = {
      agency_name,
      created_by: user.username || "System",  // Use the logged-in user's username or default to "System"
    };

    // Pass correct arguments to the DB function
    const result = await createagencydb(agencyDetails.agency_name, agencyDetails.created_by);

    // Handle DB errors
    if (result?.error) {
      return res
        .status(result.errorCode || 500)
        .json({ error: `Agency already exists`, statuscode:result.errorCode || 500 });
    }

    return res.status(201).send({
      data: result,
      message: "Agency created successfully",
      statusCode: 201
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: `Error in Creating agency: ${error.message}`, statuscode:500 });
  }
};
const getagency = async (req, res) => {
  try {
    const user = req.user;

    // if (user.usertype !== "mwp_admin" ) {
    //   return res
    //     .status(405)
    //     .json({ error: `Only mwp user or Nodal user can get agency`, statuscode:405 });
    // }

    const agency = await getagencydb();

    if (agency?.error == true) {
      throw agency?.errorMessage;
    }

    return res.status(200).send({
      data: agency,
      message: "agency data",
      statusCode: 200
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: `Unable to get agency ${error}`, statuscode:500 });
  }
};
const updateagency = async (req, res) => {
  const { agency_name } = req.params; // Current agency name from the path
  const { agency_name: new_agency_name } = req.body; // New agency name from the request body
  const user = req.user;

  // Check if the user has appropriate roles or is a mwp_admin
  if (user.usertype !== "mwp_admin") {
    return res
      .status(405)
      .json({ error: `Only mwp_admin can update the agency`, statuscode:405 });
  }

  // Validate inputs
  if (!agency_name || !new_agency_name) {
    return res
      .status(405)
      .json({ error: `agency_name (current and new) is required`, statuscode:405 });
  }

  try {
    const agency = await updateagencydb(agency_name, new_agency_name);
    if (agency?.error) {
      throw agency?.errorMessage;
    }

    return res.status(200).send({
      data: agency,
      message: "Agency updated successfully",
      statusCode: 200
    });
  } catch (error) {
    console.error(error);

    return res
      .status(500)
      .json({ error: `Error in updating agency data: ${error}`, statuscode:500 });
  }
};
const deleteagency = async (req, res) => {
  const { agency_name } = req.params;
  const user = req.user;
  
  if (user.usertype !== "mwp_admin" ) {
    return res
      .status(405)
      .json({ error: `Only mwp_admin can delete Agency`, statuscode:405 });
  }
  if (!agency_name) {
    return res.status(405).json({ error: `Agency name does not exist`, statuscode:405 });
  }

  try {
    const result = await deleteagencydb(agency_name);
    if (result?.error == true) {
      throw result?.errorMessage;
    }
    return res
      .status(200)
      .json({ message: "agency and associated data successfully deleted", statuscode:200 });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: `Unable to delete the agency: ${error}`, statuscode:500 });
  }
};
const createMetadata = async (req, res) => {
  const client = await poolmwp.connect();
  try {
    const user = req.user;

    if (!user || !user.id) {
      return res.status(403).json({
        error: "Agency ID not found. Please log in again.",
        statusCode: 403,
      });
    }

    const agency_id = await getagencyidbyusernamedb(user.username);

    // Extract fields from the request body
    const {
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
      released_data_link,
    } = req.body;

    // Validate required fields
    if (!product_name || !released_data_link) {
      return res.status(400).json({
        error: "Required fields: product_name and released_data_link.",
        statusCode: 400,
      });
    }

    await client.query("BEGIN");

    // Check for duplicate product_name
    const duplicateCheckQuery = `SELECT * FROM metadata WHERE product_name = $1`;
    const duplicateCheckResult = await client.query(duplicateCheckQuery, [product_name]);

    if (duplicateCheckResult.rows.length > 0) {
      // If a record with the same product_name exists, return an error
      return res.status(400).json({
        error: "Product already exists.",
        statusCode: 400,
      });
    }

    // Get the next metadata ID
    const newMetadataId = await getNextMetadataId();

    // Prepare metadata details
    const metadataDetails = {
      metadata_id: newMetadataId,
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
      released_data_link,
      version: 1, // Initial version
      latest_version: true, // Mark as the latest version
      created_by: user.username || "System", // Default to "System" if no username
    };

    // Insert the new metadata record
    const insertQuery = `
      INSERT INTO metadata (
        metadata_id, agency_id, product_name, contact_organisation, compiling_agency,
        contact_details, data_description, classification_system, sector_coverage,
        statistical_concepts_and_definitions, statistical_unit, statistical_population,
        reference_period, data_confidentiality, legal_acts_and_other_agreements,
        data_sharing, release_policy, release_calendar, frequency_of_dissemination,
        data_access, documentation_on_methodology, quality_documentation,
        quality_assurance, quality_assessment, sampling_error, timeliness,
        comparability_overtime, coherence, source_data_type, frequency_of_data_collection,
        data_collection_method, data_validation, data_compilation, metadata_last_posted,
        metadata_last_update, version, latest_version, released_data_link, created_by, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40
      ) RETURNING *`;

    const insertValues = [
      metadataDetails.metadata_id,
      metadataDetails.agency_id,
      metadataDetails.product_name,
      metadataDetails.contact_organisation,
      metadataDetails.compiling_agency,
      metadataDetails.contact_details,
      metadataDetails.data_description,
      metadataDetails.classification_system,
      metadataDetails.sector_coverage,
      metadataDetails.statistical_concepts_and_definitions,
      metadataDetails.statistical_unit,
      metadataDetails.statistical_population,
      metadataDetails.reference_period,
      metadataDetails.data_confidentiality,
      metadataDetails.legal_acts_and_other_agreements,
      metadataDetails.data_sharing,
      metadataDetails.release_policy,
      metadataDetails.release_calendar,
      metadataDetails.frequency_of_dissemination,
      metadataDetails.data_access,
      metadataDetails.documentation_on_methodology,
      metadataDetails.quality_documentation,
      metadataDetails.quality_assurance,
      metadataDetails.quality_assessment,
      metadataDetails.sampling_error,
      metadataDetails.timeliness,
      metadataDetails.comparability_overtime,
      metadataDetails.coherence,
      metadataDetails.source_data_type,
      metadataDetails.frequency_of_data_collection,
      metadataDetails.data_collection_method,
      metadataDetails.data_validation,
      metadataDetails.data_compilation,
      metadataDetails.metadata_last_posted,
      metadataDetails.metadata_last_update,
      metadataDetails.version,
      metadataDetails.latest_version,
      metadataDetails.released_data_link,
      metadataDetails.created_by,
      new Date(), // created_at
    ];

    const insertResult = await client.query(insertQuery, insertValues);

    await client.query("COMMIT");

    return res.status(201).json({
      data: insertResult.rows[0],
      message: "Metadata created successfully.",
      statusCode: 201,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in createMetadata:", error);
    return res.status(500).json({
      error: `Error in creating metadata: ${error.message}`,
      statusCode: 500,
    });
  } finally {
    client.release();
  }
};
const getAllMetadata = async (req, res) => {
  try {
    const result = await getAllMetadatadb();

    if (result.error) {
      return res.status(500).json({
        error: result.errorMessage,
        statuscode:500
      });
    }

    return res.status(200).json({
      error: false,
      data: result.data,
      message: "Metadata fetched successfully.",
      statuscode:200
    });
  } catch (error) {
    console.error("Error in getAllMetadata:", error);
    return res.status(500).json({
      error: `Error in getAllMetadata: ${error.message}`,
      statuscode:500
    });
  }
};
const updateMetadata = async (req, res) => {
  try {
    const id = req.params.id;
    const updatedData = req.body;

    // Validate metadata ID
    if (!id) {
      return res.status(400).json({
        error: "ID is required.",
        statuscode: 400,
      });
    }

    // Validate if updatedData contains any fields
    if (!updatedData || Object.keys(updatedData).length === 0) {
      return res.status(400).json({
        error: "No updates provided.",
        statuscode: 400,
      });
    }

    // Call the function to update the database
    const result = await updateMetadatadb(id, updatedData);

    if (result.success) {
      return res.status(200).json({
        message: "Metadata updated successfully.",
        data: result.data,
        statuscode: 200,
      });
    } else {
      return res.status(400).json({
        error: result.errorMessage || "Failed to update metadata.",
        statuscode: 400,
      });
    }
  } catch (error) {
    console.error("Error updating metadata:", error);
    return res.status(500).json({
      error: "Internal server error.",
      statuscode: 500,
    });
  }
};

const searchMetadata = async (req, res) => {
  try {
    const { product_name, version, agency_id } = req.query;

    // Call the database query function with the provided parameters
    const result = await searchMetadataDb({ product_name, version, agency_id });

    if (result.success) {
      return res.status(200).json({ message: "Metadata retrieved successfully", data: result.data, statuscode:200 });
    } else {
      return res.status(404).json({ error: "No metadata found matching the criteria", statuscode:404 });
    }
  } catch (error) {
    console.error("Error retrieving metadata:", error);
    return res.status(500).json({ error: "Internal server error", statuscode:500 });
  }
};
const deleteMetadata = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "id is required.",
        statuscode:400
      });
    }

    const result = await deleteMetadatadb(id);

    if (result.error) {
      return res.status(404).json({
        error: result.errorMessage,
        statuscode:404
      });
    }

    return res.status(200).json({
      message: "Metadata deleted successfully",
      statuscode:200
    });
  } catch (error) {
    console.error("Error in deleteMetadata:", error);
    return res.status(500).json({
      error: `Error in deleteMetadata: ${error.message}`,
      statuscode:500
    });
  }
};
// const getMetaDataByProductName = async (req, res) => {
//   const { Product } = req.params;
  
//   if (Product == undefined) {
//     return res.status(400).json({ error: `product name is required` });
//   }
//   try {
//     const metadata = await getMetaDataByProductNamedb(Product);
//     if (metadata?.error == true) {
//       throw metadata?.errorMessage;
//     }
//     return res.status(200).send({
//       data: metadata,
//       msg: "metadata",
//       statusCode: true,
//     });
//   } catch (error) {
//     console.log(error);

//     return res
//       .status(500)
//       .json({ error: `Unable to fetch data Error=${error}` });
//   }
// };

// const getMetaDataByVersion=async(req,res)=>{
//   const { product, version } = req.query;
//   try {
//     if(version==null && product!==null){
//       const metadata=await getMetaDataByVersionP(product)
//       if (metadata?.error == true) {
//         throw metadata?.errorMessage;
//       }
//       return res.status(200).send({
//         data: metadata,
//         msg: "meta data",
//         statusCode: true,
//       });
//     }
//     else if(product!=null && version!=null){
//       const metadata=await getMetaDataByVersionPV(product,version)
//       if (metadata?.error == true) {
//         throw metadata?.errorMessage;
//       }
//       return res.status(200).send({
//         data: metadata,
//         msg: "meta data",
//         statusCode: true,
//       });
//     }
//     else{
//       return res.status(200).send({
//         msg: "product is required",
//         statusCode: true,})
//     }
//   } catch (error) {
//     console.log(error);

//     return res
//       .status(500)
//       .json({ error: `Unable to fetch data Error=${error}` });
//   }
// }

// const searchMetaData=async(req,res)=>{
//   const searchParams = req.query;
 
//   try {
   
//     const metadata=await searchMetaDatadb(searchParams);
//     if(metadata?.error){
//       return res.status(400).send({
//         data: [],
//         msg: "data not found",
//         statusCode: false,
//       });
//     }
//     return res.status(200).send({
//       data: metadata,
//       msg: "meta data",
//       statusCode: true,
//     });
  
//   } catch (error) {
//     return res
//     .status(500)
//     .json({ error: `Unable to fetch data Error=${error}` });
//   }
// }

// const updatedMetadata = async (req, res) => {
//   let { Product } = req.params;
//   Product=Product.toLowerCase()
//   const {...metadata}=req.body

//   try {
//     const user = req.user;
//     const user_id=user.id
//     const userRoles = await getUserRoles(user.id);

//     const hasRole1or2 = userRoles.includes(1) || userRoles.includes(2);

//     if(user.usertype=="mwp_admin" || hasRole1or2 ){
//       const result = await updateMetadatadb(
//         Product,
//         metadata,
//         user_id
//       );
//     if (result?.error === true) {
//         throw result?.errorMessage;
//       }
//       return res.status(200).send({
//         data: result,
//         msg: "Metadata updated successfully",
//         statusCode: true,
//       });
//     }
//     else{
//       return res.status(403).send({
//         msg: "Invalid user",
//         statusCode: true,
//       });
//     }
//   } catch (error) {
//     console.log(error);
//     return res
//       .status(500)
//       .json({ error: `Error in updating metadata: ${error}` });
//   }
// };

// const deleteMetadata = async (req, res) => {
//   const { product } = req.params; // Use lowercase 'product' to match the route
//   const user = req.user;
 
//   try {
//     // Fetch user roles
//     const userRoles = await getUserRoles(user.id);
//     const hasRole1 = userRoles.includes(1);
    
//     // Permission Check
//     if (user.usertype !== "mwp_admin" && !hasRole1) {
//       return res
//         .status(403)
//         .json({ error: "Only mwp_admin or User with role 1 can delete the METADATA" });
//     }
    
//     // Check if product is provided
//     if (!product) {
//       return res.status(400).json({ error: "Product not defined" });
//     }

//     // Delete metadata from the database
//     const result = await deleteMetadatadb(product);
//     if (result?.error) {
//       return res.status(result.errorCode || 500).json({ error: result.errorMessage });
//     }

//     // Success response
//     return res.status(200).json({
//       msg: "Metadata deleted successfully",
//       statusCode: true,
//     });
    
//   } catch (error) {
//     console.error("Error deleting metadata:", error);
//     return res.status(500).json({ error: `Unable to delete metadata: ${error.message || error}` });
//   }
// };

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = await user.findOne({ where: { username } });

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ userId: user.id, role: user.roleId }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials', statuscode:401 });
  }
};

module.exports = {
  signin,
  changePassword,
  createUser,
  getUser,
  updateUser,
  deleteUser,

  createagency,
  getagency,
  updateagency,
  deleteagency,

  createMetadata,
  getAllMetadata,
  updateMetadata,
  deleteMetadata,
  searchMetadata,
  getallusertypes


  // getMetaDataByProductName,
  // updateProduct,
  // updatedMetadata,
  // deleteProduct,
  // deleteMetadata,
  // getProductById,
  
  // createProduct,
  // getProduct,
  // getMetaData,
  // getMetaDataByVersion,
  // searchMetaData,
  // getMetaDataByAgency
};
