module.exports = (sequelize, DataTypes) => {
    const UserRole = sequelize.define(
      "UserRole",
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        usertype: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        role_name: {
          type: DataTypes.STRING,
          allowNull: false,
          references: {
            model: "roles", // This assumes you already have a roles table
            key: "role_name",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
      },
      {
        tableName: "userroles",
        timestamps: false, // Disable created_at and updated_at
        underscored: true,
      }
    );
  
    return UserRole;
  };
  