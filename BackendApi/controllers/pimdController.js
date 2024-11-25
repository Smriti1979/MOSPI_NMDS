/** @format */

const { generateAccessToken } = require("../helper_utils/generateAccessToken");
const bcrypt = require("bcrypt");
const pimddb = require("../DbQuery/dbOperationpimd");
const { poolpimd } = require('../DbQuery/dbOperationpimd');
// var AES = require("crypto-js/aes");
const {
  EmailValidation,
  // createProductdb,
  createagencydb,
  // getProductByIddb,
  // getProductdb,
  getMetaDataByProductNamedb,
  getagencyByIddb,
  getMetaDataByVersionP,
  getMetaDataByVersionPV,
  // updateProductDevdb,
  // updateProductDomdb,
  updateagencydb,
  deleteagencydb,
  updateMetadatadb,
  // deleteProductdb,
  deleteMetadatadb,
  getagencydb,
  createMetadatadb,
  getMetaDatadb,
  searchMetaDatadb,
  createUserdb,
  getUserdb,
  getUserByUsernameDb,
  deleteUserDb,
  updateUserDb,
  updateuserroles,
  getMetadataByAgencydb
} = pimddb;


const getUserRoles = async (userId) => {
  try {
    const query = `SELECT role_id FROM userroles WHERE user_id = $1`;
    const result = await poolpimd.query(query, [userId]);

    
    
    if (result.rows.length > 0) {
      return result.rows.map(row => row.roleid);  // Returns an array of roleIds
    } else {
      return []; // No roles found
    }
  } catch (error) {
    console.error('Error fetching user roles:', error);
    throw new Error('Error fetching user roles');
  }
};


//USER

