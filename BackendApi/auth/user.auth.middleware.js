/** @format */
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

// DB connection for ASI
const poolauth = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASETPM,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT, // Default PostgreSQL port
});
const verifyJWT = async (req, res, next) => {
  try {
    const token =
      req.cookies?.adminAccessToken ||
      (req.headers.authorization || "").replace("Bearer ", "");

    if (!token) {
      return res.status(400).json({ error: "Unauthorized request" });
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const usersql = "SELECT * FROM users WHERE user_id=$1";
    const userDetail = await poolauth.query(usersql, [decodedToken._id]);
    const user = userDetail.rows[0];
  
    if (!user) {
      return res.status(400).json({ error: "Invalid mwp Access Token" });
    }
    const User = {
      username: user.username,
      id: user.user_id,
      usertype: user.usertype,
    };

    req.user = User;
    next();
  } catch (error) {
    res.status(500).json({ error: "Invalid user" });
  }
};
module.exports = { verifyJWT };