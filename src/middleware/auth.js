const jwt = require('jsonwebtoken')
const { isValidObjectId } = require('mongoose')
const userModel = require('../models/userModel')




const authentication = async function (req, res, next) {
    try {
        let authHeader = req.headers["authorization"];
        if (!authHeader) {
            return res.status(400).send({ status: false, Error: "Enter Token in BearerToken" });
        }

        const bearer = authHeader.split(" ");
        const bearerToken = bearer[1];
        if (!bearerToken) {
            return res.status(403).send({ status: false, message: "Token not present" });
        }

        jwt.verify(bearerToken, 'group29', function (error, decodedToken) {
            if (error && error.message === 'jwt expired') return res.status(401).send({ status: false, message: 'JWT is expired' })
            if (error) return res.status(401).send({ status: false, message: error.message })
            else {
                req.decodedToken = decodedToken
                next()
            }
        })
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

const authorisation = async function (req, res, next) {
    try {
        const userId = req.params.userId
        if (!userId) return res.status(400).send({ status: false, message: 'userId must be present' })
        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: 'userId is invalid' })
        let presentUser = await userModel.findById({ _id: userId })
        if (!presentUser) return res.status(403).send({ status: false, message: 'user not found' })

        let decodedToken = req.decodedToken.userId
        if (presentUser._id.toString() != decodedToken) return res.status(403).send({ status: false, message: 'You do not have access rights' })
        req.userId = presentUser._id.toString()
        next()

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}



module.exports = { authentication, authorisation }