module.exports = (sequelize, DataTypes) => {
    const Agency = sequelize.define('Agency', {
      agency_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      agency_name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      agency_status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      created_by: {
        type: DataTypes.STRING,
        defaultValue: 'System',
      },
      updated_by: {
        type: DataTypes.STRING,
        defaultValue: 'System',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      }
    }, {
      timestamps: false, // You can use createdAt and updatedAt manually
      tableName: 'agencies',
    });
  
    // Association with Users model (Cascade on delete)
    Agency.associate = (models) => {
      Agency.hasMany(models.User, {
        foreignKey: 'agency_id',
        onDelete: 'CASCADE',
      });
    };
  
    return Agency;
  };
  