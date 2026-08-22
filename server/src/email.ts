import nodemailer from 'nodemailer'

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, CHALLENGE_SUGGESTION_EMAIL_TO } = process.env

export async function sendChallengeSuggestionEmail(params: {
  fromUsername: string
  challengeName: string
  details: string
}): Promise<{ sent: boolean }> {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      '[email] SMTP_HOST/SMTP_USER/SMTP_PASS not set - skipping actual send. ' +
        'The suggestion was still saved to the database. Set these in server/.env to enable email.',
    )
    return { sent: false }
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  await transporter.sendMail({
    from: EMAIL_FROM || 'DeadLotto <onboarding@resend.dev>',
    to: CHALLENGE_SUGGESTION_EMAIL_TO || 'dartbirnie@gmail.com',
    subject: `DeadLotto challenge suggestion: ${params.challengeName}`,
    text: `Suggested by: ${params.fromUsername}\n\nChallenge: ${params.challengeName}\n\nDetails:\n${params.details}`,
  })

  return { sent: true }
}
