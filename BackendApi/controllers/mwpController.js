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

  allowedCreateOperations,
  allowedDeleteOperations,
  allowedUpdateOperations,
  allowedReadOperations,

  getagencyidbyusernamedb
  

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
    errors.push("Invalid email format");
  }

  // Validate phone number (basic example, can be enhanced)
  // const phoneRegex = /^[0-9]{10}$/;
  // if (!phoneRegex.test(data.phone)) {
  //   errors.push("Invalid phone number. It should be a 10-digit number.");
  // }

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
      return res.status(403).json({ error: 'Invalid credentials' });
    }

    if (UsersDetail.newuser) {
      const matchpassword = await bcrypt.compare(password, UsersDetail.password);
      if(matchpassword){
        return res.status(200).json({ userverified: false});
      }
      else {
        return res.status(403).json({ error: 'Invalid credentials' });
      }
    }

    if (!UsersDetail.password) {
      return res.status(403).json({ error: 'Invalid credentials' });
    }

    const correctpassword = await bcrypt.compare(password, UsersDetail.password);
    if (!correctpassword) {
      return res.status(403).json({ error: 'Invalid credentials' });
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
      data: {
        username,
        usertype : UsersDetail.usertype,
        token: mwpAccessToken,
      },
      userverified: true,
      statusCode: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'An error occurred during sign-in.' });
  }
};
const changePassword = async (req, res) => {
  const { username, oldPassword, password, confirmPassword } = req.body;

  try {
    // Validate input
    if (!username || !oldPassword || !password || !confirmPassword) {
      return res.status(400).json({
        error: "Username, old password, password, and confirm password are required.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "New password and confirm password do not match." });
    }

    // Fetch the user based on the username
    const userQuery = "SELECT * FROM users WHERE username = $1";
    const userResult = await poolmwp.query(userQuery, [username]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Verify the old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Old password is incorrect." });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update the password using the `updatePassword` function
    const updatedUser = await updatePassword(user.user_id, hashedPassword);

    if (!updatedUser) {
      return res.status(500).json({ error: "Failed to update the password." });
    }

    return res.status(200).json({
      message: "Password updated successfully.",
      user: { user_id: updatedUser.user_id, username: updatedUser.username },
    });
  } catch (error) {
    console.error("Error changing password:", error.message);
    return res.status(500).json({ error: "Server error during password change." });
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
    return res.status(400).json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  // Validate input data
  const validationErrors = validateUserInput(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: `Validation errors: ${validationErrors.join(", ")}` });
  }

  try {
    // Fetch allowed roles for the logged-in user
    const allowed = await allowedCreateOperations(user.usertype);
    console.log("Allowed operations:", allowed);

    // Check if the logged-in user is allowed to create the requested user type
    if (!allowed || !allowed.includes(usertype)) {
      return res.status(405).json({
        error: `You don't have access to create a user with usertype: ${usertype}`,
      });
    }

    // Call the database function to create the user
    const newUser = await createUserdb(agency_id, username, password, usertype, name, email, phone, address);

    // Check for errors from createUserdb
    if (newUser.error) {
      return res.status(403).json({ error: newUser.errorMessage });
    }

    // Success response with the new user (excluding password)
    return res.status(201).json({
      data: newUser,
      msg: "User created successfully",
      statusCode: true,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ error: `Error creating user: ${error.message}` });
  }
};

const getUser = async (req, res) => {
  try {
    const { usertype } = req.user; 

    const allowed = await allowedReadOperations(usertype);
    if (!allowed || allowed.length === 0) {
      return res.status(403).json({
        error: "You do not have permission to view any user data",
      });
    }

    console.log("Allowed operations:", allowed);

    const users = await getUserdb(allowed);
    if (users.error) {
      return res.status(400).json({ error: `Unable to fetch user data` });
    }

    return res.status(200).send({
      data: users,
      msg: "Users fetched successfully",
      statusCode: true,
    });
  } catch (error) {
    console.error("Error in getUser controller:", error);
    return res
      .status(500)
      .json({ error: `Internal server error: ${error.message}` });
  }
};
const updateUser = async (req, res) => {
  let { username } = req.params;
  let { name, email, phone, address } = req.body;
  const user = req.user;

  try {

    const userResult = await getUsertypeFromUsername(username);
    if (!userResult || userResult.error) {
      return res.status(404).json({
        error: `User with username "${username}" not found.`,
      });
    }

    const { usertype } = userResult;

    const allowed = await allowedUpdateOperations(user.usertype);
    console.log("Allowed operations:", allowed);

    // Check if the logged-in user is allowed to create the requested user type
    if (!allowed || !allowed.includes(usertype)) {
      return res.status(405).json({
        error: `You don't have access to update a user with usertype: ${usertype}`,
      });
    }

    const updatedUser = await updateUserDb(username, name, email, phone, address);

    if (updatedUser.error) {
      return res.status(updatedUser.errorCode || 500).json({ error: updatedUser.errorMessage });
    }

    // Return the updated user details
    return res.status(200).json({
      data: updatedUser,  // Send the updated user object
      msg: "User updated successfully",
      statusCode: true,
    });
  } catch (error) {
    return res.status(500).json({ error: `Error updating user: ${error.message || error}` });
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
      });
    }

    const { usertype } = userResult;

    const allowed = await allowedDeleteOperations(user.usertype);
    console.log("Allowed operations:", allowed);

    if (!allowed || !allowed.includes(usertype)) {
      return res.status(405).json({
        error: `You don't have access to delete a user with usertype: ${usertype}`,
      });
    }

    const deletedUser = await deleteUserDb(username);
    if (deletedUser.error) {
      return res.status(deletedUser.errorCode).json({ error: deletedUser.errorMessage });
    }

    return res.status(200).send({
      msg: "User deleted successfully",
      deletedUser: deletedUser.data, // Optionally include deleted user info
      statusCode: true,
    });
  } catch (error) {
    return res.status(500).json({ error: `Error deleting user: ${error.message}` });
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
        .json({ error: `Only mwp_admin can create agency` });
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
        .json({ error: result.errorMessage });
    }

    return res.status(201).send({
      data: result,
      msg: "Agency created successfully",
      statusCode: true,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: `Error in Creating agency: ${error.message}` });
  }
};

