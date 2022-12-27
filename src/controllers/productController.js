let productModel = require('../models/productModel');
const validation = require('../validations/validation');
const aws = require('../aws/aws');
const { isValidObjectId } = require('mongoose')



const createProduct = async function (req, res) {
  try {
    let data = req.body;
    let files = req.files;

    if (!validation.requiredInput(data)) return res.status(400).send({ status: false, message: "Please provide details" });

    let { title, description, price, currencyId, currencyFormat, installments, isFreeShipping, productImage, style, availableSizes, ...rest } = { ...data };

    if (Object.keys(rest).length != 0) return res.status(400).send({ status: false, message: "Data required are title description price currencyId currencyFormat image style availableSizes installments isFreeShipping" })

    if (!validation.isEmpty(title)) return res.status(400).send({ status: false, message: "title is required" });
    if (!validation.isValidStreet(title)) return res.status(400).send({ status: false, message: "title is invalid" })

    if (!validation.isEmpty(description)) return res.status(400).send({ status: false, message: "description is required" });
    if (!validation.isValidStreet(description)) return res.status(400).send({ status: false, message: "description is invalid" })

    if (!validation.isEmpty(price)) return res.status(400).send({ status: false, message: "price is required" });
    if (!validation.isValidPrice(price)) return res.status(400).send({ status: false, message: "Price is not valid" })

    if (!validation.isEmpty(currencyId)) return res.status(400).send({ status: false, message: "currencyId is required" });
    if (currencyId != 'INR') return res.status(400).send({ status: false, message: "currencyId must be INR " })

    if (!validation.isEmpty(currencyFormat)) return res.status(400).send({ status: false, message: "currencyFormat is required" });
    if (currencyFormat != '₹') return res.status(400).send({ status: false, message: "currencyFormat must be ₹ " })

    const isTitleAlreadyUsed = await productModel.findOne({ title: req.body.title });
    if (isTitleAlreadyUsed) return res.status(400).send({ status: false, message: "Title is already used" });

    if (files.length === 0) return res.status(400).send({ status: false, message: "productImage is required" });
    if (!validation.validImage(files[0].originalname)) return res.status(400).send({ status: false, message: "productImage must be of extention .jpg,.jpeg,.bmp,.gif,.png" });

    let productImg = await aws.uploadFile(files[0]);
    data.productImage = productImg;

    if (isFreeShipping || isFreeShipping == "") {
      if (!validation.isEmpty(isFreeShipping)) return res.status(400).send({ status: false, message: "isFreeShipping is empty" })

      if (!(isFreeShipping == "true" || isFreeShipping == "false")) return res.status(400).send({ status: false, message: "Please enter a boolean value for isFreeShipping" })
    }

    if (style || style == "") {
      if (!validation.isEmpty(style)) {
        return res.status(400).send({ status: false, message: "Style is empty" })
      }
      if (!validation.isValidStyle(style)) {
        return res.status(400).send({ status: false, message: "Style is not in correct format" })
      }
    }

    if (availableSizes || availableSizes == "") {
      if (!validation.isEmpty(availableSizes)) return res.status(400).send({ status: false, message: 'Available size is empty' })
      let size = availableSizes.toUpperCase().split(" ")
      for (let i = 0; i < size.length; i++) {
        if (!["S", "XS", "M", "X", "L", "XXL", "XL"].includes(size[i])) {
          return res.status(400).send({ status: false, message: "Size is not available" })
        }
      }
      data.availableSizes = size;
    }

    if (installments || installments == "") {
      if (!validation.isEmpty(installments)) {
        return res.status(400).send({ status: false, message: "Installments is empty" })
      }
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

    if (size || size == "") {
      if (!validation.isEmpty(size)) return res.status(400).send({ status: false, message: "Size is empty" })
      size = size.toUpperCase();
      if (!["S", "XS", "M", "X", "L", "XXL", "XL"].includes(size)) return res.status(400).send({ status: false, message: "Size is not available" })

      obj.availableSizes = { $in: size }
    }

    if (name || name == "") {
      if (!validation.isEmpty(name)) return res.status(400).send({ status: false, message: "name is empty" })
      obj.title = { $regex: name }
    }
    if (priceGreaterThan || priceGreaterThan == "") {
      if (!validation.isEmpty(priceGreaterThan)) return res.status(400).send({ status: false, message: "priceGreaterThan is empty" })
      if (!validation.isValidPrice(priceGreaterThan)) return res.status(400).send({ status: false, message: "priceGreaterThan is not valid" })
      obj.price = { $gt: priceGreaterThan }
    }
    if (priceLessThan || priceLessThan == "") {
      if (!validation.isEmpty(priceLessThan)) return res.status(400).send({ status: false, message: "priceLessThan is empty" })
      if (!validation.isValidPrice(priceLessThan)) return res.status(400).send({ status: false, message: "priceLessThan is not valid" })
      obj.price = { $lt: priceLessThan }
    }
    if (priceSort || priceSort == "") {
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
    if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: 'ProductId is not valid' })
    const getProduct = await productModel.findOne({ isDeleted: false, _id: productId })
    if (!getProduct) return res.status(404).send({ status: false, message: 'Product not found' })
    return res.status(200).send({ status: true, data: getProduct })


  } catch (error) {
    return res.status(500).send({ status: false, error: error.message });
  }
}

