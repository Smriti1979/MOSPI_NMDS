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
// db.roles = require("./mwp/roles")(sequelize, DataTypes);
db.userroles = require("./mwp/userroles")(sequelize, DataTypes);

// Function to seed predefined agencies
const seedAgencies = async () => {
  const predefinedAgencies = [
    { agency_name: "MWP" }, // Add more agencies as needed
  ];

  for (const agency of predefinedAgencies) {
    await db.agencies.findOrCreate({
      where: { agency_name: agency.agency_name },
    });
  }

  console.log("Predefined agencies have been seeded successfully.");
};

// Function to seed predefined users
const seedUsers = async () => {
  const predefinedUsers = [
    {
      agency_id: 1, // Assumes agency with ID 1 exists; modify as needed
      username: "mwp_admin",
      name: "Ram",
      password: "$2a$10$OlI7KS7oEJP.2/urpRWfJuEa8NqP49FrSRcGPPr9hhiMs.qN6Z/HS", // bcrypt hash of "mwp_admin123"
      usertype: "mwp_admin",
      phone: "1234567890",
      email: "mwp@gmail.com",
      address: "ABC Colony",
      newuser: false,
    },
  ];

  for (const user of predefinedUsers) {
    await db.users.findOrCreate({
      where: { username: user.username },
      defaults: user, // Insert new user with these details if not found
    });
  }

  console.log("Predefined users have been seeded successfully.");
};

// Function to seed predefined roles
// const seedRoles = async () => {
//   const predefinedRoles = [
//     "mad-edit",
//     "aad-create",
//     "aad-edit",
//     "aad-delete",
//     "au-create",
//     "au-edit",
//     "au-delete",
//     "au-approve",
//   ];

//   const existingRoles = await db.roles.findAll();
//   if (existingRoles.length >= predefinedRoles.length) {
//     console.log("Roles are already seeded.");
//     return;
//   }

//   for (const roleName of predefinedRoles) {
//     await db.roles.findOrCreate({
//       where: { role_name: roleName },
//     });
//   }

//   console.log("Predefined roles have been seeded successfully.");
// };

// Function to seed predefined user roles
const seedUserRoles = async () => {
  const predefinedUserRoles = [
    { usertype: "mwp_admin", cancreate: "agency_admin", canupdate: "mwp_admin", candelete:"agency_admin" },
    { usertype: "agency_admin", cancreate: "agency_user", canupdate: "agency_admin", candelete:"agency_user" },
    { usertype: "agency_user", cancreate: "none", canupdate: "agency_user", candelete:"none" }
  ];

  const existingUserRoles = await db.userroles.findAll();
  if (existingUserRoles.length >= predefinedUserRoles.length) {
    console.log("User roles are already seeded.");
    return;
  }

  for (const userRole of predefinedUserRoles) {
    await db.userroles.findOrCreate({
      where: {
        usertype: userRole.usertype,
        cancreate: userRole.cancreate,
        canupdate: userRole.canupdate,
        candelete: userRole.candelete,
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
    await seedAgencies();
    await seedUsers();
    // await seedRoles();
    await seedUserRoles();
  } catch (error) {
    console.error("Error during database initialization:", error);
  }
};

// Run initialization
initDatabase();

// Export database object
module.exports = db;
