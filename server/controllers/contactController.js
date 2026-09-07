import { sendContactEmail } from "../utils/mailer.js";

export async function sendContactMessage(req, res) {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        error: "Name, email, and message are required",
      });
    }

    await sendContactEmail({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });

    return res.status(200).json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("[Contact] Error:", error);

    return res.status(500).json({
      error: "Unable to send message. Please try again.",
    });
  }
}
