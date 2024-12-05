require("dotenv").config(); // Load environment variables

const { DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASETPM, DB_DIALECT } = process.env;
const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize({
  host: DB_HOST,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASETPM,
  dialect: DB_DIALECT,
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.users = require("./mwp/users")(sequelize, DataTypes);
db.agencies = require("./mwp/agencies")(sequelize, DataTypes);
db.metadata = require("./mwp/metadata")(sequelize, DataTypes);
db.roles = require("./mwp/roles")(sequelize, DataTypes);
db.userroles = require("./mwp/userroles")(sequelize, DataTypes);

// Function to seed predefined roles
const seedRoles = async () => {
  const predefinedRoles = [
    "mad-edit",
    "aad-create",
    "aad-edit",
    "aad-delete",
    "au-create",
    "au-edit",
    "au-delete",
    "au-approve",
  ];

  const existingRoles = await db.roles.findAll();
  if (existingRoles.length >= predefinedRoles.length) {
    console.log("Roles are already seeded.");
    return; // Skip seeding if roles are already present
  }

  for (const roleName of predefinedRoles) {
    await db.roles.findOrCreate({
      where: { role_name: roleName },
    });
  }

  console.log("Predefined roles have been seeded successfully.");
};

// Function to seed predefined user roles
const seedUserRoles = async () => {
  const predefinedUserRoles = [
    { usertype: "mwp_admin", role_name: "mad-edit" },
    { usertype: "mwp_admin", role_name: "aad-create" },
    { usertype: "mwp_admin", role_name: "aad-delete" },
    { usertype: "agency_admin", role_name: "aad-edit" },
    { usertype: "agency_admin", role_name: "au-create" },
    { usertype: "agency_admin", role_name: "au-delete" },
    { usertype: "agency_admin", role_name: "au-approve" },
    { usertype: "agency_user", role_name: "au-edit" },
  ];

  const existingUserRoles = await db.userroles.findAll();
  if (existingUserRoles.length >= predefinedUserRoles.length) {
    console.log("User roles are already seeded.");
    return; // Skip seeding if user roles are already present
  }

  for (const userRole of predefinedUserRoles) {
    await db.userroles.findOrCreate({
      where: {
        usertype: userRole.usertype,
        role_name: userRole.role_name,
      },
    });
  }

  console.log("Predefined user roles have been seeded successfully.");
};

// Initialize database connection and sync
const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    // Sync all models
    await sequelize.sync({ alter: true });
    console.log("All models synchronized successfully.");

    // Seed data
    await seedRoles();
    await seedUserRoles();
  } catch (error) {
    console.error("Error during database initialization:", error);
  }
};

// Run initialization
initDatabase();

// Export database object
module.exports = db;