const getagency = async (req, res) => {
  try {
    const user = req.user;

    if (user.usertype !== "mwp_admin" ) {
      return res
        .status(405)
        .json({ error: `Only mwp user or Nodal user can get agency` });
    }

    const agency = await getagencydb();

    if (agency?.error == true) {
      throw agency?.errorMessage;
    }

    return res.status(200).send({
      data: agency,
      msg: "agency data",
      statusCode: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: `Unable to get agency ${error}` });
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
      .json({ error: `Only mwp_admin can update the agency` });
  }

  // Validate inputs
  if (!agency_name || !new_agency_name) {
    return res
      .status(405)
      .json({ error: `agency_name (current and new) is required` });
  }

  try {
    const agency = await updateagencydb(agency_name, new_agency_name);
    if (agency?.error) {
      throw agency?.errorMessage;
    }

    return res.status(200).send({
      data: agency,
      msg: "Agency updated successfully",
      statusCode: true,
    });
  } catch (error) {
    console.error(error);

    return res
      .status(500)
      .json({ error: `Error in updating agency data: ${error}` });
  }
};

const deleteagency = async (req, res) => {
  const { agency_name } = req.params;
  const user = req.user;
  
  if (user.usertype !== "mwp_admin" ) {
    return res
      .status(405)
      .json({ error: `Only mwp_admin can delete Agency` });
  }
  if (!agency_name) {
    return res.status(405).json({ error: `Agency name does not exist` });
  }

  try {
    const result = await deleteagencydb(agency_name);
    if (result?.error == true) {
      throw result?.errorMessage;
    }
    return res
      .status(200)
      .json({ message: "agency and associated data successfully deleted" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: `Unable to delete the agency: ${error}` });
  }
};

const createMetadata = async (req, res) => {
  try {
    const user = req.user;
    

    if (!user || !user.id) {
      return res.status(403).json({
        error: true,
        errorMessage: "Agency ID not found. Please log in again.",
      });
    }
     
  
    const agency_id = await getagencyidbyusernamedb(user.username);
    // Extract fields from the request body
    const {
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
    } = req.body;

    // Validate required fields
    if (!product_name || !released_data_link) {
      return res.status(400).json({
        error: true,
        errorMessage: "Required fields: product_name and released_data_link.",
      });
    }

    // Prepare metadata details
    const metadataDetails = {
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
      created_by: user.username || "System", // Default to "System" if no username
    };

    // Call database function
    const result = await createMetadatadb(metadataDetails);

    if (result.error) {
      throw new Error(result.errorMessage);
    }

    return res.status(201).json({
      data: result,
      msg: "Metadata created successfully.",
      statusCode: 201,
    });
  } catch (error) {
    console.error("Error in createMetadata:", error);
    return res.status(500).json({
      error: true,
      errorMessage: `Error in creating metadata: ${error.message}`,
    });
  }
};


const getAllMetadata = async (req, res) => {
  try {
    const result = await getAllMetadatadb();

    if (result.error) {
      return res.status(500).json({
        error: true,
        errorMessage: result.errorMessage,
      });
    }

    return res.status(200).json({
      error: false,
      data: result.data,
      msg: "Metadata fetched successfully.",
    });
  } catch (error) {
    console.error("Error in getAllMetadata:", error);
    return res.status(500).json({
      error: true,
      errorMessage: `Error in getAllMetadata: ${error.message}`,
    });
  }
};

const updateMetadata = async (req, res) => {
 
};


const deleteMetadata = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: true,
        errorMessage: "id is required.",
      });
    }

    const result = await deleteMetadatadb(id);

    if (result.error) {
      return res.status(404).json({
        error: true,
        errorMessage: result.errorMessage,
      });
    }

    return res.status(200).json({
      error: false,
      message: result.message,
    });
  } catch (error) {
    console.error("Error in deleteMetadata:", error);
    return res.status(500).json({
      error: true,
      errorMessage: `Error in deleteMetadata: ${error.message}`,
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
  const user = await User.findOne({ where: { username } });

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ userId: user.id, role: user.roleId }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
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
  deleteMetadata


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
