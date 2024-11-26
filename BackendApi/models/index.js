require("dotenv").config(); // Ensure dotenv is loaded

const { DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASETPM, DB_DIALECT, DB_PORT } = process.env;
const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize({
  host: DB_HOST,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASETPM,
  dialect: DB_DIALECT,  
});

sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection successful.");
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;


db.users = require("./pimd/users")(sequelize, DataTypes);
db.agencies = require("./pimd/agencies")(sequelize, DataTypes);


sequelize.sync({ alter: true })
  .then(() => console.log("Tables have been updated"))
  .catch((error) => console.error("Error updating tables:", error));

module.exports = db;
