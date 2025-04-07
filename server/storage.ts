import { users, medications, activities, messages, type User, type InsertUser, type Medication, type InsertMedication, type Activity, type InsertActivity, type Message, type InsertMessage } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

// Memory Store for sessions
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Medication methods
  getMedicationsByUserId(userId: number): Promise<Medication[]>;
  getMedicationById(id: number): Promise<Medication | undefined>;
  createMedication(medication: InsertMedication): Promise<Medication>;
  updateMedication(id: number, medication: Partial<Medication>): Promise<Medication | undefined>;
  deleteMedication(id: number): Promise<boolean>;
  
  // Activity methods
  getActivitiesByUserId(userId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Message methods
  getMessagesByUserId(userId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private medications: Map<number, Medication>;
  private activities: Map<number, Activity>;
  private messages: Map<number, Message>;
  sessionStore: session.SessionStore;
  currentUserId: number;
  currentMedicationId: number;
  currentActivityId: number;
  currentMessageId: number;

  constructor() {
    this.users = new Map();
    this.medications = new Map();
    this.activities = new Map();
    this.messages = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    this.currentUserId = 1;
    this.currentMedicationId = 1;
    this.currentActivityId = 1;
    this.currentMessageId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Medication methods
  async getMedicationsByUserId(userId: number): Promise<Medication[]> {
    return Array.from(this.medications.values()).filter(
      (medication) => medication.userId === userId
    );
  }

  async getMedicationById(id: number): Promise<Medication | undefined> {
    return this.medications.get(id);
  }

  async createMedication(medication: InsertMedication): Promise<Medication> {
    const id = this.currentMedicationId++;
    const newMedication: Medication = { ...medication, id };
    this.medications.set(id, newMedication);
    return newMedication;
  }

  async updateMedication(id: number, medicationUpdate: Partial<Medication>): Promise<Medication | undefined> {
    const medication = this.medications.get(id);
    if (!medication) return undefined;

    const updatedMedication = { ...medication, ...medicationUpdate };
    this.medications.set(id, updatedMedication);
    return updatedMedication;
  }

  async deleteMedication(id: number): Promise<boolean> {
    return this.medications.delete(id);
  }

  // Activity methods
  async getActivitiesByUserId(userId: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(activity => activity.userId === userId)
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.currentActivityId++;
    const newActivity: Activity = { 
      ...activity, 
      id, 
      createdAt: activity.createdAt || new Date() 
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }

  // Message methods
  async getMessagesByUserId(userId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.userId === userId)
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const newMessage: Message = { 
      ...message, 
      id, 
      createdAt: message.createdAt || new Date() 
    };
    this.messages.set(id, newMessage);
    return newMessage;
  }
}

export const storage = new MemStorage();
