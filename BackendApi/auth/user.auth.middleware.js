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
      req.cookies?.pimdAccessToken ||
      (req.headers.authorization || "").replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Unauthorized request: Missing token" });
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const usersql = "SELECT * FROM users WHERE user_id=$1"; // Match your table schema
    const userDetail = await poolauth.query(usersql, [decodedToken._user_id]);

    const user = userDetail.rows[0];

    if (!user) {
      return res.status(403).json({ error: "Invalid PIMD Access Token" });
    }

    req.user = {
      username: user.username,
      user_id: user.user_id,
      usertype: user.usertype,
    };

    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message); // Debugging
    res.status(500).json({ error: "Server error during user verification" });
  }
};
module.exports = { verifyJWT };
