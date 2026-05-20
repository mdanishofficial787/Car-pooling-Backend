const users = [
  {
    userId: 1,
    fullName: "Muhammad Bilal",
    email: "bilal@example.com",
    phone: "+923001234567",
    verificationScore: 0,
    verificationStatuses: {
      phone_verified: false,
      email_verified: false,
      cnic_verified: false,
      police_verified: false,
      bank_verified: false,
      linkedin_verified: false,
    },
    highlyVerified: false,
    unverifiedWarning: true,
  },
  {
    userId: 2,
    fullName: "Ayesha Khan",
    email: "ayesha@example.com",
    phone: "+923009876543",
    verificationScore: 0,
    verificationStatuses: {
      phone_verified: false,
      email_verified: false,
      cnic_verified: false,
      police_verified: false,
      bank_verified: false,
      linkedin_verified: false,
    },
    highlyVerified: false,
    unverifiedWarning: true,
  },
];

module.exports = users;
