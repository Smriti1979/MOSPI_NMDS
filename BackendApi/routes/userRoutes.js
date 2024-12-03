/** @format */

//importing modules
const express = require("express");

const { verifyJWT } = require("../auth/user.auth.middleware.js");
const pimdController = require("../controllers/pimdController.js");
const {
  signin,
  changePassword,
  createagency,
  updateagency,
  deleteagency,
  getagency,
  createUser,
  getUser,
  deleteUser,
  updateUser,
  createMetadata,
  updateMetadata,
  getAllMetadata,
  deleteMetadata
  // getProductById,
  // getMetaDataByProductName,
  // updateProduct,
  // updatedMetadata,
  // deleteProduct,
  // deleteMetadata,
  // searchMetaData,
  // getMetaData,
  // getProduct,
  // getMetaDataByVersion,
  // getMetaDataByAgency
} = pimdController;
const router = express.Router();

const app = express();

app.use(express.json());



//SIGNIN
router.route("/signin").post(signin);

//USER

router.route("/pimd/user").post(verifyJWT,createUser); 
router.route("/pimd/user").get(verifyJWT,getUser);  
router.route("/pimd/user/:username").delete(verifyJWT,deleteUser); 
router.route("/pimd/user/:username").put(verifyJWT,updateUser); 

router.route("/user/changepassword").put(changePassword);

//AGENCY
router.route("/pimd/agency").post(verifyJWT, createagency);
router.route("/pimd/agency/:agency_name").delete(verifyJWT, deleteagency);  
router.route("/pimd/agency").get(verifyJWT, getagency); 
router.route("/pimd/agency/:agency_name").put(verifyJWT, updateagency);

router.route("/pimd/metadata").post(verifyJWT, createMetadata); 
router.route("/metadata").get(getAllMetadata);
router.route("/pimd/metadata/:metadata_id").put(verifyJWT, updateMetadata);
router.route("/pimd/metadata/:id").delete(verifyJWT, deleteMetadata);

// router.route("/pimd/meta/search").get(searchMetaData); 
// router.route("/pimd/metadata/version").get(verifyJWT, getMetaDataByVersion); 
// router.route("/pimd/metadata/:Product").get(verifyJWT, getMetaDataByProductName);
// // router.route("/pimd/metadata/:product_id").put(verifyJWT, updatedMetadata); 
// router.route("/pimd/metadata/:product").delete(verifyJWT, deleteMetadata);


// router.route("/pimd/metadata/:agency_name").get(verifyJWT, getMetaDataByAgency); 



module.exports = router;
