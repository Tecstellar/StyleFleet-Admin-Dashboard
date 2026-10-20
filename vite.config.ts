import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function devApiOtpPlugin(): Plugin {
  return {
    name: 'dev-api-otp-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/send-otp' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { email, otp } = body ? JSON.parse(body) : {};
              const targetRecipient = 'info@tecstellar.com';
              const apiKey = process.env.RESEND_API_KEY || Buffer.from('cmVfV29rZUYydm9fM01oRUxzendXa0F2RXVTdXJ4dFJSbUt1', 'base64').toString('utf-8');
              const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'StyleFleet Security <onboarding@resend.dev>',
                  to: [targetRecipient],
                  subject: `StyleFleet Super Admin Login OTP: ${otp}`,
                  html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F3F0; padding: 24px; color: #0f172a;">
                      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid rgba(7, 25, 82, 0.15); padding: 32px; box-shadow: 0 4px 12px rgba(7, 25, 82, 0.05); text-align: center;">
                        <h1 style="color: #071952; margin: 0; font-size: 24px; font-weight: 800;">StyleFleet</h1>
                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; margin-bottom: 20px;">Salon Management Console</div>
                        <div style="display: inline-block; padding: 4px 12px; background: rgba(7, 25, 82, 0.08); color: #071952; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 16px;">🔒 Super Admin Two-Factor Authentication</div>
                        <p style="font-size: 14px; color: #334155; margin: 0 0 16px;">A sign-in request was initiated for Super Admin (${email || targetRecipient}). Use the following one-time verification code:</p>
                        <div style="background: #F8F3F0; border: 2px dashed rgba(7, 25, 82, 0.3); border-radius: 12px; padding: 18px; margin: 20px 0;">
                          <div style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #071952;">${otp}</div>
                        </div>
                        <p style="font-size: 12px; color: #64748b; margin: 0;">This OTP is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
                      </div>
                    </div>
                  `,
                }),
              });

              const data = await resendRes.json();
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = resendRes.status || 200;
              res.end(JSON.stringify(data));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Error processing OTP request' }));
            }
          });
        } else {
          next();
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    devApiOtpPlugin(),
  ],
  define: {
    // Provide fallback for process.env
    'process.env': {
      NEXT_PUBLIC_SUPABASE_URL: JSON.stringify('https://scgokpcoyfewrtrwqxpu.supabase.co'),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: JSON.stringify('sb_publishable_qkXDIACBQgrrge462eSpJg_UCMKQNna'),
    },
  },
});
