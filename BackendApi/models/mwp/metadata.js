module.exports = (sequelize, DataTypes) => {
  const Metadata = sequelize.define(
    "Metadata",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      metadata_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      agency_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "agencies",
          key: "agency_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      product_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      data: {
        type: DataTypes.BLOB('long'), // Will map to bytea in PostgreSQL
        allowNull: true,
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      latest_version: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      released_data_link: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "metadata",
      timestamps: false,
      underscored: true,
    }
  );

  Metadata.associate = (models) => {
    Metadata.belongsTo(models.Agency, {
      foreignKey: "agency_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Metadata;
};
