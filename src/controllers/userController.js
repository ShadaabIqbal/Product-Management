const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { uploadFile } = require('../aws/aws');
const validations = require('../validations/validation');



const createUser = async function (req, res) {

    try {
        let data = req.body;
        let files = req.files;

        if (!validations.requiredInput(data)) {
            return res.status(400).send({ status: "false", message: "All fields are mandatory" });
        }
        if (files.length == 0) {
            return res.status(400).send({ status: false, message: "Profile pic is mandatory" })
        }

        let { fname, lname, email, phone, password, address } = data;

        if (!validations.isEmpty(fname)) {
            return res.status(400).send({ status: "false", message: "fname must be present" });
        }
        if (!validations.isEmpty(lname)) {
            return res.status(400).send({ status: "false", message: "lname must be present" });
        }
        if (!validations.isEmpty(email)) {
            return res.status(400).send({ status: "false", message: "email must be present" });
        }
        if (!validations.isEmpty(phone)) {
            return res.status(400).send({ status: "false", message: "phone number must be present" });
        }
        if (!validations.isEmpty(password)) {
            return res.status(400).send({ status: "false", message: "password must be present" });
        }
        if (!validations.isEmpty(address)) {
            return res.status(400).send({ status: "false", message: "address must be present" });
        }
        if (!validations.isValidName(fname)) {
            return res.status(400).send({ status: "false", message: "first name must be in alphabetical order" });
        }
        if (!validations.isValidName(lname)) {
            return res.status(400).send({ status: "false", message: "last name must be in alphabetical order" });
        }
        if (!validations.isValidEmail(email)) {
            return res.status(400).send({ status: "false", message: "Provide a valid email" });
        }
        if (!validations.isValidPhone(phone)) {
            return res.status(400).send({ status: "false", message: "Provide a valid phone number" });
        }
        if (!validations.isValidPswd(password)) {
            return res.status(400).send({ status: false, message: "Provide password between 8 to 15 characters and must contain one capital letter and one special character" })
        }

        address = validations.isJson(address)

        // if (typeof (address) !== 'object') { return res.status(400).send({ status: true, message: "please put address in object format" }) }

        if (!address.shipping || typeof (address.shipping) !== 'object') { return res.status(400).send({ status: true, message: "shipping address is required and must be in object format" }) }

        if (!address.billing || typeof (address.billing) !== 'object') { return res.status(400).send({ status: true, message: "billing address is required and must be in object format" }) }

        let arr = ["street", "city", "pincode"]
        for (i of arr) {
            if (!address.shipping[i]) return res.status(400).send({ status: false, message: `${i} is not present in your shipping address` })
        }

        for (i of arr) {
            if (!address.billing[i]) return res.status(400).send({ status: false, message: `${i} is not present in your billing address` })
        }

        if (!validations.isValidStreet(address.shipping.street)) { return res.status(400).send({ status: false, message: "shipping street is invalid" }) }

        if (!validations.isValidpincode(address.shipping.pincode)) { return res.status(400).send({ status: false, message: "shipping pincode is invalid" }) }

        if (!validations.isValidStreet(address.billing.street)) { return res.status(400).send({ status: false, message: "billing street is invalid" }) }

        if (!validations.isValidpincode(address.billing.pincode)) { return res.status(400).send({ status: false, message: "billing pincode is invalid" }) }

        const saltRounds = 10
        let hash = await bcrypt.hash(password, saltRounds);
        data.password = hash;

        let checkEmailAndPhone = await userModel.findOne({ $or: [{ email }, { phone }] });
        if (checkEmailAndPhone) {
            return res.status(400).send({ status: "false", message: "Email or phone already exists" });
        }

        if (!validations.validImage(files[0].originalname)) {
            return res.status(400).send({ status: false, message: "Image is not valid must be of extention .jpg,.jpeg,.bmp,.gif,.png" })
        } else {
            let uploadProfileURL = await uploadFile(files[0])
            if (!uploadProfileURL) return res.status(400).send({ status: false, message: "Provide valid profile picture" })
            data.profileImage = uploadProfileURL
        }


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
        if (!validations.requiredInput(req.body)) return res.status(400).send({ status: false, message: 'Input is required' })

        if (!validations.isEmpty(email)) return res.status(400).send({ status: false, message: 'Email is required' })

        if (!validations.isEmpty(password)) return res.status(400).send({ status: false, message: 'Password is required' })

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
        let presentUser = req.presentUser
        return res.status(200).json({ status: true, message: "User profile details", data: presentUser })

    } catch (err) {
        return res.status(500).json({ status: false, message: err.message })
    }
}

