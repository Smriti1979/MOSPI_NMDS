// module.exports = (sequelize, DataTypes) => {
//   const Metadata = sequelize.define(
//     "Metadata",
//     {
//       id:{
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true,
//         allowNull: false,
//       },
//       metadata_id: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//       },
//       agency_id: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//         references: {
//           model: "agencies",
//           key: "agency_id",
//         },
//         onUpdate: "CASCADE",
//         onDelete: "CASCADE",
//       },
//       product_name: {
//         type: DataTypes.STRING,
//         allowNull: false,
//       },
//       contact:{
//         type: DataTypes.JSON,
//         allowNull: false,
//       },
//       statistical_presentation_and_description:{
//         type: DataTypes.JSON,
//         allowNull: false,
//       },
//       institutional_mandate:{
//         type: DataTypes.JSON,
//         allowNull: false,
//       },
//       quality_management:{
//         type: DataTypes.JSON,
//         allowNull: false,
//       },
//       accuracy_and_reliability:{
//         type: DataTypes.JSON,
//         allowNull: false,
//       },
//       timeliness: {
//         type: DataTypes.JSON,
//         allowNull: false,
//       },
//       coherence_and_comparability: {
//         type: DataTypes.JSON,
//         allowNull: false,
//       },
//       statistical_processing:{
//         type: DataTypes.JSON,
//         allowNull: false,
//       },
//       metadata_update:{
//         type: DataTypes.VARCHAR,
//         allowNull: false,
//       },
//       version: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//       },
//       latest_version: {
//         type: DataTypes.BOOLEAN,
//         allowNull: false,
//         defaultValue: false,
//       },
//       released_data_link: {
//         type: DataTypes.STRING,
//         allowNull: true,
//       },
//       created_by: {
//         type: DataTypes.STRING,
//         allowNull: true,
//       },
//       updated_by: {
//         type: DataTypes.STRING,
//         allowNull: true,
//       },
//       created_at: {
//         type: DataTypes.DATE,
//         allowNull: true,
//         defaultValue: DataTypes.NOW,
//       },
//       updated_at: {
//         type: DataTypes.DATE,
//         allowNull: true,
//       },
//     },
//     {
//       tableName: "metadata",
//       timestamps: false,
//       underscored: true,
//     }
//   );

//   Metadata.associate = (models) => {
//     Metadata.belongsTo(models.Agency, {
//       foreignKey: "agency_id",
//       onDelete: "CASCADE",
//       onUpdate: "CASCADE",
//     });
//   };

//   return Metadata;
// };

module.exports = (sequelize, DataTypes) => {
  const Metadata = sequelize.define(
    "Metadata",
    {
      id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
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
      contact_organisation :{
        type: DataTypes.STRING,
        allowNull: false,
      },
      compiling_agency:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      contact_details :{
        type: DataTypes.STRING,
        allowNull: false,
      },
      data_description :{
        type: DataTypes.STRING,
        allowNull: false,
      },
      classification_system:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      sector_coverage: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      statistical_concepts_and_definitions: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      statistical_unit:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      statistical_population :{
        type: DataTypes.STRING,
        allowNull: false,
      },
      reference_period:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      data_confidentiality:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      legal_acts_and_other_agreements:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      data_sharing:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      release_policy:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      release_calendar:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      frequency_of_dissemination:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      data_access :{
        type: DataTypes.STRING,
        allowNull: false,
      },
      documentation_on_methodology:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      quality_documentation:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      quality_assurance:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      quality_assessment:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      sampling_error:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      timeliness:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      comparability_overtime:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      coherence:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      source_data_type:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      frequency_of_data_collection:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      data_collection_method:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      data_validation :{
        type: DataTypes.STRING,
        allowNull: false,
      },
      data_compilation :{
        type: DataTypes.STRING,
        allowNull: false,
      },
      metadata_last_posted  :{
        type: DataTypes.STRING,
        allowNull: false,
      },
      metadata_last_update :{
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
