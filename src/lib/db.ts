/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { User, Order, SupportTicket, Notification, PortfolioItem, AuditLog } from "../types";

const LOCAL_DB_PATH = path.join(process.cwd(), "data_db.json");

// Helper to load/save JSON database
function readLocalDb(): {
  users: any[];
  orders: any[];
  tickets: any[];
  notifications: any[];
  portfolio: any[];
  auditLogs: any[];
} {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const initial = {
      users: [],
      orders: [],
      tickets: [],
      notifications: [],
      portfolio: [],
      auditLogs: [],
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading data_db.json, recreating...", e);
    return {
      users: [],
      orders: [],
      tickets: [],
      notifications: [],
      portfolio: [],
      auditLogs: [],
    };
  }
}

function writeLocalDb(data: any) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
}

// Mongoose initialization (lazy and guarded)
let isMongoConnected = false;

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("⚠️ No MONGODB_URI found. VgoCraft is running in high-performance local persistent JSON database mode.");
    return false;
  }
  if (isMongoConnected) return true;
  try {
    await mongoose.connect(uri);
    isMongoConnected = true;
    console.log("🚀 Connected to MongoDB Atlas successfully!");
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    console.log("⚠️ Falling back to local persistent JSON database.");
    return false;
  }
}

// Defining Schema for Mongoose
const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, enum: ["admin", "client"] },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  clientName: { type: String, required: true },
  clientEmail: { type: String, required: true },
  serviceType: { type: String, required: true },
  academicLevel: { type: String, required: true },
  pages: { type: Number, required: true },
  deadline: { type: String, required: true },
  status: { type: String, required: true },
  paymentStatus: { type: String, required: true },
  paymentScreenshot: { type: String },
  upiTransactionId: { type: String },
  assignmentFiles: [{ type: String }],
  completedFiles: [{ type: String }],
  pricePerPage: { type: Number, required: true },
  fixedCharge: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  details: { type: String, required: true },
  requirements: { type: String },
  invoiceId: { type: String },
}, { timestamps: true });

const SupportTicketSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  clientName: { type: String, required: true },
  clientEmail: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, required: true },
  replies: [{
    sender: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: String, required: true },
  }],
}, { timestamps: true });

const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

const PortfolioSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  tags: [{ type: String }],
  demoUrl: { type: String },
  imageUrl: { type: String },
  documentSummary: { type: String },
});

const AuditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String, required: true },
  ip: { type: String, required: true },
}, { timestamps: true });

// Models
const MongoUser = mongoose.models.User || mongoose.model("User", UserSchema);
const MongoOrder = mongoose.models.Order || mongoose.model("Order", OrderSchema);
const MongoTicket = mongoose.models.SupportTicket || mongoose.model("SupportTicket", SupportTicketSchema);
const MongoNotification = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
const MongoPortfolio = mongoose.models.Portfolio || mongoose.model("Portfolio", PortfolioSchema);
const MongoAuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

