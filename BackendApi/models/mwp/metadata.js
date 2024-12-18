module.exports = (sequelize, DataTypes) => {
  const Metadata = sequelize.define(
    "Metadata",
    {
      metadata_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
      contact:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      statistical_presentation_and_description:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      institutional_mandate:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      quality_management:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      accuracy_and_reliability:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      timeliness: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      coherence_and_comparability: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      statistical_processing:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      metadata_update:{
        type: DataTypes.STRING,
        allowNull: false,
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
        allowNull: true,
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
