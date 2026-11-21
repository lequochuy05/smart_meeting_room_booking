import { z } from 'zod';

export interface Employee {
  id: string;
  name: string;
  email: string;
}

export interface Session {
  token: string;
  employee: Employee;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export const employeeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().min(1),
});

export const sessionSchema = z.object({
  token: z.string().min(1),
  employee: employeeSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
