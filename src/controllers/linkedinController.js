const axios = require("axios");
const users = require("../models/userModel");
const { fetchLinkedInProfile } = require("../services/linkedinService");
const { updateVerificationFlags } = require("../utils/verificationHelper");

/*
  Dummy database
*/
const linkedInProfiles = [];

const linkedInCallback = async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code missing",
      });
    }

    /*
      Exchange code for access token
    */
    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code,
          redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    /*
      Fetch profile
    */
    const profileData = await fetchLinkedInProfile(accessToken);

    /*
      Find user
    */
    const user = users.find((u) => u.userId === 1);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /*
      Prevent duplicate verification score
    */
    if (!user.verificationStatuses.linkedin_verified) {
      user.verificationStatuses.linkedin_verified = true;
    }

    /*
      Update verification score
    */
    updateVerificationFlags(user);

    /*
      Store LinkedIn profile
    */
    const linkedProfile = {
      userId: user.userId,
      linkedInVerified: true,
      linkedInData: profileData,
      createdAt: new Date(),
    };

    linkedInProfiles.push(linkedProfile);

    return res.status(200).json({
      success: true,
      message: "LinkedIn verified successfully",
      verificationScore: user.verificationScore,
      verificationHub: {
        linkedin_verified: user.verificationStatuses.linkedin_verified,
        highlyVerified: user.highlyVerified,
        unverifiedWarning: user.unverifiedWarning,
      },
      linkedInProfile: linkedProfile,
    });
  } catch (error) {
    console.error("LinkedIn Callback Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "LinkedIn verification failed",
      error: error.message,
    });
  }
};

module.exports = {
  linkedInCallback,
};
