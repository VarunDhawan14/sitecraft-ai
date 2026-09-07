import { User } from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../utils/mailer.js";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// Helper to set cookies
const setSessionCookie = (res, payload) => {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
};

// Generate 6-digit verification code
const generateVerificationCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// ================= REGISTER =================

export async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: "Name, email, and password are required",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: "Password must be at least 8 characters long",
    });
  }

  const trimmedEmail = email.toLowerCase().trim();

  const existing = await User.findOne({
    email: trimmedEmail,
  });

  if (existing) {
    if (!existing.emailVerified) {
      const verificationCode = generateVerificationCode();

      existing.emailVerificationCode = crypto
        .createHash("sha256")
        .update(verificationCode)
        .digest("hex");

      existing.emailVerificationExpires = Date.now() + 2 * 60 * 1000;

      await existing.save();

      try {
        await sendVerificationEmail(trimmedEmail, verificationCode);

        return res.status(200).json({
          requiresVerification: true,
          email: trimmedEmail,
          message: "A verification code has been sent to your email.",
        });
      } catch (error) {
        console.error("Verification email error:", error);

        existing.emailVerificationCode = null;
        existing.emailVerificationExpires = null;

        await existing.save();

        return res.status(500).json({
          error: "Unable to send verification email. Please try again.",
        });
      }
    }

    return res.status(400).json({
      error: "An account with this email already exists",
    });
  }

  const verificationCode = generateVerificationCode();

  const hashedVerificationCode = crypto
    .createHash("sha256")
    .update(verificationCode)
    .digest("hex");

  const user = await User.create({
    name,
    email: trimmedEmail,
    password,
    emailVerified: false,
    emailVerificationCode: hashedVerificationCode,
    emailVerificationExpires: Date.now() + 2 * 60 * 1000,
  });

  try {
    await sendVerificationEmail(user.email, verificationCode);

    return res.status(201).json({
      requiresVerification: true,
      email: user.email,
      message: "Verification code sent to your email.",
    });
  } catch (error) {
    console.error("Verification email error:", error);

    await User.findByIdAndDelete(user._id);

    return res.status(500).json({
      error: "Unable to send verification email. Please try again.",
    });
  }
}

// ================= VERIFY EMAIL =================

export async function verifyEmail(req, res) {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      error: "Email and verification code are required",
    });
  }

  const trimmedEmail = email.toLowerCase().trim();

  const hashedCode = crypto
    .createHash("sha256")
    .update(code.trim())
    .digest("hex");

  const user = await User.findOne({
    email: trimmedEmail,
    emailVerificationCode: hashedCode,
    emailVerificationExpires: {
      $gt: Date.now(),
    },
  });

  if (!user) {
    return res.status(400).json({
      error: "Invalid or expired verification code",
    });
  }

  user.emailVerified = true;
  user.emailVerificationCode = null;
  user.emailVerificationExpires = null;

  await user.save();

  setSessionCookie(res, {
    userId: user._id.toString(),
    email: user.email,
  });

  return res.json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
    message: "Email verified successfully.",
  });
}

// ================= RESEND VERIFICATION =================

export async function resendVerificationCode(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: "Email is required",
    });
  }

  const trimmedEmail = email.toLowerCase().trim();

  const user = await User.findOne({
    email: trimmedEmail,
  });

  if (!user) {
    return res.json({
      message: "If an account exists, a verification code has been sent.",
    });
  }

  if (user.emailVerified) {
    return res.status(400).json({
      error: "Email is already verified",
    });
  }

  const verificationCode = generateVerificationCode();

  user.emailVerificationCode = crypto
    .createHash("sha256")
    .update(verificationCode)
    .digest("hex");

  user.emailVerificationExpires = Date.now() + 2 * 60 * 1000;

  await user.save();

  try {
    await sendVerificationEmail(user.email, verificationCode);

    return res.json({
      message: "A new verification code has been sent.",
    });
  } catch (error) {
    console.error("Resend verification email error:", error);

    return res.status(500).json({
      error: "Unable to send verification code. Please try again.",
    });
  }
}

// ================= LOGIN =================

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email and password are required",
    });
  }

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  });

  if (!user) {
    return res.status(401).json({
      error: "Invalid email or password",
    });
  }

  const isValid = await user.comparePassword(password);

  if (!isValid) {
    return res.status(401).json({
      error: "Invalid email or password",
    });
  }

  // Send verification code if email is not verified
  if (!user.emailVerified) {
    const verificationCode = generateVerificationCode();

    user.emailVerificationCode = crypto
      .createHash("sha256")
      .update(verificationCode)
      .digest("hex");

    user.emailVerificationExpires = Date.now() + 2 * 60 * 1000;

    await user.save();

    try {
      await sendVerificationEmail(user.email, verificationCode);

      return res.status(403).json({
        requiresVerification: true,
        email: user.email,
        error: "Please verify your email before signing in.",
      });
    } catch (error) {
      console.error("Login verification email error:", error);

      return res.status(500).json({
        error: "Unable to send verification code. Please try again.",
      });
    }
  }

  setSessionCookie(res, {
    userId: user._id.toString(),
    email: user.email,
  });

  return res.status(200).json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
  });
}

// ================= LOGOUT =================

export async function logout(_req, res) {
  res.cookie("token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 0,
    path: "/",
  });

  res.json({
    success: true,
  });
}

// ================= ME =================

export async function me(req, res) {
  if (!req.user) {
    return res.status(401).json({
      error: "Not Authenticated",
    });
  }

  const user = await User.findById(req.user.userId).select("-password");

  if (!user) {
    return res.status(404).json({
      error: "User not found",
    });
  }

  res.json({
    user,
  });
}

// ================= FORGOT PASSWORD =================

export async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: "Email is required",
    });
  }

  const trimmedEmail = email.toLowerCase().trim();

  const user = await User.findOne({
    email: trimmedEmail,
  });

  if (!user) {
    return res.json({
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

  await user.save();

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);

    return res.json({
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Password reset email error:", error);

    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    return res.status(500).json({
      error: "Unable to send password reset email. Please try again.",
    });
  }
}

// ================= RESET PASSWORD =================

export async function resetPassword(req, res) {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      error: "New password is required",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: "Password must be at least 8 characters long",
    });
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: {
      $gt: Date.now(),
    },
  });

  if (!user) {
    return res.status(400).json({
      error: "Password reset link is invalid or has expired",
    });
  }

  user.password = password;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;

  await user.save();

  return res.json({
    message: "Password reset successfully. You can now sign in.",
  });
}