const updateUser = async function (req, res) {
    try {
        let userId = req.userId;
        const data = req.body;
        let files = req.files;
        if (!validations.requiredInput(data)) return res.status(400).send({ status: false, message: "Insert Data : BAD REQUEST" });

        let { fname, lname, email, phone, password, profileImage } = data;

        if (fname || fname == "") {
            if (!validations.isEmpty(fname)) {
                return res.status(400).send({ status: false, message: "Please Provide first name" });
            }
            if (!validations.isValidName(fname)) {
                return res.status(400).send({ status: false, message: "Invalid fname" });
            }
        }

        if (lname || lname == "") {
            if (!validations.isEmpty(lname)) {
                return res.status(400).send({ status: false, message: "Please Provide last name" });
            }
            if (!validations.isValidName(lname)) {
                return res.status(400).send({ status: false, message: "Invalid lname" });
            }
        }

        if (email || email == "") {
            if (!validations.isEmpty(email)) {
                return res.status(400).send({ status: false, message: "Please Provide email address" });
            }

            if (!validations.isValidEmail(email)) {
                return res.status(400).send({ status: false, message: "Provide a valid email id" });
            }
            const checkEmail = await userModel.findOne({ email: email });
            if (checkEmail) {
                return res.status(400).send({ status: false, message: "email id already exist" });
            }
        }

        if (phone || phone == "") {
            if (!validations.isEmpty(phone)) {
                return res.status(400).send({ status: false, message: "Please Provide phone" });
            }
            if (!validations.isValidPhone(phone)) {
                return res.status(400).send({ status: false, message: "Invalid phone number" });
            }

            const checkPhone = await userModel.findOne({ phone: phone });
            if (checkPhone) {
                return res.status(400).send({ status: false, message: "phone number already exist" });
            }
        }

        if (password || password == "") {
            if (!validations.isEmpty(password)) {
                return res.status(400).send({ status: false, message: "password is required" });
            }
            if (!validations.isValidPswd(password)) {
                return res.status(400).send({ status: false, message: "Provide password between 8 to 15 characters and must contain one capital letter and one special character" });
            }

            const saltRounds = 10
            let hash = await bcrypt.hash(password, saltRounds);
            data.password = hash;
        }

        if (data.address || data.address == "") {
            data.address = validations.isJson(data.address)
            if (typeof (data.address) !== 'object' || Object.keys(data.address).length == 0) { return res.status(400).send({ status: true, message: "please put address in object format and put value in address" }) }

            if (data.address.shipping) {
                if (typeof (data.address.shipping) !== 'object') { return res.status(400).send({ status: true, message: "shipping address is required and must be in object format" }) }

                if (data.address.shipping.city || data.address.shipping.city == "") {
                    if (!validations.isEmpty(data.address.shipping.city)) { return res.status(400).send({ status: false, message: "shipping city is empty" }) }
                    if (!validations.isValidName(data.address.shipping.city)) { return res.status(400).send({ status: false, message: "shipping city is invalid" }) }
                }

                if (data.address.shipping.street || data.address.shipping.street == "") {
                    if (!validations.isEmpty(data.address.shipping.street)) { return res.status(400).send({ status: false, message: "shipping street is empty" }) }
                    if (!validations.isValidStreet(data.address.shipping.street)) { return res.status(400).send({ status: false, message: "shipping street is invalid" }) }
                }

                if (data.address.shipping.pincode || data.address.shipping.pincode == "") {
                    if (!validations.isEmpty(data.address.shipping.pincode)) { return res.status(400).send({ status: false, message: "shipping pincode is empty" }) }
                    if (!validations.isValidpincode(data.address.shipping.pincode)) { return res.status(400).send({ status: false, message: "shipping pincode is invalid" }) }
                }

            }

            if (data.address.billing) {
                if (typeof (data.address.billing) !== 'object') { return res.status(400).send({ status: true, message: "billing address is required and must be in object format" }) }

                if (data.address.billing.city || data.address.billing.city == "") {
                    if (!validations.isEmpty(data.address.billing.city)) { return res.status(400).send({ status: false, message: "billing city is empty" }) }
                    if (!validations.isValidName(data.address.billing.city)) { return res.status(400).send({ status: false, message: "billing city is invalid" }) }
                }

                if (data.address.billing.street || data.address.billing.street == "") {
                    if (!validations.isEmpty(data.address.billing.street)) { return res.status(400).send({ status: false, message: "billing street is empty" }) }
                    if (!validations.isValidStreet(data.address.billing.street)) { return res.status(400).send({ status: false, message: "billing street is invalid" }) }
                }

                if (data.address.billing.pincode || data.address.billing.pincode == "") {
                    if (!validations.isEmpty(data.address.billing.pincode)) { return res.status(400).send({ status: false, message: "billing pincode is empty" }) }
                    if (!validations.isValidpincode(data.address.billing.pincode)) { return res.status(400).send({ status: false, message: "billing pincode is invalid" }) }
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