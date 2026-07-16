// Auth page module (Phase 2, following the Clinics pilot pattern). Reuses `common.*`
// for genuinely cross-module field labels (email, password, confirm password, first/last
// name — see `packages/core/src/i18n/common.ts`); everything specific to how the auth
// flow phrases itself (headings, hint sentences, links between auth pages, success/error
// states) stays here. Client-side zod validation messages (e.g. 'Password is required')
// are intentionally left untranslated, matching the Clinics pilot's `clinic.schema.ts`,
// which never localized its own `.min()`/`.max()` messages either.
export const authEn = {
  backToSignIn: 'Back to sign in',
  form: {
    emailPlaceholder: 'Enter your email',
  },
  login: {
    title: 'Log in',
    subtitle: 'Welcome back! Please enter your details.',
    forgotPasswordLink: 'Forgot password',
    rememberLabel: 'Remember for 30 days',
    submitButton: 'Sign in',
    noAccountText: "Don't have an account?",
    signUpLink: 'Sign up',
  },
  forgotPassword: {
    title: 'Reset password',
    subtitle: "Enter your email and we'll send you a reset link.",
    submitButton: 'Send reset link',
    sentTitle: 'Check your inbox',
    sentDescription: "If that email is registered, you'll receive a reset link shortly.",
  },
  resetPassword: {
    title: 'New password',
    subtitle: 'Choose a new password for your account.',
    newPasswordLabel: 'New password',
    submitButton: 'Update password',
    doneTitle: 'Password updated',
    doneDescription: 'Redirecting to sign in…',
  },
  signup: {
    title: 'Create your account',
    subtitle: 'Complete your registration',
    submitButton: 'Create account',
    invalidInvitationTitle: 'Invalid or expired invitation',
    invalidInvitationDescription: 'Ask an administrator to send you a new invite.',
  },
}

export const authEs = {
  backToSignIn: 'Volver a iniciar sesión',
  form: {
    emailPlaceholder: 'Ingresá tu correo electrónico',
  },
  login: {
    title: 'Iniciar sesión',
    subtitle: 'Bienvenido de nuevo. Ingresá tus datos.',
    forgotPasswordLink: 'Olvidé mi contraseña',
    rememberLabel: 'Recordarme por 30 días',
    submitButton: 'Iniciar sesión',
    noAccountText: '¿No tenés una cuenta?',
    signUpLink: 'Registrate',
  },
  forgotPassword: {
    title: 'Restablecer contraseña',
    subtitle: 'Ingresá tu correo y te enviaremos un enlace para restablecerla.',
    submitButton: 'Enviar enlace',
    sentTitle: 'Revisá tu bandeja de entrada',
    sentDescription: 'Si ese correo está registrado, recibirás un enlace en breve.',
  },
  resetPassword: {
    title: 'Nueva contraseña',
    subtitle: 'Elegí una nueva contraseña para tu cuenta.',
    newPasswordLabel: 'Nueva contraseña',
    submitButton: 'Actualizar contraseña',
    doneTitle: 'Contraseña actualizada',
    doneDescription: 'Redirigiendo a iniciar sesión…',
  },
  signup: {
    title: 'Creá tu cuenta',
    subtitle: 'Completá tu registro',
    submitButton: 'Crear cuenta',
    invalidInvitationTitle: 'Invitación inválida o vencida',
    invalidInvitationDescription: 'Pedile a un administrador que te envíe una nueva invitación.',
  },
}
