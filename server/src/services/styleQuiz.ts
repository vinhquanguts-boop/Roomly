import { z } from 'zod';

export const STYLE_QUIZ_QUESTION_IDS = ['mood', 'palette', 'texture', 'layout', 'accent'] as const;

const OPTION_TAGS: Record<string, string[]> = {
  calm_retreat: ['calm', 'minimal', 'soft'],
  warm_welcome: ['warm', 'inviting', 'cozy'],
  bold_refresh: ['bold', 'expressive', 'modern'],
  fresh_natural: ['fresh', 'natural', 'airy'],
  earthy_neutrals: ['earthy neutrals', 'organic', 'warm'],
  sage_layers: ['sage green', 'restful', 'natural'],
  clean_contrast: ['clean contrast', 'graphic', 'modern'],
  terracotta_glow: ['terracotta', 'sunlit', 'warm'],
  woven_wood: ['woven textures', 'wood accents', 'organic'],
  plush_soft: ['plush textiles', 'comfortable', 'soft'],
  tidy_lines: ['tidy lines', 'minimal', 'practical'],
  collected_mix: ['collected', 'personal', 'eclectic'],
  airy_open: ['airy', 'open', 'lightweight'],
  cozy_zone: ['cozy', 'zoned', 'layered'],
  renter_smart: ['renter-friendly', 'practical', 'flexible'],
  social_corner: ['social', 'welcoming', 'comfortable'],
  lighting_moment: ['layered lighting', 'ambient', 'warm'],
  wall_art: ['artful', 'personal', 'balanced'],
  rug_anchor: ['anchored', 'textured', 'cohesive'],
  plant_life: ['plant-filled', 'fresh', 'organic'],
};

export const quizAnswerSchema = z.object({
  questionId: z.enum(STYLE_QUIZ_QUESTION_IDS),
  optionId: z.string().min(1),
});

export const quizAnswersSchema = z.array(quizAnswerSchema);

export type QuizAnswer = z.infer<typeof quizAnswerSchema>;

export type StyleQuizResult = {
  styleDirection: string;
  traits: string[];
};

export class StyleQuizError extends Error {}

export function deriveStyleFromQuiz(answers: QuizAnswer[]): StyleQuizResult {
  const byQuestion = new Map(answers.map((answer) => [answer.questionId, answer.optionId]));

  if (byQuestion.size !== STYLE_QUIZ_QUESTION_IDS.length) {
    throw new StyleQuizError('Answer all style quiz questions.');
  }

  for (const questionId of STYLE_QUIZ_QUESTION_IDS) {
    if (!byQuestion.has(questionId)) {
      throw new StyleQuizError('Answer all style quiz questions.');
    }
  }

  const scores = new Map<string, number>();
  for (const optionId of byQuestion.values()) {
    const tags = OPTION_TAGS[optionId];
    if (!tags) {
      throw new StyleQuizError('Unknown style quiz option.');
    }

    for (const tag of tags) {
      scores.set(tag, (scores.get(tag) ?? 0) + 1);
    }
  }

  const traits = [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([tag]) => tag);

  const primary = traits[0] ?? 'warm';
  const secondary = traits[1] ?? 'practical';
  const tertiary = traits[2] ?? 'cohesive';

  return {
    styleDirection: `${primary} ${secondary} refresh with ${tertiary} details`,
    traits,
  };
}
