import "server-only";

import nodemailer from "nodemailer";

import { createSmtpMailer } from "../../action-links/index";
import { getIdentityInfrastructureConfig } from "../environment";

export function getSmtpMailer() {
  const config = getIdentityInfrastructureConfig();
  const transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    ...(config.smtp.user && config.smtp.pass
      ? {
          auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
          },
        }
      : {}),
  });

  return createSmtpMailer(transport, config.smtp.from);
}