const updateProduct = async function (req, res) {
  try {
    const productId = req.params.productId
    if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: 'Product id is invalid' });
    let productIsPresent = await productModel.findOne({ _id: productId, isDeleted: false })
    if (!productIsPresent) return res.status(404).send({ status: false, message: 'No such product' });
    const { title, description, price, currencyId, currencyFormat, isFreeShipping, productImage, style, availableSizes, installments } = req.body
    const files = req.files
    if (!validation.requiredInput(req.body)) return res.status(400).send({ status: false, message: 'Input is required for updation' });
    if (title || title == "") {
      if (!validation.isEmpty(title)) return res.status(400).send({ status: false, message: 'Title is empty' });
      if (!validation.isValidStreet(title)) return res.status(400).send({ status: false, message: 'Title should be valid' });
      if (productIsPresent.title === title) return res.status(400).send({ status: false, message: 'Already existing title' });
      productIsPresent.title = title
    }
    if (description || description == "") {
      if (!validation.isEmpty(description)) return res.status(400).send({ status: false, message: 'description is empty' });
      if (!validation.isValidStreet(description)) return res.status(400).send({ status: false, message: 'description should be valid' });
      productIsPresent.description = description
    }
    if (price || price == "") {
      if (!validation.isValidPrice(price)) return res.status(400).send({ status: false, message: 'price should be valid' });
      productIsPresent.price = price
    }
    if (currencyId || currencyId == "") {
      if (currencyId != 'INR') return res.status(400).send({ status: false, message: "currencyId must be INR " })
      productIsPresent.currencyId = currencyId
    }

    if (currencyFormat || currencyFormat == "") {
      if (currencyFormat != '₹') return res.status(400).send({ status: false, message: "currencyFormat must be ₹ " })
      productIsPresent.currencyFormat = currencyFormat
    }
    if (isFreeShipping || isFreeShipping == "") {
      if (!(isFreeShipping === "true" || isFreeShipping === "false")) return res.status(400).send({ status: false, message: "isFreeShipping should only be boolean" })
      productIsPresent.isFreeShipping = isFreeShipping
    }

    if (files && files.length > 0) {
      if (!validation.validImage(files[0].originalname))
        return res.status(400).send({ status: false, message: "productImage must be of extention .jpg,.jpeg,.bmp,.gif,.png" });
      let productImg = await aws.uploadFile(files[0]);
      productIsPresent.productImage = productImg;
    }

    if (style || style == "") {
      if (!validation.isEmpty(style)) return res.status(400).send({ status: false, message: 'style is empty' });
      if (!validation.isValidName(style)) return res.status(400).send({ status: false, message: 'style should be valid' });
      productIsPresent.style = style
    }
    if (availableSizes || availableSizes == "") {
      let size = availableSizes.toUpperCase().split(" ")
      for (let i = 0; i < size.length; i++) {
        if (!["S", "XS", "M", "X", "L", "XXL", "XL"].includes(size[i])) {
          return res.status(400).send({ status: false, message: "Size is not available" })
        }
      }
      size = size.join('')
      if (productIsPresent.availableSizes.includes(size)) return res.status(400).send({ status: false, message: "Size is already available" })
      productIsPresent.availableSizes.push(size)
    }

    if (installments || installments == "") {
      if (!validation.isValidPrice(installments)) return res.status(400).send({ status: false, message: 'installments should be valid' });
      productIsPresent.installments = installments
    }
    await productIsPresent.save()
    return res.status(200).send({ status: true, data: productIsPresent })
  } catch (error) {
    return res.status(500).send({ status: false, error: error.message });
  }
}

const deleteProduct = async function (req, res) {
  try {
    const productId = req.params.productId
    if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: 'Product id is invalid' });
    let productIsPresent = await productModel.findOne({ _id: productId, isDeleted: false })
    if (!productIsPresent) return res.status(404).send({ status: false, message: 'No such product' });
    await productModel.findByIdAndUpdate({ _id: productId }, { $set: { isDeleted: true, deletedAt: Date.now() } })
    return res.status(200).send({ status: true, message: 'Deleted Successfully' })
  } catch (error) {
    return res.status(500).send({ status: false, error: error.message })
  }
}



module.exports = { createProduct, getProductByQuery, getProductById, updateProduct, deleteProduct }