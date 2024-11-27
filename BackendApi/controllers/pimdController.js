/** @format */

const { generateAccessToken } = require("../helper_utils/generateAccessToken");
const bcrypt = require("bcrypt");
const pimddb = require("../DbQuery/dbOperationpimd");
const { poolpimd } = require('../DbQuery/dbOperationpimd');
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

  // getMetadataByAgencyIddb,
 
  // createProductdb,
  // getProductByIddb,
  // getProductdb,
  // getMetaDataByProductNamedb,
  // getMetaDataByVersionP,
  // getMetaDataByVersionPV,
  // updateProductDevdb,
  // updateProductDomdb,
  // updateMetadatadb,
  // deleteProductdb,
  // deleteMetadatadb,
  // createMetadatadb,
  // getMetaDatadb,
  // searchMetaDatadb,
  // getMetadataByAgencydb
} = pimddb;




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
        error: 'New user detected. Please reset your password.' 
      });
    }

    if (!UsersDetail.password) {
      return res.status(403).json({ error: 'Invalid credentials' });
    }

    const correctpassword = await bcrypt.compare(password, UsersDetail.password);
    if (!correctpassword) {
      return res.status(403).json({ error: 'Invalid credentials' });
    }

    const pimdAccessToken = generateAccessToken({
      username: UsersDetail.username,
      user_id: UsersDetail.user_id,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000,
    };

    res.cookie('pimdAccessToken', pimdAccessToken, cookieOptions);

    return res.status(200).json({
      data: {
        username,
        usertype : UsersDetail.usertype,
        token: pimdAccessToken,
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
  const { username, newPassword } = req.body;

  try {
    // Validate input
    if (!username || !newPassword) {
      return res.status(400).json({ error: "Both username and newPassword are required." });
    }

    // Fetch the user based on the username
    const userQuery = "SELECT * FROM users WHERE username = $1";
    const userResult = await poolpimd.query(userQuery, [username]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the password and set newuser to false
    const updateQuery = `
      UPDATE users
      SET password = $1, newuser = false
      WHERE username = $2
      RETURNING user_id, username;
    `;
    const updateResult = await poolpimd.query(updateQuery, [hashedPassword, username]);
    const updatedUser = updateResult.rows[0];

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

  // Only users with usertype "PIMD_USER" can create new users
  if (user.usertype !== "PIMD_USER") {
    return res.status(405).json({ error: "Only PIMD_USER can create a user" });
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
    if (user.usertype !== "PIMD_USER") {
      return res
        .status(405)
        .json({ error: `Only PIMD_USER can get the users` });
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

  // Check if the user is allowed to perform the update (PIMD_USER type)
  if (user.usertype !== "PIMD_USER") {
    return res.status(405).json({ error: `Only PIMD_USER can update the user` });
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
  if (user.usertype !== "PIMD_USER"){
    return res.status(405).json({ error: `Only PIMD_USER can delete the user` });
  }
  if (username == "PIMD_user"){
    return res.status(405).json({ error: `you can not delete PIMD_USER` });
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


// const getMetadata = async (req, res) => {
//   try {
//     // Extract the user's agency_id from the authenticated user data
//     const { agency_id } = req.user;

//     if (!agency_id) {
//       return res.status(400).json({
//         error: true,
//         message: "Agency ID not provided.",
//       });
//     }

//     // Fetch metadata for the agency
//     const metadataResponse = await getMetadataByAgencyIddb(agency_id);

//     if (metadataResponse.error) {
//       return res
//         .status(metadataResponse.errorCode)
//         .json({ error: true, message: metadataResponse.errorMessage });
//     }

//     // Send the retrieved metadata
//     return res.status(200).json({
//       error: false,
//       data: metadataResponse.data,
//     });
//   } catch (error) {
//     console.error("Controller error:", error);
//     return res.status(500).json({
//       error: true,
//       message: "An unexpected error occurred.",
//     });
//   }
// };


//AGENCY

const createagency = async (req, res) => {
  const { agency_name} = req.body;
  try {
    const user = req.user;

    if (user.usertype !== "PIMD_USER") {
      return res
        .status(405)
        .json({ error: `Only PIMD_USER can create agency` });
    }
   
    const result = await createagencydb(agency_name);

    if (result?.error == true) {
      throw result?.errorMessage;
    }
    return res.status(201).send({
      data: result,
      msg: "agency created successfully",
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

    if (user.usertype !== "PIMD_USER" ) {
      return res
        .status(405)
        .json({ error: `Only PIMD user or Nodal user can get agency` });
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

  // Check if the user has appropriate roles or is a PIMD_USER
  if (user.usertype !== "PIMD_USER") {
    return res
      .status(405)
      .json({ error: `Only PIMD_USER can update the agency` });
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
  
  if (user.usertype !== "PIMD_USER" ) {
    return res
      .status(405)
      .json({ error: `Only PIMD_USER can delete Agency` });
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





//METADATA
// const createMetadata = async (req, res) => {
//   try {
//     const user = req.user;

//     // Check user roles for permission
//     const userRoles = await getUserRoles(user.id);  
//     const hasRole1or2 = userRoles.includes(1) || userRoles.includes(2);
//     if (user.usertype !== "PIMD_USER" && !hasRole1or2) {
//       return res
//         .status(405)
//         .json({ error: `Only PIMD_USER or users with roleId 1 or 2 can create the Metadata` });
//     }

//     // Exclude predefined fields and store the rest in the `data` column as JSON
//     const { agency_id, product_id, product_name, status, created_by, ...dynamicData } = req.body; // Capture dynamic fields into `dynamicData`

//     // Call the database function to create the metadata
//     const result = await createMetadatadb({
//       agency_id, 
//       product_id, 
//       product_name, 
//       data: dynamicData,  // Store the remaining dynamic fields as JSON
//       user_created_id: user.id,  // user who created this metadata
//       status, 
//       created_by, 
//     });

//     // Handle error in case no result is returned
//     if (result?.error) {
//       throw new Error(result?.errorMessage);
//     }

//     // Return successful response
//     return res.status(201).send({
//       data: result,
//       msg: "Metadata created successfully",
//       statusCode: 201,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: `Error in creating metadata: ${error.message}` });
//   }
// };

// const getMetaData = async (req, res) => {
//   try {
//     const metadata = await getMetaDatadb();

//     if (metadata?.error === true) {
//       throw metadata?.errorMessage;
//     }

//     // Check if metadata has a "data" field and simplify it
//     if (metadata?.data && Array.isArray(metadata.data)) {
//       metadata.data = metadata.data.map(item => {
//         if (item.data && item.data.data) {
//           item.data = item.data.data; // Flatten the nested data
//         }
//         return item;
//       });
//     }

//     return res.status(200).send({
//       metadata,
//       msg: "metadata",
//       statusCode: true,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ error: `Unable to fetch data Error=${error}` });
//   }
// };


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

//     if(user.usertype=="PIMD_USER" || hasRole1or2 ){
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
//     if (user.usertype !== "PIMD_USER" && !hasRole1) {
//       return res
//         .status(403)
//         .json({ error: "Only PIMD_USER or User with role 1 can delete the METADATA" });
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


// const getMetaDataByAgency = async (req, res) => {
//   try {
//     const user = req.user;
//     const { agency_name } = req.params;

//     if (!user || !agency_name) {
//       return res.status(400).json({ error: "Agency name is missing in the user object." });
//     }

//     const agencyData = await getMetadataByAgencydb(agency_name);

//     return res.status(200).json({
//       success: true,
//       message: "metadata data fetched successfully.",
//       data: agencyData,
//     });
//   } catch (error) {
//     console.error("Error in getMetaDataByAgency controller:", error.message);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch agency data.",
//       error: error.message,
//     });
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

  // getMetadata,

  // getMetaDataByProductName,
  // updateProduct,
  // updatedMetadata,
  // deleteProduct,
  // deleteMetadata,
  // getProductById,
  // createMetadata,
  // createProduct,
  // getProduct,
  // getMetaData,
  // getMetaDataByVersion,
  // searchMetaData,
  // getMetaDataByAgency
};
