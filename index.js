// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import createMemoryStore from "memorystore";
import session from "express-session";
var MemoryStore = createMemoryStore(session);
var MemStorage = class {
  users;
  medications;
  activities;
  messages;
  sessionStore;
  currentUserId;
  currentMedicationId;
  currentActivityId;
  currentMessageId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.medications = /* @__PURE__ */ new Map();
    this.activities = /* @__PURE__ */ new Map();
    this.messages = /* @__PURE__ */ new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 864e5
      // prune expired entries every 24h
    });
    this.currentUserId = 1;
    this.currentMedicationId = 1;
    this.currentActivityId = 1;
    this.currentMessageId = 1;
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  // Medication methods
  async getMedicationsByUserId(userId) {
    return Array.from(this.medications.values()).filter(
      (medication) => medication.userId === userId
    );
  }
  async getMedicationById(id) {
    return this.medications.get(id);
  }
  async createMedication(medication) {
    const id = this.currentMedicationId++;
    const newMedication = { ...medication, id };
    this.medications.set(id, newMedication);
    return newMedication;
  }
  async updateMedication(id, medicationUpdate) {
    const medication = this.medications.get(id);
    if (!medication) return void 0;
    const updatedMedication = { ...medication, ...medicationUpdate };
    this.medications.set(id, updatedMedication);
    return updatedMedication;
  }
  async deleteMedication(id) {
    return this.medications.delete(id);
  }
  // Activity methods
  async getActivitiesByUserId(userId) {
    return Array.from(this.activities.values()).filter((activity) => activity.userId === userId).sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
  async createActivity(activity) {
    const id = this.currentActivityId++;
    const newActivity = {
      ...activity,
      id,
      createdAt: activity.createdAt || /* @__PURE__ */ new Date()
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }
  // Message methods
  async getMessagesByUserId(userId) {
    return Array.from(this.messages.values()).filter((message) => message.userId === userId).sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }
  async createMessage(message) {
    const id = this.currentMessageId++;
    const newMessage = {
      ...message,
      id,
      createdAt: message.createdAt || /* @__PURE__ */ new Date()
    };
    this.messages.set(id, newMessage);
    return newMessage;
  }
};
var storage = new MemStorage();

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "pgf-assistant-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1e3,
      // 24 hours
      secure: process.env.NODE_ENV === "production"
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, firstName, lastName, email } = req.body;
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const user = await storage.createUser({
        username,
        password: await hashPassword(password),
        firstName,
        lastName,
        email
      });
      const userResponse = {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      };
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userResponse);
      });
      await storage.createMessage({
        userId: user.id,
        content: "Hello! I'm your PGF Assistant. How can I help you today?",
        isBot: true
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.login(user, (err2) => {
        if (err2) return next(err2);
        const userResponse = {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        };
        res.status(200).json(userResponse);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user;
    const userResponse = {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    };
    res.json(userResponse);
  });
}

// shared/schema.ts
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email")
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
  email: true
});
var medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  medicationType: text("medication_type").notNull(),
  // prescription, supplement
  schedule: text("schedule").notNull(),
  // morning, evening, etc.
  status: text("status").notNull(),
  // upcoming, taken, overdue
  supplyRemaining: integer("supply_remaining"),
  hasInteraction: boolean("has_interaction").default(false),
  interactionDetails: text("interaction_details"),
  nextDueAt: timestamp("next_due_at")
});
var insertMedicationSchema = createInsertSchema(medications).pick({
  userId: true,
  name: true,
  dosage: true,
  medicationType: true,
  schedule: true,
  status: true,
  supplyRemaining: true,
  hasInteraction: true,
  interactionDetails: true,
  nextDueAt: true
});
var activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  activityType: text("activity_type").notNull(),
  // medication_taken, low_supply, appointment_scheduled, etc.
  description: text("description").notNull(),
  medicationId: integer("medication_id"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertActivitySchema = createInsertSchema(activities).pick({
  userId: true,
  activityType: true,
  description: true,
  medicationId: true
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  isBot: boolean("is_bot").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var insertMessageSchema = createInsertSchema(messages).pick({
  userId: true,
  content: true,
  isBot: true
});
var loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

// server/routes.ts
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
async function registerRoutes(app2) {
  setupAuth(app2);
  app2.get("/api/medications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.id;
    const medications2 = await storage.getMedicationsByUserId(userId);
    res.json(medications2);
  });
  app2.post("/api/medications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const userId = req.user.id;
      const medicationData = { ...req.body, userId };
      const validated = insertMedicationSchema.parse(medicationData);
      const medication = await storage.createMedication(validated);
      res.status(201).json(medication);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Server error" });
      }
    }
  });
  app2.put("/api/medications/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const medicationId = parseInt(req.params.id);
      const medication = await storage.getMedicationById(medicationId);
      if (!medication) {
        return res.status(404).json({ message: "Medication not found" });
      }
      if (medication.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const updatedMedication = await storage.updateMedication(medicationId, req.body);
      res.json(updatedMedication);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.delete("/api/medications/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const medicationId = parseInt(req.params.id);
      const medication = await storage.getMedicationById(medicationId);
      if (!medication) {
        return res.status(404).json({ message: "Medication not found" });
      }
      if (medication.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      await storage.deleteMedication(medicationId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/activities", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.id;
    const activities2 = await storage.getActivitiesByUserId(userId);
    res.json(activities2);
  });
  app2.post("/api/activities", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const userId = req.user.id;
      const activityData = { ...req.body, userId };
      const validated = insertActivitySchema.parse(activityData);
      const activity = await storage.createActivity(validated);
      res.status(201).json(activity);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Server error" });
      }
    }
  });
  app2.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.id;
    const messages2 = await storage.getMessagesByUserId(userId);
    res.json(messages2);
  });
  app2.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const userId = req.user.id;
      const messageData = { ...req.body, userId };
      const validated = insertMessageSchema.parse(messageData);
      const message = await storage.createMessage(validated);
      const userMessage = message.content.toLowerCase();
      let botResponse = "I'm not sure how to help with that. Could you please clarify?";
      if (userMessage.includes("refill") || userMessage.includes("prescription")) {
        botResponse = "I'd be happy to help you refill your prescription. Would you like me to send a refill request?";
      } else if (userMessage.includes("reminder") || userMessage.includes("schedule")) {
        botResponse = "I can set up medication reminders for you. What time would you like to be reminded?";
      } else if (userMessage.includes("side effect") || userMessage.includes("reaction")) {
        botResponse = "If you're experiencing side effects, you should contact your healthcare provider for guidance.";
      } else if (userMessage.includes("hello") || userMessage.includes("hi")) {
        botResponse = "Hello! How can I assist you with your medications today?";
      }
      const botMessage = await storage.createMessage({
        userId,
        content: botResponse,
        isBot: true
      });
      res.status(201).json([message, botMessage]);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Server error" });
      }
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/"),
    emptyOutDir: true
  },
  base: "/vrd-test/"
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