// Unified Database Provider
export const db = {
  users: {
    find: async (query: any = {}): Promise<any[]> => {
      if (await connectToDatabase()) {
        const items = await MongoUser.find(query);
        return items.map((i: any) => i.toObject());
      } else {
        const local = readLocalDb();
        return local.users.filter((u) => {
          for (const key in query) {
            if (u[key] !== query[key]) return false;
          }
          return true;
        });
      }
    },
    findOne: async (query: any): Promise<any | null> => {
      if (await connectToDatabase()) {
        const item = await MongoUser.findOne(query);
        return item ? item.toObject() : null;
      } else {
        const local = readLocalDb();
        const found = local.users.find((u) => {
          for (const key in query) {
            if (u[key] !== query[key]) return false;
          }
          return true;
        });
        return found || null;
      }
    },
    create: async (data: any): Promise<any> => {
      data.id = data.id || Math.random().toString(36).substring(2, 11);
      data.createdAt = new Date().toISOString();
      data.updatedAt = new Date().toISOString();
      if (await connectToDatabase()) {
        const item = await MongoUser.create(data);
        return item.toObject();
      } else {
        const local = readLocalDb();
        local.users.push(data);
        writeLocalDb(local);
        return data;
      }
    },
    updateOne: async (query: any, update: any): Promise<any> => {
      if (await connectToDatabase()) {
        return await MongoUser.updateOne(query, update);
      } else {
        const local = readLocalDb();
        const index = local.users.findIndex((u) => {
          for (const key in query) {
            if (u[key] !== query[key]) return false;
          }
          return true;
        });
        if (index !== -1) {
          const $set = update.$set || update;
          local.users[index] = { ...local.users[index], ...$set, updatedAt: new Date().toISOString() };
          writeLocalDb(local);
          return { nModified: 1 };
        }
        return { nModified: 0 };
      }
    },
  },

  orders: {
    find: async (query: any = {}): Promise<Order[]> => {
      if (await connectToDatabase()) {
        const items = await MongoOrder.find(query).sort({ createdAt: -1 });
        return items.map((i: any) => i.toObject());
      } else {
        const local = readLocalDb();
        let list = local.orders.filter((o) => {
          for (const key in query) {
            if (o[key] !== query[key]) return false;
          }
          return true;
        });
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    },
    findOne: async (query: any): Promise<Order | null> => {
      if (await connectToDatabase()) {
        const item = await MongoOrder.findOne(query);
        return item ? item.toObject() : null;
      } else {
        const local = readLocalDb();
        const found = local.orders.find((o) => {
          for (const key in query) {
            if (o[key] !== query[key]) return false;
          }
          return true;
        });
        return found || null;
      }
    },
    create: async (data: any): Promise<Order> => {
      data.id = data.id || "ORD-" + Math.floor(100000 + Math.random() * 900000);
      data.createdAt = new Date().toISOString();
      data.updatedAt = new Date().toISOString();
      if (await connectToDatabase()) {
        const item = await MongoOrder.create(data);
        return item.toObject();
      } else {
        const local = readLocalDb();
        local.orders.push(data);
        writeLocalDb(local);
        return data;
      }
    },
    updateOne: async (query: any, update: any): Promise<any> => {
      if (await connectToDatabase()) {
        return await MongoOrder.updateOne(query, update);
      } else {
        const local = readLocalDb();
        const index = local.orders.findIndex((o) => {
          for (const key in query) {
            if (o[key] !== query[key]) return false;
          }
          return true;
        });
        if (index !== -1) {
          const $set = update.$set || update;
          local.orders[index] = { ...local.orders[index], ...$set, updatedAt: new Date().toISOString() };
          writeLocalDb(local);
          return { nModified: 1 };
        }
        return { nModified: 0 };
      }
    },
  },

  tickets: {
    find: async (query: any = {}): Promise<SupportTicket[]> => {
      if (await connectToDatabase()) {
        const items = await MongoTicket.find(query).sort({ createdAt: -1 });
        return items.map((i: any) => i.toObject());
      } else {
        const local = readLocalDb();
        let list = local.tickets.filter((t) => {
          for (const key in query) {
            if (t[key] !== query[key]) return false;
          }
          return true;
        });
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    },
    findOne: async (query: any): Promise<SupportTicket | null> => {
      if (await connectToDatabase()) {
        const item = await MongoTicket.findOne(query);
        return item ? item.toObject() : null;
      } else {
        const local = readLocalDb();
        const found = local.tickets.find((t) => {
          for (const key in query) {
            if (t[key] !== query[key]) return false;
          }
          return true;
        });
        return found || null;
      }
    },
    create: async (data: any): Promise<SupportTicket> => {
      data.id = data.id || "TCK-" + Math.floor(100000 + Math.random() * 900000);
      data.createdAt = new Date().toISOString();
      data.updatedAt = new Date().toISOString();
      data.replies = data.replies || [];
      if (await connectToDatabase()) {
        const item = await MongoTicket.create(data);
        return item.toObject();
      } else {
        const local = readLocalDb();
        local.tickets.push(data);
        writeLocalDb(local);
        return data;
      }
    },
    updateOne: async (query: any, update: any): Promise<any> => {
      if (await connectToDatabase()) {
        return await MongoTicket.updateOne(query, update);
      } else {
        const local = readLocalDb();
        const index = local.tickets.findIndex((t) => {
          for (const key in query) {
            if (t[key] !== query[key]) return false;
          }
          return true;
        });
        if (index !== -1) {
          const $set = update.$set || update;
          local.tickets[index] = { ...local.tickets[index], ...$set, updatedAt: new Date().toISOString() };
          writeLocalDb(local);
          return { nModified: 1 };
        }
        return { nModified: 0 };
      }
    },
  },

  notifications: {
    find: async (query: any = {}): Promise<Notification[]> => {
      if (await connectToDatabase()) {
        const items = await MongoNotification.find(query).sort({ createdAt: -1 });
        return items.map((i: any) => i.toObject());
      } else {
        const local = readLocalDb();
        let list = local.notifications.filter((n) => {
          for (const key in query) {
            if (n[key] !== query[key]) return false;
          }
          return true;
        });
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    },
    create: async (data: any): Promise<Notification> => {
      data.id = data.id || Math.random().toString(36).substring(2, 11);
      data.createdAt = new Date().toISOString();
      data.read = false;
      if (await connectToDatabase()) {
        const item = await MongoNotification.create(data);
        return item.toObject();
      } else {
        const local = readLocalDb();
        local.notifications.push(data);
        writeLocalDb(local);
        return data;
      }
    },
    updateMany: async (query: any, update: any): Promise<any> => {
      if (await connectToDatabase()) {
        return await MongoNotification.updateMany(query, update);
      } else {
        const local = readLocalDb();
        let count = 0;
        local.notifications = local.notifications.map((n) => {
          let match = true;
          for (const key in query) {
            if (n[key] !== query[key]) match = false;
          }
          if (match) {
            count++;
            return { ...n, ...update.$set };
          }
          return n;
        });
        writeLocalDb(local);
        return { nModified: count };
      }
    },
  },

  portfolio: {
    find: async (query: any = {}): Promise<PortfolioItem[]> => {
      if (await connectToDatabase()) {
        const items = await MongoPortfolio.find(query);
        return items.map((i: any) => i.toObject());
      } else {
        const local = readLocalDb();
        return local.portfolio.filter((p) => {
          for (const key in query) {
            if (p[key] !== query[key]) return false;
          }
          return true;
        });
      }
    },
    create: async (data: any): Promise<PortfolioItem> => {
      data.id = data.id || Math.random().toString(36).substring(2, 11);
      if (await connectToDatabase()) {
        const item = await MongoPortfolio.create(data);
        return item.toObject();
      } else {
        const local = readLocalDb();
        local.portfolio.push(data);
        writeLocalDb(local);
        return data;
      }
    },
    delete: async (query: any): Promise<any> => {
      if (await connectToDatabase()) {
        return await MongoPortfolio.deleteOne(query);
      } else {
        const local = readLocalDb();
        const initialLen = local.portfolio.length;
        local.portfolio = local.portfolio.filter((p) => {
          for (const key in query) {
            if (p[key] === query[key]) return false;
          }
          return true;
        });
        writeLocalDb(local);
        return { deletedCount: initialLen - local.portfolio.length };
      }
    }
  },

  auditLogs: {
    find: async (query: any = {}): Promise<AuditLog[]> => {
      if (await connectToDatabase()) {
        const items = await MongoAuditLog.find(query).sort({ createdAt: -1 });
        return items.map((i: any) => i.toObject());
      } else {
        const local = readLocalDb();
        let list = local.auditLogs.filter((l) => {
          for (const key in query) {
            if (l[key] !== query[key]) return false;
          }
          return true;
        });
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    },
    create: async (data: any): Promise<AuditLog> => {
      data.id = data.id || Math.random().toString(36).substring(2, 11);
      data.createdAt = new Date().toISOString();
      if (await connectToDatabase()) {
        const item = await MongoAuditLog.create(data);
        return item.toObject();
      } else {
        const local = readLocalDb();
        local.auditLogs.push(data);
        writeLocalDb(local);
        return data;
      }
    },
  },
};
