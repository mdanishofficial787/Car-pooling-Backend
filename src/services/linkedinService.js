const axios = require("axios");

const fetchLinkedInProfile = async (accessToken) => {
  try {
    // Fetch basic profile
    const profileResponse = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const profile = profileResponse.data;

    // Extract required data only
    const linkedInData = {
      fullName: profile.name || null,
      profilePhoto: profile.picture || null,
      email: profile.email || null,

      // Optional placeholders
      currentEmployer: profile.organization || "Not Available",
      accountAge: "Hidden by LinkedIn",
    };

    return linkedInData;
  } catch (error) {
    console.error("LinkedIn Fetch Error:", error.response?.data || error.message);

    throw new Error("Failed to fetch LinkedIn profile");
  }
};

module.exports = {
  fetchLinkedInProfile,
};
