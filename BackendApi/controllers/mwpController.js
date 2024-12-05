/** @format */

const { generateAccessToken } = require("../helper_utils/generateAccessToken");
const bcrypt = require("bcrypt");
const mwpdb = require("../DbQuery/dbOperationmwp");
const { poolmwp } = require('../DbQuery/dbOperationmwp');
// var AES = require("crypto-js/aes");
const {
  EmailValidation,
  updatePassword,
  createagencydb,
  getagencydb,
  updateagencydb,
  deleteagencydb,

  createUserdb,
  getUserdb,
  updateUserDb,
  deleteUserDb,
  createMetadatadb,
  updateMetadatadb,
  getAllMetadatadb,
  deleteMetadatadb

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
      return res.status(403).json({ 
        userverified: false 
      });
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
        error: "Username, old password, new password, and confirm password are required.",
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

  // Check required fields
  if (!usertype) {
    return res.status(400).json({ error: "usertype is required" });
  }

  // Only users with usertype "mwp_admin" can create new users
  if (user.usertype !== "mwp_admin") {
    return res.status(405).json({ error: "Only mwp_admin can create a user" });
  }


  try {
    // Call the database function to create the user and assign roles
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
    return res.status(500).json({ error: `Error in creating user: ${error.message}` });
  }
};
const getUser=async(req,res)=>{
  const user = req.user;
    if (user.usertype != "mwp_admin") {
      return res
        .status(405)
        .json({ error: `Only mwp_admin can get the users` });
    }
  try {

    const user = await getUserdb();
    if (user.error == true) {
      return res.status(400).json({ error: `User does not exist` });
    }
    return res.status(201).send({
      data: {
        user
      },
      msg: "user creates successfully",
      statusCode: true,
    });

  } catch (error) {
    return res.status(500).json({ error: `Error in getting all user ${error}` });
  }

}
const updateUser = async (req, res) => {
  let { username } = req.params;
  let { name, email, phone, address } = req.body;
  const user = req.user;

  // Check if the user is allowed to perform the update (mwp_admin type)
  if (user.usertype !== "mwp_admin") {
    return res.status(405).json({ error: `Only mwp_admin can update the user` });
  }

  try {
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
  if (user.usertype !== "mwp_admin"){
    return res.status(405).json({ error: `Only mwp_admin can delete the user` });
  }
  if (username == "mwp_admin"){
    return res.status(405).json({ error: `you can not delete mwp_admin` });
  }
  try {
    const deletedUser = await deleteUserDb(username);
    if (deletedUser.error == true) {
      return res.status(404).json({ error: deletedUser.errorMessage });
    }
    return res.status(200).send({
      msg: "User deleted successfully",
      statusCode: true,
    });
  } catch (error) {
    return res.status(500).json({ error: `Error deleting user: ${error}` });
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
    console.log("user", user);

    if (!user || !user.id) {
      return res.status(403).json({
        error: true,
        errorMessage: "Agency ID not found. Please log in again.",
      });
    }

    // Use the agency_id from the logged-in user
    const agency_id = user.id;

    // Extract predefined fields from the request body
    const { product_name, data, released_data_link } = req.body;

    if (!agency_id || !product_name || !data || !released_data_link) {
      return res.status(400).json({
        error: true,
        errorMessage: "product_name, and data are required fields.",
      });
    }

    // Serialize the `data` object into a JSON string
    const dataString = JSON.stringify(data);

    // Prepare metadata details to be passed to the database function
    const metadataDetails = {
      agency_id,
      product_name,
      data: Buffer.from(dataString), // Convert JSON string to Buffer for BLOB storage
      released_data_link,
      created_by: user.username || "System", // Assume user info is available in the request
    };

    // Call the database function to create the metadata
    const result = await createMetadatadb(metadataDetails);

    // Handle error if the database operation fails
    if (result.error) {
      throw new Error(result.errorMessage);
    }

    // Return successful response
    return res.status(201).json({
      data: result,
      msg: "Metadata created successfully",
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

const updateMetadata = async(req,res)=>{
  try{
    const user=req.user;
    if(!user || !user.id){
      return res.status(403).json({
        error: true,
        errorMessage: "Agency ID not found. Please log in again.",
      });
    }

    const agency_id = user.id;
    const {metadata_id }= req.params;
    const { product_name, data, released_data_link } = req.body;

    if (!metadata_id || !product_name || !data || !released_data_link) {
      return res.status(400).json({
        error: true,
        errorMessage: "metadata_id, product_name, data, and released_data_link are required fields.",
      });
    }

    const dataString = JSON.stringify(data);

    const updateDetails = {
      metadata_id,
      agency_id,
      product_name,
      data: Buffer.from(dataString),
      released_data_link,
      updated_by: user.username || "System",
    };

    const result = await updateMetadatadb(updateDetails);

    if (result.error) {
      throw new Error(result.errorMessage);
    }

    return res.status(200).json({
      data: result,
      msg: "Metadata updated successfully",
      statusCode: 200,
    });

  }catch(error){
    console.error("Error in updateMetadata:", error);
    return res.status(500).json({
      error: true,
      errorMessage: `Error in updating metadata: ${error.message}`,
    });
  }
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
