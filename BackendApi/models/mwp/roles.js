// module.exports = (sequelize, DataTypes) => {
//     const Role = sequelize.define(
//       "Role",
//       {
//         role_id: {
//           type: DataTypes.INTEGER,
//           autoIncrement: true,
//           primaryKey: true,
//         },
//         role_name: {
//           type: DataTypes.STRING,
//           allowNull: false,
//           unique: true,
//         },
//       },
//       {
//         tableName: "roles",
//         timestamps: false, // Disable created_at and updated_at fields
//         underscored: true, // Use snake_case for column names
//       }
//     );
  
//     return Role;
//   };
  