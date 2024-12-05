/** @format */

//importing modules
const express = require("express");

const { verifyJWT } = require("../auth/user.auth.middleware.js");
const mwpController = require("../controllers/mwpController.js");
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
} = mwpController;
const router = express.Router();

const app = express();

app.use(express.json());



//SIGNIN
router.route("/signin").post(signin);

//USER

router.route("/mwp/user").post(verifyJWT,createUser); 
router.route("/mwp/user").get(verifyJWT,getUser);  
router.route("/mwp/user/:username").delete(verifyJWT,deleteUser); 
router.route("/mwp/user/:username").put(verifyJWT,updateUser); 

router.route("/user/changepassword").put(changePassword);

//AGENCY
router.route("/mwp/agency").post(verifyJWT, createagency);
router.route("/mwp/agency/:agency_name").delete(verifyJWT, deleteagency);  
router.route("/mwp/agency").get(verifyJWT, getagency); 
router.route("/mwp/agency/:agency_name").put(verifyJWT, updateagency);

router.route("/mwp/metadata").post(verifyJWT, createMetadata); 
router.route("/metadata").get(getAllMetadata);
router.route("/mwp/metadata/:metadata_id").put(verifyJWT, updateMetadata);
router.route("/mwp/metadata/:id").delete(verifyJWT, deleteMetadata);

// router.route("/mwp/meta/search").get(searchMetaData); 
// router.route("/mwp/metadata/version").get(verifyJWT, getMetaDataByVersion); 
// router.route("/mwp/metadata/:Product").get(verifyJWT, getMetaDataByProductName);
// router.route("/mwp/metadata/:product_id").put(verifyJWT, updatedMetadata); 
// router.route("/mwp/metadata/:product").delete(verifyJWT, deleteMetadata);


// router.route("/mwp/metadata/:agency_name").get(verifyJWT, getMetaDataByAgency); 



module.exports = router;
