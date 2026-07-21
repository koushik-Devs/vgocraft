/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { db, connectToDatabase } from "./src/lib/db";
import { uploadFile } from "./src/lib/storage";
import { sendEmail, emailTemplates } from "./src/lib/email";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "vgocraft-super-secret-key-2026";

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// Pre-seed single Admin account if it does not exist
async function preseedAdmin() {
  const adminEmail = "koushikmondal.me@outlook.com";
  try {
    const adminExists = await db.users.findOne({ email: adminEmail });
    if (!adminExists) {
      const passwordHash = await bcrypt.hash("vgoAdmin2026!", 10);
      await db.users.create({
        id: "admin-koushik",
        name: "Koushik Mondal (Admin)",
        email: adminEmail,
        passwordHash,
        role: "admin",
        isEmailVerified: true,
      });
      console.log(`🛡️ Admin pre-seeded successfully: ${adminEmail} / password: vgoAdmin2026!`);
    } else {
      console.log(`🛡️ Admin account already pre-seeded: ${adminEmail}`);
    }
  } catch (err) {
    console.error("Error seeding admin user:", err);
  }
}

// Authentication Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Access Token Required" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: "Invalid or Expired Token" });
    req.user = user;
    next();
  });
}

// Admin only Authorization Middleware
function requireAdmin(req: any, res: any, next: any) {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Access Denied: Admin Role Required" });
  }
}

// API Routes

// Registration Endpoint
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await db.users.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const newUser = await db.users.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "client",
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
    });

    // Send verification email
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const verificationLink = `${appUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(newUser.email)}`;
    
    const emailData = emailTemplates.welcome(name, verificationLink);
    await sendEmail({
      to: newUser.email,
      subject: emailData.subject,
      html: emailData.html,
    });

    // Capture Audit Log
    await db.auditLogs.create({
      userId: newUser.id,
      userName: newUser.name,
      action: "USER_REGISTER",
      details: `Registered account: ${newUser.email}`,
      ip: req.ip || "127.0.0.1",
    });

    res.status(201).json({
      message: "Registration successful! Please check your email to verify your account.",
    });
  } catch (error: any) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: error.message || "Server Error" });
  }
});

// Email Verification Endpoint
app.post("/api/auth/verify-email", async (req, res) => {
  const { token, email } = req.body;
  if (!token || !email) {
    return res.status(400).json({ message: "Token and email are required" });
  }

  try {
    const user = await db.users.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({ message: "Email is already verified" });
    }

    if (user.emailVerificationToken !== token) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    await db.users.updateOne(
      { email: email.toLowerCase() },
      { $set: { isEmailVerified: true, emailVerificationToken: null } }
    );

    await db.auditLogs.create({
      userId: user.id,
      userName: user.name,
      action: "EMAIL_VERIFY",
      details: `Verified email address: ${user.email}`,
      ip: req.ip || "127.0.0.1",
    });

    res.status(200).json({ message: "Email successfully verified! You can now log in." });
  } catch (error: any) {
    console.error("Verification Error:", error);
    res.status(500).json({ message: error.message || "Server Error" });
  }
});

