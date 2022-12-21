let productModel = require('../models/productModel');
const validation = require('../validations/validation');
const aws = require('../aws/aws');
const userModel = require('../models/userModel');



const createProduct = async function (req, res) {
  try {
    let data = req.body;
    let files = req.files;

    if (Object.keys(data).length == 0) {
      return res.status(400).send({ status: false, message: "Please provide details" });
    }

    let { title, description, price, currencyId, currencyFormat, installments, isFreeShipping, productImage, style, availableSizes, ...rest } = { ...data };

    if (Object.keys(rest).length != 0) {
      return res.status(400).send({
        status: false,
        message: "Data required are title description price currencyId currencyFormat image style availableSizes installments isFreeShipping"
      });
    }

    if (!title) return res.status(400).send({ status: false, message: "title is required" });
    if (!description) return res.status(400).send({ status: false, message: "description is required" });
    if (!price) return res.status(400).send({ status: false, message: "price is required" });
    if (!validation.isValidPrice(price)) {
      return res.status(400).send({ status: false, message: "Price should be a number" })
    }
    if (!validation.isValidPrice(price)) return res.status(400).send({ status: false, message: "Price is not valid" })
    if (!currencyId) return res.status(400).send({ status: false, message: "currencyId is required" });
    if (currencyId != 'INR') return res.status(400).send({ status: false, message: "currencyId must be INR " })
    if (!currencyFormat) return res.status(400).send({ status: false, message: "currencyFormat is required" });
    if (currencyFormat != '₹') return res.status(400).send({ status: false, message: "currencyFormat must be ₹ " })
    const isTitleAlreadyUsed = await productModel.findOne({ title: req.body.title });
    if (isTitleAlreadyUsed) return res.status(404).send({ status: false, message: "Title is already used" });

    if (files.length === 0) return res.status(400).send({ status: false, message: "productImage is required" });
    if (!validation.validImage(files[0].originalname))
      return res.status(400).send({ status: false, message: "productImage must be of extention .jpg,.jpeg,.bmp,.gif,.png" });
    let productImg = await aws.uploadFile(files[0]);
    data.productImage = productImg;

    if (isFreeShipping) {
      if (!validation.isEmpty(isFreeShipping)) {
        return res.status(400).send({ status: false, message: "isFreeShipping is empty" })
      }

      if (!(isFreeShipping == "true" || isFreeShipping == "false")) {
        return res.status(400).send({ status: false, message: "Please enter a boolean value for isFreeShipping" })
      }
    }

    if (style) {
      if (!validation.isEmpty(style)) {
        return res.status(400).send({ status: false, message: "Style is empty" })
      }
      if (!validation.isValidStyle(style)) {
        return res.status(400).send({ status: false, message: "Style is not in correct format" })
      }
    }

    if (availableSizes) {
      let size = availableSizes.toUpperCase().split(" ")

      for (let i = 0; i < size.length; i++) {
        if (!validation.validSize(size[i])) {
          return res.status(400).send({ status: false, message: "Size is not available" })
        }
      }
      data.availableSizes = size;
    }

    if (installments || installments == "") {
      if (!validation.isEmpty(installments)) {
        return res.status(400).send({ status: false, message: "Installments is empty" })
      }
    }

    if (installments) {
      if (!validation.isValidPrice(installments)) {
        return res.status(400).send({ status: false, message: "Installments should be a valid number" })
      }
    }

    const savedData = await productModel.create(data);
    return res.status(201).send({ status: true, message: "Success", data: savedData });

  } catch (error) {
    return res.status(500).send({ status: false, error: error.message });
  }
};

const getProductByQuery = async function (req, res) {
  try {
    if (!validation.requiredInput(req.query)) return res.status(400).send({ status: false, message: "Input is required" })
    let { size, name, priceGreaterThan, priceLessThan, priceSort } = req.query

    let obj = { isDeleted: false }

    if (size) {
      size = size.toUpperCase();
      if (!validation.validSize(size)) return res.status(400).send({ status: false, message: "Size is not valid" })
      obj.availableSizes = { $in: size }
    }

    if (name) {
      obj.title = { $regex: name }
    }
    if (priceGreaterThan) {
      obj.price = { $gt: priceGreaterThan }
    }
    if (priceLessThan) {
      obj.price = { $lt: priceLessThan }
    }
    if (priceSort) {
      if (!(priceSort == -1 || priceSort == 1)) return res.status(400).send({ status: false, message: "Price sort can only be 1 or -1" })
    }

    let allProduct = await productModel.find(obj).sort({ price: priceSort })
    if (!allProduct.length > 0) return res.status(404).send({ status: false, message: "Product not found" })
    return res.status(200).send({ status: true, data: allProduct })

  } catch (error) {
    return res.status(500).send({ status: false, error: error.message });
  }
}


