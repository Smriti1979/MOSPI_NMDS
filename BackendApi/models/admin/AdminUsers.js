module.exports = (sequelize, DataTypes) => {
  const AdminUsers = sequelize.define('adminUsers', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    developer: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: `adminusers`,
    timestamps: false,
    freezeTableName: true
  });
  return AdminUsers;
}
