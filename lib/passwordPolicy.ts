import zxcvbn from 'zxcvbn'

const DEFAULT_MIN_SCORE = Number(process.env.PASSWORD_MIN_SCORE ?? '3')

export function evaluatePassword(password: string, userInputs: string[] = []) {
  const trimmed = password.trim()
  if (!trimmed) {
    return {
      valid: false,
      score: 0,
      feedback: 'Mot de passe requis.'
    }
  }

  const result = zxcvbn(trimmed, userInputs.filter(Boolean))
  const minScore = Number.isFinite(DEFAULT_MIN_SCORE) ? DEFAULT_MIN_SCORE : 3
  const valid = result.score >= minScore
  const feedback = result.feedback.warning || result.feedback.suggestions[0]
  return {
    valid,
    score: result.score,
    feedback: valid ? undefined : (feedback || 'Mot de passe trop faible.')
  }
}
