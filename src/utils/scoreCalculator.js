/*
========================================
 Verification Score Calculator
========================================

Calculate verification score based on verification status.
Used for user trust/credibility ranking.
*/

/*
========================================
 Calculate Verification Score
========================================

Returns score from 0-6 based on verified fields.
*/
const calculateVerificationScore = (verification) => {
  let score = 0;

  if (verification.phone === 'verified') score++;
  if (verification.email === 'verified') score++;
  if (verification.cnic === 'verified') score++;
  if (verification.policeVerification === 'verified') score++;
  if (verification.linkedIn === 'verified') score++;
  if (verification.bankCard === 'verified') score++;

  return score;
};

/*
========================================
 Check Minimum Verification
========================================

Returns true if user has at least 1 verified field.
Required for creating carpools and joining trips.
*/
const hasMinimumVerification = (verification) => {
  const score = calculateVerificationScore(verification);
  return score >= 1;
};

/*
========================================
 Get Verification Level
========================================

Returns verification tier based on score.
*/
const getVerificationLevel = (verification) => {
  const score = calculateVerificationScore(verification);

  if (score >= 5) return 'PLATINUM';
  if (score >= 4) return 'GOLD';
  if (score >= 3) return 'SILVER';
  if (score >= 2) return 'BRONZE';
  if (score >= 1) return 'VERIFIED';
  return 'UNVERIFIED';
};

module.exports = {
  calculateVerificationScore,
  hasMinimumVerification,
  getVerificationLevel
};
