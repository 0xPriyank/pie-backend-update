import { env } from "@/config/env";
import { createTransport } from "nodemailer";

const user = env.MAIL_USER;
const pass = env.MAIL_PASS;

if (!user || !pass) {
  throw new Error("Email credentials are not set in the environment variables.");
}

const mailSender = async (email: string, title: string, body: string) => {
  try {
    const transporter = createTransport({
      service: "Gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass }
    });

    return await transporter.sendMail({
      from: "Pie-Backend",
      to: email,
      subject: title,
      html: body
    });
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export default mailSender;
