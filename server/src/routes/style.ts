import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { deriveStyleFromQuiz, quizAnswersSchema, StyleQuizError } from '../services/styleQuiz.js';

const styleRequestSchema = z.object({
  answers: quizAnswersSchema,
});

export const styleRouter = new Hono();

styleRouter.post('/from-quiz', zValidator('json', styleRequestSchema), async (c) => {
  try {
    return c.json(deriveStyleFromQuiz(c.req.valid('json').answers));
  } catch (error) {
    if (error instanceof StyleQuizError) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
});
