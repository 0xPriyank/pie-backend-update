import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

/**
 * Middleware to validate request data against a Zod schema
 * @param schema The Zod schema to validate against
 * @param source The source of data to validate (body, query, params)
 */
export const validate = (schema: ZodSchema, source: "body" | "query" | "params" = "body") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      res.status(400).json({
        errors: result.error.errors.map((err) => ({
          path: err.path,
          message: err.message
        }))
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to validate FormData against a Zod schema
 * @param schema The Zod schema to validate against
 */
export const validateFormData = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Create an object from form fields
    const formData: Record<string, unknown> = {};

    // Add all form fields from body
    for (const key in req.body) {
      // Handle arrays (like productCategories)
      if (Array.isArray(req.body[key])) {
        formData[key] = req.body[key];
      }
      // Handle booleans
      else if (req.body[key] === "true" || req.body[key] === "false") {
        formData[key] = req.body[key] === "true";
      }
      // Handle numbers
      else if (!isNaN(Number(req.body[key])) && req.body[key] !== "") {
        formData[key] = Number(req.body[key]);
      }
      // Handle strings and other values
      else {
        formData[key] = req.body[key];
      }
    }

    // Add file information if present
    if (req.file) {
      formData.file = req.file;
    }

    // Add files information if present
    if (req.files) {
      formData.files = req.files;
    }

    const result = schema.safeParse(formData);

    if (!result.success) {
      res.status(400).json({
        errors: result.error.errors.map((err) => ({
          path: err.path,
          message: err.message
        }))
      });
      return;
    }

    // Store the validated data in the request for later use
    req.validatedData = result.data;
    next();
  };
};

// Add the validatedData property to the Express Request interface
// Using module augmentation instead of global namespace
import "express";
declare module "express" {
  interface Request {
    validatedData?: unknown;
  }
}