// Login Endpoint
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await db.users.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({
        message: "Your email is not verified. Please check your inbox for the verification link.",
        notVerified: true,
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    await db.auditLogs.create({
      userId: user.id,
      userName: user.name,
      action: "USER_LOGIN",
      details: `Logged into system (Role: ${user.role})`,
      ip: req.ip || "127.0.0.1",
    });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Forgot Password Endpoint
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await db.users.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({
        message: "If that email is registered, we have sent a password reset link.",
      });
    }

    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiration

    await db.users.updateOne(
      { email: email.toLowerCase() },
      { $set: { resetPasswordToken: resetToken, resetPasswordExpires: resetExpires } }
    );

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const resetLink = `${appUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    const emailData = emailTemplates.forgotPassword(user.name, resetLink);
    await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
    });

    await db.auditLogs.create({
      userId: user.id,
      userName: user.name,
      action: "FORGOT_PASSWORD",
      details: `Requested password reset link for: ${user.email}`,
      ip: req.ip || "127.0.0.1",
    });

    res.status(200).json({
      message: "If that email is registered, we have sent a password reset link.",
    });
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Reset Password Endpoint
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, email, password } = req.body;
  if (!token || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await db.users.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.resetPasswordToken || user.resetPasswordToken !== token) {
      return res.status(400).json({ message: "Invalid or expired password reset token" });
    }

    if (user.resetPasswordExpires && new Date(user.resetPasswordExpires).getTime() < Date.now()) {
      return res.status(400).json({ message: "Password reset link has expired" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.users.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          passwordHash,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      }
    );

    await db.auditLogs.create({
      userId: user.id,
      userName: user.name,
      action: "PASSWORD_RESET",
      details: "Successfully reset account password",
      ip: req.ip || "127.0.0.1",
    });

    res.status(200).json({ message: "Password successfully updated! You can now log in." });
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Get Current User
app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
  try {
    const user = await db.users.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Update Profile API
app.put("/api/auth/profile", authenticateToken, async (req: any, res) => {
  const { name, currentPassword, newPassword } = req.body;

  try {
    const user = await db.users.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ message: "User not found" });

    const updates: any = {};
    if (name) updates.name = name;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to set a new password" });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: "Incorrect current password" });
      }
      updates.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await db.users.updateOne({ id: req.user.id }, { $set: updates });

    await db.auditLogs.create({
      userId: user.id,
      userName: user.name,
      action: "PROFILE_UPDATE",
      details: `Updated details: ${name ? "Name " : ""}${newPassword ? "Password" : ""}`,
      ip: req.ip || "127.0.0.1",
    });

    res.status(200).json({ message: "Profile successfully updated!" });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Upload endpoint
app.post("/api/upload", authenticateToken, async (req, res) => {
  const { fileName, fileContent, mimeType } = req.body;
  if (!fileName || !fileContent || !mimeType) {
    return res.status(400).json({ message: "Filename, content (base64) and mimeType are required" });
  }

  // File type validation (reject executables)
  const rejectedExtensions = [".exe", ".bat", ".sh", ".cmd", ".vbs", ".js", ".ts", ".scr"];
  const fileExt = path.extname(fileName).toLowerCase();
  if (rejectedExtensions.includes(fileExt) || mimeType.includes("application/x-msdownload") || mimeType.includes("application/javascript")) {
    return res.status(400).json({ message: "Executable and script files are strictly prohibited for security reasons." });
  }

  try {
    const buffer = Buffer.from(fileContent.split(",")[1] || fileContent, "base64");
    if (buffer.length > 100 * 1024 * 1024) {
      return res.status(400).json({ message: "Maximum file size of 100MB exceeded." });
    }

    const secureUrl = await uploadFile(buffer, fileName, mimeType);
    res.status(200).json({ secureUrl });
  } catch (err: any) {
    console.error("Upload Error:", err);
    res.status(500).json({ message: err.message || "File upload failed" });
  }
});

// Orders Routes
// Create Order
app.post("/api/orders", authenticateToken, async (req: any, res) => {
  const {
    serviceType,
    academicLevel,
    pages,
    deadline,
    details,
    requirements,
    assignmentFiles,
    upiTransactionId,
    paymentScreenshot,
  } = req.body;

  if (!serviceType || !academicLevel || !pages || !deadline || !details || !paymentScreenshot) {
    return res.status(400).json({ message: "Missing required order details or mandatory payment screenshot" });
  }

  // Calculate pricing
  // School: ₹2/Page, Fixed ₹20
  // College: ₹5/Page, Fixed ₹40
  // University: ₹7/Page, Fixed ₹50
  // Masters: ₹11/Page, Fixed ₹80
  // PhD: ₹20/Page, Fixed ₹150
  let pricePerPage = 2;
  let fixedCharge = 20;

  switch (academicLevel) {
    case "School":
      pricePerPage = 2;
      fixedCharge = 20;
      break;
    case "College":
      pricePerPage = 5;
      fixedCharge = 40;
      break;
    case "University":
      pricePerPage = 7;
      fixedCharge = 50;
      break;
    case "Masters":
      pricePerPage = 11;
      fixedCharge = 80;
      break;
    case "PhD":
      pricePerPage = 20;
      fixedCharge = 150;
      break;
  }

  const totalAmount = pricePerPage * pages + fixedCharge;
  const invoiceId = "INV-" + Date.now().toString().substring(6);

  try {
    const order = await db.orders.create({
      clientId: req.user.id,
      clientName: req.user.name,
      clientEmail: req.user.email,
      serviceType,
      academicLevel,
      pages: Number(pages),
      deadline,
      status: "pending",
      paymentStatus: "pending_verification",
      paymentScreenshot,
      upiTransactionId: upiTransactionId || "",
      assignmentFiles: assignmentFiles || [],
      completedFiles: [],
      pricePerPage,
      fixedCharge,
      totalAmount,
      details,
      requirements: requirements || "",
      invoiceId,
    });

    // Create a Client Notification
    await db.notifications.create({
      userId: req.user.id,
      title: "Order Placed Successfully",
      message: `Your order ${order.id} is pending manual payment verification.`,
    });

    // Send Client Order Email
    const clientOrderEmail = emailTemplates.orderSubmitted(order.id, totalAmount);
    await sendEmail({
      to: req.user.email,
      subject: clientOrderEmail.subject,
      html: clientOrderEmail.html,
    });

    // Notify Admin (preseeded/seeded admins receive alert)
    const adminEmail = "koushikmondal.me@outlook.com";
    await sendEmail({
      to: adminEmail,
      subject: `🚨 New VgoCraft Order Recieved - Awaiting Verification [${order.id}]`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #0f172a;">New Order Pending Payment Verification</h2>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Client:</strong> ${req.user.name} (${req.user.email})</p>
          <p><strong>Academic Level:</strong> ${academicLevel}</p>
          <p><strong>Pages:</strong> ${pages}</p>
          <p><strong>Price:</strong> ₹${totalAmount}</p>
          <p>Please log in to the admin panel at <a href="http://localhost:3000/admin/login">/admin/login</a> to approve this order.</p>
        </div>
      `,
    });

    // Capture Audit Log
    await db.auditLogs.create({
      userId: req.user.id,
      userName: req.user.name,
      action: "ORDER_CREATE",
      details: `Created order ${order.id} for ₹${totalAmount}`,
      ip: req.ip || "127.0.0.1",
    });

    res.status(201).json(order);
  } catch (error: any) {
    console.error("Order Creation Error:", error);
    res.status(500).json({ message: "Server Error creating order" });
  }
});

