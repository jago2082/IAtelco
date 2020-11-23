const bcrypt = require('bcryptjs');

const helpers = {};

helpers.encryptPassword = async(password) => {
    const BCRYPT_SALT_ROUNDS = 12;
    const hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    return hash;
};

helpers.matchPassword = async(password, savedPassword) => {
    try {
        return await bcrypt.compare(password, savedPassword);
    } catch (e) {
        console.log(e)
    }
};

module.exports = helpers;