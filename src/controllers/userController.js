const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { uploadFile } = require('../aws/aws');
const validations = require('../validations/validation');
const { isValidObjectId } = require('mongoose');
let { isEmpty, isValidName, isValidPhone, isValidpincode, isValidStreet, isValidEmail, isValidPswd, isJson } = validations;


const createUser = async function (req, res) {

    try {
        let data = req.body;
        let files = req.files;

        if (Object.keys(data).length == 0) {
            return res.status(400).send({ status: "false", message: "All fields are mandatory" });
        }
        if (files.length == 0) {
            return res.status(400).send({ status: false, message: "Profile pic is mandatory" })
        }

        let { fname, lname, email, phone, password, address } = data;

        if (!isEmpty(fname)) {
            return res.status(400).send({ status: "false", message: "fname must be present" });
        }
        if (!isEmpty(lname)) {
            return res.status(400).send({ status: "false", message: "lname must be present" });
        }
        if (!isEmpty(email)) {
            return res.status(400).send({ status: "false", message: "email must be present" });
        }
        if (!isEmpty(phone)) {
            return res.status(400).send({ status: "false", message: "phone number must be present" });
        }
        if (!isEmpty(password)) {
            return res.status(400).send({ status: "false", message: "password must be present" });
        }
        if (!isEmpty(address)) {
            return res.status(400).send({ status: "false", message: "address must be present" });
        }
        if (!isValidName(fname)) {
            return res.status(400).send({ status: "false", message: "first name must be in alphabetical order" });
        }
        if (!isValidName(lname)) {
            return res.status(400).send({ status: "false", message: "last name must be in alphabetical order" });
        }
        if (!isValidEmail(email)) {
            return res.status(400).send({ status: "false", message: "Provide a valid email" });
        }
        if (!isValidPhone(phone)) {
            return res.status(400).send({ status: "false", message: "Provide a valid phone number" });
        }
        if (!isValidPswd(password)) {
            return res.status(400).send({ status: false, message: "Provide password between 8 to 15 characters and must contain one capital letter and one special character" })
        }

        address = isJson(address)

        if (typeof (address) !== 'object') { return res.status(400).send({ status: true, msg: "please put address in object format" }) }

        if (!address.shipping || typeof (address.shipping) !== 'object') { return res.status(400).send({ status: true, msg: "shipping address is required and must be in object format" }) }

        if (!address.billing || typeof (address.billing) !== 'object') { return res.status(400).send({ status: true, msg: "billing address is required and must be in object format" }) }

        let arr = ["street", "city", "pincode"]
        for (i of arr) {
            if (!address.shipping[i]) return res.status(400).send({ status: false, msg: `${i} is not present in your shipping address` })
        }

        for (i of arr) {
            if (!address.billing[i]) return res.status(400).send({ status: false, msg: `${i} is not present in your billing address` })
        }

        if (!isValidStreet(address.shipping.street)) { return res.status(400).send({ status: false, message: "shipping street is invalid" }) }

        if (!isValidpincode(address.shipping.pincode)) { return res.status(400).send({ status: false, message: "shipping pincode is invalid" }) }

        if (!isValidStreet(address.billing.street)) { return res.status(400).send({ status: false, message: "billing street is invalid" }) }

        if (!isValidpincode(address.billing.pincode)) { return res.status(400).send({ status: false, message: "billing pincode is invalid" }) }

        const saltRounds = 10
        let hash = bcrypt.hash(password, saltRounds);
        data.password = hash;

        let checkEmailAndPhone = await userModel.findOne({ $or: [{ email }, { phone }] });
        if (checkEmailAndPhone) {
            return res.status(400).send({ status: "false", message: "Email or phone already exists" });
        }

        let PicUrl = await uploadFile(files[0])
        if (!PicUrl) return res.status(400).send({ status: false, msg: "Provide valid profile picture" })
        data.profileImage = PicUrl
        data.address = address

        let createData = await userModel.create(data);
        return res.status(201).send({
            status: true, message: "User created successfully", data: createData
        });

    } catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
}


const loginUser = async function (req, res) {
    try {
        const { email, password } = req.body
        if (!Object.keys(req.body).length > 0) return res.status(400).send({ status: false, message: 'Input is required' })

        if (!email) return res.status(400).send({ status: false, message: 'Email is required' })

        if (!password) return res.status(400).send({ status: false, message: 'Password is required' })

        let presentUser = await userModel.findOne({ email })
        if (!presentUser) return res.status(401).send({ status: false, message: 'Invalid email' })

        let comparePassword = await bcrypt.compare(password, presentUser.password)
        if (!comparePassword) return res.status(401).send({ status: false, message: 'Incorrect password' })

        const encodeToken = jwt.sign({ userId: presentUser._id, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) }, 'group29')
        let obj = { userId: presentUser._id, token: encodeToken }
        return res.status(200).send({ status: true, data: obj })

    } catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
}

const getuser = async function (req, res) {
    try {
        let userId = req.params.userId;
        let userLoggedIn = req.decodedToken.userId
        if (userId != userLoggedIn) {
            return res.status(403).send({ status: false, msg: "Authorization failed" })
        }
        let correctdata = await userModel.findById({ _id: userId });
        if (!correctdata) {
            return res.status(404).send({ status: false, message: "No data found" })
        }
        return res.status(200).json({ status: true, message: "User profile details", data: correctdata })

    } catch (err) {
        return res.status(500).json({ status: false, message: err.message })
    }
}

