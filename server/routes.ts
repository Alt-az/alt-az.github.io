import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertMedicationSchema, insertActivitySchema, insertMessageSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Prefix all routes with /api
  
  // Medications API
  app.get("/api/medications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.user!.id;
    const medications = await storage.getMedicationsByUserId(userId);
    res.json(medications);
  });

  app.post("/api/medications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user!.id;
      const medicationData = { ...req.body, userId };
      
      // Validate
      const validated = insertMedicationSchema.parse(medicationData);
      
      // Create medication
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

  app.put("/api/medications/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const medicationId = parseInt(req.params.id);
      const medication = await storage.getMedicationById(medicationId);
      
      if (!medication) {
        return res.status(404).json({ message: "Medication not found" });
      }
      
      if (medication.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const updatedMedication = await storage.updateMedication(medicationId, req.body);
      res.json(updatedMedication);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/medications/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const medicationId = parseInt(req.params.id);
      const medication = await storage.getMedicationById(medicationId);
      
      if (!medication) {
        return res.status(404).json({ message: "Medication not found" });
      }
      
      if (medication.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await storage.deleteMedication(medicationId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Activities API
  app.get("/api/activities", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.user!.id;
    const activities = await storage.getActivitiesByUserId(userId);
    res.json(activities);
  });

  app.post("/api/activities", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user!.id;
      const activityData = { ...req.body, userId };
      
      // Validate
      const validated = insertActivitySchema.parse(activityData);
      
      // Create activity
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

  // Messages API
  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.user!.id;
    const messages = await storage.getMessagesByUserId(userId);
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user!.id;
      const messageData = { ...req.body, userId };
      
      // Validate
      const validated = insertMessageSchema.parse(messageData);
      
      // Create user message
      const message = await storage.createMessage(validated);
      
      // Create bot response with simple logic
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
      
      // Create bot response message
      const botMessage = await storage.createMessage({
        userId,
        content: botResponse,
        isBot: true
      });
      
      // Return both messages
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

  const httpServer = createServer(app);
  return httpServer;
}
