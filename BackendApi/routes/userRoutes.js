/** @format */

//importing modules
const express = require("express");

const { verifyJWT } = require("../auth/user.auth.middleware.js");
const mwpController = require("../controllers/mwpController.js");
const {
  signin,
  changePassword,
  activateUser,
  deactivateUser,
  createUser,
  getUser,
  updateUser,
  activateAgency,
  deactivateAgency,
  getagency,
  createagency,
  updateagency,
  getMetadataAllVersion,
  getallusertypes,
  createMetadata,
  updateMetadata,
  getAllMetadata,
  searchMetadata
} = mwpController;
const router = express.Router();

const app = express();

app.use(express.json());



//SIGNIN

router.route("/signin").post(signin);

//USER

router.route("/mwp/user").post(verifyJWT,createUser); 
router.route("/mwp/user").get(verifyJWT,getUser);  
router.route("/mwp/activate/user/:user_id").put (verifyJWT,activateUser);
router.route("/mwp/deactivate/user/:user_id").put(verifyJWT, deactivateUser);
router.route("/mwp/user/:username").put(verifyJWT,updateUser); 
router.route("/mwp/usertypes").get(verifyJWT, getallusertypes);
router.route("/user/changepassword").put(changePassword);

//AGENCY

router.route("/mwp/agency").post(verifyJWT, createagency);
router.route("/agency").get(getagency); 
router.route("/mwp/agency/:agency_name").put(verifyJWT, updateagency);
router.route("/mwp/activate/agency/:agency_id").put (verifyJWT,activateAgency);
router.route("/mwp/deactivate/agency/:agency_id").put (verifyJWT, deactivateAgency);

//METADATA

router.route("/mwp/metadata").post(verifyJWT, createMetadata); 
router.route("/metadata").get(getAllMetadata);
router.route("/mwp/metadata").get(verifyJWT, getMetadataAllVersion);
router.route("/mwp/metadata/:id").put(verifyJWT, updateMetadata);
router.route("/metadata/search").get(searchMetadata);





module.exports = router;