const getProductById = async function (req, res) {
  try {
    const productId = req.params.productId

    const getProduct = await userModel.findById({ isDeleted: false, _id: productId })
    if (!getProduct) return res.status(404).send({ status: false, message: 'Product not found' })
    return res.status(200).send({ status: true, data: getProduct })


  } catch (error) {
    return res.status(500).send({ status: false, error: error.message });
  }
}

const updateProduct = async function (req, res) {
  try {
    const productId = req.params.productId
    let productIsPresent = await productModel.findById({ _id: productId, isDeleted: false })
    if (!productIsPresent) return res.status(404).send({ status: false, message: 'No such product' });
    const { title, description, price, currencyId, currencyFormat, isFreeShipping, productImage, style, availableSizes, installments } = req.body
    const files = req.files
    if (!validation.requiredInput(req.body)) return res.status(400).send({ status: false, message: 'Input is required for updation' });
    let obj = {}
    if (title || title == "") {
      if (!validation.isEmpty(title)) return res.status(400).send({ status: false, message: 'Title should be valid' });
      if (!validation.isValidName(title)) return res.status(400).send({ status: false, message: 'Title should be string' });
      let existingTitle = await productModel.findOne({ title: title })
      if (existingTitle) return res.status(400).send({ status: false, message: 'Already existing title' });
      obj.title = title
    }
    if (description || description == "") {
      if (!validation.isEmpty(description)) return res.status(400).send({ status: false, message: 'description should be valid' });
      if (!validation.isValidName(description)) return res.status(400).send({ status: false, message: 'description should be string' });
      obj.description = description
    }
    if (price) {
      if (!validation.price(price)) return res.status(400).send({ status: false, message: 'price should be valid' });
      obj.price = price
    }
    if (currencyId) {
      if (currencyId != 'INR') return res.status(400).send({ status: false, message: "currencyId must be INR " })
      obj.currencyId = currencyId
    }
    if (currencyFormat) {
      if (currencyFormat != '₹') return res.status(400).send({ status: false, message: "currencyFormat must be INR " })
      obj.currencyFormat = currencyFormat
    }
    if (isFreeShipping) {
      if (!(isFreeShipping === "true" || isFreeShipping === "false")) return res.status(400).send({ status: false, message: "isFreeShipping should only be boolean" })
      obj.isFreeShipping = isFreeShipping
    }

    if (files && files.length > 0) {
      if (!validation.validImage(files[0].originalname))
        return res.status(400).send({ status: false, message: "productImage must be of extention .jpg,.jpeg,.bmp,.gif,.png" });
      let productImg = await aws.uploadFile(files[0]);
      req.body.productImage = productImg;
    }

    if (style || style == "") {
      if (!validation.isEmpty(style)) return res.status(400).send({ status: false, message: 'style should be valid' });
      if (!validation.isValidName(style)) return res.status(400).send({ status: false, message: 'style should be string' });
      obj.style = style
    }
    if (availableSizes) {
      if (!validation.isEmpty(availableSizes)) return res.status(400).send({ status: false, message: 'availableSizes should be valid' });
      if (!["S", "XS", "M", "X", "L", "XXL", "XL"].includes(availableSizes)) return res.status(400).send({ status: false, message: 'availableSizes should be within "["S", "XS", "M", "X", "L", "XXL", "XL"]"' });
      obj.availableSizes = availableSizes
    }
    if (installments) {
      if (!validation.price(installments)) return res.status(400).send({ status: false, message: 'installments should be valid' });
      obj.installments = installments
    }

    let updateProduct = await productModel.findByIdAndUpdate({ _id: productId }, { $set: { title: title, description: description, price: price, currencyId: currencyId, currencyFormat: currencyFormat, isFreeShipping: isFreeShipping, productImage: productImage, style: style, availableSizes: availableSizes, installments: installments } }, { new: true })
    return res.status(200).send({ status: true, data: updateProduct })

  } catch (error) {
    return res.status(500).send({ status: false, error: error.message });
  }
}

const deleteProduct = async function (req, res) {
  try {
    const productId = req.params.productId
    let productIsPresent = await productModel.findById({ _id: productId, isDeleted: false })
    if (!productIsPresent) return res.status(404).send({ status: false, message: 'No such product' });
    await productModel.findByIdAndUpdate({ _id: productId }, { $set: { isDeleted: true, deletedAt: Date.now() } })
    return res.status(200).send({ status: true, message: 'Deleted Successfully' })
  } catch (error) {
    return res.status(500).send({ status: false, error: error.message })
  }
}



module.exports = { createProduct, getProductByQuery, getProductById, updateProduct, deleteProduct }