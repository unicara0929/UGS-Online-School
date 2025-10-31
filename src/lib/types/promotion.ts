export interface PromotionCondition {
  type: 'fp' | 'manager'
  conditions: {
    testPassed: boolean
    lpMeetingCompleted: boolean
    surveyCompleted: boolean
    compensationAverage?: number
    memberReferrals?: number
    fpReferrals?: number
    contractAchieved?: boolean
  }
  isEligible: boolean
}
