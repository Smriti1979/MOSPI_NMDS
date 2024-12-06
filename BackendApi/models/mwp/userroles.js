module.exports = (sequelize, DataTypes) => {
    const UserRole = sequelize.define(
      "UserRole",
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        usertype:{
          type: DataTypes.STRING,
          unique:true,
          allownull:false
        },
        cancreate: {
          type: DataTypes.STRING,
        },
        canupdate: {
          type: DataTypes.STRING,
        },
        candelete: {
          type: DataTypes.STRING,
        }
      },
      {
        tableName: "userroles",
        timestamps: false, 
        underscored: true,
      }
    );
  
    return UserRole;
  };
  