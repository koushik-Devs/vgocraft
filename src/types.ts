/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "admin" | "client";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | "pending"
  | "payment_verified"
  | "work_started"
  | "quality_check"
  | "completed"
  | "revision_requested";

export type PaymentStatus = "unpaid" | "pending_verification" | "approved" | "rejected";

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  serviceType: string;
  academicLevel: "School" | "College" | "University" | "Masters" | "PhD";
  pages: number;
  deadline: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentScreenshot?: string;
  upiTransactionId?: string;
  assignmentFiles: string[];
  completedFiles: string[];
  pricePerPage: number;
  fixedCharge: number;
  totalAmount: number;
  details: string;
  requirements?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  subject: string;
  message: string;
  status: "open" | "replied" | "closed";
  replies: {
    sender: UserRole;
    message: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  demoUrl?: string;
  imageUrl?: string;
  documentSummary?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ip: string;
  createdAt: string;
}

export interface ServicePrice {
  level: string;
  perPage: number;
  fixed: number;
}