// Client Orders List
app.get("/api/orders", authenticateToken, async (req: any, res) => {
  try {
    const list = await db.orders.find({ clientId: req.user.id });
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Get Order Details
app.get("/api/orders/:id", authenticateToken, async (req: any, res) => {
  try {
    const order = await db.orders.findOne({ id: req.params.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Enforce authorization (Admins can view all, clients only their own)
    if (req.user.role !== "admin" && order.clientId !== req.user.id) {
      return res.status(403).json({ message: "Access Forbidden" });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Revision Request API
app.post("/api/orders/:id/revision", authenticateToken, async (req: any, res) => {
  const { comment } = req.body;
  if (!comment) return res.status(400).json({ message: "Revision instructions are required" });

  try {
    const order = await db.orders.findOne({ id: req.params.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.clientId !== req.user.id) {
      return res.status(403).json({ message: "Access Forbidden" });
    }

    await db.orders.updateOne(
      { id: req.params.id },
      { $set: { status: "revision_requested", details: `${order.details}\n\n[REVISION REQUESTED]: ${comment}` } }
    );

    // Create Admin notification
    const adminEmail = "koushikmondal.me@outlook.com";
    await sendEmail({
      to: adminEmail,
      subject: `⚠️ Revision Requested - Order [${order.id}]`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h3>Revision Request Received</h3>
          <p><strong>Order:</strong> ${order.id}</p>
          <p><strong>Client:</strong> ${order.clientName}</p>
          <p><strong>Revision Details:</strong></p>
          <blockquote style="background-color: #f1f5f9; padding: 15px; border-left: 4px solid #ef4444;">${comment}</blockquote>
        </div>
      `,
    });

    await db.auditLogs.create({
      userId: req.user.id,
      userName: req.user.name,
      action: "REVISION_REQUEST",
      details: `Requested revision on order ${order.id}`,
      ip: req.ip || "127.0.0.1",
    });

    res.status(200).json({ message: "Revision request submitted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Admin Orders API
app.get("/api/admin/orders", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const list = await db.orders.find();
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Admin Update Order Status/Payment
app.put("/api/admin/orders/:id", authenticateToken, requireAdmin, async (req: any, res) => {
  const { status, paymentStatus, completedFiles } = req.body;
  
  try {
    const order = await db.orders.findOne({ id: req.params.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const updates: any = {};
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (completedFiles) updates.completedFiles = completedFiles;

    await db.orders.updateOne({ id: req.params.id }, { $set: updates });

    // Capture User ID and Client state for notification triggering
    const clientUser = await db.users.findOne({ id: order.clientId });

    if (clientUser) {
      if (paymentStatus === "approved") {
        await db.notifications.create({
          userId: order.clientId,
          title: "Payment Approved!",
          message: `Your payment for order ${order.id} has been approved. Work has officially started.`,
        });
        const payApprovedEmail = emailTemplates.paymentApproved(order.id);
        await sendEmail({
          to: clientUser.email,
          subject: payApprovedEmail.subject,
          html: payApprovedEmail.html,
        });
      }

      if (status === "completed") {
        await db.notifications.create({
          userId: order.clientId,
          title: "Assignment Completed!",
          message: `Your assignment for order ${order.id} is ready for download.`,
        });
        const appUrl = process.env.APP_URL || "http://localhost:3000";
        const downloadLink = `${appUrl}/dashboard/orders/${order.id}`;
        const ordCompEmail = emailTemplates.orderCompleted(order.id, downloadLink);
        await sendEmail({
          to: clientUser.email,
          subject: ordCompEmail.subject,
          html: ordCompEmail.html,
        });
      }
    }

    await db.auditLogs.create({
      userId: req.user.id,
      userName: req.user.name,
      action: "ADMIN_ORDER_UPDATE",
      details: `Updated order ${order.id}: Status: ${status || "No change"}, Payment: ${paymentStatus || "No change"}`,
      ip: req.ip || "127.0.0.1",
    });

    res.status(200).json({ message: "Order updated successfully" });
  } catch (error) {
    console.error("Admin Update Error:", error);
    res.status(500).json({ message: "Server Error updating order" });
  }
});

// Support Ticket Routes
app.post("/api/tickets", authenticateToken, async (req: any, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ message: "Subject and Message are required" });
  }

  try {
    const ticket = await db.tickets.create({
      clientId: req.user.id,
      clientName: req.user.name,
      clientEmail: req.user.email,
      subject,
      message,
      status: "open",
      replies: [],
    });

    // Notify Admin
    const adminEmail = "koushikmondal.me@outlook.com";
    await sendEmail({
      to: adminEmail,
      subject: `🎟️ New Support Ticket Opened [${ticket.id}]`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h3>New Support Ticket</h3>
          <p><strong>Ticket ID:</strong> ${ticket.id}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>From:</strong> ${req.user.name} (${req.user.email})</p>
          <p><strong>Message:</strong></p>
          <blockquote style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px;">${message}</blockquote>
        </div>
      `,
    });

    await db.auditLogs.create({
      userId: req.user.id,
      userName: req.user.name,
      action: "TICKET_CREATE",
      details: `Created support ticket: ${ticket.id}`,
      ip: req.ip || "127.0.0.1",
    });

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Get User Tickets
app.get("/api/tickets", authenticateToken, async (req: any, res) => {
  try {
    const list = await db.tickets.find(
      req.user.role === "admin" ? {} : { clientId: req.user.id }
    );
    res.status(200).json(list);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Add Ticket Reply
app.post("/api/tickets/:id/reply", authenticateToken, async (req: any, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: "Reply message is required" });

  try {
    const ticket = await db.tickets.findOne({ id: req.params.id });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (req.user.role !== "admin" && ticket.clientId !== req.user.id) {
      return res.status(403).json({ message: "Access Forbidden" });
    }

    const newReply = {
      sender: req.user.role,
      message,
      createdAt: new Date().toISOString(),
    };

    const updatedReplies = [...ticket.replies, newReply];
    const newStatus = req.user.role === "admin" ? "replied" : "open";

    await db.tickets.updateOne(
      { id: req.params.id },
      { $set: { replies: updatedReplies, status: newStatus } }
    );

    // Send notification emails
    if (req.user.role === "admin") {
      // Notify client
      await db.notifications.create({
        userId: ticket.clientId,
        title: "New Support Ticket Reply",
        message: `Admin replied to your ticket "${ticket.subject}"`,
      });

      const replyEmail = emailTemplates.supportReply(ticket.id, ticket.subject, message);
      await sendEmail({
        to: ticket.clientEmail,
        subject: replyEmail.subject,
        html: replyEmail.html,
      });
    } else {
      // Client replied, notify admin
      const adminEmail = "koushikmondal.me@outlook.com";
      await sendEmail({
        to: adminEmail,
        subject: `🎟️ User Reply - Ticket [${ticket.id}]`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h3>User Replied to Support Ticket</h3>
            <p><strong>Ticket ID:</strong> ${ticket.id}</p>
            <p><strong>User:</strong> ${ticket.clientName}</p>
            <p><strong>Message:</strong></p>
            <blockquote style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px;">${message}</blockquote>
          </div>
        `,
      });
    }

    res.status(200).json({ message: "Reply added successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Portfolio APIs
app.get("/api/portfolio", async (req, res) => {
  try {
    const list = await db.portfolio.find();
    res.status(200).json(list);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.post("/api/admin/portfolio", authenticateToken, requireAdmin, async (req, res) => {
  const { title, category, description, tags, demoUrl, imageUrl, documentSummary } = req.body;
  if (!title || !category || !description) {
    return res.status(400).json({ message: "Title, category, and description are required" });
  }

  try {
    const item = await db.portfolio.create({
      title,
      category,
      description,
      tags: tags || [],
      demoUrl: demoUrl || "",
      imageUrl: imageUrl || "",
      documentSummary: documentSummary || "",
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.delete("/api/admin/portfolio/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.portfolio.delete({ id: req.params.id });
    res.status(200).json({ message: "Portfolio item deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Notifications
app.get("/api/notifications", authenticateToken, async (req: any, res) => {
  try {
    const list = await db.notifications.find({ userId: req.user.id });
    res.status(200).json(list);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.put("/api/notifications/read", authenticateToken, async (req: any, res) => {
  try {
    await db.notifications.updateMany({ userId: req.user.id }, { $set: { read: true } });
    res.status(200).json({ message: "Notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Audit Logs (Admin ONLY)
app.get("/api/admin/audit-logs", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await db.auditLogs.find();
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Dashboard Stats Endpoint
app.get("/api/stats", authenticateToken, async (req: any, res) => {
  try {
    const orders = await db.orders.find(req.user.role === "admin" ? {} : { clientId: req.user.id });
    const tickets = await db.tickets.find(req.user.role === "admin" ? {} : { clientId: req.user.id });

    // Client dashboard statistics
    if (req.user.role !== "admin") {
      const activeOrders = orders.filter((o) => o.status !== "completed").length;
      const completedOrders = orders.filter((o) => o.status === "completed").length;
      const totalSpent = orders
        .filter((o) => o.paymentStatus === "approved")
        .reduce((sum, o) => sum + o.totalAmount, 0);

      return res.status(200).json({
        activeOrders,
        completedOrders,
        totalSpent,
        ticketsCount: tickets.length,
      });
    }

    // Admin dashboard statistics
    const totalRevenue = orders
      .filter((o) => o.paymentStatus === "approved")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const pendingPaymentsCount = orders.filter((o) => o.paymentStatus === "pending_verification").length;
    const activeAssignmentsCount = orders.filter((o) => ["work_started", "quality_check"].includes(o.status)).length;
    const completedAssignmentsCount = orders.filter((o) => o.status === "completed").length;
    const revisionRequestsCount = orders.filter((o) => o.status === "revision_requested").length;
    const openSupportTicketsCount = tickets.filter((t) => t.status === "open").length;

    // Daily statistics calculation
    const today = new Date().toISOString().split("T")[0];
    const todayOrders = orders.filter((o) => o.createdAt.startsWith(today)).length;
    const todayRevenue = orders
      .filter((o) => o.paymentStatus === "approved" && o.createdAt.startsWith(today))
      .reduce((sum, o) => sum + o.totalAmount, 0);

    res.status(200).json({
      totalRevenue,
      pendingPaymentsCount,
      activeAssignmentsCount,
      completedAssignmentsCount,
      revisionRequestsCount,
      openSupportTicketsCount,
      todayOrders,
      todayRevenue,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error calculating statistics" });
  }
});

// Setup dev server running with Vite or standard production serve
async function startServer() {
  await preseedAdmin();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve uploaded files
    app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 VgoCraft Full-Stack Application successfully running on http://localhost:${PORT}`);
  });
}

startServer();
