const jwt = require("jsonwebtoken");
const privateKey = process.env.JWT_KEY;

module.exports.jwtSign = async (payload) => {
  return jwt.sign(
    { username: payload.username, email: payload.email, sid: payload.sid },
    privateKey,
  );
};

module.exports.jwtVerify = async (token) => {
  return jwt.verify(token, privateKey);
};
