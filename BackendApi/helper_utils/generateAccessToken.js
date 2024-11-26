
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { ACCESS_TOKEN_SECRET, ACCESS_TOKEN_EXPIRY } = process.env;
function generateAccessToken({ username, user_id }) {
  return jwt.sign(
    {
      _user_id: user_id,
      username: username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
}
module.exports = { generateAccessToken };