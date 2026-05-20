const express = require("express");
const router = express.Router();

const {
  linkedInCallback,
} = require("../controllers/linkedinController");

/*
  Login URL
*/
router.get("/linkedin", (req, res) => {
  const redirectURL =
    `https://www.linkedin.com/oauth/v2/authorization` +
    `?response_type=code` +
    `&client_id=${process.env.LINKEDIN_CLIENT_ID}` +
    `&redirect_uri=${process.env.LINKEDIN_REDIRECT_URI}` +
    `&scope=openid profile email`;

  res.redirect(redirectURL);
});

/*
  Callback Route
*/
router.get("/linkedin/callback", linkedInCallback);

module.exports = router;
