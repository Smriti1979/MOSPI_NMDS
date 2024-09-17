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
    const usersql = "SELECT * FROM AdminUsers WHERE ID=$1";
    const userDetail = await poolauth.query(usersql, [decodedToken._id]);
    const user = userDetail.rows[0];

    if (!user) {
      return res.status(400).json({ error: "Invalid admin Access Token" });
    }
    const User = {
      username: user.username,
      id: user.id,
      title: user.title,
    };

    req.user = User;
    next();
  } catch (error) {
    res.status(500).json({ error: "Invalid user" });
  }
};
module.exports = { verifyJWT };
