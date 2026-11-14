const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authentication");
const {
  callback,
  createSession,
  logout,
  provider,
  startLogin,
  startMigration,
} = require("../controllers/auth");

//? Third-party provider available for sign in
router.get("/provider", provider);
//? Sign in / Sign up with the third party
router.get("/login", startLogin);
router.get("/callback", callback);
router.post("/session", createSession);
//* Migrate a password account to the third party
router.post("/migrate", verifyToken, startMigration);
//* Logout
router.post("/logout", verifyToken, logout);

module.exports = router;