const createUser = async (req, res) => {
  const { username, password, title, name, email, phone, address, roleIds } = req.body;
  const user = req.user;

  // Check required fields
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  // Only users with title "PIMD User" can create new users
  if (user.title !== "PIMD User") {
    return res.status(405).json({ error: "Only PIMD Users can create a user" });
  }

  // Ensure roles are provided
  if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
    return res.status(400).json({ error: "At least one role is required" });
  }

  try {
    // Call the database function to create the user and assign roles
    const newUser = await createUserdb(username, password, title, name, email, phone, address, roleIds);

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
    if (user.title !== "PIMD User") {
      return res
        .status(405)
        .json({ error: `Only PIMD User can get the users` });
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
const getUserByUsername = async (req, res) => {
  let { username } = req.params;
  // console.log(`Username from request params: ${username}`); // Debug log

  const user = req.user;
  if (user.title !== "PIMD User") {
    return res.status(405).json({ error: `Only PIMD User can access this data` });
  }
  
  try {
    const userData = await getUserByUsernameDb(username);
    // console.log(`Data retrieved from DB:`, userData); // Debug log

    if (userData.error === true) {
      return res.status(400).json({ error: userData.errorMessage });
    }
    
    return res.status(200).send({
      data: userData,
      msg: "User fetched successfully",
      statusCode: true,
    });
  } catch (error) {
    return res.status(500).json({ error: `Error fetching user: ${error}` });
  }
};
const deleteUser = async (req, res) => {
  let { username } = req.params;
  const user = req.user;
  if (user.title !== "PIMD User"){
    return res.status(405).json({ error: `Only PIMD User can delete the user` });
  }
  if (username == "PIMD_user"){
    return res.status(405).json({ error: `you can not delete PIMD user` });
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
const updateUser = async (req, res) => {
  let { username } = req.params;
  let { title, name, email, phno, address, password } = req.body; // Password is now part of the request body
  const user = req.user;

  if (user.title !== "PIMD User") {
    return res.status(405).json({ error: `Only PIMD User can update the user` });
  }

  try {
    const updatedUser = await updateUserDb(username, title, name, email, phno, address, password); // Pass password to the update function
    if (updatedUser.error == true) {
      return res.status(404).json({ error: updatedUser.errorMessage });
    }
    return res.status(200).send({
      data: {username, title, name, email, phno, address,},
      msg: "User updated successfully",
      statusCode: true,
    });
  } catch (error) {
    return res.status(500).json({ error: `Error updating user: ${error}` });
  }
};
async function updateroles(req, res) {
  const { username } = req.params; // Get username from request params
  const { roleIds } = req.body; // Get roleIds array from the request body

  if (!roleIds || roleIds.length === 0) {
    return res.status(400).json({ error: 'role IDs are required' });
  }

  try {
    const result = await updateuserroles(username, roleIds);

    if (result.error) {
      return res.status(result.errorCode).json({ message: result.errorMessage });
    }

    return res.status(200).json({ message: result.message });
  } catch (err) {
    console.error('Error in updateroles controller:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

//SIGNIN

const signInpimd = async (req, res) => {
  const userAgents = req.headers['x-from-swagger'];
  const userAgent = req.headers['user-agent'] || '';
  let { username, password } = req.body;

  try {
    const key = process.env.PASSWORD_KEY;

    // Decrypt the password if needed (you can uncomment this part when necessary)
    if (!userAgents && !userAgent.includes('Postman')) {
      // password = AES.decrypt(password, key);
    }

    // Wait for the email validation process to complete
    const UsersDetail = await EmailValidation(username);

    // Check if UsersDetail is null or has an error field
    if (!UsersDetail || UsersDetail.error === true) {
      return res.status(403).json({ error: `User does not exist` });
    }

    // Check if the password exists in UsersDetail
    if (!UsersDetail.password) {
      return res.status(403).json({ error: 'Password not found for the user' });
    }

    // Compare the password with the hash stored in the database
    const correctpassword = await bcrypt.compare(password, UsersDetail.password);

    if (!correctpassword) {
      return res.status(403).json({ error: `Incorrect password` });
    }

    // Generate the access token for the user
    const pimdAccessToken = generateAccessToken({
      username: username,
      id: UsersDetail.id,
    });

    // Set up the cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000,
    };

    // Set the cookie with the access token
    res.cookie('pimdAccessToken', pimdAccessToken, cookieOptions);

    // Send the response with the user data and token
    return res.status(200).send({
      data: {
        username: username,
        role: UsersDetail.title,
        token: pimdAccessToken
      },
      msg: "UserVerified",
      statusCode: true,
    });
  } catch (error) {
    // Log the error for debugging
    console.error(error);

    // Return a response with a 500 status code and the error message
    return res.status(500).json({ error: `Error in signIn User: ${error.message}` });
  }
};

//PRODUCT

// const createProduct = async (req, res) => {
//   const {
//     id,
//     title,
//     count,
//     icon,
//     period,
//     tooltip,
//     type,
//     url,
//     table,
//     swagger,
//     viz,
//     agency_name,
//   } = req.body;
  
//   try {
//     const productID = id.toLowerCase();
//     const user = req.user;


//     // Check if the user has roleId 1 or 2 or is a "PIMD User"
//     const userRoles = await getUserRoles(user.id);  // Fetch user roles from your database

//     const hasRole1or2 = userRoles.includes(1) || userRoles.includes(2);
//     if (user.title !== "PIMD User" && !hasRole1or2) {
//       return res
//         .status(405)
//         .json({ error: `Only PIMD User or users with roleId 1 or 2 can create the product` });
//     }

//     const authorId = req.user.id;

//     // Proceed to create the product in the database
//     const categories = await createProductdb(
//       productID,
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
//       agency_name,
//       authorId,
//       userRoles  // Pass userRoles to the database function
//     );

//     if (categories?.error === true) {
//       throw categories?.errorMessage;
//     }

//     return res.status(201).send({
//       data: {
//         id,
//         title,
//         count,
//         icon,
//         period,
//         tooltip,
//         type,
//         url,
//         table,
//         swagger,
//         viz,
//         agency_name: categories,
//       },
//       msg: "Product created successfully",
//       statusCode: true,
//     });
    
//   } catch (error) {
//     console.error(error);
//     return res
//       .status(error?.errorCode || 500)
//       .json({ error: `Error in Creating product: ${error}` });
//   }
// };

// const getProductById = async (req, res) => {
//   let { productId } = req.params;
//   productId=productId.toLowerCase()
//   const user = req.user;
//     const userRoles = await getUserRoles(user.id);
    
//     const hasRole1or2 = userRoles.includes(1) || userRoles.includes(2) || userRoles.includes(3);
//     if (user.title !== "PIMD User" && !hasRole1or2) {
//       return res
//         .status(405)
//         .json({ error: `Only PIMD User or users with roleId 1 or 2 or 3 can view the product` });
//     }
//   if (!productId) {
//     return res.status(400).json({ error: `productID is required` });
//   }
//   try {
//     const product = await getProductByIddb(productId);

//     if (product?.error == true) {
//       throw product?.errorMessage;
//     }
//     return res.status(200).send({
//       data: product,
//       msg: "product data",
//       statusCode: true,
//     });
//   } catch (error) {
//     console.error(error);
//     return res
//       .status(500)
//       .json({ error: `Unable to fetch data Error=${error}` });
//   }
// };
// const getProduct = async (req, res) => {

//   try {
//     const user = req.user;
//     const userRoles = await getUserRoles(user.id);
    
//     const hasRole1or2 = userRoles.includes(1) || userRoles.includes(2) || userRoles.includes(3);
//     if (user.title !== "PIMD User" && !hasRole1or2) {
//       return res
//         .status(405)
//         .json({ error: `Only PIMD User or users with roleId 1 or 2 or 3 can view the product` });
//     }
//     const product = await getProductdb();
//     if (product?.error == true) {
//       throw product?.errorMessage;
//     }
//     return res.status(200).send({
//       data: product,
//       msg: "product data",
//       statusCode: true,
//     });
//   } catch (error) {
//     console.error(error);
//     return res
//       .status(500)
//       .json({ error: `Unable to fetch data Error=${error}` });
//   }
// };
// const updateProduct = async (req, res) => {
//   let { id } = req.params;
//   id = id.toLowerCase();
//   const user = req.user;
//     const userRoles = await getUserRoles(user.id);
    
//     const hasRole1or2 = userRoles.includes(1) || userRoles.includes(2);
//     if (user.title !== "PIMD User" && !hasRole1or2) {
//       return res
//         .status(405)
//         .json({ error: `Only PIMD User or users with roleId 1 or 2 can update the product` });
//     }

//   const {
//     title,
//     count,
//     icon,
//     period,
//     tooltip,
//     type,
//     url,
//     table,
//     swagger,
//     viz,
//     agency_name,
//   } = req.body;

//   try {
//     // Proceed with the update operation for "pimd" users only
//     const product = await updateProductDevdb(
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
//       agency_name
//     );

//     if (product?.error == true) {
//       throw product?.errorMessage;
//     }

//     return res.status(200).send({
//       data: product,
//       msg: "Product updated successfully",
//       statusCode: true,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: `Error in updating product: ${error}` });
//   }
// };
// const deleteProduct = async (req, res) => {
//   const user = req.user;
//     const userRoles = await getUserRoles(user.id);
    
//     const hasRole1 = userRoles.includes(1);
//     if (user.title !== "PIMD User" && !hasRole1) {
//       return res
//         .status(405)
//         .json({ error: `Only PIMD User or users with roleId 1 can delete the product` });
//     }
//   let { id } = req.params;
//   id=id.toLowerCase()
//   if (id == null || id == undefined || id == "") {
//     return res.status(405).json({ error: `id in invalid` });
//   }

//   try {
//     const result = await deleteProductdb(id);
//     if (result?.error == true) {
//       throw result?.errorMessage;
//     }
//     return res.status(200).send({
//       data: [],
//       msg: "product deleted successfully",
//       statusCode: true,
//     });
//   } catch (error) {
//     console.log(error);
//     return res
//       .status(503)
//       .json({ error: `unable to delete the product ${error}` });
//   }
// };

//AGENCY

const createagency = async (req, res) => {
  const { agency_name} = req.body;
  try {
    const user = req.user;
    const userRoles = await getUserRoles(user.id);  

    const hasRole1or2 = userRoles.includes(1) || userRoles.includes(2);
    if (user.title !== "PIMD User" && !hasRole1or2) {
      return res
        .status(405)
        .json({ error: `Only PIMD User or users with roleId 1 or 2 can create agency` });
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


    // Check if the user has roleId 1 or 2 or is a "PIMD User"
    const userRoles = await getUserRoles(user.id);  // Fetch user roles from your database

    const hasRole1or2or3 = userRoles.includes(1) || userRoles.includes(2) || userRoles.includes(3);
    if (user.title !== "PIMD User" && !hasRole1or2or3) {
      return res
        .status(405)
        .json({ error: `Only PIMD User or users with roleId 1 or 2 or 3 can get agency` });
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
const getagencyById = async (req, res) => {
  const user = req.user;
  if (user.title !== "PIMD User") {
    return res
      .status(403) 
      .json({ error: "Only PIMD User users can access the agency." });
  }
  const { agency_name } = req.params;
  if (agency_name == undefined) {
    return res.status(400).json({ error: `agency_name is required` });
  }
  try {
    const agency = await getagencyByIddb(agency_name);

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
  const { agency_name } = req.params;
  const { name } = req.body;
  const user = req.user;


  // Check if the user has roleId 1 or 2 or is a "PIMD User"
  const userRoles = await getUserRoles(user.id);  // Fetch user roles from your database

  const hasRole1or2 = userRoles.includes(1) || userRoles.includes(2);
  if (user.title !== "PIMD User" && !hasRole1or2) {
    return res
      .status(405)
      .json({ error: `Only PIMD User or users with roleId 1 or 2 can update the agency` });
  }

  if (name == "" || name == null || name == undefined) {
    return res.status(405).json({ error: `agency_name,name are required` });
  }
  if (agency_name == null || agency_name == undefined || agency_name == "") {
    return res.status(405).json({ error: `agency_name is undefined` });
  }
  try {
    const agency = await updateagencydb(name, agency_name);
    if (agency?.error == true) {
      throw agency?.errorMessage;
    }

    return res.status(200).send({
      data: agency,
      msg: "agency updated successfully",
      statusCode: true,
    });
  } catch (error) {
    console.error(error);

    return res
      .status(500)
      .json({ error: `Error in Updating agency data: ${error}` });
  }
};
const deleteagency = async (req, res) => {
  const { agency_name } = req.params;
  const user = req.user;
 
  const userRoles = await getUserRoles(user.id);
    
  const hasRole1 = userRoles.includes(1);
  
  if (user.title !== "PIMD User" && !hasRole1) {
    return res
      .status(405)
      .json({ error: `Only PIMD User or User with role 1 can delete Agency` });
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
const createMetadata = async (req, res) => {
  try {
    const user = req.user;

    // Check user roles for permission
    const userRoles = await getUserRoles(user.id);  
    const hasRole1or2 = userRoles.includes(1) || userRoles.includes(2);
    if (user.title !== "PIMD User" && !hasRole1or2) {
      return res
        .status(405)
        .json({ error: `Only PIMD User or users with roleId 1 or 2 can create the Metadata` });
    }

    // Exclude predefined fields and store the rest in the `data` column as JSON
    const { agency_id, product_id, product_name, status, created_by, ...dynamicData } = req.body; // Capture dynamic fields into `dynamicData`

    // Call the database function to create the metadata
    const result = await createMetadatadb({
      agency_id, 
      product_id, 
      product_name, 
      data: dynamicData,  // Store the remaining dynamic fields as JSON
      user_created_id: user.id,  // user who created this metadata
      status, 
      created_by, 
    });

    // Handle error in case no result is returned
    if (result?.error) {
      throw new Error(result?.errorMessage);
    }

    // Return successful response
    return res.status(201).send({
      data: result,
      msg: "Metadata created successfully",
      statusCode: 201,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: `Error in creating metadata: ${error.message}` });
  }
};

const getMetaData = async (req, res) => {
  try {
    const metadata = await getMetaDatadb();

    if (metadata?.error === true) {
      throw metadata?.errorMessage;
    }

    // Check if metadata has a "data" field and simplify it
    if (metadata?.data && Array.isArray(metadata.data)) {
      metadata.data = metadata.data.map(item => {
        if (item.data && item.data.data) {
          item.data = item.data.data; // Flatten the nested data
        }
        return item;
      });
    }

    return res.status(200).send({
      metadata,
      msg: "metadata",
      statusCode: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: `Unable to fetch data Error=${error}` });
  }
};


const getMetaDataByProductName = async (req, res) => {
  const { Product } = req.params;
  
  if (Product == undefined) {
    return res.status(400).json({ error: `product name is required` });
  }
  try {
    const metadata = await getMetaDataByProductNamedb(Product);
    if (metadata?.error == true) {
      throw metadata?.errorMessage;
    }
    return res.status(200).send({
      data: metadata,
      msg: "metadata",
      statusCode: true,
    });
  } catch (error) {
    console.log(error);

    return res
      .status(500)
      .json({ error: `Unable to fetch data Error=${error}` });
  }
};

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

const updatedMetadata = async (req, res) => {
  let { Product } = req.params;
  Product=Product.toLowerCase()
  const {...metadata}=req.body

  try {
    const user = req.user;
    const user_id=user.id
    const userRoles = await getUserRoles(user.id);

    const hasRole1or2 = userRoles.includes(1) || userRoles.includes(2);

    if(user.title=="PIMD User" || hasRole1or2 ){
      const result = await updateMetadatadb(
        Product,
        metadata,
        user_id
      );
    if (result?.error === true) {
        throw result?.errorMessage;
      }
      return res.status(200).send({
        data: result,
        msg: "Metadata updated successfully",
        statusCode: true,
      });
    }
    else{
      return res.status(403).send({
        msg: "Invalid user",
        statusCode: true,
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ error: `Error in updating metadata: ${error}` });
  }
};

const deleteMetadata = async (req, res) => {
  const { product } = req.params; // Use lowercase 'product' to match the route
  const user = req.user;
 
  try {
    // Fetch user roles
    const userRoles = await getUserRoles(user.id);
    const hasRole1 = userRoles.includes(1);
    
    // Permission Check
    if (user.title !== "PIMD User" && !hasRole1) {
      return res
        .status(403)
        .json({ error: "Only PIMD User or User with role 1 can delete the METADATA" });
    }
    
    // Check if product is provided
    if (!product) {
      return res.status(400).json({ error: "Product not defined" });
    }

    // Delete metadata from the database
    const result = await deleteMetadatadb(product);
    if (result?.error) {
      return res.status(result.errorCode || 500).json({ error: result.errorMessage });
    }

    // Success response
    return res.status(200).json({
      msg: "Metadata deleted successfully",
      statusCode: true,
    });
    
  } catch (error) {
    console.error("Error deleting metadata:", error);
    return res.status(500).json({ error: `Unable to delete metadata: ${error.message || error}` });
  }
};


const getMetaDataByAgency = async (req, res) => {
  try {
    const user = req.user;
    const { agency_name } = req.params;

    if (!user || !agency_name) {
      return res.status(400).json({ error: "Agency name is missing in the user object." });
    }

    const agencyData = await getMetadataByAgencydb(agency_name);

    return res.status(200).json({
      success: true,
      message: "metadata data fetched successfully.",
      data: agencyData,
    });
  } catch (error) {
    console.error("Error in getMetaDataByAgency controller:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch agency data.",
      error: error.message,
    });
  }
};


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
  getMetaDataByProductName,
  getagencyById,
  // updateProduct,
  updateagency,
  updatedMetadata,
  // deleteProduct,
  deleteMetadata,
  deleteagency,
  // getProductById,
  createMetadata,
  createagency,
  // createProduct,
  signInpimd,
  getagency,
  // getProduct,
  getMetaData,
  // getMetaDataByVersion,
  // searchMetaData,
  createUser,
  getUser,
  getUserByUsername,
  deleteUser,
  updateUser,
  updateroles,
  getMetaDataByAgency
};