const updateUser = async function (req, res) {
    try {
        let userId = req.params.userId;
        let userLoggedIn = req.decodedToken.userId;

        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "userid is invalid" });
        }

        const checkUser = await userModel.findOne({ _id: userId });
        if (!checkUser) {
            return res.status(404).send({ status: false, message: "User does not exist" });
        }

        if (userId != userLoggedIn) {
            return res.status(403).send({ status: false, message: "Authorization failed" });
        }

        const data = req.body;
        let files = req.files;
        if (Object.keys(data).length == 0 && files == undefined) {
            return res.status(400).send({ status: false, message: "Insert Data : BAD REQUEST" });
        }

        let { fname, lname, email, phone, password, profileImage } = data;

        if (fname || fname == "") {
            if (!isEmpty(fname)) {
                return res.status(400).send({ status: false, message: "Please Provide first name" });
            }
            if (!isValidName(fname)) {
                return res.status(400).send({ status: false, msg: "Invalid fname" });
            }
        }

        if (lname || lname == "") {
            if (!isEmpty(lname)) {
                return res.status(400).send({ status: false, msg: "Please Provide last name" });
            }
            if (!isValidName(lname)) {
                return res.status(400).send({ status: false, msg: "Invalid lname" });
            }
        }

        if (email || email == "") {
            if (!isEmpty(email)) {
                return res.status(400).send({ status: false, msg: "Please Provide email address" });
            }

            if (!isValidEmail(email)) {
                return res.status(400).send({ status: false, message: "Provide a valid email id" });
            }
            const checkEmail = await userModel.findOne({ email: email });
            if (checkEmail) {
                return res.status(400).send({ status: false, message: "email id already exist" });
            }
        }

        if (phone || phone == "") {
            if (!isEmpty(phone)) {
                return res.status(400).send({ status: false, msg: "Please Provide email address" });
            }
            if (!isValidPhone(phone)) {
                return res.status(400).send({ status: false, message: "Invalid phone number" });
            }

            const checkPhone = await userModel.findOne({ phone: phone });
            if (checkPhone) {
                return res.status(400).send({ status: false, message: "phone number already exist" });
            }
        }

        if (password || password == "") {
            if (!isEmpty(password)) {
                return res.status(400).send({ status: false, message: "password is required" });
            }
            if (!isValidPswd(password)) {
                return res.status(400).send({ status: false, message: "Provide password between 8 to 15 characters and must contain one capital letter and one special character" });
            }

            const saltRounds = 10
            let hash = bcrypt.hash(password, saltRounds);
            data.password = hash;
        }

        if (data.address || data.address == "") {
            data.address = isJson(data.address)
            if (typeof (data.address) !== 'object') { return res.status(400).send({ status: true, msg: "please put address in object format" }) }
            if (!isEmpty(data.address)) {
                return res.status(400).send({ status: false, message: "Please provide address details!" });
            }

            if (data.address.shipping) {
                if (typeof (data.address.shipping) !== 'object') { return res.status(400).send({ status: true, msg: "shipping address is required and must be in object format" }) }

                if (data.address.shipping.city) {
                    if (!isEmpty(data.address.shipping.street)) { return res.status(400).send({ status: false, message: "shipping street is invalid" }) }
                }

                if (data.address.shipping.street) {
                    if (!isValidStreet(data.address.shipping.street) || !isEmpty(data.address.shipping.street)) { return res.status(400).send({ status: false, message: "shipping street is invalid" }) }
                }

                if (data.address.shipping.pincode) {
                    if (!isValidpincode(data.address.shipping.pincode) || !isEmpty(data.address.shipping.pincode)) { return res.status(400).send({ status: false, message: "shipping pincode is invalid" }) }
                }

            }

            if (data.address.billing) {
                if (typeof (data.address.billing) !== 'object') { return res.status(400).send({ status: true, msg: "billing address is required and must be in object format" }) }

                if (data.address.billing.city) {
                    if (!isEmpty(data.address.billing.street)) { return res.status(400).send({ status: false, message: "billing street is invalid" }) }
                }

                if (data.address.billing.street) {
                    if (!isValidStreet(data.address.billing.street) || !isEmpty(data.address.billing.street)) { return res.status(400).send({ status: false, message: "shipping street is invalid" }) }
                }

                if (data.address.billing.pincode) {
                    if (!isValidpincode(data.address.billing.pincode) || !isEmpty(data.address.billing.pincode)) { return res.status(400).send({ status: false, message: "shipping pincode is invalid" }) }
                }

            }
        }

        if (profileImage == "" && files.length == 0) return res.status(400).send({ status: false, message: "Image can't be empty" })

        if (files && files.length > 0) {
            if (!validations.validImage(files[0].originalname)) {
                return res.status(400).send({ status: false, message: "Image is not valid must be of extention .jpg,.jpeg,.bmp,.gif,.png" })
            } else {
                let uploadProfileURL = await uploadFile(files[0])
                data.profileImage = uploadProfileURL
            }
        }

        let updateData = await userModel.findOneAndUpdate({ _id: userId }, data, { new: true });
        res.status(200).send({ status: true, message: "User profile updated", data: updateData });
    } catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
};


module.exports = { createUser, loginUser, getuser, updateUser }