import "server-only";

export type PublicContactConfiguration = {
  contactEmail: string;
  privacyEmail: string;
};

const LOCAL_CONTACT_EMAIL = "kontakt@campusmarkt.local";
const LOCAL_PRIVACY_EMAIL = "datenschutz@campusmarkt.local";

function configuredEmail(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export function getPublicContactConfiguration(): PublicContactConfiguration {
  return {
    contactEmail: configuredEmail("PUBLIC_CONTACT_EMAIL", LOCAL_CONTACT_EMAIL),
    privacyEmail: configuredEmail("PUBLIC_PRIVACY_EMAIL", LOCAL_PRIVACY_EMAIL),
  };
}
