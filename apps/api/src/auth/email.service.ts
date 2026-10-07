import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}
  async send(to: string, kind: 'VERIFY' | 'RESET', token: string) {
    const path =
      kind === 'VERIFY' ? '/auth/verify-email' : '/auth/reset-password';
    const link = `${this.config.getOrThrow<string>('FRONTEND_URL')}${path}#token=${token}`;
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${this.config.getOrThrow<string>('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.getOrThrow<string>('EMAIL_FROM'),
        to: [to],
        subject:
          kind === 'VERIFY'
            ? 'Verificá tu email en Hacha y Tiza'
            : 'Restablecé tu contraseña',
        text: `Para continuar, abrí este enlace: ${link}. Si no solicitaste esta acción, ignorá este mensaje.`,
      }),
    });
    if (!result.ok) throw new Error('Email delivery unavailable');
  }
}
