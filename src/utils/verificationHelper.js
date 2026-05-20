const updateVerificationFlags = (user) => {
  const statuses = user.verificationStatuses;

  const completedCount = Object.values(statuses).filter(
    (value) => value === true
  ).length;

  user.verificationScore = completedCount;

  /*
    Highly verified logic - 4+ verifications
  */
  user.highlyVerified = completedCount >= 4;

  /*
    Unverified warning - less than 2 verifications
  */
  user.unverifiedWarning = completedCount < 2;

  return user;
};

module.exports = {
  updateVerificationFlags,
};
