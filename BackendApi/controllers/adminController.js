/** @format */

const { generateAccessToken } = require("../helper_utils/genrateAccessToken");
const bcrypt = require("bcrypt");
const admindb = require("../DbQuery/dbOperationAdmin");
const {
  EmailValidation,
  createProductdb,
  createThemedb,
  getProuductdb,
  getMetaDatadb,
  getThemedb,
  updateProductDevdb,
  updateProductDomdb,
  updateThemedb,
  updateMetadataDomdb,
  deleteThemedb,
  updateMetadataDevdb,
  deleteProductdb,
  deleteMetadatadb,
  createMetadatadb,
} = admindb;
/**
 * Sign In
 */
const signInAdmin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const UserssDetail = await EmailValidation(email);
    if (UserssDetail?.error == true) {
      return res.status(403).json({ error: `User does not exist` });
    }
    const correctpassword = await bcrypt.compare(
      password,
      UserssDetail.password
    );
    if (!correctpassword) {
      return res.status(403).json({ error: `Required correct password` });
    }

    const adminAccessToken = generateAccessToken({
      email: email,
      id: UserssDetail.id,
    });
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    };

    res.cookie("adminAccessToken", adminAccessToken, cookieOptions);
    return res.status(200).send({
      data: {
        eamil: email,
      },
      msg: "UserVerfied",
      statusCode: true,
    });
  } catch (error) {
    return res.status(500).json({ error: `Error in signIn User ${error}` });
  }
};

/**
 * Create product
 */
const createProduct = async (req, res) => {
  const {
    id,
    title,
    count,
    icon,
    period,
    tooltip,
    type,
    url,
    table,
    swagger,
    viz,
    category,
  } = req.body;
  try {
    const user = req.user;
    if (!user.developer) {
      return res
        .status(405)
        .json({ error: `Only developer can create the product` });
    }
    const categories = await createProductdb(
      id,
      title,
      count,
      icon,
      period,
      tooltip,
      type,
      url,
      table,
      swagger,
      viz,
      category,
      res
    );
    if (categories?.error == true) {
      throw categories?.errorMessage;
    }

    return res.status(200).send({
      data: {
        id,
        title,
        count,
        icon,
        period,
        tooltip,
        type,
        url,
        table,
        swagger,
        viz,
        category: categories,
      },
      msg: "product created successfully",
      statusCode: true,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: `Error in Creating product: ${error}` });
  }
};
/**
 * -----Create theme ------
 *
 */

const createTheme = async (req, res) => {
  const { category, name } = req.body;
  try {
    const user = req.user;
    if (!user.developer) {
      return res
        .status(405)
        .json({ error: `Only developer can create the theme}` });
    }

    const result = await createThemedb(category, name);
    if (result?.error == true) {
      throw result?.errorMessage;
    }
    return res.status(200).send({
      data: result,
      msg: "theme created successfully",
      statusCode: true,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: `Error in Creating theme: ${error.message}` });
  }
};

/**
 * Metadata
 */
const createMetadata = async (req, res) => {
  const {
    Product,
    title,
    Category,
    Geography,
    Frequency,
    TimePeriod,
    DataSource,
    Description,
    lastUpdateDate,
    FutureRelease,
    BasePeriod,
    Keystatistics,
    NMDS,
    nmdslink,
    remarks
  } = req.body;
  try {
    const user = req.user;
    if (!user.developer) {
      return res
        .status(405)
        .json({ error: `Only developer can create the metadata` });
    }

    const result = await createMetadatadb(
      Product,
      title,
      Category,
      Geography,
      Frequency,
      TimePeriod,
      DataSource,
      Description,
      lastUpdateDate,
      FutureRelease,
      BasePeriod,
      Keystatistics,
      NMDS,
      nmdslink,
      remarks
    );

    if (result?.error == true) {
      throw result?.errorMessage;
    }

    return res.status(200).send({
      data: result,
      msg: "Meata data create successfully",
      statusCode: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: `Error in Creating Metadata: ${error}` });
  }
};
/*
Get product 
*/
const getProuduct = async (req, res) => {
  const { productId } = req.params;
  if (!productId) {
    return res.status(400).json({ error: `productID is required` });
  }
  try {
    const product = await getProuductdb(productId);

    if (product?.error == true) {
      throw product?.errorMessage;
    }
    return res.status(200).send({
      data: product,
      msg: "product data",
      statusCode: true,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: `Unable to fetch data Error=${error}` });
  }
};

/**
 * metadata
 */

const getMetaData = async (req, res) => {
  const { Product } = req.params;
  if (Product == undefined) {
    return res.status(400).json({ error: `productID is required` });
  }
  try {
    const metadata = await getMetaDatadb(Product);
    if (metadata?.error == true) {
      throw metadata?.errorMessage;
    }
    return res.status(200).send({
      data: metadata,
      msg: "product data",
      statusCode: true,
    });
  } catch (error) {
    console.log(error);

    return res
      .status(500)
      .json({ error: `Unable to fetch data Error=${error}` });
  }
};
/**
 *
 * ---------Get Theme---------
 *
 */
const getTheme = async (req, res) => {
  const { category } = req.params;
  if (category == undefined) {
    return res.status(400).json({ error: `category is required` });
  }
  try {
    const theme = await getThemedb(category);

    if (theme?.error == true) {
      throw theme?.errorMessage;
    }

    return res.status(200).send({
      data: theme,
      msg: "theme data",
      statusCode: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: `Unable to get theme ${error}` });
  }
};

/**
 *
 * --------Update Product-------------------------
 *
 */

const updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    count,
    icon,
    period,
    tooltip,
    type,
    url,
    table,
    swagger,
    viz,
    category,
  } = req.body;
  try {
    const user = req.user;
    if (!user.developer) {
      const product = await updateProductDomdb(
        id,
        title,
        count,
        period,
        tooltip,
        type,
        viz,
        category
      );

      if (product?.error == true) {
        throw product?.errorMessage;
      }

      return res.status(200).send({
        data: product,
        msg: "product updated successfully",
        statusCode: true,
      });
    }

    const product = await updateProductDevdb(
      id,
      title,
      count,
      icon,
      period,
      tooltip,
      type,
      url,
      table,
      swagger,
      viz,
      category
    );

    if (product?.error == true) {
      throw product?.errorMessage;
    }

    return res.status(200).send({
      data: product,
      msg: "product updated successfully",
      statusCode: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `Error in Updating product ${error}` });
  }
};

/**
 *
 * --------Update Theme----------------
 *
 */
const updateTheme = async (req, res) => {
  const { category } = req.params;
  const { name } = req.body;
  if (name == "" || name == null || name == undefined) {
    return res.status(405).json({ error: `category,name are required` });
  }
  if (category == null || category == undefined || category == "") {
    return res.status(405).json({ error: `Category is undefined` });
  }
  try {
    const user = req.user;
    if (!user.developer) {
      return res
        .status(405)
        .json({ error: `Only developer can edit the theme` });
    }
    const theme = await updateThemedb(name, category);
    if (theme?.error == true) {
      throw theme?.errorMessage;
    }

    return res.status(200).send({
      data: theme,
      msg: "theme updated successfully",
      statusCode: true,
    });
  } catch (error) {
    console.error(error);

    return res
      .status(500)
      .json({ error: `Error in Updating theme data: ${error}` });
  }
};

/**
 *
 * ----------Update MetaData----------
 *
 */


const updatedMetadata = async (req, res) => {
  const { Product } = req.params;
  const {
    title,
    Category,
    Geography,
    Frequency,
    TimePeriod,
    DataSource,
    Description,
    lastUpdateDate,
    FutureRelease,
    BasePeriod,
    Keystatistics,
    NMDS,
    nmdslink,
    remarks,
  } = req.body;

  try {
    const user = req.user;
    if (!user.developer) {
      const result = await updateMetadataDomdb(
        title,
        Category,
        Geography,
        Frequency,
        TimePeriod,
        DataSource,
        Description,
        lastUpdateDate,
        FutureRelease,
        BasePeriod,
        Keystatistics,
        NMDS,
        remarks,
        Product
      );
      if (result?.error === true) {
        throw result?.errorMessage;
      }
      return res.status(200).send({
        data: result,
        msg: "Metadata updated successfully",
        statusCode: true,
      });
    }
    const result = await updateMetadataDevdb(
      title,
      Category,
      Geography,
      Frequency,
      TimePeriod,
      DataSource,
      Description,
      lastUpdateDate,
      FutureRelease,
      BasePeriod,
      Keystatistics,
      NMDS,
      nmdslink,
      remarks,
      Product
    );
    if (result?.error === true) {
      throw result?.errorMessage;
    }

    return res.status(200).send({
      data: result,
      msg: "Metadata updated successfully",
      statusCode: true,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ error: `Error in updating metadata: ${error.message}` });
  }
};



/**
 *
 * -------Delete Product----------
 *
 */

const deleteProduct = async (req, res) => {
  const { id } = req.params;
  if (id == null || id == undefined || id == "") {
    return res.status(405).json({ error: `id in invalid` });
  }

  try {
    const user = req.user;
    if (!user.developer) {
      return res.status(405).json({ error: `Only developer can delete` });
    }
    const result = await deleteProductdb(id);
    if (result?.error == true) {
      throw result?.errorMessage;
    }
    return res.status(200).send({
      data: [],
      msg: "product deleted successfully",
      statusCode: true,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(503)
      .json({ error: `unable to delete the product ${error}` });
  }
};

/***
 *
 * --------------Delete MetaData-----------
 *
 */

const deleteMetadata = async (req, res) => {
  const { Product } = req.params;
  if (Product == null || Product == undefined || Product == "") {
    return res.status(400).json({ error: `product not define ` });
  }
  const user = req.user;
  if (!user.developer) {
    return res.status(400).json({ error: `Only developer can delete` });
  }
  try {
    const result = await deleteMetadatadb(Product);
    if (result?.error == true) {
      throw result?.errorMessage;
    }
    return res.status(200).send({
      data: [],
      msg: "metadata deleted successfully",
      statusCode: true,
    });
  } catch (error) {
    console.log(error);

    return res
      .status(500)
      .json({ error: `unable to delete the metadata ${error}` });
  }
};

/**
 *
 * --------Delete Theme----------
 *
 */

const deleteTheme = async (req, res) => {
  const { category } = req.params;
  if (!category) {
    return res.status(405).json({ error: `Category is invalid` });
  }
  const user = req.user;
  if (!user.developer) {
    return res.status(405).json({ error: `Only developer can delete` });
  }

  try {
    const result = await deleteThemedb(category);
    if (result?.error == true) {
      throw result?.errorMessage;
    }
    return res
      .status(200)
      .json({ message: "theme and associated data successfully deleted" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: `Unable to delete the theme: ${error.message}` });
  }
};

module.exports = {
  getMetaData,
  getTheme,
  updateProduct,
  updateTheme,
  updatedMetadata,
  deleteProduct,
  deleteMetadata,
  deleteTheme,
  getProuduct,
  createMetadata,
  createTheme,
  createProduct,
  signInAdmin,
};
