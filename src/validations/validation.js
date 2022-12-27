const requiredInput = function (value){
    return Object.keys(value).length > 0
}

// Validation for empty
const isEmpty = function (value) {
    if (typeof value === "undefined" || value === null) return false;
    if (typeof value === "string" && value.trim().length === 0) return false;
    return true;
};

//Name Validation
const isValidName = function (name) {
    const nameRegex = /^[a-zA-Z ]+$/;
    return nameRegex.test(name);
};

// Email Validation
const isValidEmail = function (email) {
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z-]+\.([a-zA-Z-.]{2,4})+$/
    return emailRegex.test(email);
};

const isValidString = (String) => {
    return /\d/.test(String)
  };

//Phone Validation
const isValidPhone = function (phone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
};

// pincode Validation
const isValidpincode = function (pincode) {
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    return pincodeRegex.test(pincode);
};

// street Validation
const isValidStreet = function (street) {
    let streets = /^[#.0-9a-zA-Z\s,-]+$/;
    return streets.test(street);
};

// password validation
const isValidPswd = (Password) => {
    return /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,15}$/.test(Password)
}

// is valid json string
function isJson(str) {
    let obj = {}
    try {
        let parsed = JSON.parse(str);
        obj = parsed;
    } catch (e) {
        return false;
    }
    return obj;
}

const validImage = function (value){
    return value.match(/(\.jpg|\.jpeg|\.bmp|\.gif|\.png|\.PNG)$/)
}

const isValidPrice = function (price) {
    return /^[1-9]\d{0,7}(?:\.\d{1,2})?$/.test(price);
  };

  const isValidStyle = function (value) {
    return /^[a-zA-Z _.-]+$/.test(value);
  };

module.exports = { isEmpty, isValidName, isValidPhone, isValidpincode, isValidStreet, isValidEmail, isValidPswd, isJson, validImage, requiredInput, isValidPrice, isValidStyle, isValidString }