import React from 'react';
import {
  Trash2,
  Mail,
  ShieldCheck,
  Smartphone,
  AlertTriangle,
  ArrowLeft,
  Printer,
  FileText,
  Clock,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

interface DeleteAccountViewProps {
  isPublic?: boolean;
  onNavigateToLogin?: () => void;
  onBackToDashboard?: () => void;
  onOpenPrivacyPolicy?: () => void;
}

export const DeleteAccountView: React.FC<DeleteAccountViewProps> = ({
  isPublic = false,
  onNavigateToLogin,
  onBackToDashboard,
  onOpenPrivacyPolicy,
}) => {
  const lastUpdated = 'September 28, 2026';
  const supportEmail = 'Stylefleet@tecstellar.com';

  const handlePrint = () => {
    window.print();
  };

  const mailtoLink = `mailto:${supportEmail}?subject=Account%20Deletion%20Request&body=Hello%20StyleFleet%20Support%20Team%2C%0A%0AI%20would%20like%20to%20request%20the%20permanent%20deletion%20of%20my%20StyleFleet%20account%20and%20all%20associated%20salon%20data.%0A%0AMy%20Registered%20Details%3A%0A-%20Full%20Name%3A%20%0A-%20Salon%20Name%3A%20%0A-%20Registered%20Mobile%20Number%3A%20%0A-%20Reason%20for%20Deletion%20(Optional)%3A%20%0A%0AThank%20you.`;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-neutral-900 transition-colors">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FAF7EE] border border-[#D4AF37] flex items-center justify-center p-1 shadow-xs shrink-0">
            <img
              src="/stylefleet-logo.png"
              alt="StyleFleet Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wide text-neutral-900">
                STYLEFLEET
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FAF7EE] text-[#B8860B] border border-[#E8DEC4] uppercase">
                User Rights
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Account Deletion &amp; Data Erasure Instructions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:border-[#D4AF37] transition-colors cursor-pointer shadow-xs"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-[#B8860B]" />
            <span className="hidden sm:inline">Print / Save PDF</span>
          </button>

          {onOpenPrivacyPolicy && (
            <button
              onClick={onOpenPrivacyPolicy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-neutral-700 hover:text-[#B8860B] hover:border-[#D4AF37] transition-colors cursor-pointer shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-[#B8860B]" />
              <span className="hidden sm:inline">Privacy Policy</span>
            </button>
          )}

          {isPublic && onNavigateToLogin && (
            <button
              onClick={onNavigateToLogin}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#111827] text-white text-xs font-bold hover:bg-[#D4AF37] hover:text-[#111827] shadow-xs transition-all cursor-pointer"
            >
              <span>Admin Login</span>
              <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            </button>
          )}

          {!isPublic && onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#111827] text-white text-xs font-bold hover:bg-[#D4AF37] hover:text-[#111827] shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Viewport */}
      <div className="w-full flex justify-center p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-xs border border-[#E5E7EB] w-full max-w-3xl p-6 sm:p-10 md:p-12 text-neutral-800">
          {/* Header Title */}
          <div className="border-b border-[#E5E7EB] pb-6 mb-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold mb-3 border border-rose-200">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Data Rights &amp; Erasure</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 mb-2">
              Account Deletion Instructions
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#B8860B]" />
              <span>Last Updated: {lastUpdated}</span>
            </p>
          </div>

          {/* Intro Description */}
          <p className="text-sm sm:text-base leading-relaxed mb-8 text-neutral-600">
            This page explains how to delete your account in the <strong>StyleFleet</strong> app (developed and operated by <strong>TECSTELLAR SOLUTIONS LLP</strong>) and what happens to your data. You can use either option below.
          </p>

          {/* Option 1: In-App Deletion */}
          <section className="mb-10 p-6 rounded-2xl bg-[#FAF7EE] border border-[#E8DEC4]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#D4AF37] text-[#B8860B] flex items-center justify-center font-bold text-sm shadow-xs">
                <Smartphone className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
                Option 1: Delete Inside the App
              </h2>
            </div>
            <ol className="list-decimal pl-6 space-y-3 text-sm sm:text-base leading-relaxed text-neutral-700">
              <li>
                Open the <strong>StyleFleet</strong> app on your device and log in with your registered mobile number.
              </li>
              <li>
                Navigate to the <strong>More</strong> tab or open the <strong>Settings</strong> menu.
              </li>
              <li>
                Scroll down and tap <strong>Delete Account</strong>.
              </li>
              <li>
                (Optional) Select or enter your feedback reason for leaving, then tap <strong>Confirm Deletion</strong>.
              </li>
              <li>
                Your account is deleted immediately, active sessions are invalidated, and you are logged out of the app.
              </li>
            </ol>
          </section>

          {/* Option 2: Email Request */}
          <section className="mb-10 p-6 rounded-2xl bg-[#FAF7EE] border border-[#E8DEC4]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#D4AF37] text-[#B8860B] flex items-center justify-center font-bold text-sm shadow-xs">
                <Mail className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
                Option 2: Request Deletion via Email
              </h2>
            </div>
            <ol className="list-decimal pl-6 space-y-3 text-sm sm:text-base leading-relaxed text-neutral-700 mb-6">
              <li>
                Send an email to{' '}
                <a
                  href={`mailto:${supportEmail}`}
                  className="font-bold text-[#B8860B] hover:underline"
                >
                  {supportEmail}
                </a>
                .
              </li>
              <li>
                Use the exact subject line: <strong>&quot;Account Deletion Request&quot;</strong>.
              </li>
              <li>
                Include the <strong>mobile number</strong> registered with your StyleFleet account, your <strong>Salon Name</strong>, and your <strong>Full Name</strong>.
              </li>
              <li>
                Our operations team will verify the account ownership and permanently delete your account and associated data within <strong>30 days</strong>.
              </li>
            </ol>

            <a
              href={mailtoLink}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111827] text-white text-xs sm:text-sm font-bold hover:bg-[#D4AF37] hover:text-[#111827] shadow-xs transition-all"
            >
              <Mail className="w-4 h-4" />
              <span>Compose Deletion Request Email</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          </section>

          {/* Section: Data That Is Deleted */}
          <section className="mb-10">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 text-neutral-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Data That Is Deleted</span>
            </h2>
            <p className="text-sm sm:text-base mb-4 text-neutral-600">
              When your account is deleted, the following data is permanently and irreversibly removed from our production databases:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base text-neutral-600">
              <li>
                <strong className="text-neutral-900">Profile &amp; Credentials:</strong> Your owner profile, full name, phone number, avatar image, and authentication sessions.
              </li>
              <li>
                <strong className="text-neutral-900">Salon Information:</strong> Salon business name, address, city, pin code, logo, brand accent color, and custom configuration.
              </li>
              <li>
                <strong className="text-neutral-900">Staff &amp; Stylists:</strong> All staff member profiles, assigned roles, target metrics, and commission settings.
              </li>
              <li>
                <strong className="text-neutral-900">Customer Directory:</strong> Client names, phone numbers, appointment history, visit logs, and starred status.
              </li>
              <li>
                <strong className="text-neutral-900">Services &amp; Pricing:</strong> All service categories, custom salon services, prices, and durations.
              </li>
              <li>
                <strong className="text-neutral-900">Operational Records:</strong> Bills, daily invoices, sales breakdowns, and appointments booked through the platform.
              </li>
            </ul>
          </section>

          {/* Section: Data That Is Kept */}
          <section className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 text-neutral-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B8860B]" />
              <span>Data That Is Kept</span>
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base text-neutral-600">
              <li>
                If you delete from inside the app, your mobile number, salon name, timestamp, and the optional reason you give are kept in a secure deletion audit log to prevent fraudulent duplicate registrations, prevent abuse, and help us improve the app.
              </li>
              <li>
                Our payment gateway partners keep their own statutory transaction logs for any subscription or convenience fees you paid, strictly as mandated by applicable banking laws and Reserve Bank of India (RBI) regulations.
              </li>
            </ul>
          </section>

          {/* Footer Info */}
          <div className="pt-6 border-t border-[#E5E7EB] text-xs text-neutral-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>StyleFleet • Owned &amp; Operated by <strong>TECSTELLAR SOLUTIONS LLP</strong></span>
            </div>
            {onOpenPrivacyPolicy && (
              <button
                onClick={onOpenPrivacyPolicy}
                className="text-[#B8860B] hover:underline cursor-pointer font-medium"
              >
                Read Full Privacy Policy &rarr;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
