
const jwt = require("jsonwebtoken");
require("dotenv").config();
function generateAccessToken({ username, user_id }) {
  return jwt.sign(
    {
      _id: user_id,
      username: username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
}
module.exports = { generateAccessToken };